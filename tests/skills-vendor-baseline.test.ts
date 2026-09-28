import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

import {
  BASELINE_FILENAME,
  baselinePath,
  buildBaseline,
  diffBaseline,
  discoverVendoredRoots,
} from "../scripts/skills-vendor-baseline.mjs";

/**
 * SKILLS-001 · IPI-1371 — vendored skill content must not drift silently.
 *
 * `skills-lock.json` records 18 vendored skills with a `computedHash`, but that
 * hash is produced by the external vendoring tool and cannot be recomputed here
 * (verified: it is not `sha256` of `SKILL.md`, nor of the skill tree under any
 * obvious normalisation). This test supplies the guard the repository can
 * actually enforce.
 *
 * Why it matters: an edit to vendored content is lost on the next upstream sync,
 * and nothing notices in the meantime. That nearly shipped — a table-of-contents
 * pass briefly covered `cloudinary/references/official/` and the
 * `nextjs-developer` pack before being reverted.
 *
 * When this fails, do not edit the baseline to make it pass. Vendored content
 * changes by re-vendoring from upstream; then regenerate with:
 *
 *   node scripts/skills-vendor-baseline.mjs --write
 */

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("vendored skill content is unchanged", () => {
  const current = buildBaseline(REPO_ROOT);
  const file = baselinePath(REPO_ROOT);

  it("has a committed baseline", () => {
    expect(
      existsSync(file),
      `Missing ${BASELINE_FILENAME}. Generate it with: node scripts/skills-vendor-baseline.mjs --write`,
    ).toBe(true);
  });

  it("baseline covers exactly the vendored trees that exist now", () => {
    const committed = JSON.parse(readFileSync(file, "utf8")) as {
      skills: Record<string, unknown>;
    };
    const missing = Object.keys(current.skills).filter((k) => !(k in committed.skills));
    const stale = Object.keys(committed.skills).filter((k) => !(k in current.skills));
    expect(
      { missing, stale },
      "The set of vendored trees changed. A new vendored pack means the discovery rule found " +
        "upstream content that was not previously tracked; a removed one means a pack was " +
        `deleted or re-vendored. Re-run: node scripts/skills-vendor-baseline.mjs --write`,
    ).toEqual({ missing: [], stale: [] });
  });

  it("every vendored tree still matches its recorded hash", () => {
    const committed = JSON.parse(readFileSync(file, "utf8")) as {
      skills: Record<string, { hash: string; reason: string }>;
    };
    const drifted = Object.entries(current.skills)
      .filter(([path, entry]) => committed.skills[path]?.hash !== entry.hash)
      .map(([path, entry]) => ({
        path,
        expected: committed.skills[path]?.hash?.slice(0, 12) ?? "(absent)",
        actual: entry.hash.slice(0, 12),
      }));
    expect(
      drifted,
      "Vendored content was edited in place. Those edits are lost on the next upstream sync, " +
        "so re-vendor from the upstream source instead, then regenerate the baseline with " +
        "`node scripts/skills-vendor-baseline.mjs --write`.",
    ).toEqual([]);
  });

  it("discovers a non-trivial number of vendored trees", () => {
    // Guards against the discovery rule silently returning nothing, which would
    // make every assertion above vacuously true.
    expect(Object.keys(current.skills).length).toBeGreaterThan(3);
  });
});

