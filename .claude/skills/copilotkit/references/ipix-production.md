# iPix production CopilotKit — plain-language ops guide

**Status:** current iPix production/runtime operations reference. Re-verify live deployment and env names before acting.

## What this is

The operator app at **www.ipix.co/app** uses CopilotKit for the right-hand AI chat. In production, two things must be true:

1. **You are signed in** (Supabase session) — otherwise the runtime returns `401`.
2. **The Mastra Postgres store is configured** (`MASTRA_DATABASE_URL`, with `IPIX_MASTRA_HOSTED=1` so a missing URL fails closed instead of silently using in-memory storage) — Planner conversations are durable there.

> **IPI-1329 · MASTRA-INPROC-001 (2026-09-26):** `/api/copilotkit` always runs the Production
> Planner **in the same iPix/Vercel process** (`createLocalAgents(resourceId)` →
> `TenantAbortRunner`), with thread history in the existing Mastra/Postgres memory. Managed
> CopilotKit Intelligence is **not** used and **not** needed for durable threads. The route no
> longer reads `CPK_INTELLIGENCE_API_KEY`, `COPILOTKIT_API_KEY`, `INTELLIGENCE_API_URL`,
> `INTELLIGENCE_GATEWAY_WS_URL` or `MASTRA_BASE_URL`, so setting any of them cannot switch the
> Planner to a remote service or produce `503 remote_mastra_unavailable`. `/info` always reports
> `mode: "sse"`. Rollback = revert the IPI-1329 route commit; never re-route Production to a
> remote Mastra by env as an emergency workaround.

> **IPI-1191 · COPILOT-INTEL-001 correction (2026-09-11):** this doc previously said to set
> `COPILOTKIT_LICENSE_TOKEN` + `INTELLIGENCE_API_KEY` to unlock Threads — that's the old
> architecture and is what originally caused `Invalid CopilotKit license token` in production.
> `COPILOTKIT_LICENSE_TOKEN` is a **separate, offline/self-hosted-only** credential and is not
> set anywhere in iPix's managed dev/staging/prod. (Historical: the Intelligence-mode wiring
> this note describes was removed from the Product route by IPI-1329.)

## Smoke test (30 seconds)

1. Go to [https://www.ipix.co/login](https://www.ipix.co/login) → sign in with an authorized iPix operator account.
2. Open [https://www.ipix.co/app/shoots](https://www.ipix.co/app/shoots) (any `/app/*` route works).
3. Open DevTools → **Console** — expect **no** red errors mentioning `copilotkit` or `401`.
4. DevTools → **Network** → filter `copilotkit` → `info` request should be **200**.
5. Type “hello” in the AI sidebar → you should see a streamed reply.
6. Press **Stop** on a long reply → composer returns to **Send**; reload → the conversation is restored once.

**Full pass:** steps 1–6.

## Vercel project

| Setting | Value |
|---------|--------|
| Project | Verify the currently aliased iPix production project in Vercel before changing settings |
| Repository root | `/home/sk/ipixai` |
| Runtime route | `src/app/api/copilotkit/[[...slug]]/route.ts` |

## Env vars (production)

| Variable | Required | What it does |
|----------|----------|--------------|
| `MASTRA_DATABASE_URL` | Yes | Mastra Postgres storage (schema `mastra`) — durable Planner threads/messages. `src/mastra/pg-store.ts` reads only this name; `DATABASE_URL` does **not** configure Planner storage. |
| `IPIX_MASTRA_HOSTED` | Yes for hosted iPix (`1`, `true`, or `yes`) | Existing storage guard: when enabled, a missing `MASTRA_DATABASE_URL` throws instead of falling back to `InMemoryStore`. IPI-1329 documents this contract; it does not introduce it. |
| `CPK_INTELLIGENCE_API_KEY` / `COPILOTKIT_API_KEY` | No — ignored | Not read by the Product route since IPI-1329. Leave unset. |
| `MASTRA_BASE_URL` | No — ignored by Product | Only read by legacy remote-Mastra helpers kept until IPI-1334. Leave unset in Production. |
| `COPILOTKIT_LICENSE_TOKEN` | No | Offline/self-hosted-only credential — do not set; a stale/wrong-format value here is what caused `Invalid CopilotKit license token`. |
| Model/provider credentials | As configured by current Planner/model task | Never infer the active provider from this runbook; verify current agent/model config |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Auth + edge function calls |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser Supabase client |

Sync from Infisical; never commit tokens. Local dev: `app/.env.local`.

## How auth + CopilotKit interact

```
Sign in → session cookie set
  → visit /app/shoots
  → src/app/app/layout.tsx runs requireAppWorkspace()
  → verified workspace/session allows the operator shell
  → PlannerApp mounts CopilotKit only after copilotHandshake(authState) allows it
  → signed-out/unverified state must not create unsigned /api/copilotkit/info noise
```

## Common errors

| Error | Meaning | Fix |
|-------|---------|-----|
| `401` on `/api/copilotkit/info` | No valid session | IPI-125 OAuth URLs |
| `/info` reports `mode: "sse"` | Expected — the Product Planner is in-process (IPI-1329) | None |
| Reload loses the Planner conversation | Mastra Postgres storage not reachable/configured | Check `MASTRA_DATABASE_URL` and Vercel runtime logs; do not add an Intelligence key |
| `Invalid CopilotKit license token` banner | `COPILOTKIT_LICENSE_TOKEN` present with a garbage/wrong-format value (e.g. a `ck_pub_...` Cloud public key) | Remove `COPILOTKIT_LICENSE_TOKEN` — managed mode doesn't need it |
| Chat works locally, not prod | Env missing on Vercel | Redeploy after Infisical sync |

## Code pointers

- Runtime: `src/app/api/copilotkit/[[...slug]]/route.ts`
- Operator auth gate: `src/app/app/layout.tsx` → `requireAppWorkspace()`
- CopilotKit mount/provider: `src/components/operator-panel/operator-panel.tsx` (IPI-1225 · PLANNER-ROUTE-RETIRE-001 deleted `src/app/planner-app.tsx`; `/app`'s embedded Production Copilot is the only mount now)
- Mount decision: `src/lib/auth/copilot-mount.ts`
- Verified operator/resource identity: `src/lib/auth/verified-operator.ts`
- Example env: verify current root env documentation before changing variables

## Related issues

- [IPI-125](https://linear.app/amo100/issue/IPI-125) — OAuth (must be green before IPI-127)
- [IPI-48](https://linear.app/amo100/issue/IPI-48) — Mastra runtime foundation
