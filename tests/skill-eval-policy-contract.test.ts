import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { discoverVendoredRoots } from "../scripts/skills-vendor-baseline.mjs";

/**
 * IPI-1374 leaf 5 — enforce the skill-eval policy decided in ADR 005.
 *
 * ADR 005 separates three things that were being conflated:
 *
 *   1. `evals/trigger-eval.json`  — routing/description discrimination.
 *   2. `evals/evals.json`         — behavioural output-quality benchmark.
 *   3. repository contract tests  — structural/invariant proof.
 *
 * It decides that contract tests are the merge gate, that `evals/evals.json` is
 * required only for a skill whose purpose is to change what the model decides or
 * does, and that the named tranche gains a set when it is next materially
 * modified. Until this file existed, that decision was prose only: nothing failed
 * if a shipped eval set was deleted or emptied, and nothing stopped an eval from
 * being added to a hash-locked vendored tree that the next re-vendor would discard.
 *
 * Scope note: this guards the *policy boundary*, not eval quality. Whether an
 * assertion is a good assertion is a review question; whether a required set still
 * exists and is structurally usable is mechanical, and that is what runs here.
 */

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKILLS_ROOT = resolve(REPO_ROOT, ".agents/skills");

/** ADR 005: "(`pr`, `mastra`, and `shadcn` already have one.)" */
const ALREADY_SHIP_EVAL = ["mastra", "pr", "shadcn"];

/** ADR 005: the tranche that must gain a set when next materially modified. */
const EVAL_REQUIRED_NEXT_CHANGE = [
  "tasks",
  "task-verifier",
  "mermaid-diagrams",
  "explain",
  "domain-modeling",
  "requirements",
  "writing-plans",
];

const POLICY_TRANCHE = [...new Set([...ALREADY_SHIP_EVAL, ...EVAL_REQUIRED_NEXT_CHANGE])].sort();

function canonicalSkillNames(): string[] {
  return readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(SKILLS_ROOT, entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();
}

function evalPath(name: string): string {
  return join(SKILLS_ROOT, name, "evals", "evals.json");
}

function shipsEval(name: string): boolean {
  return existsSync(evalPath(name));
}

const VENDORED_REAL_ROOTS = new Set(
  discoverVendoredRoots(REPO_ROOT).map((root) => {
    try {
      return realpathSync(join(REPO_ROOT, root.path));
    } catch {
      return join(REPO_ROOT, root.path);
    }
  }),
);

function isVendored(name: string): boolean {
  let real: string;
  try {
    real = realpathSync(join(SKILLS_ROOT, name));
  } catch {
    real = join(SKILLS_ROOT, name);
  }
  return [...VENDORED_REAL_ROOTS].some((root) => real === root || real.startsWith(root + sep));
}

describe("skill eval policy follows ADR 005 (IPI-1374)", () => {
  it("every skill the ADR names still exists", () => {
    const known = new Set(canonicalSkillNames());
    const unknown = POLICY_TRANCHE.filter((name) => !known.has(name));
    expect(
      unknown,
      "ADR 005 names skills that no longer exist; update the ADR and this tranche " +
        "together rather than letting the policy point at a renamed or removed skill.",
    ).toEqual([]);
  });

  it("the skills the ADR says already ship an eval set still ship one", () => {
    // This is the assertion that fails when a required behavioural eval disappears.
    const missing = ALREADY_SHIP_EVAL.filter((name) => !shipsEval(name));
    expect(
      missing,
      "ADR 005 records these skills as already carrying `evals/evals.json`. " +
        "Deleting one silently drops the only behavioural check the skill has.",
    ).toEqual([]);
  });

  it("no skill outside the ADR tranche ships a behavioural eval", () => {
    // Allows a tranche member to gain its eval early, while catching an eval added
    // to a skill the policy has not accepted as behaviour-shaping.
    const offenders = canonicalSkillNames().filter(
      (name) => shipsEval(name) && !POLICY_TRANCHE.includes(name),
    );
    expect(
      offenders,
      "A behavioural eval was added to a skill outside the ADR 005 tranche. Either the " +
        "skill genuinely changes behaviour — then extend the ADR and this tranche — or the " +
        "eval asserts nothing meaningful and should not gate the suite.",
    ).toEqual([]);
  });

  it("every shipped eval set is structurally usable", () => {
    const problems: string[] = [];
    for (const name of canonicalSkillNames().filter(shipsEval)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(evalPath(name), "utf8"));
      } catch (error) {
        problems.push(`${name}: evals.json is not valid JSON (${String(error)})`);
        continue;
      }
      if (parsed === null || typeof parsed !== "object") {
        problems.push(`${name}: evals.json is not a JSON object`);
        continue;
      }
      const record = parsed as Record<string, unknown>;
      if (typeof record.skill_name !== "string" || record.skill_name.trim().length === 0) {
        problems.push(`${name}: missing non-empty \`skill_name\``);
      }
      const cases = record.evals;
      if (!Array.isArray(cases) || cases.length === 0) {
        problems.push(`${name}: \`evals\` must be a non-empty array`);
        continue;
      }
      cases.forEach((entry, index) => {
        const item = (entry ?? {}) as Record<string, unknown>;
        if (typeof item.prompt !== "string" || item.prompt.trim().length === 0) {
          problems.push(`${name}: evals[${index}] has no usable \`prompt\``);
        }
      });
    }
    expect(
      problems,
      "An eval set that parses to zero cases, or to cases with no prompt, cannot fail " +
        "and so cannot verify anything — it is documentation wearing a test's clothes.",
    ).toEqual([]);
  });

  it("no hash-locked vendored skill ships a behavioural eval", () => {
    const offenders = canonicalSkillNames().filter((name) => shipsEval(name) && isVendored(name));
    expect(
      offenders,
      "ADR 005: do not add an eval to a vendored tree — the next sync discards it. " +
        "Contribute the eval upstream instead.",
    ).toEqual([]);
  });

  it("exercises a non-trivial corpus so the rules above cannot pass vacuously", () => {
    const names = canonicalSkillNames();
    expect(names.length).toBeGreaterThan(45);
    expect(names.filter(shipsEval).length).toBeGreaterThan(0);
    expect(POLICY_TRANCHE.length).toBeGreaterThan(0);
    // The vendored filter must be live, or "no vendored skill ships an eval" would
    // be true simply because nothing is ever classified vendored.
    expect(names.filter(isVendored).length).toBeGreaterThan(0);
    expect(basename(SKILLS_ROOT)).toBe("skills");
  });
});
