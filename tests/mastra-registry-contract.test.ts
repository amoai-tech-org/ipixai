import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { getProductionPlannerAgent } from "../src/mastra/agents";
import {
  PLANNING_ONLY_TOOLS,
  CONSEQUENTIAL_WRITE_TOOLS,
  ALL_AGENT_TOOLS,
} from "../src/mastra/planner-tool-gate";

// IPI-1231 · VERCEL-RUNTIME-001: the registry moved to the Next.js runtime
// module; `src/mastra/index.ts` is now a separate, deliberate CLI boundary.
// These are two different contracts, so they get two source reads — not one
// assertion pretending to cover both.
const runtimeSource = readFileSync(
  new URL("../src/mastra/runtime.ts", import.meta.url),
  "utf8",
);
const cliEntrySource = readFileSync(
  new URL("../src/mastra/index.ts", import.meta.url),
  "utf8",
);
const productRouteSource = readFileSync(
  new URL("../src/app/api/copilotkit/[[...slug]]/route.ts", import.meta.url),
  "utf8",
);

const ALL_SOURCES = `${runtimeSource}\n${cliEntrySource}\n${productRouteSource}`;

describe("Mastra registry contract", () => {
  it("registers the Production Planner behind the load-bearing default key", () => {
    const agent = getProductionPlannerAgent() as unknown as { id?: string; name?: string };

    expect(agent.id).toBe("production-planner");
    expect(agent.name).toBe("Production Planner");
    expect(runtimeSource).toMatch(/default\s*:\s*getProductionPlannerAgent\(\)/);
  });

  it("keeps src/mastra/index.ts a valid Mastra CLI entry (a binding named `mastra`)", () => {
    // The CLI resolves the instance BY EXPORT NAME through a Babel AST check, and
    // its generated entry imports `{ m as mastra }`. Losing this binding hard-fails
    // `npx mastra build` with exit 1 — reproduced in IPI-1231.
    expect(cliEntrySource).toMatch(/export\s+const\s+mastra\s*=/);
  });

  it("does not register or mount the old weather/demo agent on the product route", () => {
    expect(ALL_SOURCES).not.toMatch(/weatherAgent|weather-agent|demoAgent|demo-agent/);
    expect(productRouteSource).toMatch(/createLocalAgents\(resourceId\)/);
  });
});

describe("Production Planner registered tool contract", () => {
  it("exposes the four planning tools plus the two brand-intelligence tools, every one with input/output schemas", async () => {
    const tools = await getProductionPlannerAgent().listTools();
    const expected = [
      "approveDraft",
      "composeShootPlan",
      "estimateShootBudget",
      "generateShotListDraft",
      "planDeliverables",
      "recommendShootType",
      "startBrandAnalysis",
    ].sort();

    expect(Object.keys(tools).sort()).toEqual(expected);

    for (const [name, tool] of Object.entries(tools)) {
      const contract = tool as unknown as {
        inputSchema?: unknown;
        outputSchema?: unknown;
      };
      expect(contract.inputSchema, `${name} inputSchema`).toBeTruthy();
      expect(contract.outputSchema, `${name} outputSchema`).toBeTruthy();
    }
  });
});

describe("IPI-1208 · PLANNER-TOOLGATE-001 — the gate is APPLIED to the production agent", () => {
  it("still has all 7 tools registered on the agent (listTools not filtered)", async () => {
    const tools = await getProductionPlannerAgent().listTools();
    expect(Object.keys(tools).sort()).toEqual(ALL_AGENT_TOOLS.slice().sort());
  });

  it("does not remove approveDraft/startBrandAnalysis from the agent instruction text", () => {
    // Read the source to confirm the agent instructions still mention
    // brand-intelligence tools (they are just gated per-turn, not removed).
    // IPI-1346 · PLANNER-AGENT-STRUCTURE-001 moved the prompt text out of
    // `agents/index.ts` (now a compatibility barrel), so this reads the
    // instructions owner. The assertion is unchanged.
    const source = readFileSync(
      new URL("../src/mastra/agents/production-planner-instructions.ts", import.meta.url),
      "utf8",
    );
    expect(source).toMatch(/approveDraft/);
    expect(source).toMatch(/startBrandAnalysis/);
  });

  it("injects activeTools when streaming through the production agent (the wrapper IS applied)", async () => {
    // A source-text assertion cannot prove the wrapper is applied: the previous
    // `expect(source).toMatch(/activeTools/)` passed ONLY because that word
    // appears in a JSDoc comment. Neither could the PLAN-001 runtime test —
    // composeShootPlan is the natural tool for that brief, so it runs with or
    // without the gate. This asserts the observable effect instead.
    //
    // Install the spy on the prototype BEFORE the memoised factory runs, so the
    // wrapper binds and calls the spy and we can read the options it forwards.
    //
    // NEGATIVE CONTROL: with the two wrapper lines removed from the factory,
    // `activeTools` is never injected and this test fails.
    vi.resetModules();
    const { Agent } = await import("@mastra/core/agent");
    const spy = vi
      .spyOn(
        Agent.prototype as unknown as { stream: (...args: unknown[]) => unknown },
        "stream",
      )
      .mockImplementation((async () => ({})) as never);

    try {
      const { getProductionPlannerAgent: factory } = await import("../src/mastra/agents");
      const agent = factory() as unknown as {
        stream: (messages: unknown, options?: unknown) => Promise<unknown>;
      };

      await agent.stream([{ role: "user", content: "Plan the shoot schedule." }], {});

      expect(spy).toHaveBeenCalledTimes(1);
      const call = spy.mock.calls[0] as unknown[] | undefined;
      const options = call?.[1] as { activeTools?: string[] } | undefined;
      expect(options?.activeTools).toEqual([...PLANNING_ONLY_TOOLS]);
    } finally {
      spy.mockRestore();
      vi.resetModules();
    }
  });

  it("uses the correct tool categories", () => {
    expect(PLANNING_ONLY_TOOLS).toEqual([
      "recommendShootType",
      "planDeliverables",
      "generateShotListDraft",
      "estimateShootBudget",
      "composeShootPlan",
    ]);
    expect(CONSEQUENTIAL_WRITE_TOOLS).toEqual(["approveDraft", "startBrandAnalysis"]);
    expect(ALL_AGENT_TOOLS.length).toBe(7);
  });
});
