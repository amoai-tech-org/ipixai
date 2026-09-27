import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * IPI-1358 · SB-CI-REGISTRY-001 — the postgres-meta prime step behind the
 * `supabase-fresh-replay` generated-types gate. Runs the real script against a
 * stub `docker` on PATH (no network), and pins the workflow to the script.
 */
const root = process.cwd();
const script = path.resolve(root, "scripts/prime-supabase-pgmeta.sh");
const ECR = "public.ecr.aws/supabase/postgres-meta:v0.98.0";
const GHCR = "ghcr.io/supabase/postgres-meta:v0.98.0";

type Outcome = { cached?: boolean; ecrPull?: boolean; ghcrPull?: boolean };

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function run(outcome: Outcome) {
  const dir = mkdtempSync(path.join(tmpdir(), "pgmeta-"));
  dirs.push(dir);
  const log = path.join(dir, "calls.log");
  writeFileSync(log, "");
  // Stub docker: logs every call, succeeds/fails per the scenario.
  writeFileSync(
    path.join(dir, "docker"),
    `#!/usr/bin/env bash
echo "$*" >> "${log}"
case "$1 $2" in
  "image inspect") [ "${outcome.cached ? 1 : 0}" = 1 ] ;;
  "pull ${ECR}") [ "${outcome.ecrPull ? 1 : 0}" = 1 ] ;;
  "pull ${GHCR}") [ "${outcome.ghcrPull ? 1 : 0}" = 1 ] ;;
  "tag ${GHCR}") exit 0 ;;
  *) echo "unexpected docker call: $*" >&2; exit 99 ;;
esac
`,
  );
  chmodSync(path.join(dir, "docker"), 0o755);
  const result = spawnSync("bash", [script], {
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    encoding: "utf8",
  });
  const calls = readFileSync(log, "utf8").trim().split("\n").filter(Boolean);
  return { status: result.status, calls, stderr: result.stderr };
}

describe("scripts/prime-supabase-pgmeta.sh", () => {
  it("reuses a cached image without pulling", () => {
    const { status, calls } = run({ cached: true });
    expect(status).toBe(0);
    expect(calls).toEqual([`image inspect ${ECR}`]);
  });

  it("uses ECR and never touches GHCR when ECR succeeds", () => {
    const { status, calls } = run({ ecrPull: true });
    expect(status).toBe(0);
    expect(calls).toEqual([`image inspect ${ECR}`, `pull ${ECR}`]);
  });

  it("falls back to the GHCR upstream mirror and tags it with the ECR name", () => {
    const { status, calls } = run({ ecrPull: false, ghcrPull: true });
    expect(status).toBe(0);
    expect(calls).toEqual([
      `image inspect ${ECR}`,
      `pull ${ECR}`,
      `pull ${GHCR}`,
      `tag ${GHCR} ${ECR}`,
    ]);
  });

  it("fails closed when both registries are unavailable", () => {
    const { status, calls } = run({ ecrPull: false, ghcrPull: false });
    expect(status).not.toBe(0);
    expect(calls).toEqual([`image inspect ${ECR}`, `pull ${ECR}`, `pull ${GHCR}`]);
  });

  it("never falls back to the separately built slim cli/pgmeta image", () => {
    expect(readFileSync(script, "utf8")).not.toMatch(/^[^#]*ghcr\.io\/supabase\/cli\/pgmeta/m);
  });
});

describe("supabase-fresh-replay workflow wiring", () => {
  const ci = readFileSync(path.resolve(root, ".github/workflows/ci.yml"), "utf8");
  const start = ci.indexOf("\n  supabase-fresh-replay:\n");
  const rest = ci.slice(start + 1);
  // The job block ends at the next top-level job id (two-space indent).
  const next = rest.slice(1).search(/\n {2}[a-z0-9-]+:\n/);
  const steps = next === -1 ? rest : rest.slice(0, next + 1);

  it("primes postgres-meta via the script before the generated-types gate", () => {
    const prime = steps.indexOf("run: bash scripts/prime-supabase-pgmeta.sh");
    const gate = steps.indexOf("node scripts/generate-supabase-types.mjs --check");
    const login = steps.indexOf("registry: ghcr.io");
    expect(login).toBeGreaterThan(-1);
    expect(prime).toBeGreaterThan(login);
    expect(gate).toBeGreaterThan(prime);
  });

  it("keeps the primed pgmeta tag coupled to the pinned Supabase CLI", () => {
    // CLI 2.116.0 requests postgres-meta:v0.98.0 (apps/cli-go/pkg/config/
    // templates/Dockerfile). Bumping the CLI without re-checking that tag
    // would silently prime the wrong image and lose the GHCR fallback.
    expect(steps).toMatch(/supabase\/setup-cli@[0-9a-f]{40}[^\n]*\n\s+with:\n\s+version: 2\.116\.0\n/);
    expect(readFileSync(script, "utf8")).toMatch(/^version="v0\.98\.0"$/m);
  });

  it("does not make the prime step or type gate optional", () => {
    const primeStep = steps.slice(
      steps.indexOf("- name: Prime postgres-meta image"),
      steps.indexOf("- name: Start local Supabase stack"),
    );
    expect(primeStep).not.toMatch(/continue-on-error|\|\|\s*true/);
  });
});
