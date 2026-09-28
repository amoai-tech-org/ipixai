---
parent: ipix-supabase
title: Edge Functions Inventory (iPix)
description: Canonical iPix edge functions — names, verify_jwt, auth, Gemini models. Verified live against Supabase project nvdlhrodvevgwdsneplk.
load_when: edge function list, verify_jwt, deploy, brand-intelligence, audit-asset-dna
verified_at: 2026-07-20
---

# Edge functions — iPix (as-built + target)

**Status:** PLT-003 ✅ — functions exist under `supabase/functions/`.  
**Do not** treat Medellín/mde functions in Supabase MCP as iPix scope.

**Drift check:**

```bash
.claude/skills/ipix-supabase/scripts/verify-edge-inventory.sh
cd supabase && deno task test
```

Each deployed function needs a `[functions.<name>]` block in `supabase/config.toml`.

---

## Shipped (verified live 2026-07-20)

| Function | Model(s) | `verify_jwt` | Auth / notes |
|----------|----------|--------------|--------------|
| `health` | — | false | Public liveness |
| `edge-test` | `resolveGeminiModel()` default | true | Authenticated Gemini smoke (replaces legacy `gemini-ping`) |
| `brand-intelligence` | `resolveGeminiModel()` default (Gemini) or Groq | true | URL analysis + `responseSchema`; writes `brands`, `brand_scores`, `ai_agent_logs`. Calls Gemini **directly** via `GEMINI_API_KEY` — not routed through the Cloudflare AI Gateway Worker |
| `audit-asset-dna` | `resolveGeminiModel()` default | true | Vision + DNA pillars; writes `assets.dna_score`/`dna_status`/`dna_pillars`. Same direct-Gemini path as `brand-intelligence` |
| `capture-lead` | — | false | Public lead capture from chatbot (WEB-015.2, IPI2-161). Writes `chatbot_conversations`, `chatbot_messages`, `chatbot_events`, `lead_intake_drafts`. Rate-limited by anon_id + IP. |
| `start-brand-crawl` | — | true | IPI-24 — Firecrawl v2 crawl start; idempotent `brand_crawls` job; `ai_agent_logs` |
| `firecrawl-webhook` | — | false | IPI-24 — HMAC `X-Firecrawl-Signature`; `EdgeRuntime.waitUntil`; page upserts + job metrics |

`resolveGeminiModel()` resolves from the `GEMINI_MODEL` secret or falls back to `DEFAULT_GEMINI_MODEL` in `supabase/functions/_shared/gemini.ts` — check that file directly rather than hardcoding a model ID here, it changes independently of this doc.

**Shared modules:** `_shared/auth.ts`, `_shared/cors.ts`, `_shared/env.ts`, `_shared/response.ts`, `_shared/agent-log.ts`, `_shared/supabase-client.ts`, `_shared/firecrawl.ts`, `_shared/gemini.ts` (central model registry + `generateStructuredContent`)

**Secrets (edge only):** `GEMINI_API_KEY`, `FIRECRAWL_API_KEY`, `FIRECRAWL_WEBHOOK_SECRET`

**Slug note:** Docs/issues may say `enrich-brand` — **canonical slug is `brand-intelligence`**.

---

## MVP target (not shipped)

| Function | Spec | Model (target) | Notes |
|----------|------|----------------|-------|
| `match-product-links` | AI-011 | tools + structured output | Mercur integration |

---

## Planned (post-MVP)

| Function | Spec | Notes |
|----------|------|-------|
| Mercur webhook receiver | COM-031 | Signature in-handler |
| Product link sync | COM-030 | Cron or manual |

---

## CORS (MVP)

Allow origins: `http://localhost:8080`, production Vite URL from env.

---

## When updating this file

1. Add `supabase/functions/<name>/index.ts`
2. Register in `supabase/config.toml`
3. Deploy: `supabase functions deploy <name> --linked`
4. Run `.claude/skills/ipix-supabase/scripts/verify-edge-inventory.sh` and the affected Deno tests (`cd supabase && deno task test`)
