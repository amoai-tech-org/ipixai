import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * SKILLS-001 · IPI-1371 — vendored-content drift guard.
 *
 * `skills-lock.json` records 18 skills vendored from upstream with a
 * `computedHash`, but nothing recomputes it: that hash is produced by the
 * external tool that performs the vendoring, and its algorithm is not in this
 * repository (verified — it is not `sha256` of `SKILL.md`, nor of the skill tree
 * under any obvious normalisation, so a test cannot reproduce it).
 *
 * The gap that leaves is real: an in-place edit to vendored content is silently
 * lost on the next sync, and nothing notices. That nearly happened — a
 * table-of-contents pass over 73 reference files briefly included
 * `cloudinary/references/official/` and the `nextjs-developer` pack.
 *
 * So this module owns a baseline the repository *can* verify: a deterministic
 * tree hash per vendored subtree, using an algorithm defined here.
 *
 * Discovery rule — a skill subtree is vendored when ANY of:
 *   1. its name appears in `skills-lock.json`; or
 *   2. its `SKILL.md` frontmatter declares an upstream author and no `-ipix`
 *      version suffix (a pure vendor snapshot rather than an iPix overlay).
 *
 * A `references/**` subtree inside an otherwise iPix-owned skill is vendored
 * when it carries an `UPSTREAM.md`, or when its markdown frontmatter declares an
 * upstream `author`/`hub` with no `-ipix` version.
 *
 * The `-ipix.N` suffix is the discriminator between "upstream snapshot we must
 * not edit" and "iPix overlay we own".
 *
 * Usage:  node scripts/skills-vendor-baseline.mjs [--write]
 */

const SEARCH_ROOTS = [".claude/skills", ".agents/skills"];
export const BASELINE_FILENAME = "skills-vendor-baseline.json";

