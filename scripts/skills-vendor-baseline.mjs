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

/** Deterministic hash of a directory tree: sorted `relpath\0base64(bytes)`. */
export function hashTree(dir) {
  const entries = [];
  const walk = (current) => {
    for (const name of readdirSync(current).sort()) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else {
        const rel = relative(dir, full).split(sep).join("/");
        entries.push(`${rel}\u0000${readFileSync(full).toString("base64")}`);
      }
    }
  };
  walk(dir);
  return createHash("sha256").update(entries.join("\n")).digest("hex");
}

/** Every `references/**` subtree that is a vendor pack rather than iPix content. */
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
      const first = readFrontmatter(join(current, markdown[0]));
      const author = frontValue(first, "author");
      const hub = frontValue(first, "hub");
      const anyIpixOverlay = markdown.some((name) =>
        isIpixOverlay(readFrontmatter(join(current, name))),
      );
      if (
        (isUpstreamAuthor(author) || (hub.length > 0 && isUpstreamAuthor(hub))) &&
        !anyIpixOverlay
      ) {
        found.push({
          path: current,
          reason: `markdown frontmatter declares upstream author/hub ("${author || hub}")`,
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
  walk(skillDir);
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
    console.log(`${names.length} vendored trees discovered:`);
    for (const name of names) console.log(`   ${name}\n       ${built.skills[name].reason}`);
  }
}
