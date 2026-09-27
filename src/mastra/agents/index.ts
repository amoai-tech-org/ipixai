/**
 * IPI-1346 · PLANNER-AGENT-STRUCTURE-001 — compatibility barrel.
 *
 * This module exists only to keep the existing public import surface stable.
 * `runtime.ts` and the Planner tests import `getProductionPlannerAgent` from
 * `src/mastra/agents`; that stays true.
 *
 * Owners (change the smallest one that matches your change):
 *   - Agent construction, model, tools, Memory, memoisation, stream/resume
 *     tool-gate wrappers → ./production-planner
 *   - Planner business instructions + dynamic per-request resolver
 *     → ./production-planner-instructions
 *   - RequestContext["ag-ui"] parsing/formatting → ./active-workspace-context
 *
 * Importing this module must stay side-effect free: no Agent, no Memory and
 * no storage is constructed until `getProductionPlannerAgent()` is called.
 */
export { AgentState, getProductionPlannerAgent } from "./production-planner";
