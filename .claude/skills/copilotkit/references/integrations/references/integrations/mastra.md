# Mastra Integration — current iPix contract

Use this reference when wiring or reviewing CopilotKit + Mastra in iPix. It is an **iPix overlay**, not a generic starter.

## Source priority

For version-sensitive decisions:

1. current iPix `package.json` + lockfile;
2. installed package source/types;
3. current iPix runtime files;
4. pinned maintained CopilotKit Mastra example;
5. live CopilotKit docs/MCP.

Do not copy dependency pins, demo auth, in-memory storage, or demo agent names from an upstream example into iPix.

## Current installed iPix family — verified 2026-09-28

| Package | iPix pin |
| --- | ---: |
| `@copilotkit/runtime` | `1.73.3` |
| `@copilotkit/react-core` | `1.73.3` |
| `@copilotkit/channels` | `0.11.0` |
| `@ag-ui/client` | `0.0.59` |
| `@ag-ui/mastra` | `1.1.4` |
| `@mastra/core` | `1.71.0` |
| `@mastra/memory` | `1.32.1` |
| `@mastra/pg` | `1.27.1` |
| `@mastra/client-js` | `1.50.0` |

These are the current **installed iPix pins**, not a command to install `latest`. Re-check npm/official release guidance at execution time; any dependency-family change requires a separate upgrade task and compatibility proof.

## Current Production architecture

```text
/app Production Copilot
→ same-origin /api/copilotkit
→ requirePlannerResourceId()
→ server-derived org + user resourceId
→ createLocalAgents(resourceId)
→ MastraAgent.getLocalAgents({ mastra, resourceId })
→ TenantAbortRunner
→ in-process Mastra Production Planner
→ Mastra Memory
→ PostgresStore
→ MASTRA_DATABASE_URL
→ Supabase `mastra` schema
```

Load-bearing iPix owners:

- `src/app/api/copilotkit/[[...slug]]/route.ts` — authenticated CopilotKit endpoint and local runtime selection;
- `src/agent.ts` — canonical `default` agent key and `createLocalAgents(resourceId)`;
- `src/mastra/runtime.ts` — Mastra registry for the Production Planner and workflows;
- `src/lib/copilotkit/tenant-abort-runner.ts` — tenant-scoped exact-run Stop behavior;
- `src/mastra/pg-store.ts` — guarded `PostgresStore` / `MASTRA_DATABASE_URL` storage.

The Product route deliberately does **not** select hosted CopilotKit Intelligence or remote Mastra from environment variables. Legacy remote helpers remain only until `IPI-1334` cleanup and are not the Production architecture.

## Minimal current route shape

```ts
import { CopilotRuntime, createCopilotHonoHandler } from "@copilotkit/runtime/v2";
import { createLocalAgents } from "@/agent";
import { requirePlannerResourceId } from "@/lib/auth/planner-session";
import { TenantAbortRunner, attachRunnerAbort } from "@/lib/copilotkit/tenant-abort-runner";

const session = await requirePlannerResourceId(request);
if (!session.ok) return session.response;

const resourceId = session.resourceId;
const runtime = new CopilotRuntime({
  agents: attachRunnerAbort(createLocalAgents(resourceId)),
  runner: new TenantAbortRunner(resourceId, request.signal),
  // identifyUser + auth hooks are also required by the real route.
});

const app = createCopilotHonoHandler({
  runtime,
  basePath: "/api/copilotkit",
  // real iPix route also supplies tenant-scoped hooks.
});
```

This snippet intentionally omits auth-hook implementation detail; the real route is authority. Do not replace it with demo identity or browser-owned org/thread values.

**Endpoint API note:** installed `@copilotkit/runtime 1.73.3` marks `createCopilotEndpoint` as a deprecated alias of `createCopilotHonoHandler`. The current iPix route still imports the alias, so do not copy that alias into new code. Runtime cleanup should be a separate reviewed code change; this skill-sync task changes guidance only.

## Official CopilotKit reference — ADAPT, never copy wholesale

Pinned upstream baseline used for this audit:

