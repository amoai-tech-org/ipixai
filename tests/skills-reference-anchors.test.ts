import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  findBrokenAnchors,
  githubSlug,
  headingSlugSet,
  markdownHeadings,
} from "../scripts/skills-reference-anchors.mjs";

/**
 * SKILLS-001 · IPI-1371 — every same-file anchor in an iPix-maintained skill
 * markdown file must resolve.
 *
 * This exists because the first version of this PR's table-of-contents work
 * shipped 11 files whose anchors pointed at nothing. The generator and the
 * verifier shared one slug function, so the check agreed with itself instead of
 * with GitHub. Scanning for the same failure mode afterwards found 22 more
 * hand-written anchors already broken — the oldest long predating this work.
 *
 * The conformance vector below is the real defence. Its expected values were
 * produced by `github-slugger`, the implementation GitHub itself uses, so they
 * are an independent source of truth rather than a restatement of `githubSlug`.
 * The implementation was additionally compared against that package across
 * 16,046 headings in this repository with zero mismatches.
 */

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("GitHub heading slugs", () => {
  it.each([
    ["Contents", "contents"],
    ["A. Registry/config — always when agent wiring changes", "a-registryconfig--always-when-agent-wiring-changes"],
    ["Inheritance (`<|--`)", "inheritance---"],
    ["Python (LangGraph Platform / Monorepo)", "python-langgraph-platform--monorepo"],
    ["Create a new React + Vite app (optional)", "create-a-new-react--vite-app-optional"],
    ["GitHub — curated top repos", "github--curated-top-repos"],
    ["Mastra — doc & link index", "mastra--doc--link-index"],
    ["Saving Google tokens", "saving-google-tokens"],
  ])("slugs %j as %j", (heading, expected) => {
    expect(githubSlug(heading)).toBe(expected);
  });

  it("appends -1, -2 for repeated headings instead of colliding", () => {
    expect([...headingSlugSet(["Python", "JavaScript", "Python", "Python"])]).toEqual([
      "python",
      "javascript",
      "python-1",
      "python-2",
    ]);
  });

  it("ignores heading-like lines inside fenced code blocks", () => {
    const text = "# Title\n\n```bash\n# not a heading\n## neither is this\n```\n\n## Real\n";
    expect(markdownHeadings(text)).toEqual(["Title", "Real"]);
  });
});

describe("skill markdown same-file anchors resolve", () => {
  const { broken, scanned, skippedSnapshot } = findBrokenAnchors(REPO_ROOT);

  it("has no broken same-file anchors", () => {
    expect(
      broken.map((entry) => `${entry.file}:${entry.line}  #${entry.anchor}`),
      "A same-file anchor points at a heading that does not exist. Regenerate the anchor " +
        "from the real heading text with GitHub's slug rules (see scripts/skills-reference-anchors.mjs).",
    ).toEqual([]);
  });

  it("scanned a meaningful number of files", () => {
    // Without this, a discovery bug that skipped everything would make the
    // assertion above vacuously true — the exact failure this guard exists to stop.
    expect(scanned).toBeGreaterThan(100);
  });

  it("skips snapshot files rather than validating renderer-specific anchors", () => {
    // Files declaring an external `source:` are documentation snapshots; their
    // internal anchors follow the source renderer (Mintlify `\[#anchor]`), so
    // GitHub slug rules do not apply and validating them would produce noise.
    expect(skippedSnapshot).toBeGreaterThan(0);
  });
});
