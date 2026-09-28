---
paths:
  - "supabase/migrations/**"
---

# Database: Create migration

You are a Postgres Expert who loves creating secure database schemas.

This project uses the migrations provided by the Supabase CLI.

## Order of operations — file first, always

**Write the file → retrieve authoritative live definitions when modifying existing objects → fresh-replay locally → targeted SQL/security tests → commit/review → merge through the approved deployment path → verify live read-only → regenerate types when exposed schemas changed.**

Hard rules:

- Never apply a normal schema change through Dashboard SQL or manual production `db push --linked` before the migration file is reviewed and merged.
- Never run `supabase db reset --linked` against production.
- Use `supabase migration repair` only in an explicit, reviewed recovery/incident procedure.
- Do not rewrite already-deployed migration history. Production recovery is forward-only.
- Do not manufacture application users/orgs/business rows inside historical migrations merely to make replay pass. Make the migration presence-tolerant or recover the authoritative history safely.
- If changing an existing function, trigger, policy, view, grant-sensitive RPC, or other privileged object, retrieve the installed definition first. Do not rebuild it from memory, issue prose, or reviewer comments.

Historical migrations now fresh-replay in CI. The repository's `supabase-fresh-replay` job runs a real local Supabase database and `supabase db reset --local`; this is the canonical reproducibility gate. Linked/live inspection is a separate read-only comparison, not a substitute for replay.

For migration-bearing PRs, protected `main` requires both `Supabase Preview` and `supabase-fresh-replay`, plus explicit human approval. Per IPI-1171, merging to `main` is the production approval point because the enabled Supabase GitHub Integration has **Deploy to production** ON. Do not follow older instructions that call for a second manual `supabase db push --linked` after merge.

### Verify before opening the PR

Run the cheapest applicable proof in this order:

```bash
# 1. Static review of the exact migration/diff.
# 2. Targeted local SQL/catalog/security tests for the changed contract.
# 3. Fresh replay from version-controlled history.
supabase start
supabase db reset --local
```

Then, only when extra live-state confidence is needed, use a **read-only** linked/plugin check such as migration listing, Advisors, catalog inspection, or a dry-run/lint command that cannot apply changes. Record the exact project ref.

Fresh replay proves syntax/order/history reproducibility. It does **not** prove RLS roles, grants, tenant isolation, trigger semantics, backfill correctness, query performance, or RPC exposure; add the targeted proofs from [`../verification-matrix.md`](../verification-matrix.md).

### After merge

Do not perform a second manual production push simply because the PR merged. The reviewed iPix deployment path owns migration application. Verify the deployed result read-only instead:

1. Confirm the expected migration appears in live migration state.
2. Re-read changed catalog objects (function/policy/trigger/view/grant/index) and compare with reviewed intent.
3. Run the smallest safe production smoke/read-only authorization check allowed by the task.
4. Regenerate/commit types when exposed schemas changed and the repository workflow requires it.
5. If deployment did not apply or live state differs, stop and use an explicit recovery task/runbook; do not improvise with `migration repair` or destructive linked commands.

### Recovery from remote-only / drift incidents

Treat remote-only migrations or ledger mismatches as incidents, not normal development. Preserve the authoritative installed SQL and ledger identity exactly, document provenance, restore version-controlled history through a reviewed recovery PR, and prove fresh replay before resuming normal work. Never guess a function body or silently change semantics while reconstructing history.

## Creating a migration file

Given the context of the user's message, create a database migration file inside the folder `supabase/migrations/`.

The file MUST following this naming convention:

The file MUST be named in the format `YYYYMMDDHHmmss_short_description.sql` with proper casing for months, minutes, and seconds in UTC time:

1. `YYYY` - Four digits for the year (e.g., `2024`).
2. `MM` - Two digits for the month (01 to 12).
3. `DD` - Two digits for the day of the month (01 to 31).
4. `HH` - Two digits for the hour in 24-hour format (00 to 23).
5. `mm` - Two digits for the minute (00 to 59).
6. `ss` - Two digits for the second (00 to 59).
7. Add an appropriate description for the migration.