- https://github.com/CopilotKit/CopilotKit/blob/c14e2270f2dc2b63589d0e84110ef174b2853f91/examples/integrations/mastra/src/agent.ts
  - **ADAPT** `MastraAgent.getLocalAgents(...)` as the in-process bridge.
  - Do not copy demo package pins, auth, agent registry, or persistence choices.
- https://github.com/CopilotKit/CopilotKit/blob/c14e2270f2dc2b63589d0e84110ef174b2853f91/showcase/shell-docs/src/content/docs/integrations/mastra/copilot-runtime.mdx
  - **REFERENCE ONLY** for local-vs-remote integration concepts.
  - iPix has already selected the local/in-process Product route.

Refetch upstream before a future implementation; the pinned SHA is evidence for this audit, not permanent API authority.

## HITL / interrupts — verified against installed `@ag-ui/mastra 1.1.4`

Do **not** use the old blanket rule “Mastra interrupts are unsupported.” Installed `@ag-ui/mastra 1.1.4` handles Mastra `tool-call-suspended` events, emits a structured AG-UI interrupt outcome, and resumes through the adapter's `resumeStream()` path.

Choose the mechanism by backend contract:

### Native Mastra suspend → `useInterrupt`

Use this when a Mastra tool deliberately suspends and the backend execution itself owns the checkpoint:

```text
Mastra tool suspend()
→ @ag-ui/mastra `tool-call-suspended`
→ structured AG-UI interrupt (`mastra_suspend` payload)
→ CopilotKit useInterrupt
→ human resolve/cancel
→ AG-UI resume
→ adapter resumeStream(... resumeData ...)
```

Current maintained upstream proof:

- backend suspend tool: https://github.com/CopilotKit/CopilotKit/blob/c14e2270f2dc2b63589d0e84110ef174b2853f91/showcase/integrations/mastra/src/mastra/tools/interrupt.ts
- frontend `useInterrupt`: https://github.com/CopilotKit/CopilotKit/blob/c14e2270f2dc2b63589d0e84110ef174b2853f91/showcase/integrations/mastra/src/app/demos/gen-ui-interrupt/page.tsx
- live hook docs: https://docs.copilotkit.ai/reference/v2/hooks/useInterrupt

The current CopilotKit docs contain an older conflicting Mastra page that still says interrupts are unsupported. For iPix `@ag-ui/mastra 1.1.4`, installed source/types plus the maintained upstream example above outrank that stale page.

### Frontend-tool HITL → `useHumanInTheLoop`

Use `useHumanInTheLoop` when the desired contract is an interactive **frontend tool** whose promise remains pending until the user responds. This is appropriate for LLM-initiated UI collection/confirmation that does not rely on a Mastra-native suspend event.

Reference: https://docs.copilotkit.ai/reference/v2/hooks/useHumanInTheLoop

### Durable business workflow approval

For durable Brand/Shoot/Campaign workflow state, Mastra workflow `suspend()` / resume plus persisted snapshots remain the execution truth. Do not assume every workflow-step suspension is automatically surfaced through the agent-tool AG-UI interrupt bridge; verify the exact installed event path for the workflow being changed.

For consequential actions, UI approval alone is never authorization:

```text
AI proposes
→ human reviews exact artifact/revision/hash
→ UI returns decision
→ server revalidates actor + org + run + artifact + current domain state
→ authorized idempotent action executes
→ durable result is read back
```

## Security and persistence invariants

- Browser `orgId`, resource IDs, thread IDs, run IDs, and model output are claims until server-authorized.
- `resourceId` is derived by the server before creating local agents.
- Product durability uses the guarded `PostgresStore`; local in-memory fallback must never be described as hosted durability.
- `RequestContext` is runtime context, not authorization.
- Exact-run Stop and stale-Stop behavior stay tenant scoped.
- Consequential writes require human review plus server/domain revalidation.
- Do not add another runtime, runner registry, Redis/queue, or persistence table without a proven current gap.

## Development

Use the repository-owned commands:

```bash
npm run dev:ui
npm run dev:agent
```

Run them separately. Do not use a bundled demo's `pnpm dev` instructions as the iPix development contract.
