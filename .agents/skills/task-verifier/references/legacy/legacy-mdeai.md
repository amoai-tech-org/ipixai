# Legacy mdeai verification

**Not iPix MVP.** Load only when verifying `tasks/core/F*.md`, OpenClaw, CTI, or Events tasks under `/home/sk/mdeai` or archived paths in this repo.

## Sub-guides (self-contained)

| Domain | Reference |
|--------|-----------|
| OpenClaw OCL | [openclaw-ocl.md](./openclaw-ocl.md) |
| Coffee Tour CTI | [agent-cti.md](./agent-cti.md) |
| Events | [agent-events.md](./agent-events.md) |
| Disk probes | [../../scripts/legacy/probe-disk.sh](../../scripts/legacy/probe-disk.sh) — `REPO=/home/sk/mdeai` |
| MCP cadence | [mcp-cadence.md](./mcp-cadence.md) |
| Anti-fake-done (mdeapp) | [anti-fake-done-checklist.md](../anti-fake-done-checklist.md) § Legacy mdeai |

## Mastra port pack (F13–F20)

See [task-spec-rubric.md](../task-spec-rubric.md) § Legacy mdeai extras.

## Common traps (mdeai)

1. **`npm run audit` ≠ `npm audit`** — script uses `--audit-level=high`.
2. **`F09-supp`** → canonical `F09-floor-script-and-vitest.md`.
3. **Beta processors renamed** — `TokenLimiterProcessor`, `ModerationProcessor`.
4. **`Agent({ workflows })` does not exist** — probe `agent.d.ts`.
5. **`@mastra/evals` not in beta** — defer F20 evals.
6. **Repo namespace** — `amo-tech-ai/mdeapp`, not `mdeai/mdeai-app`.
7. **Vitest `@/*` alias** — needs `vitest.config.ts` resolve.
8. **Tailwind v4** — CSS-first; no `tailwind.config.ts` required.
9. **Vercel** — never `vercel link` mdeapp to `amo100/mdeai` prod.
10. **CopilotKit in-process** vs Mastra HTTP `/chat` — Pattern 1 for mdeapp.
11. **`onFinish`** on `stream()`/`generate()`, not Agent constructor.
12. **`ai_runs.agent_type` ENUM** — no invented values.
13. **`useCoAgent` name** must match `Mastra({ agents: { key } })`.

## External paths (may not exist in ipix repo)

OpenClaw sources lived under `tasks/openclaw/docs/sources.md` on mdeai — use [openclaw-ocl.md](./openclaw-ocl.md) probes instead of broken ipix-relative links.