For example:

```
20240906123045_create_profiles.sql
```

## SQL Guidelines

Write Postgres-compatible SQL code for Supabase migration files that:

- Includes a header comment with metadata about the migration, such as the purpose, affected tables/columns, and any special considerations.
- Includes thorough comments explaining the purpose and expected behavior of each migration step.
- Write all SQL in lowercase.
- Add copious comments for any destructive SQL commands, including truncating, dropping, or column alterations.
- When creating a new table, you MUST enable Row Level Security (RLS) even if the table is intended for public access.
- When creating RLS Policies
  - Ensure the policies cover all relevant access scenarios (e.g. select, insert, update, delete) based on the table's purpose and data sensitivity.
  - If the table is intended for public access the policy can simply return `true`.
  - RLS Policies should be granular: one policy for `select`, one for `insert` etc) and for each supabase role (`anon` and `authenticated`). DO NOT combine Policies even if the functionality is the same for both roles.
  - Include comments explaining the rationale and intended behavior of each security policy

The generated SQL code should be production-ready, well-documented, and aligned with Supabase's best practices.

## New tables and sequences need an explicit `grant`

Postgres no longer hands one out for you. As of IPI-896 · SB-SEC-008 (migration
`20260801091009_ipi896_revoke_default_table_privileges.sql`), the default privileges for role
`postgres` in schema `public` grant new tables and sequences to `service_role` only — `anon` and
`authenticated` get nothing.

RLS is now the *second* gate, not the first. Enabling it is still required; it is no longer
sufficient. Grant only the operations you also cover with policies — table privileges do **not**
bypass RLS.

```sql
create table public.thing (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id)
);

alter table public.thing enable row level security;

-- Tenant check = public.is_org_member(uuid) via org_members (not a top-level JWT org_id claim)
create policy thing_select_own on public.thing
  for select to authenticated
  using (is_org_member(org_id));

create policy thing_insert_own on public.thing
  for insert to authenticated
  with check (is_org_member(org_id));

create policy thing_update_own on public.thing
  for update to authenticated
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- ← required, not optional. Without this the policies above never get consulted.
grant select, insert, update on table public.thing to authenticated;
```

**Missing grant ≠ empty RLS.** On an authenticated Data API read, a missing table privilege is
an insufficient-privilege failure (Postgres `42501` / HTTP 403). A SELECT policy that admits no
rows is a successful empty array (`[]`). `scripts/verify-rls.mjs` treats denial errors and empty
200s as different outcomes — check the grant before rewriting the policy:

```sql
select has_table_privilege('authenticated', 'public.thing', 'SELECT');  -- f = missing grant
```

Two related traps:

- A `serial` column needs its sequence granted separately — `USAGE` alone is enough for
  `nextval` on insert (`grant usage on sequence public.thing_id_seq to authenticated;`). Do not
  add `SELECT` unless the app must inspect sequence state. Prefer
  `generated always as identity` (no separate sequence grant).
- The same rule has applied to **functions** since IPI-684 · SB-SEC-001b: a new function in
  `public` is not executable by `anon`/`authenticated` without an explicit `grant execute`.

Standing guard: `supabase/tests/security/default-table-privileges.sql`, run by
`.github/workflows/supabase-verify-rls.yml` on **trusted internal PRs and pushes to `main`**
(when the workflow gate returns `mode=run`). Fork / Dependabot PRs skip remote probes
(`mode=skip`) — do not treat a skipped check as remote proof. It creates a throwaway table and
sequence inside a rolled-back transaction and fails if these defaults are ever restored.

Other schemas differ — `planner`, `talent`, and `shoot` still grant `authenticated` by default
(IPI-897 · SB-SEC-009 tracks closing that gap for `planner`). Verify rather than assume:

```sql
select defaclnamespace::regnamespace, defaclobjtype, defaclacl::text from pg_default_acl;
```
