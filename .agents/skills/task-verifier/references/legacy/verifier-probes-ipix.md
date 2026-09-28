# iPix verifier probes

**Companion:** [mcp-cadence-ipix.md](./mcp-cadence-ipix.md) · [skills-compliance-ipix.md](./skills-compliance-ipix.md) · `.claude/skills/task-verifier/SKILL.md`

**Script:** `bash .claude/skills/task-verifier/scripts/legacy/probe-disk-ipix.sh [app|supabase|skills|git]`

## Universal (every ship)

| Probe | Command | Pass |
|-------|---------|------|
| Build (legacy) | `infisical run -- npm run build` | exit 0 if `src/**` touched |
| Build (operator) | `cd app && npm run build` | exit 0 if `app/**` touched |
| Tests (legacy) | `infisical run -- npm run test` | exit 0 |
| Tests (operator) | `cd app && npm test` | exit 0 |
| RLS | `infisical run -- npm run supabase:verify-rls` | all checks when DB touched |
| Client env | `npm run check:env` | exit 0 (Vite `src/` only) |
| No Gemini in client | `rg 'GEMINI_API_KEY\|VITE_GEMINI' app/ src/` | no matches |
| Edge inventory | `ls supabase/functions/*/index.ts` | matches [edge-functions-inventory.md](../../../ipix-supabase/references/edge-functions/edge-functions-inventory.md) |

## IPI-126 / BI-OPS-002 (migration push gate)

