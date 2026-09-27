import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

type Step = {
  name?: string;
  uses?: string;
  run?: string;
  env?: Record<string, unknown>;
  with?: Record<string, unknown>;
};

type Job = {
  env?: Record<string, unknown>;
  steps?: Step[];
};

type Workflow = {
  jobs?: Record<string, Job>;
};

const REGISTRY = "SUPABASE_INTERNAL_IMAGE_REGISTRY";
const CLEAR_STEP = "Enable Supabase CLI multi-registry image fallback";
const CLEAR_RUN = 'echo "SUPABASE_INTERNAL_IMAGE_REGISTRY=" >> "$GITHUB_ENV"';
const workflow = parse(
  readFileSync(path.resolve(process.cwd(), ".github/workflows/ci.yml"), "utf8"),
) as Workflow;

function job(jobName: string): Job {
  const value = workflow.jobs?.[jobName];
  expect(value, `${jobName} must exist`).toBeDefined();
  return value!;
}

function registryEnvValue(env: Record<string, unknown> | undefined): unknown {
  return env?.[REGISTRY];
}

describe("Supabase local-stack registry fallback", () => {
  for (const jobName of ["playwright-approval-tenant", "supabase-fresh-replay"]) {
    it(`${jobName} clears setup-cli's override before supabase start`, () => {
      const value = job(jobName);
      const steps = value.steps ?? [];
      const setup = steps.findIndex((step) => step.uses?.startsWith("supabase/setup-cli@"));
      const clear = steps.findIndex((step) => step.name === CLEAR_STEP);
      const start = steps.findIndex((step) => step.name === "Start local Supabase stack with bounded retry");

      expect(setup).toBeGreaterThan(-1);
      expect(clear).toBeGreaterThan(setup);
      expect(start).toBeGreaterThan(clear);
      expect(steps[clear]?.run?.trim()).toBe(CLEAR_RUN);
      expect(steps[start]?.run).toContain("supabase start");
    });

    it(`${jobName} has no later non-empty single-registry override`, () => {
      const value = job(jobName);
      const steps = value.steps ?? [];
      const setup = steps.findIndex((step) => step.uses?.startsWith("supabase/setup-cli@"));
      expect(setup).toBeGreaterThan(-1);

      const jobRegistry = registryEnvValue(value.env);
      expect(jobRegistry === undefined || jobRegistry === "").toBe(true);

      const registryRunSteps = steps
        .slice(setup + 1)
        .filter((step) => step.run?.includes(REGISTRY))
        .map((step) => ({ name: step.name, run: step.run?.trim() }));
      expect(registryRunSteps).toEqual([{ name: CLEAR_STEP, run: CLEAR_RUN }]);

      for (const step of steps.slice(setup + 1)) {
        const registryValue = registryEnvValue(step.env);
        expect(registryValue === undefined || registryValue === "").toBe(true);
      }
    });

    it(`${jobName} keeps authenticated GHCR available as a fallback`, () => {
      const steps = job(jobName).steps ?? [];
      const login = steps.find((step) => step.uses?.startsWith("docker/login-action@"));
      expect(login).toBeDefined();
      expect(login?.with?.registry).toBe("ghcr.io");
      expect(login?.with?.password).toBe("${{ secrets.GITHUB_TOKEN }}");
    });
  }
});
