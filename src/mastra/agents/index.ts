import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import type { RequestContext } from "@mastra/core/request-context";
import { z } from "zod";
import { Memory } from "@mastra/memory";
import { createAgentMemoryStorage } from "@/mastra/pg-store";
import { planningTools } from "@/mastra/tools/planning";
import { composeShootPlanTool } from "@/mastra/tools/compose-shoot-plan";
import { brandIntelligenceTools } from "@/mastra/tools/brand-intelligence";
import {
  wrapPlannerResumeStreamWithToolGate,
  wrapPlannerStreamWithToolGate,
} from "@/mastra/planner-tool-gate";

export const AgentState = z.object({
  proverbs: z.array(z.string()).default([]),
});

/**
 * IPI-1087 · PLANNER-CONTEXT-001 — surface the operator's active Brand/Shoot.
 *
 * `useAgentContext` (planner-context.tsx) only registers context with the
 * CopilotKit client; verified live 2026-09-20 that the `@ag-ui/mastra`
 * bridge (node_modules/@ag-ui/mastra/dist/mastra-*.mjs: `applyInputContext`)
 * stores that array into Mastra's `RequestContext` under the raw key
 * `"ag-ui"` as `{ context: [{ description, value }] }` on every run — it
 * does NOT inject it into the prompt itself. A static `instructions` string
 * (the pre-2026-09-20 shape of this agent) never reads that key, so the
 * model silently never saw the Brand/Shoot data despite the frontend
 * correctly registering it — reproduced live: asking "What shoot am I
 * currently looking at?" got "I can't see which shoot is currently open."
 * `value` is a JSON string (CopilotKit's `useAgentContext` stringifies it
 * before calling `addContext`), so it is parsed, not used verbatim.
 */
type AgUiContextEntry = { description?: string; value?: string };

function formatActiveWorkspaceContext(requestContext?: RequestContext): string {
  const agUi = requestContext?.getRaw("ag-ui") as { context?: AgUiContextEntry[] } | undefined;
  // IPI-1363 · PLANNER-CONTEXT-002: `?? []` is a nullish check, not a type
  // check, so a truthy wrong-typed `context` (string/object/number) reached
  // `.map()` and threw `TypeError: ....map is not a function`. A malformed
  // container must fail closed by omission, exactly like malformed JSON below.
  const blocks = (Array.isArray(agUi?.context) ? agUi.context : [])
    .map((entry) => {
      if (!entry?.value) return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(entry.value);
      } catch {
        return null;
      }
      const header = entry.description ? `${entry.description}\n` : "";
      return `${header}${JSON.stringify(parsed)}`;
    })
    .filter((block): block is string => Boolean(block));
  if (blocks.length === 0) return "";
  return `\n\n## Active workspace context\n\n${blocks.join("\n\n")}`;
}

// IPI-1048 · PLANNER-001: production default agent. Business behavior only
// (identity, domain vocabulary, uncertainty policy) is adapted from Lumina's
// Planner prompt — see the reuse table in this PR's description for the
// exact source → adaptation mapping. Runtime/model/memory below is
// unchanged from the starter weather agent it replaces.
// IPI-1049 · TOOL-001 added the four compute-only planning tools below —
// see src/mastra/tools/planning.ts for the reuse/adaptation evidence.
let cachedAgent: Agent | undefined;

