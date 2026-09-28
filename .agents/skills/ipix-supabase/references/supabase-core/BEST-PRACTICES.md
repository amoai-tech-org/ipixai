# Database Best Practices

## Tables & Schema

### DO
- Always define primary keys
- Use appropriate data types
- Use `timestamptz` (never `timestamp`)
- Add `not null` for required fields
- Set default values for common fields
- Use foreign keys for relationships
- Add check constraints for validation
- Use lowercase with underscores
- Include audit fields (`created_at`, `updated_at`)

### DON'T
- Skip primary keys
- Use mixed case identifiers
- Use `timestamp` without timezone
- Skip foreign keys
- Allow null everywhere
- Skip default values

## Arrays

### When to Use

```sql
-- good: simple tags, small lists
tags text[]  -- ['urgent', 'backend', 'api']

-- bad: relationships (use join table instead)
user_ids uuid[]  -- don't do this
```

### Array Queries

```sql
-- contains value
select * from tasks where 'urgent' = any(tags);

-- contains all values
select * from tasks where tags @> array['backend', 'api'];

-- arrays overlap
select * from tasks where tags && array['frontend', 'ui'];

-- append to array
update tasks set tags = array_append(tags, 'new-tag') where id = 1;

-- remove from array
update tasks set tags = array_remove(tags, 'old-tag') where id = 1;
```

### Array Indexes

```sql
-- gin index for array queries
create index idx_tasks_tags on tasks using gin(tags);
```

## Indexes

### Required Indexes

1. **Foreign keys** - All FK columns
2. **WHERE columns** - Frequently filtered
3. **JOIN columns** - Used in joins
4. **ORDER BY columns** - Sorted columns

### Index Types

```sql
-- b-tree (default): equality and range
create index idx_tasks_status on tasks(status);

-- gin: arrays and jsonb
create index idx_tasks_tags on tasks using gin(tags);

-- partial: subset of rows
create index idx_active_tasks on tasks(org_id)
  where status = 'active';

-- composite: multi-column
create index idx_tasks_org_status on tasks(org_id, status);
```

### Production Indexes

```sql
-- use concurrently to avoid locking
create index concurrently idx_tasks_due_date on tasks(due_date);
```

## Joins & Relationships

### Foreign Key Patterns

```sql
-- one-to-many
create table tasks (
  org_id uuid references organizations(id) on delete cascade
);

-- many-to-many
create table task_assignments (
  task_id bigint references tasks(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (task_id, user_id)
);
```

### Supabase Client Joins

```typescript
// automatic relationship detection
const { data } = await supabase
  .from('organizations')
  .select(`
    id,
    name,
    tasks (
      id,
      title,
      status
    )
  `);

// explicit join column
const { data } = await supabase
  .from('tasks')
  .select(`
    *,
    start_event:events!start_event_id (id, name),
    end_event:events!end_event_id (id, name)
  `);
```

## JSON & JSONB

### Use JSONB (not JSON)

```sql
-- correct: binary, indexable
metadata jsonb

-- wrong: text, slower
metadata json
```

### JSONB Queries

```sql
-- extract value as text
select metadata->>'action' from events;

-- extract nested value
select metadata->'user'->>'name' from events;

-- filter by jsonb value
select * from events where metadata->>'status' = 'completed';

-- contains key
select * from events where metadata ? 'action';

-- contains object
select * from events where metadata @> '{"status": "active"}';
```

### JSONB Indexes

```sql
-- gin index for containment queries
create index idx_events_metadata on events using gin(metadata);

-- expression index for specific key
create index idx_events_status on events ((metadata->>'status'));
```

## Enums

### When to Use

- Fixed set of values
- Unlikely to change
- Need database-level validation

### Creating Enums

```sql
create type public.task_status as enum (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

create table public.tasks (
  status public.task_status not null default 'pending'
);
```

### Adding Values

```sql
-- add value (cannot be done in transaction)
alter type public.task_status add value 'blocked' after 'in_progress';
```

### When to Use Text + Check Instead

```sql
-- more flexible, easier to modify
status text not null default 'pending'
  check (status in ('pending', 'in_progress', 'completed', 'cancelled'))
```

## Multi-Tenant Patterns

### Organization Isolation

```sql
-- all tables include org_id
create table public.tasks (
  id bigint generated always as identity primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  -- ... columns
);

-- index for org-based queries
create index idx_tasks_org_id on tasks(org_id);

-- rls policy for isolation
create policy "org isolation"
  on tasks for all to authenticated
  using (org_id = (select auth.user_org_id()));
```

### Composite Indexes for Org Queries

```sql
-- common pattern: filter by org, then by status/date
create index idx_tasks_org_status on tasks(org_id, status);
create index idx_tasks_org_created on tasks(org_id, created_at desc);
```

## Performance Tips

### RLS Performance

```sql
-- slow: function called per row
using (auth.uid() = user_id)

-- fast: function cached per statement
using ((select auth.uid()) = user_id)
```

### Avoid Joins in RLS

```sql
-- slow: joins to source table
using ((select auth.uid()) in (
  select user_id from team_members
  where team_members.team_id = team_id  -- joins to source
))

-- fast: no join
using (team_id in (
  select team_id from team_members
  where user_id = (select auth.uid())
))
```

### Index Usage

```sql
-- check if index is used
explain analyze select * from tasks where org_id = 'uuid';

-- look for "Index Scan" or "Index Only Scan"
-- avoid "Seq Scan" on large tables
```

## Common Mistakes

1. **Forgetting RLS** - Always enable, even for internal tables
2. **Missing indexes on FKs** - Causes slow joins
3. **Using timestamp** - Always use timestamptz
4. **Using json** - Always use jsonb
5. **Over-nesting queries** - Keep Supabase select depth reasonable
6. **Not wrapping auth functions** - Use `(select auth.uid())`
7. **FOR ALL policies** - Always separate by operation
8. **Missing org_id** - Required for multi-tenant isolation
