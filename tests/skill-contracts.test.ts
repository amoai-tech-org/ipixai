import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
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
    expect(syncSection).toContain("\`0 0\` \u2192 PASS");
    expect(syncSection).toContain("Do not automatically rebase active feature branches");
    expect(tasks).toContain("Post-merge local-main synchronization");
    expect(agents).toContain("synchronize local \`main\` with \`origin/main\`");
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
    expect(todo).toContain("full canonical external-reference contract");
    expect(todo).toContain("Live template inventory is exactly four");
    expect(todo).toContain("Linear Reviews/Diffs does not currently discover `amoai-tech/ipixai`");
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
});
