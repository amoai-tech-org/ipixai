import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  BASELINE_FILENAME,
  baselinePath,
  buildBaseline,
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
