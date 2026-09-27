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
 * This test therefore drives the REAL engine and asserts two independent things:
 *
 *   1. the ENGINE preserved the policy across a genuine durable suspend/resume
 *      (read inside the resumed step, from the engine-restored context);
 *   2. the GATE resolves `activeTools` from that restored context — by passing
 *      it into the real resume wrapper and asking its `prepareStep`, not by
 *      reading the context directly.
 *
 * (2) matters: reading the restored context directly would still pass if the
 * wrapper stopped consulting it. A negative control confirmed the difference —
 * making `readPersistedToolPolicy` ignore the context fails case (2) and not
 * case (1).
 *
 * It is deliberately engine-level, not unit-level: only a real round-trip can
 * catch a `RequestContext` serialization regression.
 */

import { Mastra } from "@mastra/core/mastra";
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

const policySchema = z.object({ policyAfterResume: z.array(z.string()).nullable() });
const inputSchema = z.object({ label: z.string() });

function readPolicy(requestContext: RequestContext | undefined): string[] | null {
  const raw = requestContext?.getRaw(POLICY_KEY);
  return Array.isArray(raw) ? (raw as string[]) : null;
}

type RoundTripOutcome = {
  result: { status: string; result?: { policyAfterResume: string[] | null } };
  restored: RequestContext | undefined;
};

/**
 * One real suspend/resume cycle.
 *
 * The step and workflow are built per call so nothing is shared between cases:
 * the captured context lives in a local closure rather than module-level mutable
 * state, and each call gets its own engine and its own in-memory storage.
 */
async function roundTrip(persisted: RequestContext | undefined): Promise<RoundTripOutcome> {
  let restored: RequestContext | undefined;

  const capturePolicyStep = createStep({
    id: "capturePolicy",
    inputSchema,
    outputSchema: policySchema,
    resumeSchema: z.object({ approved: z.boolean() }),
    suspendSchema: z.object({ awaiting: z.string() }),
    execute: async ({ resumeData, suspend, requestContext }) => {
      if (!resumeData) {
        // First pass: the gate has already persisted the policy. Suspend and let
        // the engine persist the run (including its RequestContext).
        return suspend({ awaiting: "operator-review" }, { resumeLabel: "operator-review" });
      }
      // Resumed pass: this context is the one the ENGINE restored.
      restored = requestContext as RequestContext;
      return { policyAfterResume: readPolicy(restored) };
    },
  });

  const workflow = createWorkflow({
    id: "ipi1332-policy-roundtrip",
    inputSchema,
    outputSchema: policySchema,
  })
    .then(capturePolicyStep)
    .commit();

  const mastra = new Mastra({
    storage: new InMemoryStore(),
    workflows: { "ipi1332-policy-roundtrip": workflow },
  });
  const engineWorkflow = mastra.getWorkflow("ipi1332-policy-roundtrip");

  const run = await engineWorkflow.createRun();
  const started = (await run.start({
    inputData: { label: "roundtrip" },
    ...(persisted ? { requestContext: persisted } : {}),
  })) as { status: string; runId?: string };
  expect(started.status).toBe("suspended");

  const resumed = await engineWorkflow.createRun({ runId: run.runId });
  const result = (await resumed.resume({
    step: "capturePolicy",
    resumeData: { approved: true },
  })) as RoundTripOutcome["result"];

  expect(result.status).toBe("success");
  return { result, restored };
}

/**
 * Drive the REAL resume wrapper with the engine-restored context and return the
 * `activeTools` its forwarded `prepareStep` resolves from it.
 *
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
  resume({ approved: true }, { requestContext: restored });

  const options = calls[0]?.[1] as Record<string, unknown>;
  const prepareStep = options.prepareStep as (args: {
    requestContext?: RequestContext;
  }) => Record<string, unknown> | Promise<Record<string, unknown>>;
  const prepared = await prepareStep({ requestContext: restored });
  return prepared.activeTools;
}

/** Persist a policy through the REAL gate wrapper, as a real stream would. */
function persistPolicyFor(messages: unknown): RequestContext {
  const requestContext = new RequestContext();
  const stream = wrapPlannerStreamWithToolGate(
    (_messages: unknown, _options?: Record<string, unknown>) => "stream-result",
  );
  stream(messages, { requestContext });
  return requestContext;
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

    // The gate therefore fails closed to the planning-only set, both from the
    // engine-restored (empty) context and from a brand-new one.
    expect(await resolveActiveToolsOnResume(restored)).toEqual([...PLANNING_ONLY_TOOLS]);
    expect(await resolveActiveToolsOnResume(new RequestContext())).toEqual([
      ...PLANNING_ONLY_TOOLS,
    ]);
  });
});
