# Database Functions

## Contents

- [Core Rules](#core-rules)
- [Security Modes](#security-modes)
  - [SECURITY INVOKER (Default)](#security-invoker-default)
  - [SECURITY DEFINER](#security-definer)
- [Volatility Categories](#volatility-categories)
  - [IMMUTABLE](#immutable)
  - [STABLE](#stable)
  - [VOLATILE (Default)](#volatile-default)
- [Function Templates](#function-templates)
  - [Simple Query Function](#simple-query-function)
  - [Function with Parameters](#function-with-parameters)
  - [Function with Error Handling](#function-with-error-handling)
  - [Trigger Function](#trigger-function)
  - [Function Returning JSON](#function-returning-json)
  - [RPC Function for Complex Operations](#rpc-function-for-complex-operations)
- [Auth Helper Functions](#auth-helper-functions)
- [Best Practices](#best-practices)

---

## Core Rules

1. **Default to `security invoker`** - Functions run as calling user
2. **Always set `search_path = ''`** - Prevent search path attacks
3. **Use fully qualified names** - `public.table_name`, `auth.uid()`
4. **Choose appropriate volatility** - immutable/stable/volatile

## Security Modes

### SECURITY INVOKER (Default)

Function runs with permissions of the calling user. RLS policies apply.

```sql
create or replace function public.get_user_tasks()
returns setof public.tasks
language sql
security invoker
set search_path = ''
as $$
  select * from public.tasks where user_id = (select auth.uid());
$$;
```

### SECURITY DEFINER

Function runs with permissions of the function owner. Use sparingly.

```sql
-- use definer when function needs elevated privileges
-- always set search_path to prevent attacks
create or replace function auth.user_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.profiles where id = (select auth.uid());
$$;
```

**When to use SECURITY DEFINER:**
- Helper functions in `auth` schema
- Functions that need to bypass RLS
- Functions that access tables user can't directly access
- Always document why definer is required

## Volatility Categories

### IMMUTABLE

Function always returns the same result for same inputs. Can be optimized heavily.

```sql
create or replace function public.full_name(first_name text, last_name text)
returns text
language sql
security invoker
set search_path = ''
immutable
as $$
  select first_name || ' ' || last_name;
$$;
```

### STABLE

Function returns same result within a single query. Can read database.

```sql
create or replace function public.get_org_name(org_id uuid)
returns text
language sql
security invoker
set search_path = ''
stable
as $$
  select name from public.organizations where id = org_id;
$$;
```

### VOLATILE (Default)

Function may return different results each call. May modify database.

```sql
create or replace function public.create_task(
  p_title text,
  p_description text default null
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_task public.tasks;
begin
  insert into public.tasks (title, description, org_id, created_by)
  values (
    p_title,
    p_description,
    (select auth.user_org_id()),
    (select auth.uid())
  )
  returning * into v_task;

  return v_task;
end;
$$;
```

## Function Templates

### Simple Query Function

```sql
create or replace function public.get_active_tasks()
returns setof public.tasks
language sql
security invoker
set search_path = ''
stable
as $$
  select *
  from public.tasks
  where status = 'active'
    and org_id = (select auth.user_org_id())
  order by created_at desc;
$$;
```

### Function with Parameters

```sql
create or replace function public.get_tasks_by_status(p_status text)
returns setof public.tasks
language sql
security invoker
set search_path = ''
stable
as $$
  select *
  from public.tasks
  where status = p_status
    and org_id = (select auth.user_org_id())
  order by created_at desc;
$$;
```

### Function with Error Handling

```sql
create or replace function public.complete_task(p_task_id bigint)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_task public.tasks;
begin
  -- verify task exists and belongs to user's org
  select * into v_task
  from public.tasks
  where id = p_task_id
    and org_id = (select auth.user_org_id());

  if not found then
    raise exception 'Task not found or access denied'
      using errcode = 'P0002';
  end if;

  -- update task
  update public.tasks
  set status = 'completed',
      completed_at = now()
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;
```

### Trigger Function

```sql
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

-- attach trigger
create trigger set_updated_at
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();
```

### Function Returning JSON

```sql
create or replace function public.get_task_summary()
returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'total', count(*),
    'pending', count(*) filter (where status = 'pending'),
    'in_progress', count(*) filter (where status = 'in_progress'),
    'completed', count(*) filter (where status = 'completed')
  )
  from public.tasks
  where org_id = (select auth.user_org_id());
$$;
```

### RPC Function for Complex Operations

```sql
create or replace function public.assign_task(
  p_task_id bigint,
  p_user_id uuid
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_task public.tasks;
  v_org_id uuid;
begin
  -- get current user's org
  v_org_id := (select auth.user_org_id());

  -- verify task belongs to org
  if not exists (
    select 1 from public.tasks
    where id = p_task_id and org_id = v_org_id
  ) then
    raise exception 'Task not found'
      using errcode = 'P0002';
  end if;

  -- verify assignee belongs to org
  if not exists (
    select 1 from public.profiles
    where id = p_user_id and org_id = v_org_id
  ) then
    raise exception 'User not in organization'
      using errcode = 'P0002';
  end if;

  -- update task
  update public.tasks
  set assigned_to = p_user_id,
      status = 'in_progress'
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;
```

## Auth Helper Functions

Note: On Supabase hosted platform, create helper functions in `public` schema (not `auth` schema which requires superuser).

```sql
-- get user's organization id
create or replace function public.user_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

-- get user's role
create or replace function public.org_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- check org membership
create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and org_id = check_org_id
  )
$$;

-- check if startup belongs to user's org
create or replace function public.startup_in_org(check_startup_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.startups s
    inner join public.profiles p on p.org_id = s.org_id
    where s.id = check_startup_id and p.id = auth.uid()
  )
$$;
```

## Best Practices

1. **Prefix parameters** - Use `p_` for parameters to avoid column name conflicts
2. **Declare variables** - Use `v_` prefix for local variables
3. **Handle nulls** - Check for null parameters when needed
4. **Use transactions** - plpgsql functions are automatically transactional
5. **Return meaningful errors** - Use `raise exception` with error codes
6. **Document functions** - Add comments explaining purpose and usage
