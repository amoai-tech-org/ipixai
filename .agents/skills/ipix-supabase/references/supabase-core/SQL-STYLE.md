# SQL Style Guide

## General Rules

- **All SQL in lowercase** - Keywords, identifiers, everything
- **Use snake_case** - For tables, columns, functions
- **Consistent indentation** - 2 spaces
- **ISO 8601 dates** - `yyyy-mm-ddThh:mm:ss.sssss`

## Naming Conventions

### Tables
- Plural nouns: `tasks`, `profiles`, `organizations`
- Snake_case: `team_members`, `audit_logs`
- No prefixes like `tbl_`

### Columns
- Singular nouns: `status`, `priority`, `title`
- Foreign keys: `{singular_table}_id` (e.g., `user_id`, `org_id`)
- Booleans: `is_` or `has_` prefix (e.g., `is_active`, `has_verified`)
- Timestamps: `_at` suffix (e.g., `created_at`, `updated_at`)

### Indexes
- Format: `idx_{table}_{columns}`
- Examples: `idx_tasks_org_id`, `idx_tasks_org_status`

### Policies
- Descriptive names in quotes
- Example: `"users can view tasks in their org"`

## Table Creation

```sql
create table public.tasks (
  -- primary key first
  id bigint generated always as identity primary key,

  -- foreign keys
  org_id uuid not null references public.organizations(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,

  -- required fields
  title text not null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),

  -- optional fields
  description text,
  priority integer default 0 check (priority >= 0 and priority <= 5),
  due_date timestamptz,

  -- audit fields last
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

-- table comment
comment on table public.tasks is 'Stores all tasks for task management';

-- enable rls
alter table public.tasks enable row level security;
```

## Data Types

| Use Case | Type |
|----------|------|
| Primary Key (auto) | `bigint generated always as identity` |
| Primary Key (uuid) | `uuid default gen_random_uuid()` |
| Short text | `text` or `varchar(n)` |
| Long text | `text` |
| Integer | `integer` |
| Large integer | `bigint` |
| Decimal/Money | `numeric(10,2)` |
| Boolean | `boolean` |
| Timestamp | `timestamptz` (NEVER `timestamp`) |
| JSON | `jsonb` (NEVER `json`) |
| Arrays | `text[]`, `integer[]`, `uuid[]` |

## Query Formatting

### Short Queries

```sql
select * from tasks where status = 'active';

update tasks set status = 'completed' where id = 1;

delete from tasks where id = 1;
```

### Long Queries

```sql
select
  t.id,
  t.title,
  t.status,
  p.name as assigned_to_name
from public.tasks t
left join public.profiles p on t.assigned_to = p.id
where t.org_id = 'uuid-here'
  and t.status = 'active'
order by t.created_at desc
limit 50;
```

### Inserts

```sql
insert into public.tasks (
  org_id,
  title,
  description,
  status,
  created_by
) values (
  'org-uuid',
  'Task title',
  'Task description',
  'pending',
  'user-uuid'
);
```

### Updates

```sql
update public.tasks
set
  status = 'completed',
  completed_at = now()
where id = 1
  and org_id = 'org-uuid';
```

## Joins

```sql
-- explicit join syntax
select
  tasks.id,
  tasks.title,
  profiles.name as assigned_to
from public.tasks
inner join public.profiles on tasks.assigned_to = profiles.id
where tasks.org_id = 'uuid';

-- multiple joins
select
  t.id,
  t.title,
  p.name as assigned_to,
  o.name as org_name
from public.tasks t
inner join public.organizations o on t.org_id = o.id
left join public.profiles p on t.assigned_to = p.id
where t.status = 'active';
```

## CTEs (Common Table Expressions)

```sql
with
  -- get active tasks
  active_tasks as (
    select *
    from public.tasks
    where status = 'active'
      and org_id = 'uuid'
  ),

  -- count by assignee
  task_counts as (
    select
      assigned_to,
      count(*) as task_count
    from active_tasks
    group by assigned_to
  )

select
  p.name,
  tc.task_count
from task_counts tc
join public.profiles p on tc.assigned_to = p.id
order by tc.task_count desc;
```

## Comments

```sql
-- single line comment for simple explanations

/*
 * multi-line comment for complex logic
 * explains the purpose of the following code
 */

-- inline comment for specific lines
select * from tasks -- only active tasks
where status = 'active';
```

## Constraints

```sql
-- check constraint
status text not null check (status in ('pending', 'active', 'completed'))

-- unique constraint
email text unique not null

-- foreign key with cascade
org_id uuid not null references organizations(id) on delete cascade

-- composite primary key
primary key (task_id, user_id)

-- composite unique
unique (org_id, email)
```

## Indexes

```sql
-- simple index
create index idx_tasks_org_id on public.tasks(org_id);

-- composite index
create index idx_tasks_org_status on public.tasks(org_id, status);

-- partial index
create index idx_active_tasks on public.tasks(org_id)
  where status = 'active';

-- gin index for arrays
create index idx_tasks_tags on public.tasks using gin(tags);

-- gin index for jsonb
create index idx_events_metadata on public.events using gin(metadata);

-- concurrent index (production)
create index concurrently idx_tasks_due_date on public.tasks(due_date);
```

## Aliases

```sql
-- always use 'as' keyword
select count(*) as total_tasks from tasks;

-- table aliases for joins
select t.title, p.name as assignee
from tasks as t
join profiles as p on t.assigned_to = p.id;
```
