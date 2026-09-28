import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

/** Slugs for a heading list, in document order, with GitHub's `-1`, `-2` dedupe. */
export function headingSlugSet(headings) {
  const seen = new Map();
  const slugs = new Set();
  for (const heading of headings) {
    const base = githubSlug(heading);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    slugs.add(count === 0 ? base : `${base}-${count}`);
  }
  return slugs;
}

/** Heading texts (H1–H6) outside fenced code blocks. */
export function markdownHeadings(text) {
  const headings = [];
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
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
  const vendoredRoots = discoverVendoredRoots(repoRoot).map((root) => root.path);
  const broken = [];
  let scanned = 0;
  let skippedSnapshot = 0;
  for (const root of SKILL_ROOTS) {
    const base = join(repoRoot, root);
    if (!existsSync(base)) continue;
    for (const file of markdownFiles(base)) {
      const rel = relative(repoRoot, file).split(sep).join("/");
      if (vendoredRoots.some((v) => rel === v || rel.startsWith(`${v}/`))) continue;
      const text = readFileSync(file, "utf8");
      if (declaresExternalSource(text)) {
        skippedSnapshot += 1;
        continue;
      }
      scanned += 1;
      const valid = headingSlugSet(markdownHeadings(text));
      text.split(/\r?\n/).forEach((line, index) => {
        for (const anchor of sameFileAnchors(line)) {
          if (!valid.has(anchor)) broken.push({ file: rel, line: index + 1, anchor });
        }
      });
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
