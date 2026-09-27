import { deepStrictEqual } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const playwrightCli = path.join(root, "node_modules", "playwright", "cli.js");
const agentDir = path.join(root, ".claude", "agents");
const plannerPath = path.join(agentDir, "playwright-test-planner.md");
const generatorPath = path.join(agentDir, "playwright-test-generator.md");
const healerPath = path.join(agentDir, "playwright-test-healer.md");
const mcpPath = path.join(root, ".mcp.json");
const seedPath = path.join(root, "e2e", "agents", "seed.spec.ts");
const specsReadmePath = path.join(root, "specs", "README.md");
const managedPaths = [plannerPath, generatorPath, healerPath, mcpPath, seedPath, specsReadmePath];

if (process.platform === "win32") {
  throw new Error("Playwright Test Agent initialization is unsupported on Windows; use the repository's POSIX/Linux development environment.");
}

async function snapshotManagedFiles() {
  const snapshots = new Map();
  for (const file of managedPaths) {
    try {
      snapshots.set(file, { exists: true, content: await readFile(file) });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      snapshots.set(file, { exists: false, content: null });
    }
  }
  return snapshots;
}

async function restoreManagedFiles(snapshots) {
  for (const [file, snapshot] of snapshots) {
    if (snapshot.exists) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, snapshot.content);
    } else {
      await rm(file, { force: true });
    }
  }
}

function replaceOnce(source, expected, replacement, label) {
  const first = source.indexOf(expected);
  const last = source.lastIndexOf(expected);
  // Exact matching is intentionally fail-closed. If an installed Playwright
  // upgrade changes a load-bearing instruction, stop so a human reviews the
  // new upstream text rather than silently applying a fuzzy/partial patch.
  if (first === -1 || first !== last) {
    throw new Error(`${label}: expected exactly one upstream fragment to adapt`);
  }
  return source.replace(expected, replacement);
}

const plannerGuardrails = `
## iPix project contract
- Always invoke \`planner_setup_page\` with project \`playwright-agent\` and seed file \`e2e/agents/seed.spec.ts\`.
- Keep planning read-only by default. Do not publish, pay, delete, or perform other consequential application actions unless a human explicitly approved that exact synthetic test action.
- Scenarios that require isolated or mutable data must stop and request human-approved setup; never mutate shared seed data just to manufacture a fresh state.
- Save plans only under \`specs/**\`. Never modify application/product code.
- Never run paid-AI, approval/local-stack, production, or other non-default projects unless a human explicitly asks.
`;

const generatorGuardrails = `
## iPix project contract
- Always invoke \`generator_setup_page\` with project \`playwright-agent\` and seed file \`e2e/agents/seed.spec.ts\`.
- Write generated Playwright tests only under \`e2e/agents/**\`.
- Never modify application/product code or weaken expected behavior to make a generated test pass.
- Do not publish, pay, delete, or perform other consequential application actions unless a human explicitly approved that exact synthetic test action.
`;

const healerGuardrails = `
## iPix human-approval guardrails
- For any requested test location under \`e2e/agents/\`, invoke \`test_run\` with \`projects: ["playwright-agent"]\`; for ordinary test locations, use \`projects: ["chromium"]\`.
- Never run \`chromium-ai-smoke\`, approval/local-stack, production, or any other non-default project without explicit human approval.
- Only edit Playwright test code under \`e2e/**\`.
- Never modify application/product code, database migrations, dependency/config files, CI/workflows, or authorization/security logic. If the failure is a product bug, stop and report the proposed product fix for human review.
- Never add \`test.skip()\`, \`test.fixme()\`, or an equivalent skip without explicit human approval.
- Never weaken or remove assertions, or change expected product behavior, merely to make a test pass.
`;

