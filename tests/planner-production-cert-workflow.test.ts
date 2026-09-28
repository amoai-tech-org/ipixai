import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/**
 * IPI-1332 · CERT-PROD-001 / CI-ALERT-001 — guards for the two workflows added
 * on this branch, each locking in a review finding that was a configuration
 * assumption rather than a code defect.
 */

type WorkflowStep = {
  name?: string;
  id?: string;
  if?: string;
  run?: string;
  uses?: string;
  env?: Record<string, unknown>;
  with?: Record<string, unknown>;
};

type WorkflowJob = {
  if?: string;
  env?: Record<string, unknown>;
  steps?: WorkflowStep[];
};

function readWorkflow(relativePath: string) {
  const source = readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
  const workflow = (parse(source) ?? {}) as {
    env?: Record<string, string>;
    jobs?: Record<string, WorkflowJob>;
  };
  return { source, workflow };
}

function jobOf(workflow: { jobs?: Record<string, WorkflowJob> }, name: string): WorkflowJob {
  const job = workflow.jobs?.[name];
  if (!job) throw new Error(`workflow job "${name}" is missing`);
  return job;
}

function stepNamed(job: WorkflowJob, prefix: string): WorkflowStep {
  const step = (job.steps ?? []).find((candidate) => candidate.name?.startsWith(prefix));
  if (!step) throw new Error(`no step starting with "${prefix}"`);
  return step;
}

/**
 * Only the executable lines, so a comment that mentions a pattern cannot satisfy
 * a check. Backslash continuations are joined, so a command split over several
 * physical lines is asserted as the single command the shell actually runs —
 * otherwise only its first line carries the program name and the rest look like
 * unrelated lines.
 */
