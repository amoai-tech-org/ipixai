# iPix migration scaffold

**Production project** `nvdlhrodvevgwdsneplk` is remote-only for mutation. Migration verification happens against a local Supabase fresh replay; never run destructive linked commands against production. Folded from former `create-migration` skill.

**Also load:** [`../supabase-core/MIGRATIONS.md`](../supabase-core/MIGRATIONS.md) (generic structure) ·
[`../project-rules/supabase-migrations.md`](../project-rules/supabase-migrations.md) ·
[`../../../tasks/references/pre-merge-tests.md`](../../../tasks/references/pre-merge-tests.md)

---

## Workflow

1. **Name the file** — UTC timestamp + slug:
   ```bash
   ts=$(date -u +%Y%m%d%H%M%S)
   # e.g. supabase/migrations/20260621143000_add_asset_dna_scores.sql
   ```
   Or: `supabase migration new <slug>` then rename if needed to match repo convention.

2. **Write SQL** in `supabase/migrations/<timestamp>_<slug>.sql`

3. **RLS on every new table** (adjust `user_id` / brand scoping to match table):
   ```sql
   ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "<table>_select_own" ON public.<table>
     FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "<table>_insert_own" ON public.<table>
     FOR INSERT WITH CHECK (auth.uid() = user_id);
   ```
   Brand-scoped tables: use `brand_id` + membership pattern from existing migrations — grep
   `supabase/migrations/` for the table family before inventing policies.

4. **Index FK columns:**
   ```sql
   CREATE INDEX ON public.<table>(<fk_column_id>);
   ```

5. **Review before merge** — migration-reviewer subagent or `@migration-reviewer` on new files in
   `supabase/migrations/`.

6. **Fresh replay and verify:**
   ```bash
   supabase start
   supabase db reset --local
   npm run supabase:types:check  # when exposed schemas/types changed
   ```
   Then run the affected targeted SQL/security tests from the verification matrix. Production migration application is owned by the reviewed merge/deploy path; do not manually `db push --linked`.

## iPix conventions

| Rule | Value |
|------|--------|
| Tables | `snake_case`, plural |
| Timestamps | `timestamptz DEFAULT now()` |
| UUID PK | `uuid DEFAULT gen_random_uuid() PRIMARY KEY` |
| User FK | `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE` |
| Schema | `public` only — no new schemas without explicit discussion |
| One concern | One migration per PR (repo rule) |

## When NOT to use this doc alone

- **Mercur Postgres** (`my-marketplace/`) — separate DB
- **RLS policy-only fix** on existing table → [`../supabase-core/RLS-POLICIES.md`](../supabase-core/RLS-POLICIES.md)
- **Edge function** changes without schema → [`../edge-functions/edge-functions.md`](../edge-functions/edge-functions.md)
