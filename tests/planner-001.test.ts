import { describe, expect, it } from "vitest";
import { RequestContext } from "@mastra/core/request-context";

import { getMastra } from "../src/mastra/runtime";
import { getProductionPlannerAgent } from "../src/mastra/agents";

// IPI-1048 · PLANNER-001 — the `default` registry key stays as-is (Planner
// UI, thread drawer, history restore, and operator chat all hard-code
// agentId="default"); only the agent instance behind it changes from the
// starter weather demo to the Production Planner.
describe("IPI-1048 PLANNER-001: production planner replaces the weather demo", () => {
  it("`default` resolves to the canonical Production Planner instance", () => {
    expect(getMastra().getAgent("default")).toBe(getProductionPlannerAgent());
  });

  it("agent identity is the Production Planner, not the weather demo", () => {
    expect(getProductionPlannerAgent().id).toBe("production-planner");
    expect(getProductionPlannerAgent().name).toBe("Production Planner");
  });

  it("uses GPT-5.6 Luna as the configured OpenAI model", () => {
    expect((getProductionPlannerAgent().model as { modelId?: string }).modelId).toBe("gpt-5.6-luna");
  });

  it("no weather tool is attached — IPI-1049 · TOOL-001 owns the actual tool set", async () => {
    const tools = await getProductionPlannerAgent().listTools();
    expect(Object.keys(tools)).not.toContain("get-weather");
  });

  it("instructions carry the fashion-production contract, not the generic demo prompt", async () => {
    const instructions = await getProductionPlannerAgent().getInstructions();
    const text = String(instructions).toLowerCase();
    expect(text).not.toBe("you are a helpful assistant.");
    expect(text).not.toContain("weather");
    for (const term of ["shoot", "deliverable", "budget", "production"]) {
      expect(text).toContain(term);
    }
  });

  it("never claims a save/approval/booking/payment occurred, and asks rather than invents", async () => {
    const instructions = String(await getProductionPlannerAgent().getInstructions()).toLowerCase();
    expect(instructions).toContain("ask for missing information");
    expect(instructions).toContain("draft from anything actually saved or approved");
    // A behavioral rule ("unless the operator explicitly confirms"), not a
    // "no tools yet" caveat — stays true after IPI-1049 attaches real tools.
    expect(instructions).toContain("never claim");
    expect(instructions).toContain("unless the operator explicitly confirms");
    // IPI-1049 · TOOL-001 follow-up (Planner behavior gap): when every
    // schema-required input is already known the Planner must call the tool
    // immediately rather than interrogate the operator for optional context.
    expect(instructions).toContain("call the tool immediately");
    expect(instructions).toContain("do not block the first computation");
    // Optional context is gated: only when a tool returns "needs_input", or
    // offered afterward to refine a draft — never before the first call.
    expect(instructions).toContain('optional context may be requested only when a tool returns "needs_input"');
    // Trusted reference shot types can only come from an authorized iPix
    // reference path — the Planner must never solicit raw references from the
    // operator (reference-backed shot-list generation awaits that path).
    expect(instructions).toContain("never ask the operator for raw reference shot types");
  });

  it("keeps the existing resource-scoped Postgres/Memory configuration attached", async () => {
    const memory = await getProductionPlannerAgent().getMemory();
    expect(memory).toBeDefined();
  });

  it("no production registry entry exposes the weather agent", () => {
    const registeredIds = Object.values(getMastra().listAgents()).map((agent) => agent.id);
    expect(registeredIds).not.toContain("weather-agent");
    expect(registeredIds).toContain("production-planner");
  });
});

// IPI-1087 · PLANNER-CONTEXT-001 — regression for a real bug caught live
// 2026-09-20: the frontend correctly registered PlannerContext via
// useAgentContext, but the agent's instructions were a static string, so
// the model never saw it (reproduced: asking "what shoot am I looking at"
// got "I can't see which shoot is currently open"). The `@ag-ui/mastra`
// bridge stores the frontend's registered context into RequestContext's
// raw "ag-ui" key as `{ context: [{ description, value }] }`, where `value`
// is a JSON string — this is exactly what CopilotKit's real bridge does,
// verified against the installed node_modules/@ag-ui/mastra source, not
// assumed.
describe("IPI-1087 PLANNER-CONTEXT-001: active Brand/Shoot context reaches the model", () => {
  it("includes the registered Shoot context in resolved instructions", async () => {
    const requestContext = new RequestContext();
    requestContext.setRaw("ag-ui", {
      context: [
        {
          description: "The Shoot the operator currently has open.",
          value: JSON.stringify({ scopeKey: "shoot:s1", shoot: { name: "Shoot 104", estimatedBudget: 12000 } }),
        },
      ],
    });
    const instructions = String(
      await getProductionPlannerAgent().getInstructions({ requestContext }),
    );
    expect(instructions).toContain("Shoot 104");
    expect(instructions).toContain("12000");
    expect(instructions).toContain("The Shoot the operator currently has open.");
  });

  it("adds nothing when no context was registered (e.g. /app workspace)", async () => {
    const baseline = String(await getProductionPlannerAgent().getInstructions());
    const withEmptyContext = String(
      await getProductionPlannerAgent().getInstructions({ requestContext: new RequestContext() }),
    );
    expect(withEmptyContext).toBe(baseline);
  });

  it("does not throw and omits the entry when the registered value is malformed JSON", async () => {
    const requestContext = new RequestContext();
    requestContext.setRaw("ag-ui", { context: [{ description: "bad", value: "{not json" }] });
    const instructions = String(
      await getProductionPlannerAgent().getInstructions({ requestContext }),
    );
    expect(instructions).not.toContain("bad");
  });

  // IPI-1363 · PLANNER-CONTEXT-002 — the container itself can be malformed, not
  // just its entries. `(agUi?.context ?? [])` is a nullish check, so a truthy
  // wrong-typed `context` reached `.map()` and threw
  // "TypeError: ....map is not a function", failing the whole Planner turn.
  // A malformed container must be omitted exactly like malformed JSON.
  it("does not throw and adds nothing when the registered ag-ui container is not an array", async () => {
    const baseline = String(await getProductionPlannerAgent().getInstructions());
    for (const malformed of ["not-an-array", { not: "an array" }, 42, true]) {
      const requestContext = new RequestContext();
      requestContext.setRaw("ag-ui", { context: malformed });
      const instructions = String(
        await getProductionPlannerAgent().getInstructions({ requestContext }),
      );
      expect(instructions, `context was ${JSON.stringify(malformed)}`).toBe(baseline);
    }
  });

  it("still formats a valid context container in order (control for the malformed-container guard)", async () => {
    const requestContext = new RequestContext();
    requestContext.setRaw("ag-ui", {
      context: [
        { description: "The Shoot the operator currently has open.", value: JSON.stringify({ scopeKey: "shoot:s1" }) },
        { description: "The Brand the operator currently has open.", value: JSON.stringify({ scopeKey: "brand:b1" }) },
      ],
    });
    const instructions = String(
      await getProductionPlannerAgent().getInstructions({ requestContext }),
    );
    expect(instructions).toContain("## Active workspace context");
    expect(instructions).toContain("shoot:s1");
    expect(instructions).toContain("brand:b1");
    // Registration order is preserved.
    expect(instructions.indexOf("shoot:s1")).toBeLessThan(instructions.indexOf("brand:b1"));
  });
});
