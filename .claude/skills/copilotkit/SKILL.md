---
name: copilotkit
description: >
  CopilotKit v2 hub — operator chat runtime, AG-UI/SSE streaming, A2UI surfaces, Mastra/LangGraph
  integrations, setup, develop, debug, upgrade, OSS contribute. Use whenever the user touches
  CopilotKit, CopilotChat/CopilotSidebar/Popup, /api/copilotkit (including 401 on /info),
  useAgent/useFrontendTool/useHumanInTheLoop, agent not found / agentId mismatch, frontend tools
  not executing, SSE stuck after RunStarted, AG-UI, A2UI createSurface, license token /
  publicLicenseKey, v1→v2 migration, or wiring Mastra agents in src/ — even if they never say
  "CopilotKit". Load references/ on demand. iPix prod: references/ipix-production.md; debug:
  references/debug/debug.md. Do NOT use for Supabase-only migrations/RLS, Mercur checkout,
  shadcn-only UI tweaks, Gemini edge prompts, or Linear issue updates without CopilotKit code.
metadata:
  version: 2.2.1-ipix.2
  priority: 2
---

# CopilotKit Skills Hub

**iPixai:** this repo is the current CopilotKit + Mastra Product runtime (`src/app`, `src/mastra`, split `dev:ui` / `dev:agent`). Prefer `references/integrations/references/integrations/mastra.md` + `references/runtime/references/wiring-mastra.md`. `references/ipix-production.md` is the current iPix Production runbook; verify it against the task SHA and installed package source/types before changing runtime behavior.

One consolidated CopilotKit plugin skill. **Load the matching `references/` file on demand** — do not
paste reference bodies here. Each topic folder keeps its own `references/` sub-docs and `assets/`.

> **Consolidation (v2.2.1-ipix.1):** former standalone skills `copilotkit-setup`, `copilotkit-develop`,
> `copilotkit-integrations`, `copilotkit-agui`, `copilotkit-debug`, `copilotkit-upgrade`,
> `copilotkit-self-update`, `copilotkit-contribute`, `a2ui-renderer`, `runtime`, and `react-core`
> are now `references/` inside this skill. Behavior preserved; packaging only.

---

## Routing — load the reference that matches the task

