# Database Migrations

## File Naming Convention

Migration files MUST be named: `YYYYMMDDHHmmss_short_description.sql`

- `YYYY` - Four digits for year (e.g., 2025)
- `MM` - Two digits for month (01-12)
- `DD` - Two digits for day (01-31)
- `HH` - Two digits for hour in 24h format (00-23)
- `mm` - Two digits for minute (00-59)
- `ss` - Two digits for second (00-59)
- Use UTC time for timestamps
- Use snake_case for description

Examples:
```
20250115143022_create_tasks_table.sql
20250115143100_add_status_column_to_tasks.sql
20250115143200_create_org_members_rls.sql
```

## Migration File Structure

```sql
-- =============================================================================
-- migration: create_tasks_table
-- purpose: create the tasks table for task management
-- affected: public.tasks (new table)
-- author: [author]
-- date: 2025-01-15
-- =============================================================================

-- create the tasks table
create table public.tasks (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority integer default 0 check (priority >= 0 and priority <= 5),
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

-- add table comment
comment on table public.tasks is 'Stores all tasks for organizations';

-- enable row level security
alter table public.tasks enable row level security;

-- create indexes for foreign keys and common queries
create index idx_tasks_org_id on public.tasks(org_id);
create index idx_tasks_assigned_to on public.tasks(assigned_to);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_org_status on public.tasks(org_id, status);

-- rls policies
create policy "users can view tasks in their org"
  on public.tasks
  for select
  to authenticated
  using (org_id = (select auth.user_org_id()));

create policy "users can create tasks in their org"
  on public.tasks
  for insert
  to authenticated
  with check (org_id = (select auth.user_org_id()));

create policy "users can update tasks in their org"
  on public.tasks
  for update
  to authenticated
  using (org_id = (select auth.user_org_id()))
  with check (org_id = (select auth.user_org_id()));

create policy "users can delete tasks in their org"
  on public.tasks
  for delete
  to authenticated
  using (org_id = (select auth.user_org_id()));
```

## Destructive Operations

Always add copious comments for destructive operations:

```sql
-- =============================================================================
-- WARNING: DESTRUCTIVE MIGRATION
-- This migration will permanently delete data
-- =============================================================================

-- dropping column: old_status
-- reason: replaced by new status enum
-- data impact: existing values in old_status will be lost
-- backup: ensure backup exists before running
alter table public.tasks drop column old_status;

-- truncating table: temp_imports
-- reason: temporary data no longer needed
-- data impact: all rows will be deleted
truncate table public.temp_imports;

-- dropping table: deprecated_logs
-- reason: replaced by new audit_log table
-- data impact: all historical logs will be lost
-- dependencies: none (verified no foreign key references)
drop table if exists public.deprecated_logs;
```

## Column Alterations

```sql
-- altering column type
-- table: public.tasks
-- column: priority
-- from: integer
-- to: smallint
-- data impact: values > 32767 will cause error (verified none exist)
alter table public.tasks
  alter column priority type smallint;

-- adding not null constraint
-- table: public.tasks
-- column: title
-- requirement: all existing rows must have non-null values
-- verified: select count(*) from tasks where title is null = 0
alter table public.tasks
  alter column title set not null;
```

## Multi-Tenant Patterns

All tables should include org_id for multi-tenant isolation:

```sql
create table public.new_entity (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  -- ... other columns
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- always index org_id
create index idx_new_entity_org_id on public.new_entity(org_id);
```

## Trigger for updated_at

```sql
-- create trigger function (if not exists)
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- attach trigger to table
create trigger set_updated_at
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();
```

## Rollback Considerations

- Always consider how to rollback a migration
- For additive changes (new tables, columns), rollback is straightforward
- For destructive changes, document the rollback procedure
- Consider creating a paired down migration if rollback is needed

```sql
-- to rollback this migration:
-- drop table public.tasks cascade;
```
