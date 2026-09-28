-- IPI-1117 · HOST-RUNNER-001
-- Authorize server-derived, user-authenticated private Realtime channels used
-- only to coordinate an active Copilot run across Vercel processes.
-- No durable run registry is introduced; the channel disappears with the run.

create or replace function planner.can_use_run_channel(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_topic ~* '^planner-run:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{64}$'
    then
      (select auth.uid()) = split_part(p_topic, ':', 3)::uuid
      and public.is_org_member(split_part(p_topic, ':', 2)::uuid)
    else false
  end;
$$;

comment on function planner.can_use_run_channel(text) is
  'IPI-1117: authorize private planner-run:<org>:<user>:<server-hmac> Realtime control topics for the authenticated tenant user.';

revoke all on function planner.can_use_run_channel(text) from public, anon, authenticated;
grant execute on function planner.can_use_run_channel(text) to authenticated, service_role;

drop policy if exists "planner_run_channel_subscribe" on realtime.messages;
create policy "planner_run_channel_subscribe"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and planner.can_use_run_channel(realtime.topic())
);

drop policy if exists "planner_run_channel_broadcast" on realtime.messages;
create policy "planner_run_channel_broadcast"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and planner.can_use_run_channel(realtime.topic())
);