describe("reference-pack discovery reads every markdown file", () => {
  const created: string[] = [];
  afterAll(() => {
    for (const root of created) rmSync(root, { recursive: true, force: true });
  });

  const upstream = (author: string): string => `---\nauthor: ${author}\nversion: 1.0.0\n---\n\n# x\n`;

  const makeRepo = (files: Record<string, string>): string => {
    const root = mkdtempSync(join(tmpdir(), "ipix-vendor-"));
    created.push(root);
    for (const [relativePath, body] of Object.entries(files)) {
      const full = join(root, relativePath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, body);
    }
    return root;
  };

  const host = { ".agents/skills/host/SKILL.md": "---\nname: host\ndescription: d\n---\n" };

  it("classifies a pack when every markdown file declares upstream", () => {
    const root = makeRepo({
      ...host,
      ".agents/skills/host/references/pack/00-intro.md": upstream("upstream-co"),
      ".agents/skills/host/references/pack/official.md": upstream("upstream-co"),
    });
    expect(discoverVendoredRoots(root).map((entry) => entry.path)).toContain(
      ".agents/skills/host/references/pack",
    );
  });

  it("does not classify a mixed directory, which would freeze iPix-authored siblings", () => {
    // The real case: `.claude/skills/ipix-supabase/references/` holds one upstream
    // snapshot (`postgres-best-practices.md`, `metadata.author: supabase`) beside
    // three iPix-authored files. Treating the directory as a pack would put those
    // three behind the drift guard and drop them from the anchor guard too.
    //
    // Residual limitation, stated rather than hidden: a genuinely mixed directory
    // is therefore not classified as a pack. `UPSTREAM.md` remains the explicit
    // marker for a pack, and per-file snapshots are outside tree-level hashing.
    const root = makeRepo({
      ...host,
      ".agents/skills/host/references/mixed/00-intro.md": "# iPix-authored, no frontmatter\n",
      ".agents/skills/host/references/mixed/official.md": upstream("upstream-co"),
    });
    expect(discoverVendoredRoots(root).map((entry) => entry.path)).not.toContain(
      ".agents/skills/host/references/mixed",
    );
  });

  it("still honours UPSTREAM.md regardless of markdown frontmatter", () => {
    const root = makeRepo({
      ...host,
      ".agents/skills/host/references/pack/UPSTREAM.md": "# vendored from upstream\n",
      ".agents/skills/host/references/pack/index.md": "# no frontmatter at all\n",
    });
    expect(discoverVendoredRoots(root).map((entry) => entry.path)).toContain(
      ".agents/skills/host/references/pack",
    );
  });

  it("does not classify a pack that carries an iPix overlay", () => {
    const root = makeRepo({
      ...host,
      ".agents/skills/host/references/pack/a.md": upstream("upstream-co"),
      ".agents/skills/host/references/pack/b.md":
        "---\nauthor: upstream-co\nversion: 1.1.0-ipix.2\n---\n\n# ours\n",
    });
    expect(discoverVendoredRoots(root).map((entry) => entry.path)).not.toContain(
      ".agents/skills/host/references/pack",
    );
  });
});

describe("the vendor check can actually fail", () => {
  const built = {
    skills: {
      "a/one": { reason: "x", files: 1, hash: "aaaa" },
      "a/two": { reason: "x", files: 1, hash: "bbbb" },
    },
  };

  it("reports no drift when the committed baseline matches", () => {
    expect(diffBaseline(built, built)).toEqual({ missing: [], stale: [], drifted: [] });
  });

  it("reports an in-place edit", () => {
    const committed = { skills: { ...built.skills, "a/two": { reason: "x", files: 1, hash: "cccc" } } };
    expect(diffBaseline(committed, built).drifted).toEqual([
      { path: "a/two", expected: "cccc", actual: "bbbb" },
    ]);
  });

  it("reports a new and a removed pack", () => {
    const committed = { skills: { "a/one": { reason: "x", files: 1, hash: "aaaa" }, "a/gone": { reason: "x", files: 1, hash: "dddd" } } };
    expect(diffBaseline(committed, built)).toMatchObject({ missing: ["a/two"], stale: ["a/gone"] });
  });

  it("wires that comparison into the check command instead of only printing", () => {
    // The command is named `skills:vendor:check`; before this it printed the
    // discovered trees and exited 0 no matter what drifted, which is a comfort
    // rather than a guard. Pinned structurally because the CLI resolves its own
    // repository root and cannot be pointed at a fixture.
    const source = readFileSync(
      fileURLToPath(new URL("../scripts/skills-vendor-baseline.mjs", import.meta.url)),
      "utf8",
    );
    const checkBranch = source.slice(source.indexOf("} else {"));
    expect(checkBranch).toContain("diffBaseline(");
    expect(checkBranch).toContain("process.exitCode = 1");
  });
});
