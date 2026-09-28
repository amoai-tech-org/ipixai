---
name: ipix-supabase
description: >
  iPix Supabase hub (project nvdlhrodvevgwdsneplk): schema, RLS, migrations, auth, edge
  functions, storage, Realtime, verify-rls. Consolidates edge-functions, generic
  Supabase SQL/RLS/migrations, the Supabase CLI, and Postgres performance best-practices
  into one skill with on-demand references. Use for ANY Supabase work
  in this repo. NOT for Mercur commerce tables or legacy Medellín/FashionOS edge functions.
version: "1.5.0"
metadata:
  paths:
    - "supabase/**"
    - "**/*.sql"
    - "src/lib/supabase*"
    - "docs/data/README.md"
---

# ipix-supabase — Supabase hub

Single entry point for Supabase work on **iPixai** (same live project as Lumina: `nvdlhrodvevgwdsneplk`). Combines topic files + [`references/project-rules/`](references/project-rules/).

**Hard gates:** normal Supabase work is migration-file-first and verified locally. Do not mutate production manually; reviewed merge/deploy/recovery workflows own production writes. Mastra-specific persistence changes still require their own preview/golden-test gates. This repo now contains `supabase/`; the old `/home/sk/ipix` repo is read-only reference only.

**Load child `SKILL.md` on demand** — do not paste their bodies here.

---

## Folded topics (load on demand from `references/`)

> **Consolidation note:** the former standalone skills `edge-functions`, `supabase`,
> `supabase-cli`, and `supabase-postgres-best-practices` are now `references/` inside this hub.
> Behavior preserved; only the packaging changed.

| User intent | Reference |
|-------------|-----------|
| **Start here** — iPix project, PLT tables, local fresh-replay, verify-rls | *(this hub)* `SKILL.md` + topic files (`postgres.md`, `realtime.md`, `storage.md`, …) |
| Deno edge functions, JWT, Gemini in functions | [`references/edge-functions/edge-functions.md`](references/edge-functions/edge-functions.md) + [`edge-functions.md`](edge-functions.md) + [`references/edge-functions/edge-functions-inventory.md`](references/edge-functions/edge-functions-inventory.md) — see **Edge Functions reference index** below |
| Generic migrations, RLS SQL, DB functions, schema, SQL style | [`references/supabase-core/supabase-core.md`](references/supabase-core/supabase-core.md) (+ `MIGRATIONS/RLS-POLICIES/FUNCTIONS/SCHEMA/SQL-STYLE.md`) + `references/project-rules/` |
| Supabase **CLI** workflows (`supabase` CLI, local/remote) | [`references/cli/cli.md`](references/cli/cli.md) |
| Query perf, indexes, connection pooling, EXPLAIN | [`references/postgres-best-practices.md`](references/postgres-best-practices.md) → detail in [`references/postgres/`](references/postgres/) (already mirrored) |
| **Verification / adversarial proof** — catalog, RLS, grants, functions, triggers, migrations, advisors, live read-only state | [`references/verification-matrix.md`](references/verification-matrix.md) |

### Edge Functions reference index (`references/edge-functions/`)

| File | Topic | When to load |
|------|-------|-------------|
| [`edge-functions.md`](references/edge-functions/edge-functions.md) | Entry point — Deno.serve, CORS, JWT, DB access | Always first for edge function work |
| [`architecture.md`](references/edge-functions/architecture.md) | Serverless at edge, global distribution, cold starts | Debugging performance or runtime behaviour |
| [`cli.md`](references/edge-functions/cli.md) | `supabase functions new/serve/deploy/invoke` | Creating, serving locally, or deploying |
| [`Configuration.md`](references/edge-functions/Configuration.md) | Per-function `config.toml` — JWT toggle, import maps | Function needs non-default auth or deploy opts |
| [`dependencies.md`](references/edge-functions/dependencies.md) | npm / esm.sh / deno.land, import maps, vendoring | Adding or updating a package |
| [`development.md`](references/edge-functions/development.md) | Local dev — `functions serve`, env vars, Docker | Setting up or troubleshooting local dev |
| [`custom-routing.md`](references/edge-functions/custom-routing.md) | Multi-route functions, path/method matching | Consolidating actions into one function |
| [`secrets.md`](references/edge-functions/secrets.md) | `supabase secrets set/list`, default env vars | Adding API keys or sensitive config |
| [`testing.md`](references/edge-functions/testing.md) | `Deno.test` — HTTP, auth, DB test patterns | Writing or debugging function tests |
| [`ai-models.md`](references/edge-functions/ai-models.md) | Supabase AI API — embeddings, LLM inference | Adding AI/embedding calls inside a function |

