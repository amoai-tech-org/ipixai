# Schema Design & Management

## Contents

- [Declarative Schema (Recommended)](#declarative-schema-recommended)
  - [Directory Structure](#directory-structure)
  - [Workflow](#workflow)
  - [File Organization](#file-organization)
  - [Caveats (Use Versioned Migrations Instead)](#caveats-use-versioned-migrations-instead)
- [Schema Organization](#schema-organization)
  - [Schemas](#schemas)
- [Table Design Patterns](#table-design-patterns)
  - [Primary Keys](#primary-keys)
  - [Multi-Tenant Tables](#multi-tenant-tables)
  - [Audit Fields](#audit-fields)
  - [Join Tables (Many-to-Many)](#join-tables-many-to-many)
- [Data Types](#data-types)
  - [Timestamps](#timestamps)
  - [JSON](#json)
  - [Arrays vs. Normalized Tables](#arrays-vs-normalized-tables)
  - [Enums](#enums)
- [Foreign Keys](#foreign-keys)
  - [Cascade Rules](#cascade-rules)
  - [Naming Convention](#naming-convention)
- [Indexes](#indexes)
  - [Required Indexes](#required-indexes)
  - [Composite Indexes](#composite-indexes)
  - [Partial Indexes](#partial-indexes)
  - [GIN Indexes](#gin-indexes)
- [Constraints](#constraints)
- [Table Comments](#table-comments)

---

## Declarative Schema (Recommended)

This project uses declarative schema management with the Supabase CLI.

### Directory Structure

```
supabase/
├── schemas/           # Declarative schema files
│   ├── 00_extensions.sql
│   ├── 01_types.sql
│   ├── 02_tables.sql
│   ├── 03_functions.sql
│   └── 04_policies.sql
├── migrations/        # Auto-generated migrations
└── config.toml
```

### Workflow

1. **Edit schema files** in `supabase/schemas/`
2. **Stop local Supabase**: `supabase stop`
3. **Generate migration**: `supabase db diff -f migration_name`
4. **Review migration** in `supabase/migrations/`
5. **Apply**: `supabase db push` or `supabase db reset`

### File Organization

Schema files execute in lexicographic order. Name files to manage dependencies:

```
00_extensions.sql     # Extensions first
01_types.sql          # Custom types
02_auth_helpers.sql   # Auth helper functions
10_organizations.sql  # Core tables
11_profiles.sql
12_tasks.sql
20_rls_policies.sql   # Policies after tables
```

### Caveats (Use Versioned Migrations Instead)

The diff tool cannot track:
- DML statements (insert, update, delete)
- View ownership and grants
- Materialized views
- ALTER POLICY statements
- Schema privileges
- Comments
- Partitions

For these, create manual migrations in `supabase/migrations/`.

## Schema Organization

### Schemas

```sql
-- public: API-accessible tables (with RLS)
create table public.tasks (...);

-- private: Internal tables, not exposed via API
create schema if not exists private;
create table private.audit_logs (...);

-- auth: Supabase auth schema (managed by Supabase)

-- api: Views for complex queries
create schema if not exists api;
create view api.user_dashboard as select ...;
```

## Table Design Patterns

### Primary Keys

```sql
-- auto-increment (smaller, faster joins)
id bigint generated always as identity primary key

-- uuid (distributed, non-guessable)
id uuid primary key default gen_random_uuid()
```

### Multi-Tenant Tables

All tables must include `org_id`:

```sql
create table public.tasks (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  -- ... columns
);

-- always index org_id
create index idx_tasks_org_id on public.tasks(org_id);
```

### Audit Fields

Standard audit fields for all tables:

```sql
create table public.tasks (
  -- ... business columns

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);
```

### Join Tables (Many-to-Many)

```sql
create table public.task_assignments (
  task_id bigint not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text default 'assignee',
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id),
  primary key (task_id, user_id)
);
```

## Data Types

### Timestamps

Always use `timestamptz`:

```sql
-- correct
created_at timestamptz not null default now()

-- wrong (loses timezone)
created_at timestamp not null default now()
```

### JSON

Always use `jsonb`:

```sql
-- correct (binary, indexable, efficient)
metadata jsonb

-- wrong (text, slower)
metadata json
```

### Arrays vs. Normalized Tables

**Use arrays for:**
- Simple tags/categories (< 50 items)
- Ordered lists accessed together
- Data that doesn't need individual queries

```sql
tags text[]  -- ['urgent', 'backend', 'api']
```

**Use normalized tables for:**
- Relationships between entities
- Large lists (> 100 items)
- Data needing individual queries

```sql
create table task_tags (
  task_id bigint references tasks(id),
  tag_id bigint references tags(id),
  primary key (task_id, tag_id)
);
```

### Enums

```sql
-- create enum type
create type public.task_status as enum (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

-- use in table
create table public.tasks (
  status public.task_status not null default 'pending'
);

-- add value to enum
alter type public.task_status add value 'blocked' after 'in_progress';
```

**When to use enums:**
- Fixed set of values unlikely to change
- Values need database-level validation
- Want type safety

**When to use text + check:**
- Values may change frequently
- Need flexibility for migrations

## Foreign Keys

### Cascade Rules

```sql
-- cascade: delete children when parent deleted
org_id uuid references organizations(id) on delete cascade

-- set null: keep child, remove reference
assigned_to uuid references profiles(id) on delete set null

-- restrict: prevent parent deletion if children exist
project_id uuid references projects(id) on delete restrict
```

### Naming Convention

```sql
-- foreign key column: singular_table_id
user_id uuid references profiles(id)
org_id uuid references organizations(id)
task_id bigint references tasks(id)
```

## Indexes

### Required Indexes

```sql
-- all foreign keys
create index idx_tasks_org_id on tasks(org_id);
create index idx_tasks_assigned_to on tasks(assigned_to);

-- columns in WHERE clauses
create index idx_tasks_status on tasks(status);

-- columns in ORDER BY
create index idx_tasks_created_at on tasks(created_at desc);
```

### Composite Indexes

```sql
-- for common query patterns
create index idx_tasks_org_status on tasks(org_id, status);

-- column order matters: most selective first
```

### Partial Indexes

```sql
-- index only relevant subset
create index idx_active_tasks on tasks(org_id, due_date)
  where status = 'active';
```

### GIN Indexes

```sql
-- for array queries
create index idx_tasks_tags on tasks using gin(tags);

-- for jsonb queries
create index idx_events_metadata on events using gin(metadata);
```

## Constraints

```sql
-- not null
title text not null

-- default
status text not null default 'pending'

-- check
priority integer check (priority >= 0 and priority <= 5)

-- check with multiple values
status text check (status in ('pending', 'active', 'completed'))

-- unique
email text unique not null

-- composite unique
unique (org_id, slug)
```

## Table Comments

```sql
comment on table public.tasks is 'Stores all tasks for task management. Each task belongs to an organization and can be assigned to a user.';

comment on column public.tasks.status is 'Current status of the task: pending, in_progress, completed, or cancelled';
```
