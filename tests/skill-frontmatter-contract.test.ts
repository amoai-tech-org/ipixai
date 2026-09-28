import { type Stats, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";
import { discoverVendoredRoots } from "../scripts/skills-vendor-baseline.mjs";

/**
 * SKILLS-001 · IPI-1371 — every `SKILL.md` must be loadable through valid frontmatter.
 *
 * A skill is discovered through its YAML frontmatter: `name` is the skill's identity
 * and `description` is the trigger text the model selects on. If the frontmatter does
 * not parse, neither is readable, so the skill silently stops being selected — the
 * failure looks like "the model ignored my skill", not like a broken file.
 *
 * Why this guard exists: this PR's description rewrite produced
 *
 *   description: Drive a real browser ... how a page actually behaves or renders: verifying ...
 *
 * The `: ` after `renders` closes the plain scalar and opens a nested mapping, which is
 * a hard YAML error. Every other skill guard stayed green while the file was unloadable,
 * because none of them read frontmatter: `scripts/skill-registry.mjs` never parses it,
 * `registry.json` carries its own separate `summary`, and `scripts/skills-vendor-baseline.mjs`
 * reads frontmatter with a bespoke key scan rather than a YAML parser.
 *
 * When this fails, fix the YAML — quote the value or fold it into a block scalar (house
 * style: `.claude/skills/ipix-supabase/SKILL.md`) — rather than relaxing the assertion.
 */

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKILL_ROOTS = [".agents/skills", ".claude/skills"] as const;

/**
 * Agent Skills spec: non-empty, lowercase alphanumerics in hyphen-separated
 * segments; 64 characters max.
 *
 * Deliberately not `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`. That nested quantifier trips a
 * static ReDoS heuristic, and although the character classes are disjoint (so it
 * is in fact linear), the explicit form below cannot be mistaken for a risk and
 * costs nothing. The two are equivalent, and a test pins that over a generated
 * corpus rather than asserting it in prose.
 */
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

function isValidSkillName(name: string): boolean {
  if (name.length === 0 || name.startsWith("-") || name.endsWith("-") || name.includes("--")) {
    return false;
  }
  return [...name].every(
    (character) =>
      (character >= "a" && character <= "z") ||
      (character >= "0" && character <= "9") ||
      character === "-",
  );
}

interface SkillFile {
  /** Repository-relative POSIX path, e.g. `.agents/skills/mastra/SKILL.md`. */
  path: string;
  /** Frontmatter body without its `---` fences, or null when there is no block. */
  frontmatter: string | null;
}

type ParseResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

function readFrontmatter(absolute: string): string | null {
  const match = readFileSync(absolute, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

/**
 * Every `SKILL.md` under the skill roots, deduplicated by real path.
 *
 * `.claude/skills/<name>` is normally a symlink to `.agents/skills/<name>` (the
 * one-real-copy rule), so walking both roots visits the same file twice; without
 * deduplication every genuine failure would be reported twice.
 */
function findSkillFiles(): SkillFile[] {
  const found = new Map<string, SkillFile>();
  const visitedDirectories = new Set<string>();

  const walk = (directory: string): void => {
    let realDirectory: string;
    try {
      realDirectory = realpathSync(directory);
    } catch {
      return;
    }
    if (visitedDirectories.has(realDirectory)) return;
    visitedDirectories.add(realDirectory);

    let entries: string[];
    try {
      entries = readdirSync(directory);
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolute = join(directory, entry);
      let stats: Stats;
      try {
        // statSync, not the Dirent: `.claude/skills/<name>` is a symlink and
        // `isDirectory()` on the link itself would be false.
        stats = statSync(absolute);
      } catch {
        continue;
      }
      if (stats.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (entry !== "SKILL.md") continue;

      const realFile = realpathSync(absolute);
      if (found.has(realFile)) continue;
      found.set(realFile, {
        path: relative(REPO_ROOT, absolute).split("\\").join("/"),
        frontmatter: readFrontmatter(absolute),
      });
    }
  };

  for (const root of SKILL_ROOTS) walk(join(REPO_ROOT, root));
  return [...found.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function parseFrontmatter(file: SkillFile): ParseResult {
  if (file.frontmatter === null) {
    return { ok: false, error: "no `---` frontmatter block found" };
  }
  const document = parseDocument(file.frontmatter);
  const [firstError] = document.errors;
  if (firstError) {
    return { ok: false, error: firstError.message.split("\n")[0] ?? "YAML parse error" };
  }
  const data = document.toJS() as unknown;
  if (data === null || typeof data !== "object") {
    return { ok: false, error: "frontmatter is not a YAML mapping" };
  }
  return { ok: true, data: data as Record<string, unknown> };
}

/** Every string of the given length drawn from `alphabet`. */
function everyString(alphabet: string[], length: number): string[] {
  let result = [""];
  for (let index = 0; index < length; index += 1) {
    result = result.flatMap((prefix) => alphabet.map((character) => prefix + character));
  }
  return result;
}

const SKILL_FILES = findSkillFiles();
const PARSED = SKILL_FILES.map((file) => ({ file, result: parseFrontmatter(file) }));
const LOADABLE = PARSED.flatMap(({ file, result }) =>
  result.ok ? [{ file, data: result.data }] : [],
);

describe("every SKILL.md is discoverable through valid frontmatter", () => {
  it("discovers a non-trivial number of skill files", () => {
    // Guards against the walk silently finding nothing, which would make every
    // assertion below vacuously true.
    expect(SKILL_FILES.length).toBeGreaterThan(20);
  });

  it("every SKILL.md has a parseable YAML frontmatter block", () => {
    const unparseable = PARSED.filter(({ result }) => !result.ok).map(({ file, result }) => ({
      path: file.path,
      error: result.ok ? "" : result.error,
    }));
    expect(
      unparseable,
      "SKILL.md frontmatter must be valid YAML, or the skill's name and trigger " +
        "description cannot be read and the skill stops being selected. A common cause " +
        "is a `: ` inside an unquoted description; quote the value or fold it into a " +
        "block scalar.",
    ).toEqual([]);
  });

  it("every loadable frontmatter declares a valid skill name", () => {
    const invalid = LOADABLE.flatMap(({ file, data }) => {
      const name = data.name;
      if (typeof name !== "string" || name.length === 0) {
        return [{ path: file.path, problem: "`name` is missing or is not a string" }];
      }
      const problems: string[] = [];
      if (name.length > MAX_NAME_LENGTH) {
        problems.push(`\`name\` is ${name.length} characters (max ${MAX_NAME_LENGTH})`);
      }
      if (!isValidSkillName(name)) {
        problems.push(`\`name\` "${name}" is not lowercase letters, digits and hyphens`);
      }
      return problems.map((problem) => ({ path: file.path, problem }));
    });
    expect(invalid, "The Agent Skills spec requires a lowercase, hyphenated `name`.").toEqual([]);
  });

  it("every loadable frontmatter declares a usable description", () => {
    const invalid = LOADABLE.flatMap(({ file, data }) => {
      const description = data.description;
      if (typeof description !== "string" || description.trim().length === 0) {
        return [{ path: file.path, problem: "`description` is missing or empty" }];
      }
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        return [
          {
            path: file.path,
            problem: `\`description\` is ${description.length} characters (max ${MAX_DESCRIPTION_LENGTH})`,
          },
        ];
      }
      return [];
    });
    expect(
      invalid,
      "`description` is the primary trigger for a skill, so it must be present and " +
        "within the spec's length limit.",
    ).toEqual([]);
  });

  it("a canonical .agents/skills/<name>/SKILL.md declares that same name", () => {
    const mismatched = LOADABLE.filter(({ file }) =>
      /^\.agents\/skills\/[^/]+\/SKILL\.md$/.test(file.path),
    ).flatMap(({ file, data }) => {
      const directory = basename(dirname(join(REPO_ROOT, file.path)));
      return data.name === directory
        ? []
        : [{ path: file.path, declared: String(data.name), directory }];
    });
    expect(
      mismatched,
      "A skill's frontmatter `name` must match its directory under the canonical " +
        "`.agents/skills/` tree, which is what `registry.json` points at. Nested " +
        "upstream packs are excluded: they legitimately namespace their `name`.",
    ).toEqual([]);
  });

  it("the explicit name check is equivalent to an independent oracle", () => {
    // A deliberately different decomposition from the shipped `isValidSkillName`.
    // The shipped check validates characters and rejects leading, trailing and
    // doubled hyphens; this one splits on hyphens and validates the segments. Two
    // different algorithms have to be wrong the same way to agree falsely, which
    // is the point of having a second one at all.
    //
    // It is not the spec's literal `/^[a-z0-9]+(?:-[a-z0-9]+)*$/: that nested
    // quantifier trips a static ReDoS heuristic on every run. The pattern is in
    // fact linear — the classes are disjoint, so there is no ambiguity to
    // backtrack into — but the segment form states the same rule without being
    // mistakable for a risk, and losing nothing is better than winning an argument.
    const specOracle = (name: string): boolean =>
      name.length > 0 &&
      name.split("-").every(
        (segment) =>
          segment.length > 0 &&
          [...segment].every(
            (character) =>
              (character >= "a" && character <= "z") || (character >= "0" && character <= "9"),
          ),
      );
    const alphabet = ["a", "z", "0", "9", "-", "A", "_"];
    const candidates = [
      "",
      "-",
      "--",
      "a",
      "ab",
      "a-b",
      "a--b",
      "-a",
      "a-",
      "a-1",
      "1-a",
      "A",
      "aB",
      "a_b",
      "a.b",
      "a/b",
      "a b",
      "a--",
      "--a",
      "a-b-c",
      "a-1-b",
      "playwright-cli",
      "qa-pr-analysis",
      "ipix",
      "0",
      "9-9",
      "-a-",
      "a".repeat(64),
      "a".repeat(65),
      ...Array.from({ length: 5 }, (_, length) => everyString(alphabet, length)).flat(),
    ];
    const disagreements = candidates.filter(
      (candidate) => isValidSkillName(candidate) !== specOracle(candidate),
    );
    expect(
      disagreements,
      "`isValidSkillName` and the Agent Skills spec regex disagree; the explicit " +
        "form is supposed to encode the same rule.",
    ).toEqual([]);
  });
});

/**
 * IPI-1374 leaf 1 — an auto-invokable skill must say *when* to use it.
 *
 * `description` is the only text the model routes on, so a description that only
 * states WHAT a skill does makes selection a guess. A full re-audit of all 53
 * canonical skills found exactly three without a WHEN clause, and all three are
 * legitimate exemptions rather than defects:
 *
 *   - `improve-test-cases` and `qa-automation-test-consolidation` are hash-locked
 *     vendored snapshots (`skills-lock.json`, author Testomat.io). Editing them is
 *     forbidden, and the next re-vendor would discard the edit, so their routing is
 *     carried by `registry.json` metadata instead — asserted below.
 *   - `to-spec` sets `disable-model-invocation: true`, so it is never auto-selected
 *     and needs no trigger prose. The rule below skips it for that reason.
 *
 * The two earlier audits that fed IPI-1371 and IPI-1374 disagreed because a loose
 * "does it look like a trigger?" eyeball is unstable. This states the rule
 * mechanically and pins the detector against samples in both directions.
 */
const TRIGGER_MARKERS = [
  "use this when",
  "use when",
  "use whenever",
  "use for",
  "use on",
  "use before",
  "use during",
  "use after",
  "use it when",
  "use to",
  "use as",
  "use this",
  "applies when",
  "applies to",
  "activates",
  "triggers",
  "trigger",
  "when the user",
  "when asked",
  "when you",
  "when a ",
  "when an ",
  "whenever",
  "should be used",
  "used when",
  "asks about",
  "mentions",
];

function statesWhenToUse(description: string): boolean {
  const text = description.toLowerCase();
  return TRIGGER_MARKERS.some((marker) => text.includes(marker));
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

function isVendoredSkillPath(path: string): boolean {
  let real: string;
  try {
    real = realpathSync(join(REPO_ROOT, path));
  } catch {
    real = join(REPO_ROOT, path);
  }
  return [...VENDORED_REAL_ROOTS].some((root) => real === root || real.startsWith(root + sep));
}

const REGISTRY = JSON.parse(
  readFileSync(join(REPO_ROOT, ".agents/skills/registry.json"), "utf8"),
) as {
  skills: Record<string, { modes?: string[]; do_not_use_for?: string[] }>;
};

describe("an auto-invokable skill states when to use it (IPI-1374)", () => {
  const canonical = LOADABLE.filter(({ file }) => file.path.startsWith(".agents/skills/"));
  const modelInvocable = canonical.filter(({ data }) => data["disable-model-invocation"] !== true);
  const nonVendored = modelInvocable.filter(({ file }) => !isVendoredSkillPath(file.path));

  it("the trigger detector separates WHEN descriptions from WHAT-only ones", () => {
    // Non-vacuity: a detector that returned true (or false) unconditionally would
    // make the rule below either vacuous or permanently red.
    const shouldMatch = [
      "Use when the user asks to deploy the planner.",
      "Applies when working with shadcn/ui or a components.json file.",
      "This skill should be used when writing or reviewing React code.",
      "Use on every substantial Linear task and PR to model architecture.",
    ];
    const shouldNotMatch = [
      "Convert approved manual test cases into maintainable automated tests.",
      "Detect redundant tests, duplicated test logic, and semantic overlaps.",
      "Mermaid diagrams as an iPix engineering reasoning tool, not presentation.",
      "Detect flaky tests and trim the suite.",
    ];
    expect(shouldMatch.filter((text) => !statesWhenToUse(text))).toEqual([]);
    expect(shouldNotMatch.filter((text) => statesWhenToUse(text))).toEqual([]);
  });

  it("checks a non-trivial share of the tree rather than a handful of files", () => {
    expect(canonical.length).toBeGreaterThan(45);
    expect(nonVendored.length).toBeGreaterThan(30);
    // The exemptions must be live: if nothing were exempt, the rule below would be
    // hiding a regression behind a filter that no longer matches anything.
    expect(canonical.length - nonVendored.length).toBeGreaterThan(0);
  });

  it("every model-invocable, non-vendored skill states when to use it", () => {
    const silent = nonVendored
      .filter(({ data }) => !statesWhenToUse(String(data.description ?? "")))
      .map(({ file }) => file.path);
    expect(
      silent,
      "A skill the model can auto-select must state when to use it; a WHAT-only " +
        "`description` makes routing a guess. Add a WHEN clause, or — if the skill " +
        "is hash-locked vendored — record routing in registry.json instead.",
    ).toEqual([]);
  });

  it("vendored skills that cannot state a trigger carry registry routing metadata instead", () => {
    const exempt = canonical.filter(
      ({ file, data }) =>
        isVendoredSkillPath(file.path) && !statesWhenToUse(String(data.description ?? "")),
    );
    expect(
      exempt.length,
      "expected the frozen-description exemption to match the known vendored skills",
    ).toBeGreaterThan(0);
    const missing = exempt
      .filter(({ file }) => {
        const name = basename(dirname(join(REPO_ROOT, file.path)));
        const entry = REGISTRY.skills[name];
        return !entry || !(entry.modes ?? []).length || !(entry.do_not_use_for ?? []).length;
      })
      .map(({ file }) => file.path);
    expect(
      missing,
      "A vendored skill whose upstream description carries no WHEN clause must still be " +
        "routable, so registry.json needs non-empty `modes` and `do_not_use_for`.",
    ).toEqual([]);
  });
});
