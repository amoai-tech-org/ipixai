import type { RequestContext } from "@mastra/core/request-context";

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
 *
 * IPI-1346 · PLANNER-AGENT-STRUCTURE-001 extracted this module from
 * `agents/index.ts` unchanged: parsing/formatting only, no authorization.
 * These values are request-scoped context data, never a tenant permission.
 * IPI-1363 · PLANNER-CONTEXT-002 landed while that extraction was open and
 * added the malformed-container guard below; this module carries it.
 */
type AgUiContextEntry = { description?: string; value?: string };

export function formatActiveWorkspaceContext(requestContext?: RequestContext): string {
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