function commandLines(run: string | undefined): string[] {
  const lines = (run ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

  const joined: string[] = [];
  let pending: string | null = null;
  for (const line of lines) {
    const continues = line.endsWith("\\");
    const body = continues ? line.slice(0, -1).trim() : line;
    pending = pending === null ? body : `${pending} ${body}`;
    if (!continues) {
      joined.push(pending);
      pending = null;
    }
  }
  if (pending !== null) joined.push(pending);
  return joined;
}

const CERT_WORKFLOW = ".github/workflows/production-planner-cert.yml";
const ALERT_WORKFLOW = ".github/workflows/ai-smoke.yml";

describe("production Planner certification workflow", () => {
  // Review finding: `vercel ls ipixai` hardcodes the project *name*, so a rename,
  // a casing change or an org prefix would fail the SHA check with a confusing
  // "no production deployment found". `ci.yml` identifies the project by ID.
  it("identifies the Vercel project by ID rather than a hardcoded name", () => {
    const { workflow } = readWorkflow(CERT_WORKFLOW);
    const step = stepNamed(jobOf(workflow, "certify"), "Assert Production serves");

    expect(step.env?.VERCEL_PROJECT_ID).toContain("vars.VERCEL_PROJECT_ID");
    expect(step.env?.VERCEL_ORG_ID).toContain("vars.VERCEL_ORG_ID");

    const commands = commandLines(step.run).join("\n");
    expect(commands).toContain('vercel ls "$VERCEL_PROJECT_ID"');
    expect(
      /vercel ls\s+ipixai\b/.test(commands),
      "the project must not be addressed by its display name",
    ).toBe(false);
  });

  // Review finding: checking out `main` certified an older deployment with newer specs.
  it("checks out the certified SHA, not main", () => {
    const { workflow } = readWorkflow(CERT_WORKFLOW);
    const checkout = stepNamed(jobOf(workflow, "certify"), "Checkout");

    expect(checkout.uses).toContain("actions/checkout@");
    expect(checkout.env).toBeUndefined();
    expect(checkout.with?.ref).toContain("steps.request.outputs.expected_sha");
    expect(checkout.with?.ref).not.toBe("main");
  });

  // Review finding: nothing asserted that the verifying step actually publishes
  // the outputs its later steps read, so a break there would silently skip the
  // 5xx check (`if: steps.prod.outputs.deployment_url != ''`) and blank the
  // summary. Step outputs are written through `$GITHUB_OUTPUT` — a step cannot
  // declare them in YAML — so assert the writes and the consumption wiring.
  it("publishes the deployment outputs its later steps consume", () => {
    const { workflow } = readWorkflow(CERT_WORKFLOW);
    const job = jobOf(workflow, "certify");
    const prod = stepNamed(job, "Assert Production serves");

    expect(prod.id, "later steps reference steps.prod.outputs").toBe("prod");

    const prodCommands = commandLines(prod.run).join("\n");
    for (const output of ["deployment_url", "deployment_sha"]) {
      expect(prodCommands, `${output} must be written to GITHUB_OUTPUT`).toContain(
        `GITHUB_OUTPUT, \`${output}=`,
      );
    }

    const logStep = stepNamed(job, "Assert no unexpected");
    expect(logStep.if).toContain("steps.prod.outputs.deployment_url");
    expect(String(logStep.env?.DEPLOYMENT_URL)).toContain("steps.prod.outputs.deployment_url");

    const summary = stepNamed(job, "Certification summary");
    expect(summary.run).toContain("steps.prod.outputs.deployment_url");
    expect(summary.run).toContain("steps.prod.outputs.deployment_sha");
  });

  // Review finding: `|| true` turned a failed log query into a passing 5xx check.
  it("fails closed when the log query or the scanned window is unusable", () => {
    const { workflow } = readWorkflow(CERT_WORKFLOW);
    const step = stepNamed(jobOf(workflow, "certify"), "Assert no unexpected");

    const commands = commandLines(step.run);
    const logLines = commands.filter((line) => line.includes("vercel logs"));
    expect(logLines, "the step must query the deployment logs").toHaveLength(1);
    expect(logLines[0], "a discarded failure cannot be reported as no-5xx").not.toContain("|| true");
    expect(logLines[0], "the 100-line default truncates the window").toContain("--limit");

    expect(commands.join("\n")).toContain("scripts/check-planner-production-logs.mjs");
  });

  // `vercel logs` applies --since/--until to the newest --limit entries rather
  // than streaming a range, so an unbounded query scans "whatever the newest log
  // lines happen to be". Measured 2026-09-28: `--limit 50` returned 50 entries
  // and `--limit 5000` returned 5000 for the same requested range, so the limit
  // silently decides how much real time is covered.
  it("bounds the scanned window to the journey instead of whatever is newest", () => {
    const { workflow } = readWorkflow(CERT_WORKFLOW);
    const job = jobOf(workflow, "certify");

    const journeyCommands = commandLines(
      stepNamed(job, "Run the signed-in Production Planner certification").run,
    );
    const windowWrite = journeyCommands.find((line) => line.includes("CERT_STARTED_AT"));
    expect(windowWrite, "the certification window start must be recorded").toBeDefined();
    // $GITHUB_ENV, not $GITHUB_OUTPUT: the log step runs with `if: always()`,
    // including when the journey step itself fails.
    expect(String(windowWrite)).toContain("GITHUB_ENV");
    expect(
      journeyCommands.indexOf(String(windowWrite)),
      "the window must start before the journey runs",
    ).toBeLessThan(journeyCommands.findIndex((line) => line.includes("e2e:production-cert")));

    const logStep = stepNamed(job, "Assert no unexpected");
    const logLines = commandLines(logStep.run).filter((line) => line.includes("vercel logs"));
    expect(logLines[0]).toContain('--since "$CERT_STARTED_AT"');
    expect(logLines[0], "an open-ended window widens past the journey").toContain("--until");

    // The same limit reaches the checker, which reports reaching it: a truncated
    // scan drops the OLDEST entries, so the volume is evidence rather than a
    // failure — the thread-id guard is what proves the journey is in the window.
    expect(String(logStep.env?.PROD_LOG_LIMIT)).toMatch(/^\d+$/);
    expect(logLines[0]).toContain('--limit "$PROD_LOG_LIMIT"');
  });

  it("refuses to check logs when the certification window is unknown", () => {
    const { workflow } = readWorkflow(CERT_WORKFLOW);
    const commands = commandLines(
      stepNamed(jobOf(workflow, "certify"), "Assert no unexpected").run,
    );

    const guard = commands.find((line) => line.includes("CERT_STARTED_AT"));
    expect(guard, "the step must guard the window start").toBeDefined();
    expect(String(guard)).toContain(":-");
    expect(commands.join("\n")).toContain("exit 1");
    // Guarded before the query, so an unset window cannot reach `vercel logs`.
    expect(commands.indexOf(String(guard))).toBeLessThan(
      commands.findIndex((line) => line.includes("vercel logs")),
    );
  });

  // Production is live, so /api/copilotkit traffic exists whether or not this
  // journey ran (measured: ~1100 requests in a 30-second slice against this
  // journey's 11). Only the journey's own thread id ties the scanned window to
  // the certification, so the trace must be configured for the whole job.
  it("ties the log check to this certification's own thread, not to copilotkit traffic", () => {
    const { workflow } = readWorkflow(CERT_WORKFLOW);
    const job = jobOf(workflow, "certify");

    expect(
      String(job.env?.CERT_TRACE_FILE),
      "the job must publish a trace the log check can read",
    ).toContain("planner-cert-trace.json");

    // The journey writes it and the check reads it, in the same job.
    expect(stepNamed(job, "Run the signed-in Production Planner certification").run).toBeDefined();
    expect(commandLines(stepNamed(job, "Assert no unexpected").run).join("\n")).toContain(
      "scripts/check-planner-production-logs.mjs",
    );
  });

  it("requires the certified SHA to be a released commit on main", () => {
    const { workflow } = readWorkflow(CERT_WORKFLOW);
    const commands = commandLines(
      stepNamed(jobOf(workflow, "certify"), "Assert the SHA is a released commit").run,
    ).join("\n");

    expect(commands).toContain('git merge-base --is-ancestor "$EXPECTED_SHA" origin/main');
  });

  it("normalizes the requested SHA before anything compares it", () => {
    const { workflow } = readWorkflow(CERT_WORKFLOW);
    const step = stepNamed(jobOf(workflow, "certify"), "Validate the request");

    expect(step.name).toBe("Validate the request");
    expect(commandLines(step.run).join("\n")).toContain("tr '[:upper:]' '[:lower:]'");
    expect(step.env?.EXPECTED_SHA).toContain("inputs.expected_sha");
  });
});

describe("ai-smoke repeated-failure alerting", () => {
  it("only alerts for scheduled runs whose predecessor also failed", () => {
    const { workflow } = readWorkflow(ALERT_WORKFLOW);
    const job = jobOf(workflow, "alert-on-repeat-failure");

    expect(job.if).toContain("failure()");
    expect(job.if).toContain("github.event_name == 'schedule'");
  });

  // Review finding: the check reads completed runs, and completed includes both
  // cancelled and skipped — so neither may be silently treated as a failure, and
  // neither may be silently ignored either.
  it("treats cancelled and skipped predecessors explicitly instead of as failures", () => {
    const { workflow } = readWorkflow(ALERT_WORKFLOW);
    const commands = commandLines(
      stepNamed(jobOf(workflow, "alert-on-repeat-failure"), "Open or update").run,
    ).join("\n");

    expect(commands).toContain("--status=completed");
    expect(commands).toContain('"$first" = "cancelled"');
    expect(commands).toContain('"$first" = "skipped"');
    // The cancelled/skipped branch must come before the failure gate, or those
    // conclusions would fall through to the generic "not a repeated failure" path.
    expect(commands.indexOf('"$first" = "cancelled"')).toBeLessThan(
      commands.indexOf('"$first" != "failure"'),
    );
  });
});
