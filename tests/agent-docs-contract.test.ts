import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * AGENT-DOCS-001 · IPI-1370 — the agent contract files must describe this
 * repository, not a remembered version of it.
 *
 * Why this test exists: `AGENTS.md` and `CLAUDE.md` are the first thing every
 * coding agent reads, and nothing validated them. That is how the documented
 * default local-database path (`supabase start`) stayed broken, how a
 * machine-local absolute path survived in a portable open format, and how
 * `CLAUDE.md` grew 13 sections that restated `AGENTS.md`.
 *
 * Two of the three checks below are pure drift detection and cost nothing:
 * every repository path the docs reference must exist, and every
 * `npm run <script>` they name must exist in `package.json`. Rename a skill
 * directory or a script and this fails instead of silently misleading an agent.
 *
 * Deliberately EXCLUDED from the path check, because they are generated or
 * local-only and legitimately absent in CI:
 *   - `graphify-out/**`   — generated analysis state, gitignored, never shipped
 *   - `.env*`             — local secret files, gitignored
 *
 * What the scanner does and does NOT cover, so the guarantee is not overstated:
 * it reads inline-code references (`` `src/a.ts` ``) and repository-relative
 * Markdown links, matched against `TRACKED_PREFIXES` plus `BARE_FILES`. A path
 * written as bare prose, or under a directory absent from `TRACKED_PREFIXES`,
 * is NOT validated. Add the prefix when a doc starts referencing a new tree.
 */

