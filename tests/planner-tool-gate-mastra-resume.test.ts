/**
 * IPI-1332 · MASTRA-UPG-005 — real-engine suspend → resume proof.
 *
 * `tests/planner-tool-gate-resume.test.ts` proves the gate's policy logic, but
 * it calls the wrappers with plain function stubs, so it never touches a real
 * Mastra engine. The upgrade risk is different and specific: Mastra persists a
 * run's `RequestContext` through its own suspend/resume machinery, and if a
 * target version changed that round-trip, the Planner's persisted tool policy
 * would silently disappear on resume — re-exposing consequential Brand tools on
 * a resumed turn.
 *
 * This test therefore drives the REAL engine (`new Mastra` + a real workflow
 * that genuinely suspends and resumes over real storage) and asserts:
 *
 *   1. a persisted brand policy is still readable after a real resume;
 *   2. a persisted planning policy is still readable after a real resume;
 *   3. with nothing persisted it stays absent, and the gate then fails closed
 *      to planning-only tools.
 *
 * It is deliberately engine-level, not unit-level: only a real round-trip can
 * catch a `RequestContext` serialization regression.
 */

import { RequestContext } from "@mastra/core/request-context";
import { InMemoryStore } from "@mastra/core/storage";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  ALL_AGENT_TOOLS,
  PLANNING_ONLY_TOOLS,
  wrapPlannerResumeStreamWithToolGate,
  wrapPlannerStreamWithToolGate,
} from "../src/mastra/planner-tool-gate";

/** Private to planner-tool-gate.ts; asserted here as the persisted contract. */
const POLICY_KEY = "ipix.planner.activeTools";

/** Captures the RequestContext the engine restored on resume. */
let restoredAfterResume: RequestContext | undefined;

function readPolicy(requestContext: RequestContext | undefined): string[] | null {
  const raw = requestContext?.getRaw(POLICY_KEY);
  return Array.isArray(raw) ? (raw as string[]) : null;
}

/**
 * One real suspend/resume cycle. `resumeData` is only present on the resumed
 * pass, which is exactly where the restored context matters.
 */
const capturePolicyStep = createStep({
  id: "capturePolicy",
  inputSchema: z.object({ label: z.string() }),
  outputSchema: z.object({ policyAfterResume: z.array(z.string()).nullable() }),
  resumeSchema: z.object({ approved: z.boolean() }),
  suspendSchema: z.object({ awaiting: z.string() }),
  execute: async ({ resumeData, suspend, requestContext }) => {
    if (!resumeData) {
      // First pass: the gate has already persisted the policy. Suspend and let
      // the engine persist the run (including its RequestContext).
      return suspend({ awaiting: "operator-review" }, { resumeLabel: "operator-review" });
    }
    restoredAfterResume = requestContext as RequestContext | undefined;
    return { policyAfterResume: readPolicy(restoredAfterResume) };
  },
});

const policyWorkflow = createWorkflow({
  id: "ipi1332-policy-roundtrip",
  inputSchema: z.object({ label: z.string() }),
  outputSchema: z.object({ policyAfterResume: z.array(z.string()).nullable() }),
})
  .then(capturePolicyStep)
  .commit();

function newEngine() {
  // A fresh engine (and fresh in-memory storage) per run so no snapshot leaks
  // between cases.
  const { Mastra } = require("@mastra/core/mastra") as typeof import("@mastra/core/mastra");
  return new Mastra({
    storage: new InMemoryStore(),
    workflows: { "ipi1332-policy-roundtrip": policyWorkflow },
  });
}

/** Persist a policy through the REAL gate wrapper, as a real stream would. */
function persistPolicyFor(messages: unknown): RequestContext {
  const requestContext = new RequestContext();
  const stream = wrapPlannerStreamWithToolGate(
    (_messages: unknown, _options?: Record<string, unknown>) => "stream-result",
  );
  stream(messages, { requestContext, runId: "roundtrip-run" });
  return requestContext;
}

type RoundTripOutcome = {
  result: { status: string; result?: { policyAfterResume: string[] | null } };
  restored: RequestContext | undefined;
};

