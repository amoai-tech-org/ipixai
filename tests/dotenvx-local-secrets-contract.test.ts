import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), "utf8");
const pkg = JSON.parse(read("package.json")) as {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe("Dotenvx local secrets contract", () => {
  it("pins Dotenvx and retires the plain dotenv loader", () => {
    expect(pkg.devDependencies?.["@dotenvx/dotenvx"]).toBe("2.30.0");
    expect(pkg.devDependencies?.dotenv).toBeUndefined();
  });

  it("injects local app secrets through Dotenvx", () => {
    expect(pkg.scripts?.["dev:ui"]).toMatch(/^dotenvx run --convention=nextjs -- /);
    expect(pkg.scripts?.["dev:agent"]).toMatch(/^dotenvx run --convention=nextjs -- /);
    expect(pkg.scripts?.channel).toMatch(/^dotenvx run --convention=nextjs -- /);
    expect(pkg.scripts?.["dev:e2e"]).toMatch(/^dotenvx run --convention=nextjs -- /);
    expect(pkg.scripts?.["start:e2e"]).toMatch(/^dotenvx run --convention=nextjs -- /);
    expect(pkg.scripts?.build).toMatch(/^dotenvx run --convention=nextjs -- /);
    expect(pkg.scripts?.start).toMatch(/^dotenvx run --convention=nextjs -- /);
  });

  it("loads Playwright env files through typed Dotenvx imports from the repo root", () => {
    for (const file of ["playwright.config.ts", "playwright.production.config.ts"]) {
      const source = read(file);
      expect(source).toContain('import { config as loadDotenvx } from "@dotenvx/dotenvx"');
      expect(source).not.toContain('import dotenvx from "@dotenvx/dotenvx"');
      expect(source).not.toContain('from "node:path"');
      expect(source).not.toContain('from "node:process"');
      expect(source).not.toContain("__dirname");
      expect(source).not.toContain('from "dotenv"');
    }
  });

  it("loads the app fallback from .env.local, not transitional .env", () => {
    const source = read("playwright.config.ts");
    expect(source).toContain('path: ".env.local"');
    expect(source).not.toContain('path: ".env"');
  });

  it("surfaces missing local Playwright env files outside CI while CI stays file-optional", () => {
    const source = read("playwright.config.ts");
    expect(source).toContain('process.env.CI ? ["MISSING_ENV_FILE"] : undefined;');
    expect(source.match(/ignore: missingEnvIgnore/g)).toHaveLength(2);

    const productionSource = read("playwright.production.config.ts");
    expect(productionSource).toContain("Intentionally do not ignore MISSING_ENV_FILE");
    expect(productionSource).not.toContain('ignore: ["MISSING_ENV_FILE"]');
  });

  it("automates Dotenvx private-key staging and local permission checks", () => {
    expect(pkg.scripts?.["secrets:protect"]).toBe("dotenvx protect");
    expect(pkg.scripts?.["secrets:check"]).toBe("node scripts/check-local-secrets.mjs");
    expect(pkg.scripts?.pretest).toBe("npm run secrets:check");
    expect(read("scripts/check-local-secrets.mjs")).toContain(".env.keys");
  });

  it("keeps local secret docs aligned with the in-process Planner env contract", () => {
    const example = read(".env.example");
    expect(example).toContain("ALWAYS runs the Production Planner in-process");
    expect(example).not.toContain("# CPK_INTELLIGENCE_API_KEY=");

    const secrets = read("docs/ipix-platform/06-development/SECRETS.md");
    expect(secrets).toContain("| `CPK_INTELLIGENCE_API_KEY` | **DROP** |");
    expect(secrets).toContain("| `INTELLIGENCE_API_KEY` | **DROP** |");
    expect(secrets).toContain("| `MASTRA_BASE_URL` | **ROLLBACK_ONLY** |");
  });

  it("launches coding agents with a separate least-privilege env file", () => {
    expect(pkg.scripts?.["agent:claude"]).toBe(
      "dotenvx run -f .env.agent --strict --redact -- claude",
    );
    expect(pkg.scripts?.["agent:codex"]).toBe(
      "dotenvx run -f .env.agent --strict --redact -- codex",
    );
    expect(read(".gitignore")).toContain("!.env.agent.example");
    expect(read(".env.agent.example")).not.toMatch(/^[A-Z0-9_]+=.+$/m);
  });

  it("documents Dotenvx as local truth without replacing deployment secret stores", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("Dotenvx is the canonical local secret-injection path");
    expect(agents).toContain("Production/deployment secrets remain provider-managed");
    expect(agents).not.toContain("Infisical is the canonical secret-injection path");
  });

  it("retires the local Infisical rollback binding after names-only parity", () => {
    expect(existsSync(join(root, ".infisical.json"))).toBe(false);
    expect(read("AGENTS.md")).not.toContain(".infisical.json");
  });
});
