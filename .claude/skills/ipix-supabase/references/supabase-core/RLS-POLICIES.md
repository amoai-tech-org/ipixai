# Row Level Security (RLS) Policies

## Contents

- [Core Rules](#core-rules)
- [Policy Syntax](#policy-syntax)
- [Helper Functions](#helper-functions)
  - [auth.uid()](#authuid)
  - [auth.jwt()](#authjwt)
  - [Custom Helper Functions](#custom-helper-functions)
- [Common Policy Patterns](#common-policy-patterns)
  - [Organization Isolation](#organization-isolation)
  - [Owner-Only Access](#owner-only-access)
  - [Role-Based Access](#role-based-access)
  - [Public Read Access](#public-read-access)
  - [MFA Requirement](#mfa-requirement)
- [Performance Recommendations](#performance-recommendations)
  - [Add Indexes](#add-indexes)
  - [Wrap Functions in SELECT](#wrap-functions-in-select)
  - [Avoid Joins in Policies](#avoid-joins-in-policies)
  - [Always Specify Roles](#always-specify-roles)
- [Permissive vs Restrictive](#permissive-vs-restrictive)

---

## Core Rules

1. **Always enable RLS** - Even for public tables
2. **Separate policies per operation** - Never use `for all`
3. **Separate policies per role** - `anon` vs `authenticated`
4. **Use `(select auth.uid())`** - Wrap functions for performance
5. **Use permissive policies** - Avoid restrictive unless specifically needed

## Policy Syntax

```sql
-- select policies: use USING only
create policy "policy name"
  on public.table_name
  for select
  to authenticated
  using ( condition );

-- insert policies: use WITH CHECK only
create policy "policy name"
  on public.table_name
  for insert
  to authenticated
  with check ( condition );

-- update policies: use both USING and WITH CHECK
create policy "policy name"
  on public.table_name
  for update
  to authenticated
  using ( condition_for_which_rows_can_be_updated )
  with check ( condition_for_new_values );

-- delete policies: use USING only
create policy "policy name"
  on public.table_name
  for delete
  to authenticated
  using ( condition );
```

## Helper Functions

### auth.uid()
Returns the ID of the user making the request.

```sql
-- always wrap in select for performance
using ((select auth.uid()) = user_id)
```

### auth.jwt()
Returns the JWT of the user. Access metadata:

```sql
-- access app_metadata (cannot be modified by user - safe for auth)
using (team_id = any(
  select jsonb_array_elements_text(
    (select auth.jwt()) -> 'app_metadata' -> 'teams'
  )::uuid
))

-- access user_metadata (can be modified by user - not safe for auth)
```

### Custom Helper Functions

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

-- check if user is org member
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

-- get user's role in org
create or replace function public.org_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;
```

## Common Policy Patterns

### Organization Isolation

```sql
-- users can only access data in their organization
create policy "org isolation - select"
  on public.tasks
  for select
  to authenticated
  using (org_id = (select public.user_org_id()));

create policy "org isolation - insert"
  on public.tasks
  for insert
  to authenticated
  with check (org_id = (select public.user_org_id()));

create policy "org isolation - update"
  on public.tasks
  for update
  to authenticated
  using (org_id = (select public.user_org_id()))
  with check (org_id = (select public.user_org_id()));

create policy "org isolation - delete"
  on public.tasks
  for delete
  to authenticated
  using (org_id = (select public.user_org_id()));
```

### Owner-Only Access

```sql
-- users can only access their own records
create policy "owner only - select"
  on public.user_settings
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "owner only - insert"
  on public.user_settings
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "owner only - update"
  on public.user_settings
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "owner only - delete"
  on public.user_settings
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
```

### Role-Based Access

```sql
-- admins can do everything, members have limited access
create policy "admins can select all in org"
  on public.sensitive_data
  for select
  to authenticated
  using (
    org_id = (select public.user_org_id())
    and (select public.org_role()) = 'admin'
  );

create policy "members can select own records"
  on public.sensitive_data
  for select
  to authenticated
  using (
    org_id = (select public.user_org_id())
    and created_by = (select auth.uid())
  );
```

### Public Read Access

```sql
-- anyone can read, only authenticated can write
create policy "public read access"
  on public.blog_posts
  for select
  to anon, authenticated
  using (published = true);

create policy "authenticated insert"
  on public.blog_posts
  for insert
  to authenticated
  with check (author_id = (select auth.uid()));
```

### MFA Requirement

```sql
-- require MFA for sensitive operations
create policy "mfa required for update"
  on public.sensitive_data
  for update
  to authenticated
  using (
    (select auth.jwt()->>'aal') = 'aal2'
    and owner_id = (select auth.uid())
  );
```

## Performance Recommendations

### Add Indexes

```sql
-- index columns used in RLS policies
create index idx_tasks_org_id on public.tasks(org_id);
create index idx_tasks_user_id on public.tasks(user_id);
create index idx_profiles_org_id on public.profiles(org_id);
```

### Wrap Functions in SELECT

```sql
-- slow: function called per row
using (auth.uid() = user_id)

-- fast: function result cached per statement
using ((select auth.uid()) = user_id)
```

### Avoid Joins in Policies

```sql
-- slow: joins source table to target
create policy "slow policy"
  on public.tasks
  for select
  to authenticated
  using (
    (select auth.uid()) in (
      select user_id from public.team_members
      where team_members.team_id = team_id  -- joins to tasks.team_id
    )
  );

-- fast: no join, fetch filter criteria into set
create policy "fast policy"
  on public.tasks
  for select
  to authenticated
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = (select auth.uid())  -- no join to source table
    )
  );
```

### Always Specify Roles

```sql
-- prevents policy from running for anon users
create policy "auth only"
  on public.tasks
  for select
  to authenticated  -- execution stops here for anon
  using ((select auth.uid()) = user_id);
```

## Permissive vs Restrictive

- **PERMISSIVE (default)**: Multiple policies are OR'd together
- **RESTRICTIVE**: Policy must pass in addition to any permissive policies

```sql
-- permissive: user can access if ANY permissive policy passes
create policy "can access own" on tasks
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "can access team" on tasks
  for select to authenticated
  using (team_id in (select team_id from team_members where user_id = (select auth.uid())));

-- restrictive: must pass IN ADDITION to permissive policies
-- use sparingly - usually for additional security requirements
create policy "must have mfa" on sensitive_data
  as restrictive
  for update to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2');
```

**Recommendation**: Use PERMISSIVE policies. Only use RESTRICTIVE when you need to add an additional requirement that must be met alongside other policies.
