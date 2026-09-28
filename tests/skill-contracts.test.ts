import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function readMarkdownTree(path: string): Array<{ path: string; content: string }> {
  const root = join(process.cwd(), path);
  const results: Array<{ path: string; content: string }> = [];

  // Fail loudly on a renamed or deleted skill tree. Without this the walker
  // throws a bare ENOENT from readdirSync, and a contract that silently scans
  // nothing is worse than one that fails.
  if (!existsSync(root)) {
    throw new Error(`Skill tree not found: ${path}`);
  }

  function visit(dir: string) {
    for (const entry of readdirSync(dir)) {
      const absolute = join(dir, entry);
      if (statSync(absolute).isDirectory()) {
        visit(absolute);
      } else if (entry.endsWith(".md")) {
        // `relative()` rather than slicing by `process.cwd().length`: slicing
        // assumed a separator width and a trailing-slash-free prefix, which is
        // not portable.
        results.push({
          path: relative(process.cwd(), absolute),
          content: readFileSync(absolute, "utf8"),
        });
      }
    }
  }

  visit(root);
  return results;
}

let agents: string;
let bestPractices: string;
let todo: string;
let changelog: string;
let refactorPlan: string;
let domainModeling: string;
let adrFormat: string;
let tasks: string;
let taskFormat: string;
let researchEvidence: string;
let externalReferenceMapping: string;
let mergeConflicts: string;
let postMerge: string;
let preMergeTests: string;