> **Edge Function dependency gotcha:** `brand-intelligence`'s dependency closure reaches outside `supabase/` entirely — `_shared/llm/allowlist.ts` imports `../../../../config/groq-models.json`, resolving to `config/groq-models.json` at the **repo root**, a generated SSOT shared with the Next.js app, not a file under `supabase/functions/`. Easy to miss if you're only looking inside `supabase/functions/_shared/`; the CLI's own import resolution won't miss it, another reason to deploy via CLI rather than hand-listing files.

### Routing decision tree

```
Supabase task in iPix
  ├─ Which project / table / MVP policy?         → this SKILL.md + topic files
  ├─ Edge function (Deno, CORS, Gemini)?          → references/edge-functions/edge-functions.md
  ├─ Migration, RLS policy, Postgres function?    → references/supabase-core/supabase-core.md + references/project-rules/
  ├─ Supabase CLI workflow?                       → references/cli/cli.md
  ├─ Slow query, index, EXPLAIN, pool limits?     → references/postgres-best-practices.md + references/postgres/
  └─ Prove DB change safe / production-ready?      → references/verification-matrix.md
```

---

## When NOT to use

- **Mercur catalog** (products, orders, sellers) — lives on Mercur Postgres, not Supabase
- **Auth0 / Clerk / Firebase** as primary auth — iPix uses Supabase Auth (PLT-002)
- **Raw Postgres** without Supabase client, RLS, or Edge Functions in scope

## Triggers

supabase, RLS, auth.uid, edge function, Deno.serve, verify_jwt, storage bucket, signed URL, migration, supabase-js, service role, publishable key, brands, brand_scores, ai_agent_logs, verify-rls, fresh-replay, local Docker.

---

## Project identity

| Key | Value |
|-----|-------|
| **Project ref** | `nvdlhrodvevgwdsneplk` |
| **Dashboard** | https://supabase.com/dashboard/project/nvdlhrodvevgwdsneplk |
| **Policy** | Local fresh-replay (`supabase start` / `db reset --local`) is the proven verification method — CI-enforced via the `supabase-fresh-replay` job on every PR (see IPI-1162). In the normal workflow, do **not** manually run `supabase db push --linked`, `supabase migration repair`, or `supabase db reset --linked` against production; production migration application is owned by the reviewed merge/deploy path. |
| **Commerce** | **Mercur** — never duplicate product/order tables in Supabase |

Mastra schema contract: [`docs/mastra/db-001-matrix.md`](../../../docs/mastra/db-001-matrix.md)
Old operator repo (read-only reference): `/home/sk/ipix/supabase/`

### MCP / CLI trust

1. Prefer the **Supabase plugin/MCP for read-only live inspection** when it is confirmed on `nvdlhrodvevgwdsneplk`; record the project ref in evidence.
2. Use **local CLI + Docker** for migration replay and destructive testing. Use `--linked` only for explicit read-only state checks such as migration listing/lint/dry-run.
3. After every RLS change, fresh-replay locally and run the affected targeted SQL/security tests from `references/verification-matrix.md`. CI `supabase-fresh-replay` is the global reproducibility gate; do not depend on removed `supabase:verify-*` npm scripts.
4. Cursor **`user-supabase` MCP** may show legacy Medellín/FashionOS objects — **ignore** unless MCP is confirmed on `nvdlhrodvevgwdsneplk`.
5. Never treat plugin/CLI permission errors as permission to change production manually; change verification method or escalate.
6. **To deploy an Edge Function, use the CLI: `supabase functions deploy <name> --project-ref nvdlhrodvevgwdsneplk`** from the exact reviewed/merged source already checked out locally. Do **not** hand-bundle a function's files through the MCP `deploy_edge_function` tool — that tool takes an inline file array, which means manually resolving the function's entire relative-import dependency closure yourself (every `_shared/` file it touches, transitively) and re-typing each file's content into the call. It's slow, and one missed or mistyped file produces a silent runtime bug instead of a bundle error. The CLI resolves imports itself from the real files on disk, including dependencies outside `supabase/` (see the dependency gotcha above). (IPI-1093 post-merge deploy, 2026-09-12 — the MCP path took ~20 tool calls and a manual dependency-closure script for one function; the CLI took one command.)
7. **Large MCP reads can blow past tool output limits.** `get_edge_function` on a function with a wide dependency tree (e.g. `brand-intelligence`, which pulls in the whole `_shared/llm/` provider-abstraction layer) returns 100KB+ and gets truncated/saved-to-file. Prefer `supabase functions list` or reading the local source directly; reach for `get_edge_function` only when you specifically need to diff *deployed* bytecode against local source.