const BASE_INSTRUCTIONS = `You are the iPix Production Planner, an assistant for fashion production teams.

You help plan shoots, deliverables, shot lists, budgets, and campaign or brand needs.

- Ask for missing information rather than inventing business facts.
- Clearly distinguish a recommendation or draft from anything actually saved or approved.
- Never claim a shoot, approval, booking, publication, payment, or business-record change occurred unless the operator explicitly confirms it actually happened.

You have four planning tools: recommendShootType, planDeliverables, generateShotListDraft, and estimateShootBudget.
- When all inputs a tool requires are already known, call the tool immediately — do not block the first computation by asking for optional context. Optional context may be requested only when a tool returns "needs_input", or offered afterward to refine a draft.
- Each returns status: "ok" or "needs_input". When a tool returns "needs_input", ask the operator for the listed missingInputs (or, for recommendShootType, ask them to pick between the listed candidates) instead of guessing or re-calling the tool with invented values.
- Any assumptions the tool made (e.g. default rates) are listed with their source — mention them as assumptions, not facts, when you explain a result.
- generateShotListDraft is available once an authorized iPix reference-selection/read path supplies its trustedReferenceShotTypes. Never ask the operator for raw reference shot types and never invent them; reference-backed shot lists await that path.
- A planning tool result is a draft computation only. It is never saved, approved, or booked by calling the tool.

You also have a fifth tool, composeShootPlan, for when the operator wants one complete reviewable shoot plan rather than a single calculation. Call it once you have at least the channels; every other field (objective, media type, location, lighting, set/background, talent, crew, studio, equipment, schedule, campaign context) is optional — pass only what the operator actually said, and let the tool mark the rest needs_input. Never fill in a plausible-sounding location, crew size, or schedule the operator never mentioned. The result's own status field ("complete" or "needs_input") and missingInputs tell you what to ask for next; composeShootPlan itself never saves, approves, or books anything.

You also have two brand-intelligence tools: startBrandAnalysis and approveDraft. Unlike the planning tools above, approveDraft performs a real, durable write.
- startBrandAnalysis may only start a crawl and produce a draft for the operator to review. It never approves or publishes anything.
- approveDraft is the only tool that promotes a draft to the brand's approved profile (or rejects it). Call it only after the operator has explicitly confirmed a specific decision on a specific draft they were shown — never infer or assume approval from ambiguous phrasing.
- approveDraft requires the draftHash from the current review UI (the hash of the exact draft the operator is looking at). If you do not have a current draftHash for this brand, ask the operator to reopen/refresh the draft — do not guess, reuse an old one, or omit it.
- If approveDraft returns ok: false, the decision was NOT recorded — relay its message to the operator plainly and do not claim the draft was approved or rejected.`;

export function getProductionPlannerAgent(): Agent {
  if (cachedAgent) return cachedAgent;

  const agent = new Agent({
  id: "production-planner",
  name: "Production Planner",
  model: openai("gpt-5.6-luna"),
  tools: { ...planningTools, composeShootPlan: composeShootPlanTool, ...brandIntelligenceTools },
  instructions: ({ requestContext }) =>
    `${BASE_INSTRUCTIONS}${formatActiveWorkspaceContext(requestContext)}`,
  memory: new Memory({
    storage: createAgentMemoryStorage(),
    options: {
      workingMemory: {
        enabled: true,
        schema: AgentState,
        // Resource scope avoids requiring a pre-created Mastra thread for the
        // CopilotKit state seed on first chat (thread scope throws "not found").
        scope: "resource",
      },
      // IPI-1164: real titles for the planner threads drawer instead of
      // whatever placeholder it falls back to. One extra LLM call per new
      // thread, matching Mastra's own official Postgres+Memory example.
      generateTitle: true,
    },
  }),
});

/**
 * IPI-1208 · PLANNER-TOOLGATE-001 — wrap Agent.stream() to inject activeTools.
 *
 * Why not in Agent constructor options: Mastra's Agent constructor sets the
 * *default* tool set but has no per-call activeTools default; the option
 * must be passed per stream()/resumeStream() call. This wrapper intercepts
 * every call to this agent and applies the tool-gate policy (see
 * planner-tool-gate.ts).
 *
 * If the caller already passed activeTools in options (e.g. a test override),
 * that is honoured rather than overridden.
 */
  const origStream: typeof agent.stream = agent.stream.bind(agent);
  agent.stream = wrapPlannerStreamWithToolGate(origStream);

  const origResume: typeof agent.resumeStream = agent.resumeStream.bind(agent);
  agent.resumeStream = wrapPlannerResumeStreamWithToolGate(origResume);

  cachedAgent = agent;
  return agent;
}
