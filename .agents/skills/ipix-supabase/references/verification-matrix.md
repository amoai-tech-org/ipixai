# iPix Supabase / Postgres verification matrix

Parent: [`../SKILL.md`](../SKILL.md). This file owns **HOW** Supabase/Postgres correctness is proved. `tasks` classifies risk; `task-verifier` decides which proof is required; this reference supplies the database-specific method.

## Hard rules

1. **Never reconstruct an existing database object from memory, an issue summary, migration prose, or a reviewer comment.** Retrieve the authoritative current definition before modifying a function, trigger, policy, view, grant-sensitive RPC, or other privileged object.
2. **Catalog proof and behavioral proof are different.** Use both when one can be green while the other is wrong.
3. **Fresh replay is mandatory for migration-bearing work.** Prove a clean local database can be rebuilt from version-controlled history.
4. **Authorization is a matrix, not a happy path.** Prove intended allow and deny cases across role, tenant/org, old row, and resulting row where applicable.
5. **Advisor finding is evidence, not an automatic fix.** Classify intent, ownership, risk, and workload before changing schema, grants, extensions, or indexes.
6. Prefer read-only live inspection. Production writes belong only to the reviewed deployment/recovery path with explicit human approval.

## Proof classes

| Proof class | What it answers | Typical evidence |
|---|---|---|
| **Catalog** | What is actually installed? | `pg_*` / `information_schema`, function definition, policies, ACLs, triggers, indexes, publications |
| **Behavioral** | Does PostgreSQL/API behavior match the contract? | targeted SQL/API success + failure cases |
| **Authorization / tenant** | Can only the right principal perform the operation? | anon/authenticated, same-org, wrong-org, wrong-role, expired/missing auth where relevant |
| **Migration replay** | Can Git reproduce the database safely? | `supabase db reset --local`, migration ordering/ledger, fresh-replay CI |
| **Performance / exposure** | Is the path efficient and intentionally reachable? | Advisors, `EXPLAIN (ANALYZE, BUFFERS)` when safe, grants, Data API/view/RPC exposure |
| **Live read-only** | Did the deployed result match the reviewed intent? | plugin/linked read-only catalog/runtime checks on the exact project |

## Change matrix

| Area | Common failure | Minimum proof |
|---|---|---|
| Table / column | wrong type, PK, nullability, default, check, unique | catalog + positive insert/update + negative constraint case |
| Foreign key | relation valid but cross-tenant reparenting allowed | FK catalog + same-tenant allow + cross-tenant deny when tenant-owned |
| RLS SELECT | policy exists but wrong role/tenant predicate | policy catalog + intended member allow + anon/nonmember/wrong-org deny |
| RLS INSERT | caller can forge ownership/org | explicit `WITH CHECK` + forged owner/org negative case |
| RLS UPDATE | old row authorized but resulting row escapes ownership | `USING` + `WITH CHECK`; prove allowed edit and forbidden reparent/owner change; confirm SELECT policy exists |
| RLS DELETE | role/predicate too broad | policy catalog + allowed delete + wrong-role/wrong-org deny |
| Grants | RLS safe but object unexpectedly reachable, or missing grant misdiagnosed as RLS | table/function/sequence ACL catalog + actual caller behavior |
| Function / RPC | stale body, unintended public execution, privilege escalation | retrieve authoritative definition first; signature/body + `prosecdef` + `proconfig` + ACL; behavior + tenant negatives |
| SECURITY DEFINER | unsafe `search_path`, unqualified refs, caller controls identity | justification; safe `search_path`; schema-qualified refs; explicit EXECUTE intent; caller cannot substitute another user/org |
| View | owner privileges bypass underlying RLS | `security_invoker=true` when API-facing, or prove unexposed/revoked access; role/tenant read test |
| Trigger | wrong event/timing/OLD/NEW/NULL logic, recursion, hidden side effect | trigger catalog + installed function definition + transition matrix incl. NULL changes where possible |
| Index | missing FK/RLS/query index, redundant/unused index removed blindly | Advisors + index catalog + workload/query-plan evidence before adding/removing |
| Backfill | NULL/unexpected existing rows fail or lock too much | fixtures for zero/one/many/unexpected states; lock/runtime assessment; forward-compatible rollout |
| Migration | works incrementally only, invents data, rewrites history | fresh local replay; no synthetic app fixtures just to satisfy history; forward-only production migration |
| Migration ledger | file timestamp/order differs from applied history | migration-list comparison when relevant; duplicate timestamp/name checks; exact authoritative recovery procedure |
| Realtime | wrong table publication or authorization assumption | publication catalog + subscriber authorization behavior |
| Edge Function | weak JWT/custom auth, unsafe CORS, service-role leak | `verify_jwt=true` by default; if disabled prove signed/custom auth; HTTP auth matrix; secret scan; duplicate/retry behavior for writes |
| Webhook | forged/replayed callback repeats durable state | signature/auth verification + duplicate/stale event + concurrent/retry idempotency test |
| Storage | policy combination incomplete | operation matrix; remember upsert may require INSERT + SELECT + UPDATE; iPix defaults media bytes to Cloudinary |
| pgvector | dimension/operator/index mismatch or expensive query | schema/index catalog + representative query/plan; do not add vector index without workload evidence |
| Types | generated types omit schemas or drift from deployed DB | generate with intended schemas/tooling, inspect diff, compile affected consumers |

