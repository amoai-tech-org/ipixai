import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverVendoredRoots } from "./skills-vendor-baseline.mjs";

/**
 * SKILLS-001 · IPI-1371 — same-file anchor guard for skill markdown.
 *
 * Why this exists: this PR shipped 11 reference files whose generated table of
 * contents pointed at anchors that do not exist, because the generator and the
 * verifier shared one slug function and agreed with each other rather than with
 * GitHub. Review caught it. Scanning for the failure mode afterwards found 22
 * more hand-written anchors already broken, the oldest predating this work.
 *
 * The slug rule below is GitHub's, implemented here rather than pulled in as a
 * dependency. It is validated two ways: by the conformance vector in
 * `tests/skills-reference-anchors.test.ts` (expected values taken from
 * `github-slugger`, the implementation GitHub uses), and at authoring time by
 * comparing this function against that package across every heading in the
 * repository — see the PR evidence. Expected values therefore come from an
 * independent source of truth, not from this implementation.
 *
 * Scope rules — a file is skipped when it is vendored (see
 * `skills-vendor-baseline.mjs`) or when its frontmatter declares an external
 * `source:`, which marks a documentation snapshot whose internal links follow
 * the source renderer's conventions (Mintlify `\[#anchor]`, for example) rather
 * than GitHub's.
 */

const SKILL_ROOTS = [".claude/skills", ".agents/skills"];
const SKIP_PATH_SEGMENTS = ["node_modules"];

/** GitHub's heading slug: lowercase, strip punctuation (keep `-`/`_`), spaces to `-`. */
export function githubSlug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
    .replace(/ /g, "-");
}

/**
 * Slugs for a heading list, in document order, with GitHub's dedupe.
 *
 * GitHub's rule (the one `github-slugger` implements) is a `while` loop, not a
 * one-shot suffix: it keeps bumping the counter until it lands on a slug that is
 * still free. Getting this wrong is subtle and was a real defect here — for
 * headings `Foo`, `Foo`, `Foo-1` a one-shot counter yields `foo`, `foo-1` and
 * then reuses `foo-1`, while GitHub yields `foo`, `foo-1`, `foo-1-1`. The reuse
 * makes this guard accept a link to an id no heading owns, and reject a link to
 * the id GitHub does create.
 */
export function headingSlugSet(headings) {
  const counters = new Map();
  const occupied = new Set();
  for (const heading of headings) {
    const base = githubSlug(heading);
    let slug = base;
    while (occupied.has(slug)) {
      const next = (counters.get(base) ?? 0) + 1;
      counters.set(base, next);
      slug = `${base}-${next}`;
    }
    occupied.add(slug);
  }
  return occupied;
}

/**
 * Lines that are not inside a fenced code block, with their 1-based line numbers.
 *
 * A fence closes only with the same marker family (backtick or tilde) and a run
 * at least as long as the opener, so a four-backtick fence may legitimately
 * contain a three-backtick line. A naive toggle invents headings and links out of
 * fenced examples: it treats `# example` inside a fence as a real heading, and
 * reports an example `](#missing)` as a broken anchor. Both are false positives,
 * which is the failure mode this guard is supposed to prevent, not cause.
 */
export function linesOutsideFences(text) {
  const outside = [];
  let fence = null;
  text.split(/\r?\n/).forEach((line, index) => {
    const match = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      const closes =
        match !== null &&
        match[1][0] === fence.marker &&
        match[1].length >= fence.length &&
        (fence.marker === "~" || match[2].trim() === "");
      if (closes) fence = null;
      return;
    }
    if (match) {
      fence = { marker: match[1][0], length: match[1].length };
      return;
    }
    outside.push({ number: index + 1, text: line });
  });
  return outside;
}

/** Heading texts (H1–H6) outside fenced code blocks. */
export function markdownHeadings(text) {
  const headings = [];
  for (const { text: line } of linesOutsideFences(text)) {
    const match = line.match(/^#{1,6}\s+(.*?)\s*$/);
    if (match) headings.push(match[1]);
  }
  return headings;
}

function declaresExternalSource(text) {
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!front) return false;
  const source = front[1].match(/^\s*source:\s*(.+)$/m);
  return Boolean(source && /https?:\/\/|\.[a-z]{2,}\//i.test(source[1]));
}

/** Same-file anchor targets referenced as `](#anchor)`. */
export function sameFileAnchors(text) {
  return [...text.matchAll(/\]\(#([^)]+)\)/g)].map((match) => match[1]);
}

function* markdownFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_PATH_SEGMENTS.includes(entry.name)) continue;
      yield* markdownFiles(full);
    } else if (entry.name.endsWith(".md")) {
      yield full;
    }
  }
}

/** Every broken same-file anchor in an iPix-maintained skill markdown file. */
export function findBrokenAnchors(repoRoot) {
  // Canonicalise vendored roots to real paths before comparing. `.claude/skills/<name>`
  // is normally a symlink to `.agents/skills/<name>`, and `markdownFiles` descends real
  // directories rather than symlinks, so a literal comparison against the baseline's
  // spelling silently fails to exclude the tree. Verified: 6 of the 10 `.claude/`-spelled
  // vendored roots resolved to a `.agents/skills/` path that the walk actually produced,
  // so those vendored trees were being scanned despite the exclusion.
  const vendoredRealRoots = discoverVendoredRoots(repoRoot).map((root) => {
    const absolute = join(repoRoot, root.path);
    try {
      return realpathSync(absolute);
    } catch {
      return absolute;
    }
  });
  const isVendored = (file) => {
    let real;
    try {
      real = realpathSync(file);
    } catch {
      real = file;
    }
    return vendoredRealRoots.some((root) => real === root || real.startsWith(root + sep));
  };

  const broken = [];
  let scanned = 0;
  let skippedSnapshot = 0;
  for (const root of SKILL_ROOTS) {
    const base = join(repoRoot, root);
    if (!existsSync(base)) continue;
    for (const file of markdownFiles(base)) {
      if (isVendored(file)) continue;
      const rel = relative(repoRoot, file).split(sep).join("/");
      const text = readFileSync(file, "utf8");
      if (declaresExternalSource(text)) {
        skippedSnapshot += 1;
        continue;
      }
      scanned += 1;
      const valid = headingSlugSet(markdownHeadings(text));
      for (const { number, text: line } of linesOutsideFences(text)) {
        for (const anchor of sameFileAnchors(line)) {
          if (!valid.has(anchor)) broken.push({ file: rel, line: number, anchor });
        }
      }
    }
  }
  return { broken, scanned, skippedSnapshot };
}

const isCli =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isCli) {
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const { broken, scanned, skippedSnapshot } = findBrokenAnchors(repoRoot);
  console.log(
    `scanned ${scanned} skill markdown files (${skippedSnapshot} snapshots skipped); ` +
      `${broken.length} broken same-file anchors`,
  );
  for (const entry of broken) console.log(`   ${entry.file}:${entry.line}  #${entry.anchor}`);
}
