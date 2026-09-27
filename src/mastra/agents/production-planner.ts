import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { z } from "zod";

import { createAgentMemoryStorage } from "@/mastra/pg-store";
import { planningTools } from "@/mastra/tools/planning";
import { composeShootPlanTool } from "@/mastra/tools/compose-shoot-plan";
import { brandIntelligenceTools } from "@/mastra/tools/brand-intelligence";
import {
  wrapPlannerResumeStreamWithToolGate,
  wrapPlannerStreamWithToolGate,
} from "@/mastra/planner-tool-gate";

import { productionPlannerInstructions } from "./production-planner-instructions";

/**
 * Working-memory shape for the Planner's `proverbs` slot. Kept exported
 * because `agents/index.ts` re-exports it as part of the module's existing
 * surface; the live frontend type is the separate `@/lib/types` declaration.
 */
export const AgentState = z.object({
  proverbs: z.array(z.string()).default([]),
});

// IPI-1048 · PLANNER-001: production default agent. Runtime/model/memory below
// is unchanged from the starter weather agent it replaces.
// IPI-1049 · TOOL-001 added the four compute-only planning tools below —
// see src/mastra/tools/planning.ts for the reuse/adaptation evidence.
//
// IPI-1346 · PLANNER-AGENT-STRUCTURE-001: this module owns Agent construction
// only. Business prompt text lives in production-planner-instructions.ts and
// RequestContext parsing lives in active-workspace-context.ts.
let cachedAgent: Agent | undefined;

export function getProductionPlannerAgent(): Agent {
  if (cachedAgent) return cachedAgent;

  const agent = new Agent({
    id: "production-planner",
    name: "Production Planner",
    model: openai("gpt-5.6-luna"),
    tools: { ...planningTools, composeShootPlan: composeShootPlanTool, ...brandIntelligenceTools },
    instructions: productionPlannerInstructions,
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