## RLS verification matrix

For a tenant-owned table or RPC, adapt this matrix rather than testing only the owner happy path:

| Principal | Same org | Wrong org | Expected |
|---|:---:|:---:|---|
| signed out / `anon` | — | — | deny unless explicitly public |
| authenticated nonmember | no | yes | deny |
| authenticated member, insufficient role | yes | — | read/write per exact role contract |
| authenticated authorized role | yes | — | allow intended operation only |
| authenticated authorized user targeting another org | — | yes | deny |
| service/admin path | task-specific | task-specific | server-only; prove boundary separately |

Also ask separately: **can a lower-privileged user read their own row while bulk org access remains restricted?** Do not loosen a bulk manager policy merely to support a narrow self lookup.

## Functions and RPCs

Classify every changed `SECURITY DEFINER` function before deciding grants:

- **Direct Data API RPC intended:** `authenticated` EXECUTE may be correct. The function must self-authorize from trusted context, use safe `search_path`, schema-qualified relations, least privilege, and tenant-negative tests.
- **Trigger / RLS helper / internal-only:** direct client execution is normally unnecessary. Revoke `PUBLIC`, `anon`, and `authenticated` as appropriate and/or place it in an unexposed schema. Then prove the trigger/policy path still works.

Functions do not become safe merely because referenced tables have RLS. A definer function can run with creator privileges and must enforce its own contract.

## Advisors: triage, do not auto-fix

Run security and performance Advisors after material DDL and periodically against live state. Classify findings:

- **Security definer executable:** determine intended direct RPC vs internal helper before revoking.
- **RLS enabled, no policy:** can be intentional deny-all/server-only. Prove grants and intended caller before adding a policy.
- **Extension in `public`:** do not move blindly; verify extension relocatability, dependencies, compatibility, and actual exposure.
- **Leaked password protection disabled:** production Auth hardening item; assess plan/support and enable through approved account configuration.
- **Unindexed FK:** candidate, especially for deletes/updates/joins; use workload and plan evidence.
- **Unused index:** never drop solely because the Advisor says unused; verify observation window, constraints, write/read tradeoff, and production workload.
- **Duplicate index:** compare definitions, constraints, dependencies, and workload before removing one.
- **`auth_rls_initplan`:** prefer `(select auth.uid())` / `(select auth.jwt())` when row-independent; verify behavior is unchanged.

Existing unrelated Advisor findings are baseline debt, not automatic blockers for every PR. A new or changed finding on the affected surface must be explained before Done.

## Automated regression gates

Use automation for deterministic invariants, not for context-dependent Advisor recommendations.

- `supabase-fresh-replay` remains the global migration reproducibility gate.
- `supabase/tests/security/catalog-security-regression.sql` runs after fresh replay and blocks new client-readable tables without RLS, RLS deny-all tables that still retain client grants, PUBLIC-scoped RLS policies, client-callable `SECURITY DEFINER` functions without a pinned `search_path`, and new client-readable definer views.
- The catalog gate intentionally does **not** auto-fail on unindexed/unused/duplicate indexes, function EXECUTE intent, or RLS-enabled/no-policy alone; those require workload/ownership intent and Advisor triage.
- Known exceptions must be exact, reviewed, and named in the test. Never weaken a global assertion to silence unrelated legacy debt.
- Hosted Supabase Advisors remain a read-only pre/post-deploy evidence source. Local CI may reproduce only deterministic catalog rules that do not require hosted telemetry.

## Migration safety

1. File first; never make an untracked Dashboard SQL change in the normal workflow.
2. Review generated/diff SQL manually. Schema-diff tools can miss or mishandle grants, view security, RLS changes, publications, DML/backfills, and other objects.
3. Fresh replay locally from version-controlled history.
4. Run targeted database tests for the changed contract; replay alone proves syntax/order, not authorization correctness.
5. Production is forward-only: do not edit/reset already-deployed history. Recovery is a new reviewed migration or an explicit incident procedure.
6. Do not add synthetic users/orgs/business rows to historical migrations merely to make replay pass; make historical migrations presence-tolerant or recover the authoritative state safely.
7. If modifying an existing function/trigger/policy/view, compare against the installed live definition before writing the migration and again read-only after deploy.

## Cheapest reliable proof order

Use the least expensive proof that actually answers the risk:

1. static SQL/diff inspection
2. catalog assertion
3. targeted local SQL behavior/negative test
4. local fresh replay
5. typecheck/build when generated types/consumers changed
6. exact-head CI
7. live read-only post-deploy verification

Use browser/E2E only when the user journey itself is needed to prove the database contract. Do not substitute UI success for tenant/RLS proof.

## Done contract

A material Supabase change is not Done because "RLS is enabled," "migration applied," "Advisors are green," or "tests pass." Done requires all applicable independent proof classes above, exact-head evidence, and read-only deployed-state verification when the task claims production completion.
