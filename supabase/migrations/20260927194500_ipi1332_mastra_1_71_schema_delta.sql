-- =============================================================================
-- migration: ipi1332_mastra_1_71_schema_delta
-- purpose: add the exact additive Mastra storage delta required by the target
--          @mastra/pg 1.27.1 family, so the iPix runtime can stay on
--          schemaName: "mastra" + disableInit: true with no schema drift.
-- affected: mastra.mastra_workflow_definitions  (+"schedule" JSONB, nullable)
--           mastra.mastra_workflow_snapshot     (+1 expression index)
-- task: IPI-1332 · MASTRA-UPG-005
-- date: 2026-09-27
--
-- Source of truth (installed package, not website docs):
--   exportSchemas("mastra") from @mastra/pg, diffed current vs target:
--     @mastra/pg 1.22.2 -> 1044 DDL lines / 43 tables / 43 indexes
--     @mastra/pg 1.27.1 -> 1046 DDL lines / 43 tables / 44 indexes
--   Delta: 0 removed lines, 2 added lines. No DROP, no ALTER COLUMN,
--   no SET NOT NULL, no type rewrite, no privilege change.
--
-- Additive-only by construction, mirroring IPI-1008 / IPI-629 / IPI-796:
--   * no new table, no FK, no timestamp trigger (the adapter writes timestamps)
--   * RLS, policies and grants are NOT touched here — table-level DML grants
--     already cover columns added later, so the runtime role needs no new grant
--   * keep disableInit: true; this migration is the only DDL path
--   * do not create public.mastra_*
--
-- Rollback (manual, not applied here):
--   DROP INDEX IF EXISTS mastra.mastra_mastra_workflow_snapshot_threadid_idx;
--   ALTER TABLE mastra.mastra_workflow_definitions DROP COLUMN IF EXISTS "schedule";
-- =============================================================================

-- Fail-closed preflight: the prerequisites must already exist. This migration
-- only ADDs; if either owner table is missing, the environment is not the one
-- this delta was verified against and we stop rather than guess.
DO $$
DECLARE
  defs_ok boolean;
  snap_ok boolean;
  snapshot_col_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'mastra' AND table_name = 'mastra_workflow_definitions'
  ) INTO defs_ok;
  IF NOT defs_ok THEN
    RAISE EXCEPTION 'IPI-1332 preflight: mastra.mastra_workflow_definitions missing';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'mastra' AND table_name = 'mastra_workflow_snapshot'
  ) INTO snap_ok;
  IF NOT snap_ok THEN
    RAISE EXCEPTION 'IPI-1332 preflight: mastra.mastra_workflow_snapshot missing';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'mastra'
      AND table_name = 'mastra_workflow_snapshot'
      AND column_name = 'snapshot'
  ) INTO snapshot_col_ok;
  IF NOT snapshot_col_ok THEN
    RAISE EXCEPTION 'IPI-1332 preflight: mastra.mastra_workflow_snapshot.snapshot missing';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. @mastra/pg 1.27.1 adds a nullable `schedule` column to workflow
--    definitions. Nullable with no default: existing rows are unaffected.
-- ---------------------------------------------------------------------------
ALTER TABLE mastra.mastra_workflow_definitions
  ADD COLUMN IF NOT EXISTS "schedule" JSONB;

-- ---------------------------------------------------------------------------
-- 2. @mastra/pg 1.27.1 adds a thread-id expression index over workflow
--    snapshots, covering both the suspended-run stream state and the plain
--    input message-list state.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "mastra_mastra_workflow_snapshot_threadid_idx"
ON mastra.mastra_workflow_snapshot
((COALESCE(
  jsonb_path_query_first(snapshot, '$.context.* ? (@.status == "suspended").suspendPayload.__streamState.messageList.memoryInfo.threadId') #>> '{}',
  snapshot #>> '{context,input,messageListState,memoryInfo,threadId}'
)));

-- Fail-closed postflight: the two additions exist exactly as specified, and the
-- security posture of both owner tables is unchanged.
DO $$
DECLARE
  col_type text;
  col_nullable text;
  idx_ok boolean;
  defs_rls boolean;
  snap_rls boolean;
  public_shadow int;
  postgrest_grant int;
BEGIN
  SELECT data_type, is_nullable INTO col_type, col_nullable
  FROM information_schema.columns
  WHERE table_schema = 'mastra'
    AND table_name = 'mastra_workflow_definitions'
    AND column_name = 'schedule';
  IF col_type IS NULL THEN
    RAISE EXCEPTION 'IPI-1332 postflight: mastra_workflow_definitions.schedule missing';
  END IF;
  IF col_type <> 'jsonb' THEN
    RAISE EXCEPTION 'IPI-1332 postflight: schedule must be jsonb, found %', col_type;
  END IF;
  IF col_nullable <> 'YES' THEN
    RAISE EXCEPTION 'IPI-1332 postflight: schedule must stay nullable, found is_nullable=%', col_nullable;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'mastra'
      AND tablename = 'mastra_workflow_snapshot'
      AND indexname = 'mastra_mastra_workflow_snapshot_threadid_idx'
  ) INTO idx_ok;
  IF NOT idx_ok THEN
    RAISE EXCEPTION 'IPI-1332 postflight: mastra_mastra_workflow_snapshot_threadid_idx missing';
  END IF;

  SELECT c.relrowsecurity INTO defs_rls
  FROM pg_class c
  JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
  WHERE nsp.nspname = 'mastra' AND c.relname = 'mastra_workflow_definitions';
  IF NOT COALESCE(defs_rls, false) THEN
    RAISE EXCEPTION 'IPI-1332 postflight: RLS lost on mastra_workflow_definitions';
  END IF;

  SELECT c.relrowsecurity INTO snap_rls
  FROM pg_class c
  JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
  WHERE nsp.nspname = 'mastra' AND c.relname = 'mastra_workflow_snapshot';
  IF NOT COALESCE(snap_rls, false) THEN
    RAISE EXCEPTION 'IPI-1332 postflight: RLS lost on mastra_workflow_snapshot';
  END IF;

  SELECT count(*) INTO public_shadow
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('mastra_workflow_definitions', 'mastra_workflow_snapshot');
  IF public_shadow <> 0 THEN
    RAISE EXCEPTION 'IPI-1332 postflight: public.mastra_* shadow must not exist';
  END IF;

  -- This migration adds no privilege: PostgREST roles must still have none.
  SELECT count(*) INTO postgrest_grant
  FROM information_schema.role_table_grants
  WHERE table_schema = 'mastra'
    AND table_name IN ('mastra_workflow_definitions', 'mastra_workflow_snapshot')
    AND grantee IN ('anon', 'authenticated', 'service_role');
  IF postgrest_grant <> 0 THEN
    RAISE EXCEPTION 'IPI-1332 postflight: PostgREST role gained grants on touched mastra tables';
  END IF;
END $$;
