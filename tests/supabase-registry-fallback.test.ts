import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ci = readFileSync(path.resolve(process.cwd(), ".github/workflows/ci.yml"), "utf8");

function jobBlock(job: string): string {
  const marker = `\n  ${job}:\n`;
  const start = ci.indexOf(marker);
  expect(start, `${job} must exist`).toBeGreaterThan(-1);
  const rest = ci.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z0-9-]+:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

describe("Supabase local-stack registry fallback", () => {
  for (const job of ["playwright-approval-tenant", "supabase-fresh-replay"]) {
    it(`${job} clears setup-cli's forced registry before supabase start`, () => {
      const block = jobBlock(job);
      const setup = block.indexOf("supabase/setup-cli@");
      const clear = block.indexOf('echo "SUPABASE_INTERNAL_IMAGE_REGISTRY=" >> "$GITHUB_ENV"');
      const start = block.indexOf("if supabase start");

      expect(setup).toBeGreaterThan(-1);
      expect(clear).toBeGreaterThan(setup);
      expect(start).toBeGreaterThan(clear);
      expect(block).not.toMatch(/^\s*run:.*SUPABASE_INTERNAL_IMAGE_REGISTRY=public\.ecr\.aws/m);
      expect(block).not.toMatch(/^\s*run:.*SUPABASE_INTERNAL_IMAGE_REGISTRY=ghcr\.io/m);
    });

    it(`${job} keeps authenticated GHCR available as a fallback`, () => {
      const block = jobBlock(job);
      expect(block).toContain("registry: ghcr.io");
      expect(block).toContain("password: ${{ secrets.GITHUB_TOKEN }}");
    });
  }
});
