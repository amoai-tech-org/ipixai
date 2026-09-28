# iPix CopilotKit v2 Conventions

Use this file for **current iPix implementation choices**, not as a generic CopilotKit migration guide.
Installed package source/types outrank this reference when they disagree.

## Current iPix package family

Verified from `package.json` / installed types:

| Package | iPix version |
|---|---:|
| `@copilotkit/runtime` | `1.73.3` |
| `@copilotkit/react-core` | `1.73.3` |
| `@copilotkit/channels` | `0.11.0` |
| `@ag-ui/client` | `0.0.59` |
| `@ag-ui/mastra` | `1.1.4` |
| `@mastra/core` | `1.71.0` |
| `@mastra/memory` | `1.32.1` |
| `@mastra/pg` | `1.27.1` |

Do not turn this reference update into a dependency upgrade. Re-read `package.json`, the lockfile, and installed types before implementing against a future package family.

## Production Planner architecture

```text
/app
  → same-origin /api/copilotkit
  → requirePlannerResourceId() derives org + user identity on the server
  → createLocalAgents(resourceId)
  → MastraAgent.getLocalAgents(...)
  → TenantAbortRunner exact-run cancellation
  → in-process Mastra Production Planner
  → Memory + PostgresStore
  → MASTRA_DATABASE_URL
  → approved Supabase/Postgres `mastra` schema
```

This is the Product runtime contract. Do **not** make hosted CopilotKit Intelligence, `MASTRA_BASE_URL`, `MastraClient`, or `MastraAgent.getRemoteAgents()` the default Product path. Legacy remote helpers remain only until `IPI-1334` cleanup.

## Runtime endpoint API

For **new** CopilotKit Hono code, prefer the non-deprecated factory exported by the installed runtime:

```ts
import {
  CopilotRuntime,
  createCopilotHonoHandler,
} from "@copilotkit/runtime/v2";

const runtime = new CopilotRuntime({
  agents: attachRunnerAbort(createLocalAgents(resourceId)),
  identifyUser: identifyOperator,
  runner: new TenantAbortRunner(resourceId, request.signal),
});

const app = createCopilotHonoHandler({
  runtime,
  basePath: "/api/copilotkit",
  hooks: copilotAuthHooksFor(resourceId),
});
```

Installed `@copilotkit/runtime 1.73.3` marks `createCopilotEndpoint` as a deprecated alias of `createCopilotHonoHandler`. The current iPix route still uses that alias; do not copy it into new code, and do not mix that runtime cleanup into unrelated feature work.

## Current hook/API conventions

Import the current React v2 APIs from `@copilotkit/react-core/v2` unless the installed source for the target component says otherwise.

| Legacy pattern | Current iPix v2 direction |
|---|---|
| `useCoAgent` | `useAgent` |
| `useCopilotReadable` | `useAgentContext` |
| `useCopilotAction` | `useFrontendTool` |
| render inside `useCopilotAction` | `useRenderTool` / `useRenderToolCall` or activity rendering as appropriate |
| `useCopilotChatSuggestions` | `useConfigureSuggestions` + `useSuggestions` |
| package-root v1 provider | `CopilotKit` from `@copilotkit/react-core/v2` |
| old framework endpoint helpers | `createCopilotHonoHandler` for Hono/Next.js runtime integration |

Do not mechanically translate an old hook name without checking the installed `@copilotkit/react-core/v2` types. Current installed exports include `useAgent`, `useAgentContext`, `useFrontendTool`, `useHumanInTheLoop`, `useInterrupt`, `useRenderTool`, `useRenderToolCall`, `useConfigureSuggestions`, and `useSuggestions`.

## HITL: choose the protocol by what is waiting

`@ag-ui/mastra 1.1.4` supports native Mastra tool suspension through the AG-UI interrupt protocol: `tool-call-suspended` becomes a structured interrupt outcome and resume returns through Mastra `resumeStream()`.

Use the smallest matching primitive:

- **Mastra server tool suspends:** Mastra `suspend()` / `resumeStream()` + CopilotKit `useInterrupt` when the UI must resolve the structured interrupt.
- **Frontend-owned approval tool:** `useHumanInTheLoop` when the browser owns the interactive tool contract.
- **Durable asynchronous business workflow:** Mastra workflow `suspend()` / `run.resume()` backed by persisted workflow snapshots.

UI approval is not authorization. For any durable or privileged action, the **server revalidates** the authenticated actor, organization, exact artifact/run, and requested action immediately before the idempotent write.

## iPix invariants

- Server-derived `resourceId` is the tenant/user memory boundary; never trust browser `orgId`, user metadata, thread IDs, or model output for authorization.
- Supabase/Postgres remains durable application truth and tenant security remains Auth + RLS + server authorization.
- Mastra owns agents, tools, workflows, memory/orchestration, and durable suspend/resume—not tenant authorization.
- CopilotKit + AG-UI owns the interactive transport/UI boundary.
- `TenantAbortRunner` remains the current exact-run Stop boundary.
- Hosted Production must use the guarded Postgres path; do not replace it with in-memory or LibSQL examples from demos.
- AI proposes; humans approve; the server revalidates and records the exact approved action.

## Verification before changing Product runtime code

1. Re-read `package.json`, lockfile, and the installed runtime/react/AG-UI types.
2. Inspect `src/app/api/copilotkit/[[...slug]]/route.ts`, `src/agent.ts`, `src/lib/copilotkit/tenant-abort-runner.ts`, and `src/mastra/pg-store.ts`.
3. Check the current official CopilotKit Mastra example and current HITL docs/source.
4. Keep the current in-process architecture unless a separate evidence-backed architecture task explicitly changes it.
5. Run the narrow contract tests first, then the owning skill/registry checks.

For the detailed CopilotKit↔Mastra source mapping and pinned upstream example, see `../integrations/references/integrations/mastra.md`.