function readFrontmatter(file) {
  if (!existsSync(file)) return {};
  const text = readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const front = {};
  let nested = null;
  for (const line of match[1].split(/\r?\n/)) {
    const indented = /^\s+\S/.test(line);
    const entry = line.match(/^\s*([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!entry) continue;
    const key = entry[1];
    const value = entry[2].trim().replace(/^["']|["']$/g, "");
    if (indented) {
      if (nested) nested[key] = value;
      continue;
    }
    if (value === "") {
      nested = {};
      front[key] = nested;
    } else {
      nested = null;
      front[key] = value;
    }
  }
  return front;
}

function frontValue(front, key) {
  const direct = front[key];
  if (typeof direct === "string") return direct;
  const meta = front.metadata;
  if (meta && typeof meta === "object" && typeof meta[key] === "string") return meta[key];
  return "";
}

/** An upstream author we do not own, as opposed to iPix's own content. */
function isUpstreamAuthor(author) {
  return author.length > 0 && !/ipix/i.test(author);
}

function isIpixOverlay(front) {
  return /-ipix\./i.test(frontValue(front, "version"));
}

/** Deterministic hash of a directory tree: sorted `relpath\0base64(bytes)`, newline-joined. */
export function hashTree(dir) {
  const paths = [];
  const walk = (current) => {
    for (const name of readdirSync(current).sort()) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else {
        paths.push(relative(dir, full).split(sep).join("/"));
      }
    }
  };
  walk(dir);

  // Collect the paths first, then read and feed one file at a time, so peak memory
  // is the largest single file rather than the whole tree. The earlier form held
  // every file's contents, and before that a second base64-inflated copy of the
  // entire tree joined into one string bounded by V8's maximum string length.
  //
  // Base64 is kept deliberately: hashing raw buffers would change every committed
  // hash for no functional gain, and the concern was holding the whole tree, not
  // the encoding. The byte stream is identical, so `skills:vendor:check` still
  // matches the committed baseline.
  const hash = createHash("sha256");
  paths.forEach((rel, index) => {
    if (index > 0) hash.update("\n");
    hash.update(`${rel}\u0000`);
    hash.update(readFileSync(join(dir, rel)).toString("base64"));
  });
  return hash.digest("hex");
}

/**
 * Every `references/**` subtree that is a vendor pack rather than iPix content.
 *
 * Only *sub*trees are considered. The skill root is classified by its own
 * `SKILL.md` frontmatter (above), never by sibling markdown: `ipix-supabase`
 * ships upstream Supabase snapshots as `postgres.md` and `client-and-auth.md`
 * (`author: supabase`) alongside its own content, so judging the root by any
 * markdown file would exempt the whole skill — including its iPix-authored
 * files — from the drift guard and the anchor guard. That is why discovery starts
 * one level down.
 */
function vendoredReferencePacks(skillDir) {
  const found = [];
  const walk = (current) => {
    let names;
    try {
      names = readdirSync(current).sort();
    } catch {
      return;
    }
    if (names.includes("UPSTREAM.md")) {
      found.push({ path: current, reason: "carries UPSTREAM.md (vendor snapshot manifest)" });
      return; // do not descend into a pack already owned as a unit
    }
    const markdown = names.filter((name) => name.endsWith(".md"));
    if (markdown.length > 0) {
      // Inspect *every* markdown file, and require them to agree, rather than
      // looking only at `markdown[0]`. Two reasons:
      //
      //  - Order independence. Reading one arbitrary file misses a pack whose
      //    upstream declaration lives in a later file, and a missed pack is never
      //    hashed, so edits to it go unchecked.
      //  - Unanimity, not "any". A single upstream file among siblings that
      //    declare nothing is a snapshot *file*, not a snapshot *directory*.
      //    `.claude/skills/ipix-supabase/references/` is exactly that case: one
      //    upstream `postgres-best-practices.md` beside three iPix-authored
      //    files. Calling the directory a pack would freeze those three behind
      //    the drift guard and drop them from the anchor guard as well.
      const fronts = markdown.map((name) => readFrontmatter(join(current, name)));
      const upstreams = fronts.map(
        (front) => frontValue(front, "author") || frontValue(front, "hub"),
      );
      if (upstreams.every((value) => isUpstreamAuthor(value)) && !fronts.some(isIpixOverlay)) {
        found.push({
          path: current,
          reason: `every markdown file declares upstream author/hub ("${upstreams[0]}")`,
        });
        return;
      }
    }
    for (const name of names) {
      const full = join(current, name);
      try {
        if (statSync(full).isDirectory()) walk(full);
      } catch {
        /* unreadable entry — not a vendored root we can hash */
      }
    }
  };

  let children;
  try {
    children = readdirSync(skillDir).sort();
  } catch {
    return found;
  }
  for (const name of children) {
    const full = join(skillDir, name);
    try {
      if (statSync(full).isDirectory()) walk(full);
    } catch {
      /* unreadable entry */
    }
  }
  return found;
}

/** Every vendored subtree in the repository, with the reason it was selected. */
export function discoverVendoredRoots(repoRoot) {
  const lockPath = join(repoRoot, "skills-lock.json");
  const locked = new Set(
    existsSync(lockPath)
      ? Object.keys(JSON.parse(readFileSync(lockPath, "utf8")).skills ?? {})
      : [],
  );

  const roots = [];
  // `.claude/skills/<name>` is normally a symlink to `.agents/skills/<name>`, so
  // the same tree is reachable by two paths. Dedupe on the real path and keep the
  // first-seen (canonical `.agents`) spelling, so the baseline has one entry per
  // actual tree rather than one per route to it.
  const seenReal = new Set();
  const push = (root) => {
    let key;
    try {
      key = realpathSync(join(repoRoot, root.path));
    } catch {
      key = root.path;
    }
    if (seenReal.has(key)) return;
    seenReal.add(key);
    roots.push(root);
  };

  for (const searchRoot of SEARCH_ROOTS) {
    const base = join(repoRoot, searchRoot);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base).sort()) {
      const skillDir = join(base, name);
      try {
        if (!statSync(skillDir).isDirectory()) continue;
      } catch {
        continue; // broken symlink
      }
      const skillFront = readFrontmatter(join(skillDir, "SKILL.md"));
      const author = frontValue(skillFront, "author");

      if (locked.has(name)) {
        push({ path: `${searchRoot}/${name}`, reason: "listed in skills-lock.json" });
        continue;
      }
      if (isUpstreamAuthor(author) && !isIpixOverlay(skillFront)) {
        push({
          path: `${searchRoot}/${name}`,
          reason: `pure vendor snapshot (author "${author}", no -ipix version)`,
        });
        continue;
      }
      for (const pack of vendoredReferencePacks(skillDir)) {
        push({
          path: relative(repoRoot, pack.path).split(sep).join("/"),
          reason: pack.reason,
        });
      }
    }
  }
  return roots.sort((a, b) => (a.path < b.path ? -1 : 1));
}

export function buildBaseline(repoRoot) {
  const skills = {};
  for (const root of discoverVendoredRoots(repoRoot)) {
    const dir = join(repoRoot, root.path);
    let files = 0;
    const count = (current) => {
      for (const name of readdirSync(current)) {
        const full = join(current, name);
        if (statSync(full).isDirectory()) count(full);
        else files += 1;
      }
    };
    count(dir);
    skills[root.path] = { reason: root.reason, files, hash: hashTree(dir) };
  }
  return {
    version: 1,
    algorithm: "sha256 over sorted `relpath\\0base64(bytes)` entries, newline-joined",
    note:
      "Generated by `node scripts/skills-vendor-baseline.mjs --write`. Vendored trees must not be " +
      "edited in place — re-vendor from upstream and refresh this file deliberately.",
    skills,
  };
}

export function baselinePath(repoRoot) {
  return join(repoRoot, BASELINE_FILENAME);
}

/**
 * How a freshly built baseline differs from the committed one.
 *
 * The command named `skills:vendor:check` must be able to fail, or it is a
 * comfort rather than a guard: a vendored file can change while the manifest
 * stays put, and a check that only prints the discovered trees exits 0 anyway.
 */
export function diffBaseline(committed, built) {
  const committedSkills = committed?.skills ?? {};
  const missing = Object.keys(built.skills).filter((path) => !(path in committedSkills));
  const stale = Object.keys(committedSkills).filter((path) => !(path in built.skills));
  const drifted = Object.keys(built.skills)
    .filter((path) => path in committedSkills && committedSkills[path].hash !== built.skills[path].hash)
    .map((path) => ({ path, expected: committedSkills[path].hash, actual: built.skills[path].hash }));
  return { missing, stale, drifted };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isCli) {
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const built = buildBaseline(repoRoot);
  const names = Object.keys(built.skills);
  if (process.argv.includes("--write")) {
    writeFileSync(baselinePath(repoRoot), `${JSON.stringify(built, null, 2)}\n`);
    console.log(`wrote ${BASELINE_FILENAME}: ${names.length} vendored trees`);
    for (const name of names) {
      console.log(`   ${built.skills[name].hash.slice(0, 12)}…  ${name}`);
    }
  } else {
    const file = baselinePath(repoRoot);
    if (!existsSync(file)) {
      console.error(
        `missing ${BASELINE_FILENAME}; generate it with: node scripts/skills-vendor-baseline.mjs --write`,
      );
      process.exitCode = 1;
    } else {
      const { missing, stale, drifted } = diffBaseline(
        JSON.parse(readFileSync(file, "utf8")),
        built,
      );
      const problems = missing.length + stale.length + drifted.length;
      if (problems === 0) {
        console.log(`${names.length} vendored trees match ${BASELINE_FILENAME}`);
      } else {
        process.exitCode = 1;
        console.error(`${problems} vendored-tree problem(s) against ${BASELINE_FILENAME}:`);
        for (const path of missing) console.error(`   not in baseline (new vendored pack?)  ${path}`);
        for (const path of stale) console.error(`   in baseline but no longer discovered   ${path}`);
        for (const entry of drifted) {
          console.error(
            `   edited in place                        ${entry.path}\n` +
              `       expected ${entry.expected.slice(0, 12)}…  actual ${entry.actual.slice(0, 12)}…`,
          );
        }
        console.error(
          "Vendored content changes by re-vendoring from upstream, then regenerate deliberately:\n" +
            "   node scripts/skills-vendor-baseline.mjs --write",
        );
      }
    }
  }
}