| User intent | Reference to load |
|-------------|-------------------|
| **iPix production:** license token, Vercel env, `/app/*` smoke, 401 on `/api/copilotkit/info` | [`references/ipix-production.md`](references/ipix-production.md) · Linear [IPI-127](https://linear.app/amo100/issue/IPI-127) |
| Add CopilotKit to a project, first chat, runtime + provider, framework detection | [`references/setup/setup.md`](references/setup/setup.md) |
| Build features: CopilotChat/Popup/Sidebar, frontend tools, context, HITL interrupts, chat customization | [`references/develop/develop.md`](references/develop/develop.md) |
| Wire an external agent framework (Mastra, LangGraph, CrewAI, ADK, PydanticAI, LlamaIndex, Agno, Strands, MS Agent Framework, A2A) | [`references/integrations/integrations.md`](references/integrations/integrations.md) |
| AG-UI protocol, custom backend agents, SSE transport, `HttpAgent`, event flow | [`references/agui/agui.md`](references/agui/agui.md) |
| A2UI surfaces — `createSurface` / `updateComponents` / `updateDataModel`, CopilotRuntime `a2ui`, themes | [`references/a2ui-renderer.md`](references/a2ui-renderer.md) |
| **Generative UI choice:** controlled React UI vs A2UI vs MCP Apps | [`references/generative-ui.md`](references/generative-ui.md) |
| **Channels:** first setup vs managed Channel code vs self-hosted adapters | [`references/channels.md`](references/channels.md) |
| **Inspector:** optional local runtime inspection; upstream contributor skills only when editing Inspector itself | [`references/inspector.md`](references/inspector.md) |
| **Intelligence:** optional managed capability map; verify runtime/licensing/tenancy before adoption | [`references/intelligence.md`](references/intelligence.md) |
| Debug runtime connectivity, streaming, tool execution, transcription, version mismatch, AG-UI event tracing | [`references/debug/debug.md`](references/debug/debug.md) |
| Migrate CopilotKit v1 → v2 (imports, deprecated hooks, GraphQL→AG-UI runtime) | [`references/upgrade/upgrade.md`](references/upgrade/upgrade.md) |
| Refresh/reinstall upstream CopilotKit agent skills (not app code) | [`references/self-update.md`](references/self-update.md) |
| Contribute to the CopilotKit OSS monorepo (fork, branch, test, PR) | [`references/contribute/contribute.md`](references/contribute/contribute.md) |
| **`@copilotkit/runtime`** — CopilotRuntime, AgentRunner, BuiltInAgent, server tools, Intelligence mode | [`references/runtime/runtime.md`](references/runtime/runtime.md) |
| **`@copilotkit/react-core`** — provider, CopilotChat/Popup/Sidebar, useAgent/useThreads/useFrontendTool | [`references/react-core/react-core.md`](references/react-core/react-core.md) |

### Related sibling skills (not folded in)

| Task | Skill |
|------|-------|
| Mastra agents + workflows (iPix) | [`mastra`](../mastra/SKILL.md) |
| Improve/validate this skill | [`skill-creator`](../skill-creator/SKILL.md) |
| iPix AI runtime docs | [`docs/copilotkit-mastra/README.md`](../../../docs/copilotkit-mastra/README.md) |

---

## Routing decision tree

```
CopilotKit task
  ├─ iPix prod / Vercel / license / 401?           → references/ipix-production.md
  ├─ New project / first integration?              → references/setup/setup.md
  ├─ Chat UI, frontend tools, context, interrupts? → references/develop/develop.md
  ├─ External agent framework (Mastra, LangGraph…)?  → references/integrations/integrations.md
  │     (+ references/runtime/runtime.md for deep server wiring)
  ├─ Custom backend / AG-UI events / SSE?          → references/agui/agui.md
  ├─ Agent emits A2UI createSurface/updateComponents? → references/a2ui-renderer.md
  ├─ Need rich typed UI / choose GenUI strategy?        → references/generative-ui.md
  ├─ Slack / Teams delivery?                            → references/channels.md
  ├─ Threads / Agents / AG-UI runtime inspection?       → references/inspector.md
  ├─ CopilotKit Intelligence capability/license area?   → references/intelligence.md
  ├─ Something broken (stream, tools, connectivity)?  → references/debug/debug.md
  ├─ Upgrading from v1?                            → references/upgrade/upgrade.md
  ├─ Stale CopilotKit skill knowledge?             → references/self-update.md
  ├─ PR to CopilotKit/CopilotKit?                  → references/contribute/contribute.md
  ├─ Deep @copilotkit/runtime API?                 → references/runtime/runtime.md
  └─ Deep @copilotkit/react-core hooks?             → references/react-core/react-core.md
```

**iPix Operator Hub path:** `setup` → `integrations` (Mastra) → `develop` → `generative-ui` for typed business artifacts. Use `a2ui-renderer` only when a genuinely dynamic model-selected layout is required.

---

## Reference map (sub-docs to load deeper)

| Topic | Entry guide | Deeper references |
|-------|-------------|-------------------|
| **setup** | `references/setup/setup.md` | `references/setup/references/{framework-detection,runtime-architecture,telemetry-setup}.md` · `references/setup/assets/*` |
| **develop** | `references/develop/develop.md` | `references/develop/references/{api-surface,runtime-api,chat-customization}.md` |
| **integrations** | `references/integrations/integrations.md` | `references/integrations/references/integrations/{mastra,langgraph,crewai,adk,...}.md` |
| **agui** | `references/agui/agui.md` | `references/agui/references/{protocol-spec,client-sdk,building-agents,event-flow-diagrams}.md` |
| **debug** | `references/debug/debug.md` | `references/debug/references/{quick-workflows,runtime-debugging,agent-debugging,error-patterns}.md` |
| **upgrade** | `references/upgrade/upgrade.md` | `references/upgrade/references/{v1-to-v2-migration,breaking-changes,deprecation-map}.md` · `ipix-v2-conventions.md` |
| **contribute** | `references/contribute/contribute.md` | `references/contribute/references/{contribution-guide,pr-guidelines,repo-structure,testing-guide}.md` |
| **runtime** | `references/runtime/runtime.md` | `references/runtime/references/{setup-endpoint,built-in-agent,agent-runners,wiring-*,...}.md` |
| **react-core** | `references/react-core/react-core.md` | `references/react-core/references/{provider-setup,chat-components,client-side-tools,...}.md` |
| **a2ui-renderer** | `references/a2ui-renderer.md` | — (single file) |
| **generative-ui** | `references/generative-ui.md` | Controlled GenUI is iPix default for stable artifacts |
| **channels** | `references/channels.md` | Upstream live setup guide; later/external delivery |
| **inspector** | `references/inspector.md` | Local debugging/observability only |
| **intelligence** | `references/intelligence.md` | Licensed platform capability map; never domain truth |
| **self-update** | `references/self-update.md` | — (single file) |

Each topic folder also carries a `sources.md` where upstream provenance is recorded.

---

## Source-of-truth order

For iPix implementation decisions, use this order:

```text
installed package source/types
→ current official CopilotKit example
→ live CopilotKit docs/MCP
→ bundled skill/reference text
```

Do not follow stale `beta`/`latest` install advice from a bundled reference when the installed dependency family and maintained official example show a stable compatible family.

## Live documentation (MCP)

This plugin bundles the `copilotkit-docs` MCP server (`search-docs`, `search-code`) for live
CopilotKit docs and source lookups. See [`.mcp.json`](.mcp.json).

- **Cursor / Claude Code:** MCP auto-configured when the plugin is installed.
- **Codex / manual:** see [`references/debug/debug.md#mcp-setup`](references/debug/debug.md#mcp-setup).

Use MCP alongside references when API signatures may have changed since the bundled docs were synced.

---

## How to use this skill

1. Identify the task from the routing table or decision tree above.
2. Load **only** that topic's entry guide (`references/<topic>/...`).
3. Load deeper sub-references **on demand** when the guide points to them — keep context lean.
4. For framework wiring, also load [`references/runtime/runtime.md`](references/runtime/runtime.md) when server-side detail is needed.

---

## iPix PR review invariants

When this skill is loaded for PR review, review only changed behavior and verify version-sensitive claims against installed source/types before blocking.

- Stay on `@copilotkit/runtime/v2` and `@copilotkit/react-core/v2` unless the change proves an intentional supported migration.
- Preserve the authenticated `/api/copilotkit` runtime/transport contract and registered `agentId="default"`.
- Thread, connect, stop, runner, and HITL behavior must remain tenant-scoped; **Browser-supplied IDs are not authorization**.
- For cloning, abort/stop, streaming, interrupts, or HITL changes, verify both installed CopilotKit and `@ag-ui/mastra` source/types.
- Require a concrete failure scenario; deterministic tests/CI outrank speculative AI review.
- Prefer targeted CopilotKit route/component tests, then `npm run typecheck`; use broader proof only when the changed boundary requires it.

For a changed v2 import finding, include exactly:
- `Fix: Restore the changed CopilotKit import to its `/v2` subpath.`
- `Verification: Run the existing targeted CopilotKit route tests, then `npm run typecheck`.`
- `Expected result: The route uses the `/v2` import and the targeted tests/typecheck pass.`
