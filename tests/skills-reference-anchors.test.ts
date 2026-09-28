import { type Dirent, readdirSync, realpathSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  findBrokenAnchors,
  githubSlug,
  headingSlugSet,
  linesOutsideFences,
  markdownHeadings,
  sameFileAnchors,
} from "../scripts/skills-reference-anchors.mjs";
import { discoverVendoredRoots } from "../scripts/skills-vendor-baseline.mjs";

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
const SKILL_ROOTS = [".claude/skills", ".agents/skills"];

/** The same composition the guard uses: anchors on lines that are not inside a fence. */
function anchorsOutsideFences(text: string): string[] {
  return linesOutsideFences(text).flatMap(({ text: line }) => sameFileAnchors(line));
}

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

  it("keeps bumping the suffix until the slug is actually free", () => {
    // Expected values come from `github-slugger`. A one-shot counter returns
    // `foo`, `foo-1`, `foo-1` for the first vector — reusing a slug that a later
    // heading owns, which makes the guard accept a link to an id no heading has
    // and reject a link to the id GitHub really creates.
    expect([...headingSlugSet(["Foo", "Foo", "Foo-1"])]).toEqual(["foo", "foo-1", "foo-1-1"]);
    expect([...headingSlugSet(["Foo", "Foo-1", "Foo"])]).toEqual(["foo", "foo-1", "foo-2"]);
  });

  it("closes a four-backtick fence only at four or more backticks", () => {
    const text = "````md\n```\n# Hidden\n```\n````\n\n# Real\n";
    expect(markdownHeadings(text)).toEqual(["Real"]);
  });

  it("recognises tilde fences", () => {
    const text = "~~~\n# Hidden\n~~~\n\n# Real\n";
    expect(markdownHeadings(text)).toEqual(["Real"]);
  });

  it("does not read anchors out of fenced examples", () => {
    const text = "```md\nsee [x](#not-a-real-anchor)\n```\n\n[real](#real)\n\n## Real\n";
    expect(anchorsOutsideFences(text)).toEqual(["real"]);
  });
});

describe("vendored trees are excluded from the anchor scan", () => {
  const vendoredRealRoots = new Set(
    discoverVendoredRoots(REPO_ROOT).map((root) => {
      try {
        return realpathSync(join(REPO_ROOT, root.path));
      } catch {
        return join(REPO_ROOT, root.path);
      }
    }),
  );

  // Mirrors `markdownFiles` in the guard: `readdirSync(..., {withFileTypes:true})`
  // does not follow symlinks, so `.claude/skills/<name>` is not descended and the
  // same tree is reached as `.agents/skills/<name>`.
  const candidateFiles: string[] = [];
  const walk = (dir: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) candidateFiles.push(full);
    }
  };
  for (const root of SKILL_ROOTS) walk(join(REPO_ROOT, root));

  const vendoredFiles = candidateFiles.filter((file) => {
    const real = realpathSync(file);
    return [...vendoredRealRoots].some((root) => real === root || real.startsWith(root + sep));
  });

  it("actually finds vendored markdown to exclude", () => {
    // Without this the assertion below would hold vacuously.
    expect(vendoredFiles.length).toBeGreaterThan(0);
  });

  it("scans every non-vendored file and no vendored one", () => {
    // This is the assertion that fails when the exclusion silently stops working.
    // `.claude/skills/<name>` symlinks to `.agents/skills/<name>`, so the baseline
    // records one spelling while the walk produces the other; comparing the two
    // literally excluded nothing for 6 of the 10 vendored roots.
    const { scanned, skippedSnapshot } = findBrokenAnchors(REPO_ROOT);
    expect(scanned + skippedSnapshot).toBe(candidateFiles.length - vendoredFiles.length);
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
