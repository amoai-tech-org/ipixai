import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { discoverVendoredRoots } from "../scripts/skills-vendor-baseline.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const agentsRoot = resolve(repoRoot, ".agents/skills");
const claudeRoot = resolve(repoRoot, ".claude/skills");
const registry = JSON.parse(readFileSync(resolve(agentsRoot, "registry.json"), "utf8")) as {
  skills: Record<string, { canonical: string; claude_exposed: boolean; replaces?: string[] }>;
  deprecated_aliases?: Record<string, string>;
};

function filesUnder(root: string, extensions: Set<string>): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(path, extensions));
    else if (entry.isFile() && extensions.has(extname(entry.name))) out.push(path);
  }
  return out;
}

// A hash-locked vendored tree must not be edited in place, so it cannot be held to a
// content contract that only an edit could satisfy. Exclude it here for the same reason
// `skills-reference-anchors.test.ts` excludes it: its link rot belongs upstream, and a
// frozen file under a fixable-content rule produces an unfixable red check. IPI-1374.
const vendoredRealRoots = new Set(
  discoverVendoredRoots(repoRoot).map((root) => {
    try {
      return realpathSync(join(repoRoot, root.path));
    } catch {
      return join(repoRoot, root.path);
    }
  }),
);

function isVendored(file: string): boolean {
  const real = realpathSync(file);
  return [...vendoredRealRoots].some((root) => real === root || real.startsWith(root + sep));
}

function allCanonicalSkillFiles(): string[] {
  return readdirSync(agentsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(agentsRoot, entry.name, "SKILL.md")))
    .map((entry) => resolve(agentsRoot, entry.name, "SKILL.md"));
}

function canonicalSkillFiles(): string[] {
  return allCanonicalSkillFiles().filter((file) => !isVendored(file));
}

function bodyWithoutFrontmatter(text: string): string {
  if (!text.startsWith("---\n")) return text;
  const end = text.indexOf("\n---\n", 4);
  return end === -1 ? text : text.slice(end + 5);
}

const liveSkillNames = new Set([
  ...Object.keys(registry.skills),
  ...readdirSync(claudeRoot, { withFileTypes: true })
    .filter((entry) => existsSync(resolve(claudeRoot, entry.name, "SKILL.md")))
    .map((entry) => entry.name),
]);
const deprecatedSkills = new Set([
  ...Object.values(registry.skills).flatMap((entry) => entry.replaces ?? []),
  ...Object.keys(registry.deprecated_aliases ?? {}),
]);

describe("skill reference integrity", () => {
  it("skips only hash-locked trees and still checks the iPix-maintained majority", () => {
    const all = allCanonicalSkillFiles();
    const checked = canonicalSkillFiles();
    const skipped = all.filter(isVendored);
    // Non-vacuity: the exclusion must actually match vendored trees...
    expect(skipped.length).toBeGreaterThan(0);
    expect(checked.length + skipped.length).toBe(all.length);
    // ...and must not swallow the tree it is meant to leave checked.
    expect(checked.length).toBeGreaterThan(skipped.length);
  });

  it("does not route canonical skill handoffs to removed or unknown skill names", () => {
    const offenders: string[] = [];
    const routePatterns = [
      /(?:route|hand off|delegate)[^\n.]{0,50}\bto\s+(?:the\s+)?`([a-z0-9][a-z0-9-]+)`(?:\s+skill)?/gi,
      /(?:use|with|load|invoke|call)\s+(?:the\s+)?`([a-z0-9][a-z0-9-]+)`\s+skill/gi,
    ];
    for (const file of canonicalSkillFiles()) {
      const text = bodyWithoutFrontmatter(readFileSync(file, "utf8"));
      for (const removed of deprecatedSkills) {
        if (text.includes(`\`${removed}\``) || text.includes(`${removed} skill`)) offenders.push(`${file.slice(repoRoot.length + 1)} -> removed ${removed}`);
      }
      for (const pattern of routePatterns) {
        for (const match of text.matchAll(pattern)) {
          const name = match[1];
          if (!liveSkillNames.has(name)) offenders.push(`${file.slice(repoRoot.length + 1)} -> unknown ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("resolves canonical skill reference-file links", () => {
    const missing: string[] = [];
    const linkPattern = /\[[^\]]*\]\(([^)]+\.md(?:#[^)]+)?)\)/g;
    for (const file of canonicalSkillFiles()) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(linkPattern)) {
        const target = match[1].split("#", 1)[0];
        if (/^(?:https?:|mailto:)/.test(target)) continue;
        // Intentionally validate every relative Markdown link, not only references/, to catch cross-doc rot.
        if (!existsSync(resolve(dirname(file), target))) missing.push(`${file.slice(repoRoot.length + 1)} -> ${target}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("keeps Ponytail load-bearing rules aligned across the canonical skill and Cursor adapter", () => {
    const canonical = readFileSync(resolve(agentsRoot, "ponytail/SKILL.md"), "utf8");
    const cursor = readFileSync(resolve(repoRoot, ".cursor/rules/ponytail.mdc"), "utf8");
    const invariants = [
      "Does it already exist in this codebase?",
      "input validation at trust boundaries",
      "error handling that prevents data loss",
      "security",
      "accessibility",
      "Lazy code without its check is unfinished",
      "AGENTS.md and the live Linear task still win",
    ];

    for (const invariant of invariants) {
      expect(canonical, `canonical Ponytail missing: ${invariant}`).toContain(invariant);
      expect(cursor, `Cursor Ponytail missing: ${invariant}`).toContain(invariant);
    }
  });

  it("keeps explicit skill paths and deprecated aliases out of AGENTS, Cursor rules, and scripts", () => {
    const sourceFiles = [
      resolve(repoRoot, "AGENTS.md"),
      ...filesUnder(resolve(repoRoot, ".cursor/rules"), new Set([".mdc", ".md"])),
      ...filesUnder(resolve(repoRoot, "scripts"), new Set([".mjs", ".js", ".ts", ".md"])),
    ];
    const invalidPaths: string[] = [];
    const staleAliases: string[] = [];
    const pathPattern = /\.(agents|claude)\/skills\/([a-z0-9][a-z0-9-]+)(?=\/|`|[ \t]|$)/gim;

    for (const file of sourceFiles) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(pathPattern)) {
        const target = resolve(repoRoot, `.${match[1]}/skills/${match[2]}/SKILL.md`);
        if (!existsSync(target)) invalidPaths.push(`${file.slice(repoRoot.length + 1)} -> ${match[0]}`);
      }
      for (const alias of deprecatedSkills) {
        const stale = [
          `.agents/skills/${alias}`,
          `.claude/skills/${alias}`,
          `\`${alias}\``,
          `${alias} skill`,
          `Skill(\"${alias}\")`,
          `Skill('${alias}')`,
        ].some((needle) => text.includes(needle));
        if (stale) staleAliases.push(`${file.slice(repoRoot.length + 1)} -> ${alias}`);
      }
    }
    expect(invalidPaths).toEqual([]);
    expect(staleAliases).toEqual([]);
  });
});
