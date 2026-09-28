import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

vi.mock("../e2e/support/context", () => ({
  gotoPageWithRetry: vi.fn(async () => undefined),
}));

import { SIGN_IN_TIMEOUT_MS, signInWithCredentials } from "../e2e/support/login";
import {
  establishAndProveVercelBypass,
  scopedBypassRoute,
} from "../e2e/support/vercel-bypass";
import agentPlaywrightConfig from "../playwright.agents.config";
import playwrightConfig, { isAllowedE2EBaseUrl, previewBypassHeaders } from "../playwright.config";
import { E2E_WEBSERVER_MARKER, plannerSeedRoutesEnabled } from "../src/lib/planner/seed-routes";


type WorkflowStep = {
  name?: string;
  run?: string;
  uses?: string;
  env?: Record<string, unknown>;
};

type WorkflowJob = {
  steps?: WorkflowStep[];
};

function workflowJob(source: string, jobName: string): WorkflowJob {
  let workflow: { jobs?: Record<string, WorkflowJob> };
  try {
    workflow = (parse(source) ?? {}) as { jobs?: Record<string, WorkflowJob> };
  } catch (error) {
    throw new Error(`Failed to parse workflow YAML: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  const job = workflow.jobs?.[jobName];
  if (!job) throw new Error(`Workflow job "${jobName}" is missing`);
  return job;
}

function never<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

function timeoutError() {
  const error = new Error("page.waitForURL: Timeout 30000ms exceeded.");
  error.name = "TimeoutError";
  return error;
}
describe("Playwright E2E harness hardening", () => {
  it("allows current amoco iPix Vercel previews and rejects unsafe hosts", () => {
    expect(isAllowedE2EBaseUrl("https://ipixai-5y1wsa98w-amoco.vercel.app")).toBe(true);
    expect(isAllowedE2EBaseUrl("https://ipixai-amoco.vercel.app")).toBe(true);
    expect(isAllowedE2EBaseUrl("http://localhost:3015")).toBe(true);
    expect(isAllowedE2EBaseUrl("https://ipixai-5y1wsa98w-amo1000.vercel.app")).toBe(false);
    expect(isAllowedE2EBaseUrl("https://evil-amoco.vercel.app")).toBe(false);
    expect(isAllowedE2EBaseUrl("https://ipix.co")).toBe(false);
    expect(isAllowedE2EBaseUrl("http://ipixai-5y1wsa98w-amoco.vercel.app")).toBe(false);
  });

  // IPI-1344 · E2E-PREVIEW-BYPASS-001: certifying a Preview against Vercel
  // Deployment Protection used to depend on single-use share links, which
  // silently stopped granting access and made journeys fail on an SSO screen.
  it("requires and sends the Vercel bypass secret for Preview runs, and never locally", () => {
    expect(previewBypassHeaders("http://localhost:3015", undefined)).toBeUndefined();
    expect(previewBypassHeaders("http://127.0.0.1:3015", "ignored-secret")).toBeUndefined();

    expect(() => previewBypassHeaders("https://ipixai-abc123-amoco.vercel.app", undefined)).toThrow(
      "VERCEL_AUTOMATION_BYPASS_SECRET is required for Vercel Preview E2E",
    );
    expect(() => previewBypassHeaders("https://ipixai-abc123-amoco.vercel.app", "")).toThrow(
      /VERCEL_AUTOMATION_BYPASS_SECRET is required/,
    );
    // A whitespace-only secret is truthy, so it must still fail closed here
    // rather than be sent and fail later at Vercel's SSO boundary.
    expect(() => previewBypassHeaders("https://ipixai-abc123-amoco.vercel.app", "   ")).toThrow(
      /VERCEL_AUTOMATION_BYPASS_SECRET is required/,
    );

    expect(previewBypassHeaders("https://ipixai-abc123-amoco.vercel.app", "the-secret")).toEqual({
      "x-vercel-protection-bypass": "the-secret",
      "x-vercel-set-bypass-cookie": "true",
    });
    // A padded secret is trimmed before it is sent.
    expect(previewBypassHeaders("https://ipixai-abc123-amoco.vercel.app", "  padded\n")).toEqual({
      "x-vercel-protection-bypass": "padded",
      "x-vercel-set-bypass-cookie": "true",
    });
  });

  it("keeps Preview config collection credential-independent while auth setup fails closed", () => {
    const config = readFileSync(path.resolve(process.cwd(), "playwright.config.ts"), "utf8");
    const authSetup = readFileSync(path.resolve(process.cwd(), "e2e/auth.setup.ts"), "utf8");

    expect(config).not.toContain(
      "previewBypassHeaders(baseURL, process.env.VERCEL_AUTOMATION_BYPASS_SECRET);",
    );
    expect(authSetup).toContain("previewBypassHeaders(");
    expect(authSetup).toContain("process.env.VERCEL_AUTOMATION_BYPASS_SECRET");
  });

  it("never sets a context-wide extraHTTPHeaders for the bypass", () => {
    const config = readFileSync(path.resolve(process.cwd(), "playwright.config.ts"), "utf8");
    // Playwright's extraHTTPHeaders is global to the browser context: the bypass
    // secret would be attached to cross-origin calls to Supabase and Cloudinary,
    // leaking it and forcing a CORS preflight those services need not allow.
    // Measured against the installed Playwright, cross-origin fetch/img/script
    // requests all received the header. The bypass is scoped to the deployment
    // origin in e2e/support/vercel-bypass.ts instead.
    expect(config).not.toContain("extraHTTPHeaders:");

    const authSetup = readFileSync(path.resolve(process.cwd(), "e2e/auth.setup.ts"), "utf8");
    expect(authSetup).toContain("previewBypassHeaders(");
    expect(authSetup).toContain("setup.beforeEach(");
    expect(authSetup).toContain("establishAndProveVercelBypass(");
    // `isLocalE2ETarget("")` is false, so a missing baseURL would otherwise
    // reach `new URL("")` and die as a bare "TypeError: Invalid URL".
    expect(authSetup).toContain("E2E baseURL is required to clear Vercel Deployment Protection");

    const bypass = readFileSync(
      path.resolve(process.cwd(), "e2e/support/vercel-bypass.ts"),
      "utf8",
    );
    // The header is added only on the deployment origin...
    expect(bypass).toContain("context.route(");
    expect(bypass).toContain("originOf(request.url()) !== deploymentOrigin");
    // ...the route is removed before the replay...
    expect(bypass).toContain("context.unroute(");
    // ...and Vercel's internal cookie name is deliberately NOT what proves it.
    expect(bypass).not.toContain("_vercel_jwt");
    expect(authSetup).not.toContain("_vercel_jwt");
  });

  it("keeps the exact-SHA Preview workflow's journey run wired to the deployed artifact", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), ".github/workflows/vercel-preview.yml"),
      "utf8",
    );
    const workflow = (parse(source) ?? {}) as { env?: Record<string, string> };
    const job = workflowJob(source, "deploy");
    const journey = (job.steps ?? []).find((step) =>
      step.run?.includes("npx playwright test"),
    );
    expect(journey, "the exact-SHA Preview workflow must run the Planner journeys").toBeDefined();
    // The deployed artifact must be the target, and Deployment Protection must be
    // cleared by the existing secret rather than an unprotected preview.
    expect(journey?.env?.E2E_BASE_URL).toContain("steps.deploy.outputs.url");
    expect(journey?.env?.VERCEL_AUTOMATION_BYPASS_SECRET).toContain(
      "secrets.VERCEL_AUTOMATION_BYPASS_SECRET",
    );

    // IPI-1332 · CERT-INTEGRITY-001 — the certified spec list is declared once
    // at workflow level and the run step consumes it, so assert the EFFECTIVE
    // list rather than one step's literal text: a check on the literal text can
    // pass while the workflow actually runs something else. Assert the COMPLETE
    // list, not a subset — a subset still passes if the list loses the very spec
    // whose omission caused the false-green this guard exists to prevent.
    const certified = String(workflow.env?.CERT_SPECS ?? "");
    expect(
      certified
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      "CERT_SPECS must declare exactly the certified Planner journeys",
    ).toEqual([
      "e2e/planner-stop-journey.spec.ts",
      "e2e/planner-journey.spec.ts",
      "e2e/planner-thread-isolation.spec.ts",
      "e2e/planner-workflows.spec.ts",
    ]);
    // The run step must consume the declared list rather than keep its own copy.
    expect(journey?.run).toContain("$CERT_SPECS");

    // It must not silently widen to the writing brand-intelligence journey.
    // Assert on the spec path, not the bare name, so the workflow's own
    // explanatory comment cannot satisfy or break this check.
    expect(certified).not.toContain("brand-intelligence-journey.spec.ts");
    expect(journey?.run).not.toContain("brand-intelligence-journey.spec.ts");
  });

  // IPI-1332 · CERT-INTEGRITY-001 regression — the run step expands
  // `CERT_SPECS` into a bash array. `read -r -a` reads only the FIRST line, so a
  // multi-line declaration silently shrank to a single spec — narrowing the
  // certified set in exactly the way this workflow exists to prevent. Execute
  // the workflow's own expansion line against its own declared list, so a
  // regression to a first-line-only reader fails here.
  it("expands every declared certified spec when the Preview workflow runs", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), ".github/workflows/vercel-preview.yml"),
      "utf8",
    );
    const workflow = (parse(source) ?? {}) as { env?: Record<string, string> };
    const rawDeclaration = String(workflow.env?.CERT_SPECS ?? "");
    const declared = rawDeclaration
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    expect(declared.length, "a multi-line declaration is the case this guards").toBeGreaterThan(1);

    const job = workflowJob(source, "deploy");
    const journey = (job.steps ?? []).find((step) =>
      step.run?.includes("npx playwright test"),
    );
    const runLines = (journey?.run ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));

    const patternLine = runLines.find((line) => line.startsWith("spec_path_pattern="));
    const expander = runLines.find(
      (line) => /^(mapfile|read)\b/.test(line) && line.includes("specs"),
    );
    const declarer = runLines.find((line) => line.startsWith("declared="));
    expect(patternLine, "the journey step must define the spec path pattern").toBeDefined();
    expect(expander, "the journey step must expand CERT_SPECS into an array").toBeDefined();
    expect(declarer, "the journey step must derive the declared line count").toBeDefined();

    // GitHub supplies a YAML block scalar's value WITH its trailing newline, and
    // the here-string adds another. Simulating the value without that newline is
    // how an earlier version of this test passed while the workflow appended an
    // empty array element and failed its own count check on every run.
    const expansion = spawnSync(
      "bash",
      [
        "-c",
        [
          patternLine,
          expander,
          declarer,
          `printf '%s\\n' "\${specs[@]}"`,
          `echo "declared=\${declared}"`,
        ].join("\n"),
      ],
      {
        encoding: "utf8",
        env: { ...process.env, CERT_SPECS: `${rawDeclaration}` },
      },
    );
    expect(expansion.status, expansion.stderr).toBe(0);

    const [specOutput, ...declaredLines] = expansion.stdout.split("declared=");
    // Drop only printf's own trailing newline, so an accidental empty array
    // element stays visible instead of being filtered away.
    const passed = specOutput.split("\n").slice(0, -1);
    expect(passed, "the run step must pass every declared spec to Playwright").toEqual(declared);
    expect(passed, "no array element may be empty").not.toContain("");
    expect(
      String(declaredLines.join("")).trim(),
      "the count check compares the array length against the declared line count",
    ).toBe(String(declared.length));
  });

  // IPI-1332 · CERT-INTEGRITY-001 regression — the spec path pattern drives BOTH
  // the candidate/running comparison AND the Playwright invocation, so a path it
  // cannot match is dropped from both sides: the guard passes while that spec
  // never runs. `e2e/agents/seed.spec.ts` (a real file) is exactly such a path,
  // because a narrower class excludes the sub-directory slash.
  it("extracts every real e2e spec path, including sub-directories", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), ".github/workflows/vercel-preview.yml"),
      "utf8",
    );
    const job = workflowJob(source, "deploy");
    const assertion = (job.steps ?? []).find((step) =>
      step.name?.startsWith("Assert the running workflow"),
    );
    const run = assertion?.run ?? "";

    const declaredPattern = run
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("spec_path_pattern="))
      ?.replace(/^spec_path_pattern=/, "")
      .replace(/^['"]|['"]$/g, "");
    expect(declaredPattern, "the assertion step must define the spec path pattern").toBeDefined();

    // Every spec file actually present must be matched by that pattern.
    const specFiles = readdirSync(path.resolve(process.cwd(), "e2e"), {
      recursive: true,
      encoding: "utf8",
    })
      .map((entry) => `e2e/${entry}`)
      .filter((entry) => entry.endsWith(".spec.ts"));
    expect(specFiles.length).toBeGreaterThan(0);

    // Exercise the workflow's real extraction (`grep -oE`) instead of
    // reimplementing the match in JS. That is both a stronger test — it proves the
    // shipped mechanism, not a JS lookalike — and it avoids a non-literal
    // `new RegExp`, which is a legitimate security-linter finding. The pattern is
    // passed through the environment, never interpolated into the command.
    const extraction = spawnSync(
      "bash",
      ["-c", 'grep -oE "$SPEC_PATH_PATTERN" <<< "$SPEC_LIST" | sort -u'],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          SPEC_PATH_PATTERN: declaredPattern,
          SPEC_LIST: specFiles.join("\n"),
        },
      },
    );
    expect(extraction.status, extraction.stderr).toBe(0);
    const extracted = extraction.stdout.split("\n").filter(Boolean);
    expect(
      extracted,
      "the spec path pattern must extract every real spec path, including sub-directories and mixed case",
    ).toEqual([...specFiles].sort());

    // The same pattern must appear in the run step, or the two could drift.
    const journey = (job.steps ?? []).find((step) =>
      step.run?.includes("npx playwright test"),
    );
    expect(journey?.run).toContain("spec_path_pattern");
  });

  it("tells the operator a dispatch ref may be a branch or a tag", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), ".github/workflows/vercel-preview.yml"),
      "utf8",
    );
    const job = workflowJob(source, "deploy");
    const assertion = (job.steps ?? []).find((step) =>
      step.name?.startsWith("Assert the running workflow"),
    );

    expect(assertion?.run).toContain("branch or tag");
    expect(assertion?.run, "a workflow_dispatch ref is not always a branch").not.toMatch(
      /--ref (?:set to )?the branch\b/,
    );
  });

  // IPI-1332 · CERT-INTEGRITY-001 regression — a workflow_dispatch runs the
  // workflow file from the dispatch REF, not from the candidate SHA, so
  // certifying a PR-branch SHA while dispatching `--ref main` silently ran
  // main's spec list. On 2026-09-27 that recorded `planner-workflows.spec.ts`
  // as Preview-verified without it ever executing. This locks the guard in.
  it("proves the exact-SHA Preview cert runs the candidate SHA's workflow, not the dispatch ref's", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), ".github/workflows/vercel-preview.yml"),
      "utf8",
    );
    const job = workflowJob(source, "deploy");
    const guard = (job.steps ?? []).find((step) =>
      step.name?.includes("Assert the running workflow matches the candidate SHA"),
    );
    expect(
      guard,
      "the Preview cert must assert it is running the candidate SHA's workflow",
    ).toBeDefined();
    // It must compare the candidate SHA's declared list against the RUNNING
    // file's, which comes from the dispatch ref.
    expect(guard?.env?.CANDIDATE_SHA).toContain("inputs.sha");
    expect(guard?.env?.RUNNING_REF_SHA).toContain("github.sha");
    expect(guard?.run).toContain("CANDIDATE_SHA");
    expect(guard?.run).toContain("RUNNING_REF_SHA");
    // …and fail closed rather than warn and continue with the wrong list.
    expect(guard?.run).toContain("exit 1");
  });

  it("reports a clear Supabase Auth timeout instead of a raw Playwright TimeoutError", async () => {
    const passwordFill = vi.fn(async () => undefined);
    const genericLocator = { fill: vi.fn(async () => undefined) };
    const signIn = {
      waitFor: vi.fn(async () => undefined),
      click: vi.fn(async () => undefined),
    };
    const page = {
      url: () => "http://localhost:3015/login",
      getByRole: vi.fn((role: string) => (role === "button" ? signIn : genericLocator)),
      getByLabel: vi.fn(() => ({ fill: passwordFill })),
      waitForURL: vi.fn(() => Promise.reject(timeoutError())),
      waitForEvent: vi.fn(() => never()),
      waitForResponse: vi.fn(() => never()),
    };

    await expect(signInWithCredentials(page as never, "qa@example.com", "secret-password")).rejects.toThrow(
      `Sign-in timed out after ${SIGN_IN_TIMEOUT_MS}ms waiting for Supabase Auth`,
    );
    expect(passwordFill).toHaveBeenLastCalledWith("");
  });

  it("deletes stale secondary-role storageState before optional credential checks can skip", () => {
    const source = readFileSync(path.resolve(process.cwd(), "e2e/auth.setup.ts"), "utf8");
    expect(source).toContain('await rm(orgBFile, { force: true });');
    expect(source).toContain('await rm(shootsFile, { force: true });');
  });

  it("keeps UI, headed, and debug commands on deterministic browser projects", () => {
    const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"));
    for (const script of ["e2e:ui", "e2e:headed", "e2e:debug"]) {
      expect(pkg.scripts[script]).toContain("--project=chromium");
      expect(pkg.scripts[script]).toContain("--project=mobile-chromium");
      expect(pkg.scripts[script]).not.toContain("chromium-ai-smoke");
    }
  });

  it("pins the repo-local Playwright CLI to the skill-supported 0.1.21 release", () => {
    const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"));
    expect(pkg.devDependencies["@playwright/cli"]).toBe("0.1.21");
  });

  it("provides a Chromium-only CLI attach debug command", () => {
    const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"));
    const script = pkg.scripts["e2e:debug:cli"] as string | undefined;
    expect(script).toContain("PLAYWRIGHT_HTML_OPEN=never");
    expect(script).toContain("PLAYWRIGHT_BROWSERS_PATH=0");
    expect(script).toContain("--project=chromium");
    expect(script).toContain("--debug=cli");
    expect(script).not.toContain("--project=mobile-chromium");
    expect(script).not.toContain("chromium-ai-smoke");

    const attachScript = pkg.scripts["e2e:debug:cli:attach"] as string | undefined;
    expect(attachScript).toBe("playwright-cli attach");
  });

  it("runs the required e2e job against a production build with the seed-route opt-in wired end to end", () => {
    const read = (file: string) => readFileSync(path.resolve(process.cwd(), file), "utf8");
    const ci = read(".github/workflows/ci.yml");
    const job = workflowJob(ci, "playwright-e2e");
    const steps = job.steps ?? [];
    // The job builds first, then runs the suite with the production-server switch and the opt-in.
    const build = steps.findIndex((step) => step.run?.trim() === "npm run build");
    const e2e = steps.findIndex((step) => step.run?.trim() === "npm run e2e");
    expect(build).toBeGreaterThan(-1);
    expect(e2e).toBeGreaterThan(build);
    const e2eStep = steps[e2e];
    expect(e2eStep?.env?.E2E_SERVER).toBe("production");
    expect(String(e2eStep?.env?.IPIX_E2E_SEED_ROUTES)).toBe("1");

    // The production server script exists and serves the same port as the dev server.
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["start:e2e"]).toContain("next start -p 3015");
    expect(pkg.scripts["dev:e2e"]).toContain("-p 3015");

    // Playwright starts that script and sets the exact marker the seed route checks.
    const config = read("playwright.config.ts");
    expect(config).toContain('process.env.E2E_SERVER === "production" ? "npm run start:e2e" : "npm run dev:e2e"');
    expect(config).toContain(`env: { ${E2E_WEBSERVER_MARKER.key}: "${E2E_WEBSERVER_MARKER.value}" }`);
    expect(
      plannerSeedRoutesEnabled({
        NODE_ENV: "production",
        IPIX_E2E_SEED_ROUTES: "1",
        [E2E_WEBSERVER_MARKER.key]: E2E_WEBSERVER_MARKER.value,
      }),
    ).toBe(true);
  });

  it("reads the playwright e2e job by YAML structure, regardless of job order or scalar quoting", () => {
    const ci = `jobs:
  playwright-approval-tenant:
    steps:
      - run: echo approval
  playwright-e2e:
    steps:
      - run: |
          npm run build
      - run: |
          npm run e2e
        env:
          E2E_SERVER: production
          IPIX_E2E_SEED_ROUTES: 1
`;
    const job = workflowJob(ci, "playwright-e2e");
    const e2eStep = job.steps?.find((step) => step.run?.trim() === "npm run e2e");

    expect(e2eStep?.env?.E2E_SERVER).toBe("production");
    expect(String(e2eStep?.env?.IPIX_E2E_SEED_ROUTES)).toBe("1");
  });

  it("reports a descriptive missing-job error for an empty workflow", () => {
    expect(() => workflowJob("", "playwright-e2e")).toThrow(
      'Workflow job "playwright-e2e" is missing',
    );
  });

  it("reports workflow context when YAML parsing fails", () => {
    expect(() => workflowJob("jobs:\n  playwright-e2e: [", "playwright-e2e")).toThrow(
      "Failed to parse workflow YAML",
    );
  });

  it("gives Playwright time to flush reports before the CI hard timeout", () => {
    const source = readFileSync(path.resolve(process.cwd(), "playwright.config.ts"), "utf8");
    expect(source).toContain("globalTimeout: process.env.CI ? 12 * 60_000 : undefined");
  });

  it("does not use networkidle to decide whether Recent Work previews are ready", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "e2e/dash-main-002-populated-command-center.spec.ts"),
      "utf8",
    );
    expect(source).not.toContain('waitForLoadState("networkidle")');
    expect(source).toContain("preview request or placeholder must settle");
  });

  it("keeps production-only smoke tests out of the deterministic chromium project", () => {
    const source = readFileSync(path.resolve(process.cwd(), "playwright.config.ts"), "utf8");
    const start = source.indexOf('name: "chromium"');
    const end = source.indexOf('name: "chromium-ai-smoke"', start);
    const chromiumProject = source.slice(start, end);
    expect(chromiumProject).toContain('/production-smoke\\.spec\\.ts/');
  });

  it("keeps live AI monitoring in its own non-release workflow", () => {
    const ci = readFileSync(path.resolve(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    const aiSmoke = readFileSync(path.resolve(process.cwd(), ".github/workflows/ai-smoke.yml"), "utf8");
    expect(ci).not.toContain("  playwright-ai-smoke:");
    expect(aiSmoke).toContain("workflow_dispatch:");
    expect(aiSmoke).toContain("schedule:");
    expect(aiSmoke).toContain("timeout-minutes: 15");
    expect(aiSmoke).toContain("npm run e2e:ai-smoke");
  });

  it("does not upload authenticated Playwright reports from public CI", () => {
    const ci = readFileSync(path.resolve(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    const aiSmoke = readFileSync(path.resolve(process.cwd(), ".github/workflows/ai-smoke.yml"), "utf8");
    expect(ci).not.toContain("name: playwright-report");
    expect(aiSmoke).not.toContain("name: playwright-ai-smoke-report");
  });

  it("keeps Testomat reporting but does not publish authenticated Playwright artifacts", () => {
    const source = readFileSync(path.resolve(process.cwd(), ".github/workflows/testomatio.yml"), "utf8");
    const job = workflowJob(source, "playwright");
    const steps = job.steps ?? [];

    const reportStep = steps.find((step) => step.run?.includes("@testomatio/reporter@"));
    expect(reportStep).toBeDefined();
    expect(String(reportStep?.env?.TESTOMATIO_DISABLE_ARTIFACTS)).toBe("1");
    expect(steps.some((step) => step.uses?.startsWith("actions/upload-artifact@"))).toBe(false);
  });

  it("generates exactly the three official Playwright Test Agent definitions", () => {
    const agentDir = path.resolve(process.cwd(), ".claude/agents");
    expect(existsSync(agentDir)).toBe(true);

    const agentFiles = readdirSync(agentDir)
      .filter((file) => file.startsWith("playwright-test-") && file.endsWith(".md"))
      .sort();
    expect(agentFiles).toEqual([
      "playwright-test-generator.md",
      "playwright-test-healer.md",
      "playwright-test-planner.md",
    ]);

    for (const [file, name] of [
      ["playwright-test-planner.md", "playwright-test-planner"],
      ["playwright-test-generator.md", "playwright-test-generator"],
      ["playwright-test-healer.md", "playwright-test-healer"],
    ] as const) {
      const source = readFileSync(path.join(agentDir, file), "utf8");
      expect(source).toContain(`name: ${name}`);
    }
  });

  it("wires the Playwright Test Agents through the repo Playwright MCP server", () => {
    const mcpPath = path.resolve(process.cwd(), ".mcp.json");
    expect(existsSync(mcpPath)).toBe(true);
    expect(JSON.parse(readFileSync(mcpPath, "utf8"))).toEqual({
      mcpServers: {
        "playwright-test": {
          command: "npx",
          args: ["playwright", "run-test-mcp-server", "--config=playwright.agents.config.ts"],
        },
      },
    });
  });

  it("requires human approval before the healer can skip or fixme a failing test", () => {
    const healerPath = path.resolve(process.cwd(), ".claude/agents/playwright-test-healer.md");
    expect(existsSync(healerPath)).toBe(true);
    const healer = readFileSync(healerPath, "utf8");

    expect(healer).toContain("## iPix human-approval guardrails");
    expect(healer).toContain("Never add `test.skip()`, `test.fixme()`, or an equivalent skip without explicit human approval");
    expect(healer).not.toContain("mark this test as test.fixme()");
  });

  it("keeps Playwright Test Agents from autonomously modifying product code", () => {
    for (const file of [
      "playwright-test-planner.md",
      "playwright-test-generator.md",
      "playwright-test-healer.md",
    ]) {
      const filePath = path.resolve(process.cwd(), ".claude/agents", file);
      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, "utf8")).toContain("Never modify application/product code");
    }
  });

  it("defaults Playwright agent execution to deterministic Chromium only", () => {
    const agentProject = agentPlaywrightConfig.projects?.find((project) => project.name === "playwright-agent");
    expect(agentProject).toBeDefined();
    expect(agentProject?.testDir).toBe("./e2e/agents");
    expect(agentProject?.dependencies).toEqual(["setup"]);
    expect(agentProject?.use).toEqual(expect.objectContaining({ storageState: "playwright/.auth/user.json" }));

    expect(agentPlaywrightConfig.projects?.map((project) => project.name)).toEqual([
      "setup",
      "chromium",
      "playwright-agent",
    ]);
    const config = readFileSync(path.resolve(process.cwd(), "playwright.agents.config.ts"), "utf8");
    expect(config).toContain('devices["Desktop Chrome"]');
    expect(config).not.toContain('name: "chromium-ai-smoke"');

    const healerPath = path.resolve(process.cwd(), ".claude/agents/playwright-test-healer.md");
    expect(existsSync(healerPath)).toBe(true);
    const healer = readFileSync(healerPath, "utf8");
    expect(healer).toContain('e2e/agents/');
    // Nested generated tests must stay on the dedicated agent project too:
    // e2e/agents/checkout/nested.spec.ts is still "under e2e/agents/".
    expect(healer).toContain('any requested test location under `e2e/agents/`');
    expect(healer).toContain('projects: ["playwright-agent"]');
    expect(healer).toContain('projects: ["chromium"]');
    expect(healer).toContain("Never run `chromium-ai-smoke`");
  });

  it("keeps Preview bypass origin-scoped for the agent config through its setup dependency", () => {
    const agentProject = agentPlaywrightConfig.projects?.find(
      (project) => project.name === "playwright-agent",
    );
    const setupProject = agentPlaywrightConfig.projects?.find(
      (project) => project.name === "setup",
    );

    expect(agentPlaywrightConfig.use?.extraHTTPHeaders).toBeUndefined();
    expect(agentProject?.use?.extraHTTPHeaders).toBeUndefined();
    expect(agentProject?.dependencies).toEqual(["setup"]);
    expect(setupProject).toBeDefined();

    const authSetup = readFileSync(
      path.resolve(process.cwd(), "e2e/auth.setup.ts"),
      "utf8",
    );
    expect(authSetup).toContain("previewBypassHeaders(");
    expect(authSetup).toContain("establishAndProveVercelBypass({");
    expect(authSetup).toContain("deploymentOrigin: new URL(baseURL).origin");
  });

  it("keeps the Playwright agent project out of the default Playwright config", () => {
    expect(playwrightConfig.projects?.some((project) => project.name === "playwright-agent")).toBe(false);

    const agentConfigPath = path.resolve(process.cwd(), "playwright.agents.config.ts");
    expect(existsSync(agentConfigPath)).toBe(true);
    const agentConfigSource = readFileSync(agentConfigPath, "utf8");
    expect(agentConfigSource).toContain('name: "playwright-agent"');
    expect(agentConfigSource).toContain('requiredProject("chromium")');

    const mcp = JSON.parse(readFileSync(path.resolve(process.cwd(), ".mcp.json"), "utf8"));
    expect(mcp.mcpServers["playwright-test"].args).toContain("--config=playwright.agents.config.ts");
  });

  it("describes the real authenticated seed state instead of assuming blank data", () => {
    const planner = readFileSync(
      path.resolve(process.cwd(), ".claude/agents/playwright-test-planner.md"),
      "utf8",
    );
    expect(planner).not.toContain("always assume blank/fresh state");
    expect(planner).toContain("existing authenticated account/data");
    expect(planner).toContain("human-approved setup");
  });

  it("keeps generated Playwright tests inside the agent-only directory", () => {
    const generator = readFileSync(
      path.resolve(process.cwd(), ".claude/agents/playwright-test-generator.md"),
      "utf8",
    );
    expect(generator).toContain("Write generated Playwright tests only under `e2e/agents/**`");
    expect(generator).not.toContain("Write generated Playwright tests only under `e2e/**`");
  });

  it("fails before generation on unsupported Windows hosts", () => {
    const initializer = readFileSync(
      path.resolve(process.cwd(), "scripts/init-playwright-test-agents.mjs"),
      "utf8",
    );
    expect(initializer).toContain('process.platform === "win32"');
    expect(initializer).toContain("unsupported on Windows");
  });

  it("regenerates Playwright Test Agents deterministically with the installed CLI", () => {
    const managed = [
      ".claude/agents/playwright-test-planner.md",
      ".claude/agents/playwright-test-generator.md",
      ".claude/agents/playwright-test-healer.md",
      ".mcp.json",
      "e2e/agents/seed.spec.ts",
      "specs/README.md",
    ];
    const before = new Map(
      managed.map((file) => [
        file,
        readFileSync(path.resolve(process.cwd(), file)),
      ]),
    );

    try {
      const result = spawnSync(
        process.execPath,
        ["scripts/init-playwright-test-agents.mjs"],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: { ...process.env, CI: "1" },
        },
      );

      expect(
        result.status,
        `initializer failed:\n${result.stderr || result.stdout}`,
      ).toBe(0);
      for (const file of managed) {
        expect(readFileSync(path.resolve(process.cwd(), file))).toEqual(
          before.get(file),
        );
      }
    } finally {
      for (const file of managed) {
        writeFileSync(path.resolve(process.cwd(), file), before.get(file)!);
      }
    }
  }, 30_000);

  it("fails closed when generated Playwright agent output drifts", () => {
    const initializer = readFileSync(
      path.resolve(process.cwd(), "scripts/init-playwright-test-agents.mjs"),
      "utf8",
    );
    expect(initializer).toContain("snapshotManagedFiles");
    expect(initializer).toContain("restoreManagedFiles");
    expect(initializer).toContain("deepStrictEqual");
    expect(initializer).toContain("mkdir");
  });

  it("keeps the generated Playwright agent seed out of normal release E2E", () => {
    const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"));
    expect(pkg.scripts.e2e).not.toContain("playwright-agent");
    expect(pkg.scripts["e2e:agents:seed"]).toContain("--config=playwright.agents.config.ts");
    expect(pkg.scripts["e2e:agents:seed"]).toContain("--project=playwright-agent");
    expect(pkg.scripts["e2e:ai-smoke"]).not.toContain("playwright-agent");
    expect(pkg.scripts["e2e:approval"]).not.toContain("playwright-agent");

    for (const name of ["chromium", "mobile-chromium"]) {
      const project = playwrightConfig.projects?.find((candidate) => candidate.name === name);
      const ignores = Array.isArray(project?.testIgnore) ? project.testIgnore : [project?.testIgnore].filter(Boolean);
      expect(
        ignores.some((pattern) => pattern instanceof RegExp && pattern.test("/repo/e2e/agents/seed.spec.ts")),
      ).toBe(true);
      expect(
        ignores.some((pattern) => pattern instanceof RegExp && pattern.test("/repo/e2e/agents/helper.ts")),
      ).toBe(true);
      expect(
        ignores.some((pattern) => pattern instanceof RegExp && pattern.test("/repo/e2e/dashboard.spec.ts")),
      ).toBe(false);
    }

    const seedPath = path.resolve(process.cwd(), "e2e/agents/seed.spec.ts");
    expect(existsSync(seedPath)).toBe(true);
    const seed = readFileSync(seedPath, "utf8");
    expect(seed).toContain('await page.goto("/app")');
    expect(seed).toContain("toHaveURL");
  });

  it("keeps live-AI planner smoke health-only instead of requiring composeShootPlan tool selection", () => {
    const source = readFileSync(path.resolve(process.cwd(), "e2e/planner-journey.spec.ts"), "utf8");
    expect(source).not.toContain('test("real agent reaches composeShootPlan');
    expect(source).not.toContain('getByTestId("compose-shoot-plan-card")');
  });

  it("waits for the Planner turn to settle before reloading the thread", () => {
    const source = readFileSync(path.resolve(process.cwd(), "e2e/planner-journey.spec.ts"), "utf8");
    // IPI-1344: reloading while the first run is still streaming restores a
    // conversation whose run never reached a terminal event. CopilotKit then
    // keeps the composer in Stop mode, the post-reload follow-up click sends a
    // Stop instead of a run, and the test waits out its whole budget for a
    // /run that was never sent. Observed once on the first, cold request to a
    // freshly deployed Preview — see planner-stop-journey.spec.ts for the
    // documented form of the same hazard.
    expect(source).toContain("the plan turn must reach send-ready before the reload");
    expect(source).toContain("the restored thread must be send-ready before the follow-up");
    expect(source).toContain('locator("svg.lucide-square")');
  });

});

// IPI-1344 · E2E-PREVIEW-BYPASS-001 — the bypass is only useful if the cookie
// Vercel stores keeps working once the header is gone, because every project
// after `setup` carries storageState and never re-sends the header. Asserting a
// named cookie existed was the previous weakness: it passed even when Vercel
// rejected the cookie on the next request. These prove the replay instead.
const PREVIEW_ORIGIN = "https://ipixai-abc123-amoco.vercel.app";
const BYPASS_HEADERS = {
  "x-vercel-protection-bypass": "the-secret",
  "x-vercel-set-bypass-cookie": "true",
};
const IPIX_TITLE = "iPix — AI-Powered Content Studio for Fashion Brands";

function cookieJar(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    name: `cookie-${index}`,
    value: "irrelevant",
    domain: "ipixai-abc123-amoco.vercel.app",
    path: "/",
    expires: -1,
    httpOnly: true,
    secure: true,
    sameSite: "Lax" as const,
  }));
}

function fakeRoute(url: string, headers: Record<string, string> = {}) {
  const continueFn = vi.fn(async () => undefined);
  return {
    route: {
      request: () => ({ url: () => url, headers: () => headers }),
      continue: continueFn,
    },
    continueFn,
  };
}

function bypassHarness(options: {
  cookiesBefore?: number;
  cookiesAfter?: number;
  replayUrl?: string;
  replayTitle?: string;
}) {
  const calls: string[] = [];
  const context = {
    route: vi.fn(async () => {
      calls.push("route");
    }),
    unroute: vi.fn(async () => {
      calls.push("unroute");
    }),
    cookies: vi
      .fn()
      .mockResolvedValueOnce(cookieJar(options.cookiesBefore ?? 0))
      .mockResolvedValueOnce(cookieJar(options.cookiesAfter ?? 1)),
  };
  const page = {
    goto: vi.fn(async () => {
      calls.push("goto");
      return null;
    }),
    url: vi.fn(() => options.replayUrl ?? `${PREVIEW_ORIGIN}/`),
    title: vi.fn(async () => options.replayTitle ?? IPIX_TITLE),
  };
  const run = () =>
    establishAndProveVercelBypass({
      context: context as never,
      page: page as never,
      deploymentOrigin: PREVIEW_ORIGIN,
      headers: BYPASS_HEADERS,
    });
  // `calls` is appended live, so read it after awaiting `run()`.
  return { context, page, run, calls };
}

describe("Vercel Deployment Protection bypass proof", () => {
  it("sends the bypass secret only to the deployment origin", async () => {
    const handler = scopedBypassRoute(PREVIEW_ORIGIN, BYPASS_HEADERS);

    const sameOrigin = fakeRoute(`${PREVIEW_ORIGIN}/login`, { accept: "text/html" });
    await handler(sameOrigin.route as never);
    expect(sameOrigin.continueFn).toHaveBeenCalledWith({
      headers: { accept: "text/html", ...BYPASS_HEADERS },
    });

    // Supabase and Cloudinary calls must never carry the deployment secret.
    const crossOrigin = fakeRoute("https://project.supabase.co/auth/v1/token");
    await handler(crossOrigin.route as never);
    expect(crossOrigin.continueFn).toHaveBeenCalledWith();

    // An unparseable URL is treated as cross-origin rather than leaking.
    const opaque = fakeRoute("about:blank");
    await handler(opaque.route as never);
    expect(opaque.continueFn).toHaveBeenCalledWith();
  });

  it("removes the bypass route before replaying, and passes when the cookie still works", async () => {
    const harness = bypassHarness({ cookiesBefore: 0, cookiesAfter: 1 });
    await harness.run();

    // The replay must happen with the header already gone — that ordering is
    // the whole proof, so assert the sequence rather than just the call count.
    expect(harness.calls).toEqual(["route", "goto", "unroute", "goto"]);
    expect(harness.context.unroute).toHaveBeenCalledWith("**/*", expect.any(Function));
    expect(harness.context.cookies).toHaveBeenCalledWith(PREVIEW_ORIGIN);
  });

  it("fails closed when Vercel stores no bypass cookie", async () => {
    const harness = bypassHarness({ cookiesBefore: 0, cookiesAfter: 0 });
    await expect(harness.run()).rejects.toThrow("stored no bypass cookie");
    // No replay: a cookie-less second request would only prove the SSO screen.
    expect(harness.calls).toEqual(["route", "goto", "unroute"]);
  });

  it("fails when the stored cookie alone does not reach iPix", async () => {
    const harness = bypassHarness({
      cookiesBefore: 0,
      cookiesAfter: 1,
      replayUrl: `https://vercel.com/login?next=%2Fsso-api%3Furl%3D${encodeURIComponent(PREVIEW_ORIGIN)}`,
      replayTitle: "Login – Vercel",
    });
    await expect(harness.run()).rejects.toThrow("did not grant access");
  });

  it("fails when the deployment origin serves Vercel's interstitial instead of iPix", async () => {
    // Same origin, wrong document — the origin check alone is not enough.
    const harness = bypassHarness({
      cookiesBefore: 0,
      cookiesAfter: 1,
      replayUrl: `${PREVIEW_ORIGIN}/`,
      replayTitle: "Authentication Required – Vercel",
    });
    await expect(harness.run()).rejects.toThrow("did not grant access");
  });

  it("accepts any cookie Vercel chooses to store, not a hard-coded name", async () => {
    // Vercel is free to rename its internal cookie; the proof is behavioural.
    const harness = bypassHarness({ cookiesBefore: 0, cookiesAfter: 1 });
    await expect(harness.run()).resolves.toBeUndefined();
    const source = readFileSync(
      path.resolve(process.cwd(), "e2e/support/vercel-bypass.ts"),
      "utf8",
    );
    expect(source).not.toContain("_vercel_jwt");
  });
});