Linear [IPI-126](https://linear.app/amo100/issue/IPI-126) · tracker [`docs/linear/issues/README.md`](../../../../../docs/linear/issues/README.md)

| Probe | Command / check | Pass |
|-------|-----------------|------|
| Migration file on disk | `ls supabase/migrations/20260625000000_brand_scores_unique_update_rls.sql` | exists |
| Remote applied | `infisical run -- npm run supabase:migrations` | `20260625000000` listed |
| UNIQUE index | SQL: `pg_indexes` for `brand_scores_brand_id_score_type_uidx` | on remote |
| UPDATE RLS | `infisical run -- npm run supabase:verify-rls` | `user A updates own brand_score` |
| Onboarding smoke | `/app/onboarding` → Hub 4 scores + DNA AVG | manual or E2E |
| Done flip | IPI-126 **Done** + IPI-46 **Done** after smoke | both issues |

**Order:** IPI-46 **code** on `main` first → IPI-126 push/verify → E2E → Done. Not a separate epic; final gate for IPI-46 B3–B4.

## IPI-26 / IPI-BI-003 (schema v2)

Linear [IPI-26](https://linear.app/amo100/issue/IPI-26) · spec [`IPI-26-IPI-BI-003.md`](../../../../../docs/linear/issues/IPI-26-IPI-BI-003.md)

| Probe | Command / check | Pass |
|-------|-----------------|------|
| Dependencies | IPI-46 + IPI-126 **Done** | before start |
| Enum `brand_intake_status` | 7 lifecycle values; not `none/draft/approved` | `pg_type` / constraint |
| Backfill | `none/draft→brand_created`, `approved→ready` | SQL count |
| `instagram_handle` | on `brands` | column exists |
| `score_version` + `source` | on `brand_scores` (`details` pre-exists) | columns |
| 4 new tables | `brand_social_channels`, `brand_competitors`, `brand_crawl_results`, `brand_agent_results` | remote |
| Indexes | brand_id + unique (platform, firecrawl_job_id) | `pg_indexes` |
| `brand_intake_drafts` | **alter** RLS only — table pre-exists | no CREATE |
| `verify-rls.mjs` | probes for all 5 tables in spec §6 | script + green run |
| Realtime | `pg_publication_tables` for `brand_crawl_results` | not implicit |
| Agent audit cols | `agent_version`, `model`, `started_at`, `completed_at` on `brand_agent_results` | columns |
| Types | `npm run supabase:types` | committed |

**Enum (brands only):** `brand_created`, `crawl_running`, `crawl_complete`, `analysis_running`, `scores_complete`, `ready`, `failed` — HITL on `brand_intake_drafts.status`.

## IPI-24 / IPI-BI-001 (Firecrawl crawl pipeline)

Linear [IPI-24](https://linear.app/amo100/issue/IPI-24) · spec [`IPI-24-IPI-BI-001.md`](../../../../../docs/linear/issues/IPI-24-IPI-BI-001.md)

| Probe | Command / check | Pass |
|-------|-----------------|------|
| Dependencies | IPI-46 + IPI-26 **Done** | before start |
| Shared wrapper | `test -f supabase/functions/_shared/firecrawl.ts` | file exists |
| Edge fns | `ls supabase/functions/start-brand-crawl supabase/functions/firecrawl-webhook` | both dirs |
| No client SDK | `rg '@mendable/firecrawl\|firecrawl-js' app/src src/` | 0 matches |
| Migration | `ls supabase/migrations/*brand_crawls*` | `20260627000000_brand_crawls_job_pages.sql` |
| Job table | SQL: `to_regclass('public.brand_crawls')` | not null |
| Job enums | `brand_crawl_job_status`, `brand_crawl_pipeline_state` | `pg_type` |
| Page columns | `brand_crawl_results.crawl_id`, `page_url`, `raw_json`, `firecrawl_scrape_id` | `information_schema.columns` |
| Idempotency index | `brand_crawls_idempotency_active_uidx` | `pg_indexes` |
| `firecrawl_job_id` UNIQUE | on `brand_crawls` | constraint |
| RLS job table | `npm run supabase:verify-rls` | org-member SELECT; cross-org deny |
| RLS page rows | `verify-rls.mjs` | SELECT via crawl → brand org |
| Realtime | `pg_publication_tables` for **`brand_crawls`** | job progress (IPI-31) |
| Intelligence smoke | `npm run supabase:verify-brand-intelligence` | crawl file probes green |
| Webhook security | HMAC `X-Firecrawl-Signature` on raw body | unit test or manual |
| Secrets | Infisical `/ipix/edge`: `FIRECRAWL_API_KEY`, `FIRECRAWL_WEBHOOK_SECRET` | not in client bundle |

**Backward compat:** `crawlResultId` = `brand_crawls.id`; `brand_crawls.raw_data` aggregate until IPI-25 reads normalized pages.

## As-built edge (2026-06-14)

| Function | Model | `config.toml` |
|----------|-------|---------------|
| `health` | — | ✅ `verify_jwt = false` |
| `edge-test` | `gemini-2.5-flash` (smoke) | ✅ `verify_jwt = true` |
| `brand-intelligence` | `gemini-2.5-flash` | ✅ register after deploy |

**Not shipped yet:** `audit-asset-dna`, `match-product-links`

## Schema traps

| Wrong | Correct |
|-------|---------|
| `ai_agent_logs.latency_ms` | `duration_ms` |
| `brand_scores.overall_score` | `score` + `score_type` |
| `generateImages()` | `generateContent()` + `inlineData` |

## Model policy

| Layer | Default | Notes |
|-------|---------|-------|
| **As-built edge** | `gemini-2.5-flash` | `brand-intelligence/index.ts` |
| **Target (AI-018)** | `gemini-3.5-flash` | [`tasks/intelligence/plans/gemini-plan.md`](../../../../../tasks/intelligence/plans/gemini-plan.md) |
| **Mastra agent server** | `google/gemini-3.5-flash` | Verify provider registry at AIOR-001 |

## Dashboard / UI probes (operator app)

| Claim | Probe |
|-------|-------|
| Operator layout | `rg OperatorPanel app/src/` |
| Route registered | `rg '/app/onboarding' app/src/app` |
| CopilotKit v2 | `rg '@copilotkit/react-core/v2' app/src/` |
| Canonical routes | Match `docs/plan/02-ai-native-dashboards-plan.md` §2 |