describe("iPix engineering skill contracts", () => {
  beforeAll(() => {
    agents = readRepoFile("AGENTS.md");
    bestPractices = readRepoFile("docs/ipix-platform/BEST-PRACTICES.md");
    todo = readRepoFile("todo.md");
    changelog = readRepoFile("changelog.md");
    refactorPlan = readRepoFile(".claude/skills/refactor-plan/SKILL.md");
    domainModeling = readRepoFile(".claude/skills/domain-modeling/SKILL.md");
    adrFormat = readRepoFile(".claude/skills/domain-modeling/ADR-FORMAT.md");
    tasks = readRepoFile(".claude/skills/tasks/SKILL.md");
    taskFormat = readRepoFile(".claude/skills/tasks/references/task-format.md");
    researchEvidence = readRepoFile(".claude/skills/tasks/references/research-evidence.md");
    externalReferenceMapping = readRepoFile(".claude/skills/tasks/references/external-reference-mapping.md");
    mergeConflicts = readRepoFile(".claude/skills/resolving-merge-conflicts/SKILL.md");
    postMerge = readRepoFile(".claude/skills/tasks/references/post-merge.md");
    preMergeTests = readRepoFile(".claude/skills/tasks/references/pre-merge-tests.md");
  });

  test("refactor-plan continues when implementation was already requested", () => {
    expect(refactorPlan).toContain("If the user already asked to implement the refactor");
    expect(refactorPlan).toContain("continue without a second confirmation");
    expect(refactorPlan).toContain("If the user asked for planning only, stop after the plan and ask for confirmation");
  });

  test("domain-modeling preserves the ordered iPix source hierarchy", () => {
    expect(domainModeling).toContain(
      [
        "1. Live Supabase/runtime contracts when they are the durable source of truth.",
        "2. `docs/prd.md` and the product sitemap for product language and scope.",
        "3. Accepted ADRs in `docs/adr/`.",
        "4. Current `origin/main` implementation and generated types.",
        "5. Lumina/legacy docs only as reference, never as V2 authority.",
      ].join("\n"),
    );
  });

  test("ADR format selects the owning directory and increments its local sequence", () => {
    expect(adrFormat).toMatch(
      /Choose the directory before numbering:[\s\S]*- If no root `CONTEXT-MAP\.md` exists, use root `docs\/adr\/`\.[\s\S]*- If `CONTEXT-MAP\.md` exists and the decision is system-wide or spans multiple contexts, use root `docs\/adr\/`\.[\s\S]*- If `CONTEXT-MAP\.md` exists and the decision belongs to one context, follow the map to that context and use that context's `docs\/adr\/`\.[\s\S]*After selecting the owning ADR directory above, scan \*\*that directory only\*\* for the highest existing number and increment by one\. Root and context-specific ADR directories maintain independent sequences\./,
    );
  });

  test("tasks prefers tracer-bullet vertical slices and reserves expand-migrate-contract for wide refactors", () => {
    expect(tasks).toContain("## Ticket decomposition — vertical slices first");
    expect(tasks).toContain("prefer **tracer-bullet vertical slices** over layer-by-layer tickets");
    expect(tasks).toContain("### Wide-refactor exception — expand → migrate → contract");
    expect(tasks).toContain("whose blast radius cannot stay green as a vertical slice");
    expect(tasks).toContain("Do not pretend a horizontal breaking change is a tracer bullet");
  });

  test("Linear governance routes each work type to exactly four approved templates and preserves the ordered reference contract", () => {
    const routingSection = tasks.match(
      /## Linear template routing — mandatory([\s\S]*?)Rules:/,
    )?.[1] ?? "";
    const routingLines = routingSection
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && line !== "```text" && line !== "```");

    const expectedRoutes = [
      ["Production/release certification?", "Production Readiness / Release Gate"],
      ["Confirmed failure requiring root-cause repair?", "Forensic Error Audit & Fix"],
      ["Audit/research only with no implementation?", "iPix Task Audit & Implementation Plan"],
      ["Otherwise", "Universal Engineering Task"],
    ] as const;

    for (const [question, template] of expectedRoutes) {
      const index = routingLines.indexOf(question);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(routingLines[index + 1]).toBe(`→ ${template}`);
    }
    expect(routingLines.filter((line) => line.startsWith("→ "))).toHaveLength(4);
    expect(agents).toContain("- Normal feature/fix → `Universal Engineering Task`");
    expect(agents).toContain("- Audit/research only; no implementation → `iPix Task Audit & Implementation Plan`");
    expect(agents).toContain("- Confirmed bug/root-cause repair → `Forensic Error Audit & Fix`");
    expect(agents).toContain("- Production/release certification → `Production Readiness / Release Gate`");
    expect(agents).toContain("Before implementation, use one of two explicit paths:");
    expect(agents).toContain("**Standard path:**");
    expect(agents).toContain("**Exception path:**");
    expect(tasks).toContain("Before implementation, use one of two explicit paths:");
    expect(tasks).toContain("**Standard path:**");
    expect(tasks).toContain("**Exception path:**");
    const canonicalStandardPath =
      "**Standard path:** verify template/type, project/milestone, dependencies/blockers, relations, observable outcome, acceptance criteria, verification plan, and exact next action.";
    expect(agents).toContain(canonicalStandardPath);
    expect(tasks).toContain(canonicalStandardPath);
    expect(agents).toContain("Existing-issue decision:");
    expect(tasks).toContain("Existing-issue decision:");
    expect(agents).toContain("do not create a duplicate solely to change template metadata");
    expect(tasks).toContain("do not create a duplicate solely to change template metadata");
    expect(agents).toContain("If Linear is temporarily unavailable");
    expect(agents).toContain("reconcile that handoff back into Linear before marking the issue Done");
    expect(tasks).toContain("If Linear is temporarily unavailable");
    expect(tasks).toContain("reconcile that handoff back into Linear before marking the issue Done");

    for (const source of [agents, tasks, bestPractices]) {
      expect(source).not.toContain("reuse-rule-linear-task");
    }

    expect(bestPractices).toMatch(
      /exact URL \+ exact source file\/example\/section\/symbol[\s\S]*tracking class:[\s\S]*Inspect[\s\S]*approved implementation Action[\s\S]*Current owner \/ truth[\s\S]*exact target\/destination[\s\S]*do-not-copy\/defer\/drop boundary[\s\S]*Constraints[\s\S]*precise change[\s\S]*exact verification[\s\S]*Checkpoint: PASS \+ evidence[\s\S]*STOP condition/,
    );
  });

  test("tasks requires a repeatable PR follow-up review loop after a PR opens", () => {
    expect(tasks).toContain("## PR follow-up loop — mandatory after PR opens");
    expect(tasks).toContain("classify each review thread as `VALID`, `PARTIAL`, or `NOISE`");
    expect(tasks).toContain("resolve a thread only after the fix and evidence exist");
    expect(tasks).toContain("Re-check current `main` and required exact-head checks after every push");
    expect(tasks).toContain("KEEP / REFACTOR NOW / FOLLOW-UP");
    expect(tasks).toContain("Update the PR title/body");
    expect(tasks).toContain("Repeat this loop after every push");
    expect(bestPractices).toContain("### PR follow-up after opening or pushing");
    expect(bestPractices).toContain("VALID / PARTIAL / NOISE");
    expect(bestPractices).toContain("exact-head merge gate");
  });

  test("post-merge workflow synchronizes local main safely before the next task", () => {
    const sectionStart = postMerge.indexOf("## Local main synchronization gate");
    const sectionEnd = postMerge.indexOf("## Required checks when applicable");

    expect(sectionStart).toBeGreaterThanOrEqual(0);
    expect(sectionEnd).toBeGreaterThan(sectionStart);

    const syncSection = postMerge.slice(sectionStart, sectionEnd);
    expect(syncSection).toMatch(
      /before creating the next task branch\/worktree[\s\S]*git fetch origin --prune[\s\S]*git rev-list --left-right --count main\.\.\.origin\/main/,
    );
    expect(syncSection).toMatch(
      /\`0 N\`[\s\S]*worktree that owns \`main\`[\s\S]*git merge --ff-only origin\/main[\s\S]*re-run the divergence check/,
    );
    expect(syncSection).toMatch(
      /\`N 0\` or \`N M\`[\s\S]*\*\*STOP\*\*[\s\S]*Preserve those local-only commits[\s\S]*never silently reset or discard them/,
    );
    expect(syncSection).toContain("\`0 0\` → PASS");
    expect(syncSection).toContain("Do not automatically rebase active feature branches");
    expect(tasks).toContain("Post-merge local-main synchronization");
    expect(agents).toContain("synchronize local `main` with `origin/main`");
  });

  test("durable records are updated in the same PR, and stale ones are corrected with the change", () => {
    expect(tasks).toContain("docs/**` in the same PR");
    expect(tasks).toContain("update `changelog.md` **in the same PR**");
    expect(tasks).toContain("The post-merge pass is the fallback for a genuine miss, never the plan");
    expect(tasks).toContain("Stale records are corrected in the same PR as the change that made them stale");
    expect(tasks).toContain("neither applies → record the reason briefly in the task/PR");
  });

  test("review suggestions are verified against the thing they cite before being applied", () => {
    expect(tasks).toContain("open it and confirm it says what the suggestion claims");
    expect(tasks).toContain("classify each review thread as `VALID`, `PARTIAL`, or `NOISE`");
  });

  test("pre-merge guidance requires running contract tests after editing a file they read", () => {
    const sectionStart = preMergeTests.search(/^## Documentation files are under test$/m);
    const sectionEnd = preMergeTests.search(/^## iPix path\/risk matrix$/m);

    expect(sectionStart, "the section must exist as its own heading").toBeGreaterThanOrEqual(0);
    expect(sectionEnd, "the closing heading must exist after it").toBeGreaterThan(sectionStart);

    const section = preMergeTests.slice(sectionStart, sectionEnd);
    expect(section).toMatch(/run the contract test \*\*after\*\* the edit/);
    expect(section).toContain("npm run test:skills");
    expect(section).toMatch(/pin the \*\*structure\*\*/);
    expect(section).toMatch(/rather than transient wording/);
  });

  test("todo stays a short Linear handoff while changelog stays curated shipped history", () => {
    expect(todo).toContain("Linear is the authoritative task/status source");
    expect(todo).toContain("## Current");
    expect(todo).toContain("## Durable sources");
    expect(todo).toContain("- State:");
    expect(todo).toContain("- Last proof:");
    expect(todo).toContain("- Remaining blocker:");
    expect(todo).toContain("- Next action:");
    expect(todo).toContain("IPI-1294");
    expect(todo).not.toContain("Exact head:");
    expect(todo).not.toContain("PR merge gate:");
    expect(todo).not.toContain("complete the live Linear template + integration settings work, then merge/certify PR #258");
    expect(changelog).toContain("# Changelog");
    expect(changelog).toContain("## [Unreleased]");
    expect(changelog).toContain("### Added");
    expect(changelog).toContain("### Security");
    expect(changelog).toContain("notable verified");
    expect(changelog).toContain("IPI-1294");
    expect(changelog).toContain("four-template routing");
    // Retired with the post-merge records: these assertions pinned transient
    // IPI-1294 handoff prose. Durable history belongs in Linear/changelog;
    // todo.md must remain free to describe the current handoff.
    expect(todo).not.toContain("synchronize/retire live Linear template definitions");
  });

  test("tasks makes the external-reference mapping supplement discoverable from governing guidance", () => {
    expect(tasks).toContain("[external-reference-mapping.md](references/external-reference-mapping.md)");
    expect(taskFormat).toContain("[external-reference-mapping.md](external-reference-mapping.md)");
    expect(researchEvidence).toContain("[external-reference-mapping.md](external-reference-mapping.md)");
  });

  test("external-reference mapping supplements the canonical action and source contract", () => {
    expect(externalReferenceMapping).toMatch(/supplement[s]?, rather than replace[s]?/i);
    expect(externalReferenceMapping).toContain("Tracking class");
    expect(externalReferenceMapping).toContain("**Inspect**");
    expect(externalReferenceMapping).toContain("**Action**");
    expect(externalReferenceMapping).toContain("**Current owner / truth**");
    expect(externalReferenceMapping).toContain("**Constraints**");
    expect(externalReferenceMapping).not.toContain("**Reference 1 — ADAPT**");
  });

  test("external-reference mapping keeps checkpoint and STOP requirements synchronized", () => {
    expect(externalReferenceMapping).toMatch(
      /Required mapping:[\s\S]*checkpoint[\s\S]*STOP condition[\s\S]*```/i,
    );
    expect(externalReferenceMapping).toMatch(
      /## Ready gate[\s\S]*Inspect[\s\S]*Action[\s\S]*Current owner \/ truth[\s\S]*Constraints[\s\S]*checkpoint[\s\S]*STOP condition/i,
    );
  });

  test("merge-conflict skill allows safe pause or abort and requires confirmation for new trade-offs", () => {
    expect(mergeConflicts).toContain("If a safe evidence-backed resolution cannot be established, pause or abort");
    expect(mergeConflicts).toContain("require user confirmation before committing it");
    expect(mergeConflicts).toContain("Do **not** invent new behaviour");
  });

  test("merge-conflict skill preserves unrelated work and verifies the staged diff", () => {
    expect(mergeConflicts).toContain("Record any staged or unstaged changes that existed before conflict resolution");
    expect(mergeConflicts).toContain("Stage only the resolved files/hunks that belong to the current merge/rebase");
    expect(mergeConflicts).toContain("never use a blanket stage");
    expect(mergeConflicts).toContain("Inspect `git diff --cached` and `git status`");
    expect(mergeConflicts).toContain("the staged diff contains no unrelated changes");
  });

  test("merge-conflict skill routes high-risk iPix domains to targeted verification", () => {
    expect(mergeConflicts).toContain("Supabase migrations/RLS/RPCs");
    expect(mergeConflicts).toContain("auth/tenant code");
    expect(mergeConflicts).toContain("Mastra memory/HITL/workflows");
    expect(mergeConflicts).toContain("run the owning domain skill's targeted verification afterward");
    expect(mergeConflicts).toContain("run the cheapest decisive proof");
  });

  test("CopilotKit Mastra reference matches the installed iPix runtime family and in-process architecture", () => {
    const integration = readRepoFile(
      ".claude/skills/copilotkit/references/integrations/references/integrations/mastra.md",
    );

    const packageJson = JSON.parse(readRepoFile("package.json")) as {
      dependencies: Record<string, string>;
    };
    // Derived from package.json, not a copy of the reference table, so the
    // documented family and the installed family cannot drift apart. Every name
    // here must appear as a row in the integration reference.
    for (const name of [
      "@copilotkit/runtime",
      "@copilotkit/react-core",
      "@copilotkit/channels",
      "@ag-ui/client",
      "@ag-ui/mastra",
      "@mastra/core",
      "@mastra/memory",
      "@mastra/pg",
      "@mastra/client-js",
    ]) {
      const version = packageJson.dependencies[name]?.replace(/^[~^]/, "");
      expect(version).toBeTruthy();
      expect(integration).toContain(`| \`${name}\` | \`${version}\` |`);
    }

    expect(integration).toContain("requirePlannerResourceId()");
    expect(integration).toContain("createLocalAgents(resourceId)");
    expect(integration).toContain("TenantAbortRunner");
    expect(integration).toContain("PostgresStore");
    expect(integration).toContain("MASTRA_DATABASE_URL");
    expect(integration).toContain("createCopilotHonoHandler");
    expect(integration).toMatch(/`createCopilotEndpoint`[^\n]*deprecated alias/);
    expect(integration).not.toContain("Current audited iPix family (2026-09-04)");
    expect(integration).not.toContain("InMemoryAgentRunner");
    expect(integration).not.toContain("LibSQLStore");
  });

  test("Mastra skill references do not present the retired 1.63.2 runtime as current", () => {
    const stale = readMarkdownTree(".claude/skills/mastra")
      .filter(({ content }) => content.includes("1.63.2"))
      .map(({ path }) => path);

    expect(stale).toEqual([]);
  });

  test("Mastra HITL guidance distinguishes native suspend interrupts from frontend-tool HITL", () => {
    const copilotMastra = readRepoFile(
      ".claude/skills/copilotkit/references/integrations/references/integrations/mastra.md",
    );
    const workflows = readRepoFile(".claude/skills/mastra/references/workflows.md");
    const guidance = `${copilotMastra}\n${workflows}`;

    expect(guidance).toContain("tool-call-suspended");
    expect(guidance).toContain("useInterrupt");
    expect(guidance).toContain("useHumanInTheLoop");
    expect(guidance).toContain("@ag-ui/mastra 1.1.4");
    expect(guidance).toMatch(/server[- ]revalidat/i);
    expect(guidance).toMatch(/persisted[\s\S]*snapshot|snapshot[\s\S]*persisted/i);
  });


  test("CopilotKit and Mastra skill trees contain none of the retired runtime pins", () => {
    const retiredPins = ["1.68.1", "1.63.2", "1.22.2", "0.9.0", "0.0.58"];
    const stale = [
      ...readMarkdownTree(".claude/skills/copilotkit"),
      ...readMarkdownTree(".claude/skills/mastra"),
    ].flatMap(({ path, content }) =>
      retiredPins
        .filter((pin) => content.includes(pin))
        .map((pin) => `${path} -> ${pin}`),
    );

    expect(stale).toEqual([]);
  });

  test("iPix CopilotKit v2 conventions delegate the runtime contract to the canonical reference", () => {
    const conventions = readRepoFile(
      ".claude/skills/copilotkit/references/upgrade/ipix-v2-conventions.md",
    );

    // This file owns legacy→current API translation and upgrade rules, not the
    // current runtime contract. It must point at the canonical reference rather
    // than restate it: duplicated runtime truth drifts, and only one copy gets
    // updated when the runtime changes.
    expect(conventions).toContain(
      "../integrations/references/integrations/mastra.md",
    );
    expect(conventions).not.toContain("1.60.0");

    // The current in-process runtime contract is asserted against its canonical
    // home, so it can no longer be weakened by editing a file that only
    // summarises it.
    const runtimeContract = readRepoFile(
      ".claude/skills/copilotkit/references/integrations/references/integrations/mastra.md",
    );
    expect(runtimeContract).toContain("createCopilotHonoHandler");
    expect(runtimeContract).toContain("requirePlannerResourceId");
    expect(runtimeContract).toContain("createLocalAgents(resourceId)");
    expect(runtimeContract).toContain("TenantAbortRunner");
    expect(runtimeContract).toContain("PostgresStore");
    expect(runtimeContract).toContain("server revalidates");
  });

  test("active CopilotKit debugging guidance teaches the preferred Hono handler", () => {
    const debugFiles = [
      ".claude/skills/copilotkit/references/debug/debug.md",
      ".claude/skills/copilotkit/references/debug/references/error-patterns.md",
      ".claude/skills/copilotkit/references/debug/references/runtime-debugging.md",
      ".claude/skills/copilotkit/references/debug/references/quick-workflows.md",
    ];

    for (const path of debugFiles) {
      const content = readRepoFile(path);
      expect(content, path).not.toContain("createCopilotEndpoint(");
    }
    expect(readRepoFile(debugFiles[0])).toContain("createCopilotHonoHandler");
    expect(readRepoFile(debugFiles[2])).toContain("createCopilotHonoHandler");
  });

});
