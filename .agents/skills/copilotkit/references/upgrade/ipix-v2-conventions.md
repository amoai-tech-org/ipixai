# iPix CopilotKit v2 Conventions

Use this file for **legacy → current API translation** and upgrade-specific rules.

For the **current iPix CopilotKit↔Mastra runtime contract** — the installed
package family, the Production architecture, the minimal route shape, the HITL
protocol choice, and the security/persistence invariants — read
[`../integrations/references/integrations/mastra.md`](../integrations/references/integrations/mastra.md).
That file is canonical. This one must not restate it: two copies of the same
runtime truth drift apart, and only one of them gets updated when the runtime
changes. Installed package source/types outrank both references when they
disagree, and `package.json` + the lockfile outrank all three.

## Legacy → current API translation

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

### Runtime endpoint factory — version-qualified

**Installed `@copilotkit/runtime 1.73.3`:** prefer `createCopilotHonoHandler`; this family marks `createCopilotEndpoint` as a deprecated alias. The current iPix route still uses that alias — do not copy it into new code, and do not mix that runtime cleanup into unrelated feature work.

Treat the factory name as **version-qualified guidance, not a permanent API name**. Upstream documentation surfaces currently also describe `createCopilotEndpointHono` and `createCopilotRuntimeHandler` variants, so re-check the installed `@copilotkit/runtime/v2` exports and types after any CopilotKit upgrade before relying on this name. The route shape itself lives in the canonical Mastra integration reference.

## Upgrade rules

- **A reference update is not a dependency upgrade.** Re-read `package.json`, the lockfile, and installed types before implementing against a future package family; any family change needs its own task and compatibility proof.
- **Retired pins must not reappear.** If a reference still names a superseded version as current, fix the reference rather than the version.
- **Installed source outranks every document**, including this one and any upstream page. Where an upstream page contradicts installed `@ag-ui/mastra` or `@copilotkit/runtime` behaviour, the installed source wins and the contradiction should be recorded.

## Verification before changing Product runtime code

1. Re-read `package.json`, lockfile, and the installed runtime/react/AG-UI types.
2. Inspect `src/app/api/copilotkit/[[...slug]]/route.ts`, `src/agent.ts`, `src/lib/copilotkit/tenant-abort-runner.ts`, and `src/mastra/pg-store.ts`.
3. Check the current official CopilotKit Mastra example and current HITL docs/source.
4. Keep the current in-process architecture unless a separate evidence-backed architecture task explicitly changes it.
5. Run the narrow contract tests first, then the owning skill/registry checks.

For the detailed CopilotKit↔Mastra source mapping and pinned upstream example, see
[`../integrations/references/integrations/mastra.md`](../integrations/references/integrations/mastra.md).
