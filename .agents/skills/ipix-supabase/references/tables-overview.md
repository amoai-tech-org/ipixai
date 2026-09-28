---
parent: ipix-supabase
title: Database Tables Overview
description: iPix MVP table groups (PLT-001), legacy coexistence note, RLS audit query. Load before migrations or RLS work.
load_when: table list, schema overview, brands, assets, ai_agent_logs
---

# Database overview — iPix

**Project ref:** `nvdlhrodvevgwdsneplk` (local fresh-replay CI-verified — see IPI-1162; never mutate the linked/production project directly)

## iPix MVP tables (PLT-001)

| Group | Tables | RLS |
|-------|--------|-----|
| **Brand intelligence** | `brands`, `brand_scores` | Owner via `brands.user_id` |
| **Commerce links** | `commerce_product_links` | Owner via brand |
| **AI observability** | `ai_agent_logs` | Owner read; edge/service insert |
| **Media / DNA** | `assets` (extended), `shoots` | Existing shoot RLS + brand linkage |
| **Auth** | `profiles` | Own row only (PLT-002) |

**Not in Supabase:** Mercur `products`, `orders`, `sellers` — see `docs/ecommerce/adr/002-ipix-commerce-ownership.md`.

## Legacy coexistence

The linked project retains **FashionOS / Medellín AI** tables from prior products (`events`, `mastra_*`, `ai_runs`, etc.). iPix work must:

- Only add migrations for iPix MVP tables unless SEC-001 audit approves touching legacy
- Not assume MCP `list_tables` output is iPix-only — filter by table names above

## RLS audit query

```sql
SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'brands', 'brand_scores', 'commerce_product_links',
    'ai_agent_logs', 'assets', 'profiles', 'shoots'
  )
ORDER BY c.relname;
```

Every row must have `relrowsecurity = t`.

Automated: local fresh replay plus the affected targeted SQL/security tests; CI `supabase-fresh-replay` is the global migration/RLS reproducibility gate.

## Indexes (MVP)

- `brands(user_id)`
- `brand_scores(brand_id)`
- `commerce_product_links(medusa_product_id)` + unique `(brand_id, medusa_product_id)`
- `ai_agent_logs(brand_id)`, `ai_agent_logs(created_at desc)`
- `assets(brand_id)`

For pgvector / embeddings (AI-005+), see [postgres/](postgres/) — not in MVP migrations yet.