function read(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const DOCS = ["AGENTS.md", "CLAUDE.md"] as const;

/** Repository-relative prefixes whose members must exist as real files. */
const TRACKED_PREFIXES = [
  ".claude/",
  ".agents/",
  ".cursor/",
  "src/",
  "scripts/",
  "tests/",
  "docs/",
  "supabase/",
  "e2e/",
  ".github/",
] as const;

/** Generated or local-only trees that are legitimately absent. */
const GENERATED_PREFIXES = ["graphify-out/"] as const;

/** Bare filenames the docs reference that must also exist. */
const BARE_FILES = ["AGENTS.md", "CLAUDE.md", "package.json", ".gitignore"] as const;

function referencedPaths(source: string): string[] {
  const found = new Set<string>();

  // Inline-code references: `src/mastra/pg-store.ts`
  for (const token of source.match(/`([^`\n]+)`/g) ?? []) {
    const value = token.slice(1, -1);
    if (value.includes(" ") || value.includes("*") || value.includes("<")) continue;
    if (TRACKED_PREFIXES.some((prefix) => value.startsWith(prefix))) found.add(value);
    if ((BARE_FILES as readonly string[]).includes(value)) found.add(value);
  }

  // Markdown links to repository files: [text](docs/thing.md)
  for (const match of source.match(/\]\(([^)]+)\)/g) ?? []) {
    const value = match.slice(2, -1);
    if (value.startsWith("http") || value.startsWith("#")) continue;
    if (TRACKED_PREFIXES.some((prefix) => value.startsWith(prefix))) found.add(value);
  }

  return [...found].filter(
    (value) => !GENERATED_PREFIXES.some((prefix) => value.startsWith(prefix)),
  );
}

describe("IPI-1370 AGENT-DOCS-001: agent contract files describe the real repository", () => {
  it.each(DOCS)(
    "%s references only existing paths, for the inline-code and relative-link forms it scans",
    (doc) => {
      const missing = referencedPaths(read(doc)).filter(
        (value) => !existsSync(new URL(`../${value}`, import.meta.url)),
      );
      expect(
        missing,
        `${doc} references path(s) that do not exist: ${missing.join(", ")}. ` +
          "Either create the path, or update the reference — do not leave the contract stale.",
      ).toEqual([]);
      // Guard against the scanner silently matching nothing.
      expect(referencedPaths(read(doc)).length).toBeGreaterThan(3);
    },
  );

  it.each(DOCS)("%s names only npm scripts that exist in package.json", (doc) => {
    const scripts = Object.keys(
      JSON.parse(read("package.json")).scripts ?? {},
    ) as string[];
    const source = read(doc);
    const named = new Set<string>();
    for (const match of source.match(/npm run ([a-zA-Z0-9:_-]+)/g) ?? []) {
      named.add(match.replace("npm run ", ""));
    }
    // `npm test` invokes the `test` lifecycle script directly (with `pretest`).
    for (const _match of source.match(/npm test\b/g) ?? []) named.add("test");
    const unknown = [...named].filter((name) => !scripts.includes(name));
    expect(
      unknown,
      `${doc} tells agents to run script(s) that package.json does not define: ${unknown.join(", ")}`,
    ).toEqual([]);
    // Guard against the assertion silently matching nothing.
    expect(named.size).toBeGreaterThan(0);
  });

  it("documents the full precedence chain, including that user chat wins", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("Precedence, highest first:");
    expect(agents).toContain("an explicit instruction from the user in chat");
    expect(agents).toContain("the closest `AGENTS.md` to the file being edited");
    // Nested AGENTS.md files must be named, not described as hypothetical:
    // they already exist and the closest one wins for its subtree.
    expect(agents).toContain(".claude/skills/vercel-react-best-practices/AGENTS.md");
    // Both Claude files must be placed correctly, and they are different files:
    // the root CLAUDE.md is the overlay; .claude/CLAUDE.md is directory-scoped
    // trigger notes for work under .claude/. Conflating them mis-states which
    // file an agent should read.
    expect(agents).toContain("`CLAUDE.md` at the repository root — the Claude-only overlay");
    expect(agents).toContain("`.claude/CLAUDE.md` — a directory-scoped file");
  });

  it("keeps AGENTS.md portable — no machine-local absolute paths", () => {
    const agents = read("AGENTS.md");
    const localPaths = agents.match(/\/(?:home|Users)\/[A-Za-z0-9._-]+\//g) ?? [];
    expect(
      localPaths,
      "AGENTS.md is a portable open format; absolute developer paths do not belong in it.",
    ).toEqual([]);
  });

  it("CLAUDE.md is an overlay, not a second copy of the repository-wide rules", () => {
    const claude = read("CLAUDE.md");
    // Sections that AGENTS.md owns. CLAUDE.md once restated 13 of them and the
    // two copies had already drifted (e.g. two spellings of the Linear naming rule).
    const ownedByAgents = [
      "## Claude workflow",
      "## Fastest safe path",
      "## Mermaid reasoning",
      "## Source of truth",
      "## Architecture reminders",
      "## Verification",
      "## Git / task safety",
      "## Graphify",
    ];
    // Exact line equality, not a constructed RegExp: the headings are static,
    // and a plain string comparison says exactly what it does.
    const claudeLines = claude.split("\n");
    for (const heading of ownedByAgents) {
      expect(
        claudeLines.includes(heading),
        `CLAUDE.md restates "${heading}", which AGENTS.md owns — use a pointer instead.`,
      ).toBe(false);
    }
    expect(claude).toContain("must not restate or override repository-wide rules");
    expect(claude).toContain("A second copy in this file is drift, not documentation.");
  });

  it("keeps the merge-authority rule intact", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("### Merge authority — human approval is mandatory");
    expect(agents).toContain("Explicit human approval for that exact head SHA");
    // The rule must not acquire an agent-side escape hatch.
    expect(agents).toContain("no agent-side override");
  });

  it("records the verified local-database breakage and its workarounds", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("failed to parse config: missing private key");
    expect(agents).toContain("dotenvx-encrypted `.env.local`");
    expect(agents).toContain("Disposable Postgres plus this repository's own migrations");
  });

  it("documents the npm test gate and the vitest bypass", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("`npm test` and `npx vitest run` are not the same check");
    expect(agents).toContain("pretest");
    expect(agents).toContain("check-local-secrets.mjs");
  });
});