---

## iPix MVP tables (PLT-001)

| Table | Purpose |
|-------|---------|
| `brands` | Operator brand profiles (`user_id`, `ai_profile` jsonb) |
| `brand_scores` | DNA scores (`score_type`, `score`, `details`) |
| `commerce_product_links` | Supabase ↔ Mercur `medusa_product_id` |
| `ai_agent_logs` | Agent runs (`duration_ms`, tokens, model) |
| `assets` | + `brand_id`, `dna_score`, `dna_status`, `dna_pillars` |
| `profiles` | PLT-002 sync with `auth.users` |
| `shoots` | Shoot metadata (legacy, still used) |

Legacy FashionOS tables coexist on the shared project — do not extend them for iPix MVP without audit ([SEC-001 / IPI-52](https://linear.app/amo100/issue/IPI-52)).

Full orientation: [references/tables-overview.md](references/tables-overview.md)

---

## Repo coordinates (iPixai)

Wire clients under `src/` when they exist. Until then, treat the table below as **target layout**, not proof the files are already here.

| What | Where |
|------|-------|
| Supabase client | `app/src/lib/supabase/` for the operator app; verify exact current path before editing |
| Mastra storage | PostgresStore → `mastra` schema — preview first |
| Types | Do **not** regenerate via MCP `generate_typescript_types` blindly — it can emit `public` only and drop other schemas. Prefer CLI `--linked` + `git diff --stat` |
| Edge functions / migrations | `supabase/` in this repository; old `/home/sk/ipix/supabase/` is read-only historical reference |
| Client env | `NEXT_PUBLIC_SUPABASE_*` |
| Server secrets | never `NEXT_PUBLIC_` for service role |

## Daily verification path

Do **not** `cd /home/sk/ipix` from this repo. This repository now owns `supabase/` and the fresh-replay CI path.

1. Inspect current repo migrations/schema first.
2. For an existing live DB object being changed, retrieve its authoritative installed definition before editing — never reconstruct functions, triggers, policies, views, or privileged RPCs from memory, issue prose, or reviewer comments.
3. Prove migrations locally with `supabase start` + `supabase db reset --local` (or the exact CI equivalent).
4. Use the plugin/linked project only for read-only comparison, Advisors, and post-deploy verification unless an explicitly approved migration/recovery workflow owns the write.
5. Never use Dashboard SQL editor, manual `db push --linked`, `migration repair`, or `db reset --linked` as the normal development path.

### Local Docker stack identity (`project_id`)

`supabase/config.toml`'s `project_id` names the local Docker Compose stack — it is **not** cosmetic. This repo runs many concurrent git worktrees, and `supabase init` auto-sets `project_id` to whatever directory it's run in. If a worktree-generated `config.toml` (with that worktree's own `project_id`) ever gets merged into `main`, every future checkout of `main` — including the primary `~/ipixai` clone — inherits it, and now shares/races over the *same* container set as that worktree instead of getting its own independent stack (confirmed live: PR amoai-tech/ipixai#131, `project_id` had leaked in from `wt-ipi-1162-sb-mig-003`, producing a `supabase start` failure that looked like a random container-startup race but was really two checkouts fighting over one Docker project).

Before trusting `supabase start`/`status` output in an unfamiliar checkout: confirm `project_id` in `supabase/config.toml` actually matches *this* directory (normally `"ipixai"`). If it names a worktree or branch you don't recognize, `git blame` that line before debugging further — the fix is a one-line `project_id` change, not a Docker investigation. Note that even with correct, distinct `project_id`s, two stacks still can't run *concurrently* on the same host — the local ports (`54321`–`54324` etc.) are fixed in `config.toml`, so only one Supabase stack owns them at a time; `supabase stop` the other checkout's stack before starting this one.

### New migrations

When this repo has `supabase/migrations/`:

```bash
supabase migration new <name>
# edit supabase/migrations/<timestamp>_<name>.sql
```

Do not `supabase db push` to production as a normal development step. Historical IPI-126 / PLT-era remote-apply notes are no longer workflow authority; current migration ownership is defined by the reviewed merge/deploy path and the project rules below.

Do **not** rewrite applied remote history. Local Docker/fresh replay is now an active required verification path; historical notes that call it deferred are stale.

---

## Path-scoped rules — [`references/project-rules/`](references/project-rules/)

| Topic | File |
|-------|------|
| Client usage, RLS mindset, schema habits | [supabase-patterns.md](references/project-rules/supabase-patterns.md) |
| Migration file conventions | [supabase-migrations.md](references/project-rules/supabase-migrations.md) |
| RLS policy SQL patterns | [supabase-rls-policies.md](references/project-rules/supabase-rls-policies.md) |
| Postgres functions | [supabase-database-functions.md](references/project-rules/supabase-database-functions.md) |
| Edge Functions (Deno) | [supabase-edge-functions.md](references/project-rules/supabase-edge-functions.md) |
| Realtime | [supabase-realtime.md](references/project-rules/supabase-realtime.md) |
| SQL style | [supabase-sql-style.md](references/project-rules/supabase-sql-style.md) |

---

## Core principles

1. **Database is source of truth.** RLS enforces this — not frontend state.
2. **Verify, don't assume.** Run fresh replay, affected targeted SQL/security tests, and applicable Advisors before declaring done.
3. **Service-role key never reaches the browser.** Edge functions / CLI only. No `VITE_*`.
4. **Every new iPix table has RLS.** No exceptions in `public`.
5. **Use `(select auth.uid())` / `(select auth.jwt())` when row-independent** so Postgres can initPlan/cache them per statement; do not wrap row-dependent functions blindly.
6. **Grants + RLS are separate gates.** A correct policy cannot compensate for an unintended table/function grant, and a missing grant is not an RLS denial.
7. **UPDATE ownership must protect both old and new rows.** Review `USING` and `WITH CHECK`, and remember UPDATE also needs a SELECT policy.
8. **Views are an exposure boundary.** Public/API-facing views should normally use `security_invoker = true` or be kept out of exposed schemas / have access revoked.
9. **SECURITY DEFINER is exceptional.** Default to invoker; if definer is required, set a safe `search_path`, schema-qualify references, classify whether direct RPC execution is intended, and verify ACL + tenant behavior.
10. **Advisor finding ≠ automatic fix.** Classify intent and prove impact before moving extensions, dropping indexes, changing grants, or modifying legacy objects.

---

## Routing — read topic files on demand

| User intent | Read |
|-------------|------|
| Auth, profiles, GoTrue, session | [client-and-auth.md](client-and-auth.md) + [`references/auth/`](references/auth/) |
| Edge functions, Gemini, deploy | [edge-functions.md](edge-functions.md) + [references/edge-functions/edge-functions.md](references/edge-functions/edge-functions.md) + [references/edge-functions/edge-functions-inventory.md](references/edge-functions/edge-functions-inventory.md) |
| AI edge patterns | [references/edge-functions/ai-edge-functions.md](references/edge-functions/ai-edge-functions.md) |
| Schema / table groups | [references/tables-overview.md](references/tables-overview.md) |
| Query perf, indexes, advisors | [postgres.md](postgres.md) + [references/postgres-best-practices.md](references/postgres-best-practices.md) + [references/postgres/](references/postgres/) |
| Realtime channels | [realtime.md](realtime.md) |
| Storage buckets, signed URLs | [storage.md](storage.md) |

---

## iPix edge functions (as-built — verified live 2026-07-20)

| Function | Purpose |
|----------|---------|
| `health` | Liveness |
| `edge-test` | Authenticated Gemini smoke (replaces legacy `gemini-ping`) |
| `brand-intelligence` | URL → brand profile (Gemini + urlContext + responseSchema) |
| `start-brand-crawl` | Firecrawl v2 crawl job start (IPI-24) |
| `capture-lead` | Public lead capture from the marketing chatbot (WEB-015.2) -- writes `chatbot_conversations`/`chatbot_messages`/`lead_intake_drafts` |
| `firecrawl-webhook` | Firecrawl signed webhook → `brand_crawls` / `brand_crawl_results` |
| `audit-asset-dna` | Image DNA scoring — writes `assets.dna_score`/`dna_status`/`dna_pillars` |

**Do not** copy Medellín/mde edge functions from MCP inventory — different product.

Full per-function detail (verify_jwt, models, secrets): [references/edge-functions/edge-functions-inventory.md](references/edge-functions/edge-functions-inventory.md). After adding functions: also update `supabase/config.toml` → run [scripts/verify-edge-inventory.sh](scripts/verify-edge-inventory.sh).

### Two separate Gemini call paths -- do not conflate them

This repo has **two independent routes to Gemini**, not one:

```mermaid
flowchart LR
    subgraph nextjs["Next.js operator app"]
        MA["Mastra agents"] -->|AI_GATEWAY_URL| CFW["Cloudflare AI Gateway Worker<br/>services/cloudflare-worker/"]
        CFW --> LLM1["Gemini / Groq"]
    end
    subgraph edge["Supabase edge functions"]
        BI["brand-intelligence /<br/>audit-asset-dna"] -->|"GEMINI_API_KEY, direct SDK call"| LLM2["Gemini"]
    end
```

- **Mastra agents** (the Next.js operator app) call out through the Cloudflare AI Gateway Worker -- see `app/src/lib/ai/provider-adapter.ts` (`AI_GATEWAY_URL`) and CLAUDE.md's Cloudflare section.
- **Supabase edge functions** (`brand-intelligence`, `audit-asset-dna`) call Gemini **directly** via the `GoogleGenAI` SDK + the `GEMINI_API_KEY` secret (`supabase/functions/_shared/gemini.ts`) -- they do **not** go through the Cloudflare Worker at all.

Don't assume Cloudflare AI Gateway guidance applies to edge functions, or that edge-function Gemini calls show up in Cloudflare AI Gateway logs -- they won't.

---

## Storage (PLT-011 — Cloudinary, not Supabase Storage)

**MVP decision:** Cloudinary holds bytes; Supabase holds metadata in `assets` + optional `cloudinary_assets`.

- Folder: `ipix/{user_id}/{brand_id}/{asset_id}`
- Edge: `cloudinary-sign` (signed upload params), `register-asset` (persist row)
- Secrets: `CLOUDINARY_*` edge-only — see `docs/supabase/secrets-inventory.md`
- Spec: `docs/linear/issues/IPI-30-PLT-011.md`
- **Do not** create `ipix-assets` Supabase buckets for MVP unless explicitly re-approved

Legacy FashionOS `storage` buckets and shoot-scoped RLS remain — extend with brand-owner policies via forward migration.

---

## Auth (PLT-002)

- **Operator:** `app/src/app/(operator)/app/*` — session via Supabase SSR (`app/src/lib/supabase/server.ts`, `session.ts`)
- **Login:** `app/src/app/(marketing)/login` · callback `app/src/app/auth/callback/route.ts`
- **Legacy Vite:** `/login` + `ProtectedRoute` in `src/` — retire with [IPI-89](https://linear.app/amo100/issue/IPI-89)
- Google OAuth: `signInWithOAuth({ provider: "google" })` with redirect to `/app`
- Prod redirect URLs: [IPI-125](https://linear.app/amo100/issue/IPI-125)

### Auth references — `references/auth/`

| File | When to load |
|------|-------------|
| [`architecture.md`](references/auth/architecture.md) | Debugging auth flow, JWT issuance, GoTrue internals |
| [`google.md`](references/auth/google.md) | Google OAuth setup, Google Cloud Console config, One Tap |
| [`facebook.md`](references/auth/facebook.md) | Facebook OAuth setup, App Review, email permission |
| [`sessions.md`](references/auth/sessions.md) | JWT expiry, refresh tokens, session limits, unexpected logouts |
| [`users.md`](references/auth/users.md) | User object schema, RLS with auth.uid(), app_metadata vs user_metadata |
| [`Identities.md`](references/auth/Identities.md) | Multiple identities per user, identity linking, anonymous users |
| [`nextjs.md`](references/auth/nextjs.md) | Auth setup for `app/` Next.js operator hub (PKCE, cookie auth) |

---

## Universal security checklist

- **`user_metadata` is user-editable** — never authorize from it
- **UPDATE needs SELECT** RLS policy
- **Storage upsert needs INSERT + SELECT + UPDATE** policies
- **Service role never in `app/` or `src/`**
- Extend `scripts/verify-rls.mjs` when adding tenant-scoped tables
- **`maybeSingle()`/`single()` calls MUST check `error` before checking for a missing row.** `maybeSingle()` returns `{ data: null, error: null }` on a genuine miss but `{ data: null, error: PostgrestError }` on a real DB/RLS/network failure — treating both the same way (`if (!data) notFound()`) silently converts real outages into a misleading 404. Found via 3 independent PR reviewers flagging the exact same line on IPI-536/PR #347. Always: `const { data, error } = await ...; if (error) throw error; if (!data) notFound();` — never skip the error check.
- **A bulk-access RLS policy does not automatically cover "can a user see their own row."** `assignments_select_org` (`supabase/migrations/20260709000000_planner_schema_rls.sql:468-470`) required manager+ to `SELECT` *any* `planner.assignments` row, including the caller's own — so a contributor/viewer checking their own permissions got zero rows and was treated as unassigned (P1 bug, PR #347). Any time you write an RLS policy for "managers/owners can see everyone's records," ask the separate question **"can a user see their own record too?"** at write time — if yes, add a narrow `SECURITY DEFINER` RPC hard-scoped to `auth.uid()` (never a caller-supplied user id) alongside the bulk policy, don't wait for a reviewer to find the gap. See `public.planner_get_my_assignment` (migration `20260712235000`) for the pattern.

---

## Pre-ship checklist

- [ ] Applicable proof classes from [`references/verification-matrix.md`](references/verification-matrix.md) are identified and satisfied.
- [ ] Migration-bearing change fresh-replays locally from scratch; no synthetic application state was added merely to make history replay.
- [ ] Existing functions/triggers/policies/views changed in this task were compared with their authoritative installed definitions first.
- [ ] RLS/grants changes include allowed + denied role/tenant cases; UPDATE checks old and resulting row where ownership can change.
- [ ] SECURITY DEFINER / public RPC / view exposure is explicitly classified and ACL/search-path/security-invoker state proved where applicable.
- [ ] `npm run supabase:types` if exposed schema changed.
- [ ] Affected targeted RLS/grant/SQL security tests pass; CI `supabase-fresh-replay` remains the global reproducibility gate.
- [ ] Fresh replay also passes `supabase/tests/security/catalog-security-regression.sql`; any exception is exact and reviewed, not a weakened global rule.
- [ ] Security + performance Advisors reviewed; findings are triaged, not blindly fixed.
- [ ] No service role or Gemini key in client bundle.
- [ ] Edge function CORS + JWT/custom-auth contract documented and tested.
- [ ] Exact-head CI is green; after deploy, applicable live state is verified read-only.

---

## Post-merge Edge Function deploy checklist

The pre-ship checklist above covers *before merge*. Once a PR touching `supabase/functions/**` merges, deploying it to production needs its own proof — a merge alone does not update the live Edge Functions (they're deployed separately from the DB migration path). Sequence proven on IPI-1093 · BRAND-INTEL-001 (PR #128, 2026-09-12):

- [ ] Confirm the working tree is at the exact merge commit — zero diff against `origin/main` for every path being deployed (function dirs + `_shared/` + any repo-root config the function imports, e.g. `config/groq-models.json`).
- [ ] Record each function's pre-deploy `version`/`status` via `list_edge_functions` (or `supabase functions list`) *before* deploying — this is the only way to prove the version actually advanced afterward.
- [ ] Deploy via CLI (`supabase functions deploy <name> --project-ref <ref>`), one function at a time.
- [ ] Re-run `list_edge_functions` — confirm each deployed function's `version` is strictly greater than its pre-deploy value and `status` is `ACTIVE`. Confirm `verify_jwt` didn't silently flip (the CLI preserves it, but check).
- [ ] **Don't stop at grepping local source — that proves the checkout, not the deployed artifact.** A version bump proves *something* deployed; it doesn't prove the *right* bytes did. Pick one verification method:
  - `supabase functions download <name> --project-ref <ref>` into a scratch directory and diff it against the exact reviewed/merged source you deployed from, or
  - `get_edge_function` (Supabase MCP, read-only) to inspect the deployed source directly when downloading isn't convenient, or
  - when neither is practical, a targeted runtime/behavior check that only the new code path can produce (see next step) — but treat that as weaker evidence of *artifact identity* than a source diff.
- [ ] Run a targeted authenticated/runtime smoke against the live function that exercises the specific fix/behavior the PR claimed (e.g. the exact request shape that used to fail) — this proves *behavior*, which a version bump or source diff alone does not.
- [ ] Re-run `get_advisors` (security) and diff against the pre-deploy baseline — a deploy should introduce zero new findings; anything new is either a false read or a real regression, not something to wave through. Advisors prove security/performance posture, not Edge source identity — they don't substitute for the source-diff/runtime-smoke steps above.
- [ ] Check function logs (`query_logs` or CLI `functions logs`) for unexpected provider/config/schema errors after the smoke request.

---

## Companion skills

- [`tasks`](../tasks/SKILL.md) — canonical Linear task definition/execution standard
- [`task-verifier`](../task-verifier/SKILL.md) — independent evidence gate; use Adversarial for Supabase security/data-integrity work

Use `tasks` for task/PR lifecycle orchestration; keep Supabase implementation and verification details in this skill.

## Source of truth

| Location | Role |
|----------|------|
| `.claude/skills/ipix-supabase/` | The one Supabase skill — hub + iPix topic files + `references/` (incl. folded edge-functions, supabase-core, cli, postgres-best-practices) |

---

## References (deep dives)

- [references/postgres/](references/postgres/) — query perf, indexes, RLS perf, locking
- [references/storage/rls-policies.md](references/storage/rls-policies.md)
- [references/realtime/rls-policy-cookbook.md](references/realtime/rls-policy-cookbook.md)
- [references/supabase/skill-feedback.md](references/supabase/skill-feedback.md)

---

## Exit conditions

- Routed to correct topic file(s)
- iPix project ref respected; verified via local fresh-replay; for any `supabase/migrations/**` change, explicit human approval was obtained *before* merge (merge itself applies to production — IPI-1171) and that approval is recorded; no manual destructive command (`db push --linked`, `migration repair`, `db reset --linked`) run outside that approved path
- Local fresh replay + affected targeted RLS/grant tests run after policy changes
- Inventory updated after edge function add/remove


## PR review invariants

When reviewing Supabase/Auth/Postgres changes, use this same canonical skill rather than a separate reviewer.

- Browser `orgId`, `user_metadata`, and service-role possession are never authorization.
- RLS and SQL grants are separate gates; verify both.
- UPDATE ownership needs correct `USING`, `WITH CHECK`, and SELECT visibility.
- `SECURITY DEFINER` requires explicit need, safe `search_path`, qualified references, narrow ACLs, and tenant proof.
- Public/API views require intentional exposure, normally `security_invoker=true` or revoked access.
- Migration history is forward-only; do not rewrite applied history.
- DB errors must not be silently converted to “not found”.
- Tenant-sensitive changes require deterministic Org A allowed + Org B denied proof.
- Do not invent production state; live DB observations count only when independently retrieved and identified by project/schema.
