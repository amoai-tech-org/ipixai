# Mastra — full framework guide

**Parent:** [../SKILL.md](../SKILL.md) · **Index:** [README.md](./README.md)

Progressive disclosure hub — load topic files on demand; do not paste vendor docs here.

---

## Verify before coding (priority order)

1. **Embedded docs:** `grep -r "Agent" node_modules/@mastra/core/dist/docs/references`
2. **Source map:** `cat node_modules/@mastra/core/dist/docs/assets/SOURCE_MAP.json`
3. **Remote:** https://mastra.ai/llms.txt (append `.md` to doc URLs)
4. **MCP:** `searchMastraDocs` with `projectPath` = `$(git rev-parse --show-toplevel)` (this repo root — not `/home/sk/ipix/app`)

Never trust training-data API shapes — Mastra APIs change between versions.

---

## iPix wiring (mandatory)

| Rule | Detail |
|------|--------|
| Location | `src/mastra/` only (not old iPix `app/src/mastra/`) |
| Export | `export const mastra` from `src/mastra/index.ts` |
| Storage | PostgresStore, `schemaName: "mastra"`, `disableInit: true`. Missing `MASTRA_DATABASE_URL` must abort (no in-memory LibSQL). LibSQL only if a task marks the env as disposable preview |
| Models | Starter pin until a provider ticket — run [`model-selection.md`](./model-selection.md) before new ids |
| Agent IDs | **Current:** `weather-agent` (`default`). **Target:** `production-planner` (+ `default` alias) per convert plan — do not assume the target is registered |
| CopilotKit | In-process `getLocalAgents({ mastra, resourceId })` — `resourceId` = `org:{orgId}::user:{userId}` |
| Dev | `npm run dev:agent` (`:4111`) and `npm run dev:ui` (`:3000`) — never combined `npm run dev` |

Full iPix block: [SKILL.md § iPix-specific wiring](../SKILL.md).

---

## Core concepts

| Concept | Reference |
|---------|-----------|
| Agents vs workflows | [core-concepts.md](./core-concepts.md) |
| Agents + tools | [tools.md](./tools.md) · [embedded-docs.md](./embedded-docs.md) |
| Workflows / HITL | [workflows.md](./workflows.md) |
| Memory / threads | [memory.md](./memory.md) |
| Streaming / AG-UI | [streaming.md](./streaming.md) |
| MCP | [mcp.md](./mcp.md) |
| Model ids | [model-selection.md](./model-selection.md) · [model-providers.md](./model-providers.md) |
| `mastra api` CLI | [mastra-api.md](./mastra-api.md) |
| Errors / migration | [common-errors.md](./common-errors.md) · [migration-guide.md](./migration-guide.md) |
| Doc routing | [topic-routing.md](./topic-routing.md) · [../links.md](../links.md) |

---

## TypeScript / dev workflow

- Agent/Studio: `npm run dev:agent` (`mastra dev` on `:4111`)
- UI: `npm run dev:ui` (`:3000`) in a second terminal
- Typecheck: `npx tsc --noEmit` at repo root
- Inspect: `npx --no-install mastra api --help` first; if `api` exists, `npx --no-install mastra api --url http://localhost:4111 agent list` when `:4111` is up

---

## When to load sibling skills

| Need | Skill |
|------|-------|
| CopilotKit operator UI | [copilotkit](../../copilotkit/SKILL.md) |
| Forensic Done gate | [task-verifier](../../task-verifier/SKILL.md) |
