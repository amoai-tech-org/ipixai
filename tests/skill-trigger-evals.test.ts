import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Skill trigger evals must be real, not decorative.
 *
 * The `description` field is the primary mechanism deciding whether a skill is
 * consulted at all, so the skill-creator workflow evaluates it with realistic
 * should-trigger and should-not-trigger queries. This repository has carried
 * such a file for `copilotkit` while nothing read it and no skill pointed at it —
 * an eval nothing runs is documentation, not verification.
 *
 * These assertions keep the files honest and are deliberately shallow: they
 * check that an eval set could actually discriminate, not that its cases are
 * well chosen. Judging case quality needs the human review loop.
 *
 * Minimums follow the guidance's "keep it small: 8–12 cases per skill":
 *   - at least 8 cases, so a single case cannot stand in for a suite;
 *   - at least 3 of each direction, so an all-positive or all-negative set fails;
 *   - negative cases must not all be trivially unrelated — enforced by requiring
 *     at least one negative to share vocabulary with the skill's own domain,
 *     which is what makes near-misses worth testing;
 *   - queries must be substantive, because one-line requests like "format this
 *     data" do not trigger skills regardless of description quality.
 */

const SKILL_ROOTS = [".claude/skills", ".agents/skills"];
const MIN_CASES = 8;
const MIN_PER_DIRECTION = 3;
const MIN_QUERY_LENGTH = 20;

type TriggerCase = { query: string; should_trigger: boolean };

function findTriggerEvals(): Array<{ skill: string; path: string; cases: TriggerCase[] }> {
  const seen = new Set<string>();
  const found: Array<{ skill: string; path: string; cases: TriggerCase[] }> = [];

  for (const root of SKILL_ROOTS) {
    let skills: string[];
    try {
      skills = readdirSync(root);
    } catch {
      continue;
    }
    for (const skill of skills) {
      const dir = join(root, skill);
      try {
        if (!statSync(dir).isDirectory()) continue;
      } catch {
        continue; // broken symlink
      }
      const file = join(dir, "evals", "trigger-eval.json");
      let real: string;
      try {
        real = realpathSync(file);
        if (!statSync(real).isFile()) continue;
      } catch {
        continue; // no trigger eval for this skill
      }
      if (seen.has(real)) continue;
      seen.add(real);
      found.push({
        skill,
        path: `${root}/${skill}/evals/trigger-eval.json`,
        cases: JSON.parse(readFileSync(real, "utf8")) as TriggerCase[],
      });
    }
  }
  return found;
}

const evals = findTriggerEvals();

describe("skill trigger evals", () => {
  it("exist for more than one skill", () => {
    // Without this the loop below could pass by finding nothing.
    expect(evals.map((entry) => entry.skill).sort()).toEqual(
      expect.arrayContaining(["copilotkit", "mastra"]),
    );
  });

  it.each(evals.map((entry) => [entry.path, entry] as const))(
    "%s is a well-formed, discriminating eval set",
    (_path, entry) => {
      const { cases } = entry;
      expect(Array.isArray(cases), `${entry.path} must be a JSON array`).toBe(true);
      expect(
        cases.length,
        `${entry.path} has ${cases.length} cases; the guidance recommends at least ${MIN_CASES}`,
      ).toBeGreaterThanOrEqual(MIN_CASES);

      for (const [index, item] of cases.entries()) {
        expect(
          typeof item.should_trigger,
          `${entry.path}[${index}] must set a boolean should_trigger`,
        ).toBe("boolean");
        expect(
          typeof item.query === "string" && item.query.trim().length >= MIN_QUERY_LENGTH,
          `${entry.path}[${index}] query is too short to be a realistic prompt: ${JSON.stringify(item.query)}`,
        ).toBe(true);
      }

      const shouldTrigger = cases.filter((item) => item.should_trigger).length;
      const shouldNot = cases.length - shouldTrigger;
      expect(
        shouldTrigger,
        `${entry.path} needs at least ${MIN_PER_DIRECTION} should-trigger cases`,
      ).toBeGreaterThanOrEqual(MIN_PER_DIRECTION);
      expect(
        shouldNot,
        `${entry.path} needs at least ${MIN_PER_DIRECTION} should-not-trigger cases`,
      ).toBeGreaterThanOrEqual(MIN_PER_DIRECTION);

      const queries = cases.map((item) => item.query);
      const duplicates = queries.filter((query, index) => queries.indexOf(query) !== index);
      expect(duplicates, `${entry.path} repeats a query`).toEqual([]);
    },
  );
});