const snapshots = await snapshotManagedFiles();
try {
  const generated = spawnSync(
    process.execPath,
    [
      playwrightCli,
      "init-agents",
      "--loop=claude",
      "--config=playwright.agents.config.ts",
      "--project=playwright-agent",
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (generated.status !== 0) throw new Error(`playwright init-agents failed with status ${generated.status ?? "unknown"}`);

  let planner = await readFile(plannerPath, "utf8");
  let generator = await readFile(generatorPath, "utf8");
  let healer = await readFile(healerPath, "utf8");
  const generatedMcp = JSON.parse(await readFile(mcpPath, "utf8"));
  const expectedGeneratedMcp = {
    mcpServers: {
      "playwright-test": {
        command: "npx",
        args: ["playwright", "run-test-mcp-server"],
      },
    },
  };
  try {
    deepStrictEqual(generatedMcp, expectedGeneratedMcp);
  } catch (cause) {
    throw new Error("Unexpected .mcp.json from installed Playwright; review before committing", { cause });
  }

  planner = replaceOnce(
    planner,
    "- Assumptions about starting state (always assume blank/fresh state)",
    "- Assumptions about starting state (use the existing authenticated account/data supplied by the seed; never assume blank/fresh data)",
    "planner seed-state guard",
  );

  // Playwright 1.63.0 generates one invalid TypeScript example (`async { page }`).
  // Apply only that upstream syntax correction until the dependency carries it.
  if (generator.includes("async { page } =>")) {
    generator = replaceOnce(generator, "async { page } =>", "async ({ page }) =>", "generator syntax patch");
  } else if (!generator.includes("async ({ page }) =>")) {
    throw new Error("generator syntax patch: neither known upstream form was found");
  }

  healer = replaceOnce(
    healer,
    "1. **Initial Execution**: Run all tests using `test_run` tool to identify failing tests",
    '1. **Initial Execution**: Run the requested failing tests with `test_run`; use `projects: ["playwright-agent"]` for any requested test location under `e2e/agents/`, otherwise use `projects: ["chromium"]`',
    "healer deterministic-project guard",
  );
  healer = replaceOnce(
    healer,
    "- If the error persists and you have high level of confidence that the test is correct, mark this test as test.fixme()\n  so that it is skipped during the execution. Add a comment before the failing step explaining what is happening instead\n  of the expected behavior.\n- Do not ask user questions, you are not interactive tool, do the most reasonable thing possible to pass the test.\n",
    "- If the error persists and the test appears correct, stop and report the product/test mismatch for human review.\n",
    "healer human-approval guard",
  );

  const reviewedMcp = {
    mcpServers: {
      "playwright-test": {
        command: "npx",
        args: ["playwright", "run-test-mcp-server", "--config=playwright.agents.config.ts"],
      },
    },
  };

  await mkdir(agentDir, { recursive: true });
  await mkdir(path.dirname(seedPath), { recursive: true });
  await mkdir(path.dirname(specsReadmePath), { recursive: true });
  await writeFile(plannerPath, planner.trimEnd() + "\n" + plannerGuardrails, "utf8");
  await writeFile(generatorPath, generator.trimEnd() + "\n" + generatorGuardrails, "utf8");
  await writeFile(healerPath, healer.trimEnd() + "\n" + healerGuardrails, "utf8");
  await writeFile(
    seedPath,
    `import { expect, test } from "@playwright/test";\n\ntest("Playwright Test Agent authenticated seed", async ({ page }) => {\n  await page.goto("/app");\n  await expect(page).toHaveURL(/\\/app(?:[/?#]|$)/);\n});\n`,
    "utf8",
  );
  await writeFile(
    specsReadmePath,
    `# Playwright Test Agent plans\n\nHuman-readable plans created by the official Playwright Planner live here.\n\nRegenerate the installed-version Planner, Generator, and Healer definitions with \`npm run e2e:agents:init\`. iPix then applies only the repository-specific safety guards required by IPI-1335.\n`,
    "utf8",
  );
  await writeFile(mcpPath, JSON.stringify(reviewedMcp, null, 2) + "\n", "utf8");
} catch (error) {
  await restoreManagedFiles(snapshots);
  throw error;
}
