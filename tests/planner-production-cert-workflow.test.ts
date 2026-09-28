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

/** Only the executable lines, so a comment that mentions a pattern cannot satisfy a check. */
function commandLines(run: string | undefined): string[] {
  return (run ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
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
