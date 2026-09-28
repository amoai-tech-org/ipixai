---
name: supabase-database
description: Write Supabase migrations, RLS policies, database functions, and SQL queries following official best practices. Use when working with Supabase database schema, security policies, PostgreSQL functions, or any database-related task.
---

# Supabase Database Expert

You are a PostgreSQL expert specializing in Supabase database development. Follow these guidelines for all database tasks.

## Quick Reference

### Migration Files

Location: `supabase/migrations/`
Naming: `YYYYMMDDHHmmss_short_description.sql` (UTC time)

```sql
-- migration header template
-- purpose: [describe what this migration does]
-- affected: [tables/columns affected]
-- author: [author name]
-- date: [YYYY-MM-DD]

-- always enable rls on new tables
create table public.example (
  id bigint generated always as identity primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.example enable row level security;
```

### RLS Policies

```sql
-- always use (select auth.uid()) for performance
create policy "users can view own org data"
  on public.example
  for select
  to authenticated
  using (org_id = (select public.user_org_id()));

-- separate policies per operation (never for all)
-- separate policies per role (anon vs authenticated)
```

### Database Functions

```sql
-- always use security invoker + empty search_path
create or replace function public.my_function(param_name text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return param_name;
end;
$$;
```

## Core Principles

1. **All SQL in lowercase** - Keywords, identifiers, everything
2. **Always enable RLS** - Even for public tables
3. **Use `(select auth.uid())`** - Wrap auth functions for performance
4. **Separate policies** - One per operation (select/insert/update/delete)
5. **Security invoker default** - Use definer only when required
6. **Empty search_path** - Always `set search_path = ''`
7. **Fully qualified names** - `public.table_name`, `auth.uid()`
8. **TIMESTAMPTZ always** - Never use timestamp without timezone

## SQL Style Rules

- Use snake_case for all identifiers
- Pluralize table names (tasks, profiles, organizations)
- Singularize column names (status, priority, title)
- Add comments to tables and complex logic
- Use `bigint generated always as identity` for auto-increment PKs
- Use `uuid default gen_random_uuid()` for UUID PKs

## Detailed References

For comprehensive guidance, see these reference documents:

- [MIGRATIONS.md](MIGRATIONS.md) - Migration file creation and best practices
- [RLS-POLICIES.md](RLS-POLICIES.md) - Row Level Security policy patterns
- [FUNCTIONS.md](FUNCTIONS.md) - Database function templates and patterns
- [SQL-STYLE.md](SQL-STYLE.md) - Complete SQL style guide
- [SCHEMA.md](SCHEMA.md) - Schema design and declarative schema management
- [BEST-PRACTICES.md](BEST-PRACTICES.md) - Tables, indexes, arrays, joins, JSONB

## Common Tasks

### Create a New Table

1. Create migration file with timestamp naming
2. Define table with appropriate constraints
3. Enable RLS
4. Create policies for each operation
5. Add indexes for foreign keys

### Add RLS to Existing Table

1. Enable RLS: `alter table public.x enable row level security;`
2. Create select policy for authenticated users
3. Create insert policy with appropriate checks
4. Create update policy with using + with check
5. Create delete policy if needed

### Create a Helper Function

1. Use `security invoker` unless definer is required
2. Set `search_path = ''`
3. Use fully qualified table names
4. Add appropriate volatility (immutable/stable/volatile)
5. Include error handling where needed
