# MCP cadence — iPix surfaces

> Before marking any **IPI-* issue Done**, verify external surfaces via MCP or CLI. Fix spec/implementation before flipping status.

**Sources of truth:** `CLAUDE.md` · `prd.md` · `mvp.md` · `todo.md` · `supabase/README.md`

## Surface → probe map

| Surface | MCP / command | Verify |
|---------|---------------|--------|
| Supabase schema + RLS | `user-supabase` MCP · `npm run supabase:verify-rls` | Tables, 19 RLS checks |
| Edge functions (local) | `ls supabase/functions/` · `supabase/config.toml` `[functions.*]` | Name, `verify_jwt` |
| Edge functions (remote) | `user-supabase` `list_edge_functions` / deploy logs | Live version |
| Next.js 16 (`app/`) | `nextjs-16` | `next-devtools-mcp` (dev running) |
| Gemini models | `user-gemini-api-docs-mcp` · read `brand-intelligence/index.ts` `MODEL` | As-built vs AI-018 target |
| CopilotKit v2 | `.agents/skills/copilotkit-*` · `rg @copilotkit/react-core/v2` | No v1 APIs |
| Mastra | `user-mastra` MCP · `services/agent/` when present | Not required until AIOR-001 |
| Client env | `npm run check:env` | No secrets in `VITE_*` |
| Build | `npm run build` · `npm test` | exit 0 |

## Rules

1. **Disk beats memory** — probe `supabase/functions/` before trusting issue text.
2. **Legacy MCP noise** — Medellín/FashionOS objects on shared project are **not** iPix MVP scope.
3. **Edge slug** — shipped function is `brand-intelligence`, not `enrich-brand`.
4. **Model as-built** — edge fns use `gemini-3.5-flash` via `_shared/gemini.ts`; operator app via `src/mastra/models.ts`.

## iPix trap list

| Trap | Probe |
|------|-------|
| `enrich-brand` in spec | Must be `brand-intelligence` |
| `gemini-ping` function | Renamed to `edge-test` |
| `_shared/gemini.ts` exists | `ls supabase/functions/_shared/gemini.ts` — **pending AI-009** |
| PLT-003 / PLT-004 blocking | **Done** post-PR#3 — next queue is UI-001 |
| Routes `/dashboard/assets` | Canonical: `/dashboard/brands/:id/assets` per `02-ai-native-dashboards-plan.md` |
| `ai_agent_logs.latency_ms` | Column is `duration_ms` |
