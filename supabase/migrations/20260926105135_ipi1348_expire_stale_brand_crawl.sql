-- IPI-1361 · SB-DRIFT-002 — restore the remote-only migration identity.
-- The schema statement below is byte-identical to the schema-changing part
-- recorded in production migration history for 20260926105135. The hosted-only
-- schema_migrations(..., created_by) bookkeeping insert is intentionally omitted:
-- Supabase CLI 2.116.0's local history table has no created_by column.

create or replace function public.expire_stale_brand_analysis()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.brands
    set intake_status = 'failed',
        analysis_lock_token = null,
        analysis_locked_at = null
    where (
        intake_status = 'analysis_running'
        and (
          (analysis_locked_at is not null and analysis_locked_at < now() - interval '10 minutes')
          or (analysis_locked_at is null and updated_at < now() - interval '10 minutes')
        )
      )
      or (
        intake_status = 'crawl_running'
        and updated_at < now() - interval '60 minutes'
      )
    returning id
  )
  select count(*) into v_count from expired;

  return v_count;
end;
$$;