async function roundTrip(requestContext: RequestContext | undefined): Promise<RoundTripOutcome> {
  restoredAfterResume = undefined;
  const mastra = newEngine();
  const workflow = mastra.getWorkflow("ipi1332-policy-roundtrip");

  const run = await workflow.createRun();
  const started = (await run.start({
    inputData: { label: "roundtrip" },
    ...(requestContext ? { requestContext } : {}),
  })) as { status: string; runId?: string };
  expect(started.status).toBe("suspended");

  const resumed = await workflow.createRun({ runId: run.runId });
  const result = (await resumed.resume({
    step: "capturePolicy",
    resumeData: { approved: true },
  })) as RoundTripOutcome["result"];

  expect(result.status).toBe("success");
  return { result, restored: restoredAfterResume };
}

/**
 * Drive the REAL resume wrapper and return the `activeTools` its forwarded
 * `prepareStep` resolves from the given context.
 *
 * Using the engine-restored context HERE is the whole point: reading the
 * restored context directly would not exercise the gate at all, so the test
 * would pass even if the wrapper stopped consulting the restored policy.
 * No explicit `activeTools` is passed, so the wrapper must recover the policy
 * from the restored context rather than being told what to use.
 */
async function resolveActiveToolsOnResume(
  restored: RequestContext | undefined,
): Promise<unknown> {
  const calls: unknown[][] = [];
  const resume = wrapPlannerResumeStreamWithToolGate(
    (data: unknown, options: Record<string, unknown>) => {
      calls.push([data, options]);
      return "resume-result";
    },
  );
  resume({ approved: true }, { runId: "roundtrip-run", requestContext: restored });

  const options = calls[0]?.[1] as Record<string, unknown>;
  const prepareStep = options.prepareStep as (args: {
    requestContext?: RequestContext;
  }) => Record<string, unknown> | Promise<Record<string, unknown>>;
  const prepared = await prepareStep({ requestContext: restored });
  return prepared.activeTools;
}

describe("IPI-1332 planner tool policy survives a real Mastra suspend/resume", () => {
  it("keeps a persisted brand policy readable after a real resume", async () => {
    const persisted = persistPolicyFor([{ role: "user", content: "Start a brand analysis" }]);
    // Sanity: the gate did persist the brand policy before the engine ran.
    expect(readPolicy(persisted)).toEqual([...ALL_AGENT_TOOLS]);

    const { result, restored } = await roundTrip(persisted);

    // 1. The ENGINE preserved the raw policy across a real suspend/resume: this
    //    value was read inside the resumed step from the restored context.
    expect(result.result?.policyAfterResume).toEqual([...ALL_AGENT_TOOLS]);

    // 2. Guard against a false green: the resumed step must be reading a context
    //    the ENGINE reconstructed, not the same object handed to start(). If
    //    these were the same instance the test would prove nothing about
    //    serialization.
    expect(restored).toBeDefined();
    expect(restored).not.toBe(persisted);
    expect(restored?.getRaw(POLICY_KEY)).toBeDefined();

    // 3. And the GATE itself resolves brand tools from that restored context.
    expect(await resolveActiveToolsOnResume(restored)).toEqual([...ALL_AGENT_TOOLS]);
  });

  it("keeps a persisted planning policy planning-only after a real resume", async () => {
    const persisted = persistPolicyFor([{ role: "user", content: "Plan a campaign shoot" }]);
    expect(readPolicy(persisted)).toEqual([...PLANNING_ONLY_TOOLS]);

    const { result, restored } = await roundTrip(persisted);

    expect(result.result?.policyAfterResume).toEqual([...PLANNING_ONLY_TOOLS]);

    const resolved = await resolveActiveToolsOnResume(restored);
    expect(resolved).toEqual([...PLANNING_ONLY_TOOLS]);
    expect(resolved).not.toContain("approveDraft");
    expect(resolved).not.toContain("startBrandAnalysis");
  });

  it("fails closed to planning-only tools when no policy was ever persisted", async () => {
    const { result, restored } = await roundTrip(undefined);

    // Nothing was persisted, and the engine must not invent one.
    expect(result.result?.policyAfterResume).toBeNull();

    // The gate therefore fails closed to the planning-only set.
    expect(await resolveActiveToolsOnResume(restored)).toEqual([...PLANNING_ONLY_TOOLS]);
    expect(await resolveActiveToolsOnResume(new RequestContext())).toEqual([
      ...PLANNING_ONLY_TOOLS,
    ]);
  });
});
