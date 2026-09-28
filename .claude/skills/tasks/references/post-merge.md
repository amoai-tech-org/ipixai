# Post-merge verification standard

Merge is not Done. Verify the merged commit on `origin/main`, deployment/runtime health, and the task's observable outcome before 100% / Linear Done.

## Core sequence

```text
PR merged
→ fetch origin/main
→ verify merge/head SHA
→ verify main CI
→ verify deployment/runtime
→ run task-specific smoke journey
→ run domain-specific proof
→ synchronize local main with origin/main
→ verify main...origin/main = 0 0
→ route residual risks
→ update Linear evidence/progress
→ 100% / Done
```

## Completion window

Post-merge verification starts immediately after merge, not "eventually." For a substantial task, complete the required checks below within **1 business day** of merge unless the task explicitly documents a longer window (e.g. waiting on a scheduled deploy). A merged PR with no post-merge evidence after that window is a stale task, not a done one — surface it, don't let it sit silently at "merged."

## Local main synchronization gate

After the merged-main proof is complete and **before creating the next task branch/worktree**, synchronize local `main` safely:

```bash
git fetch origin --prune
git rev-list --left-right --count main...origin/main
```

Interpret the result as `<local-only> <remote-only>`:

- `0 0` → PASS: local `main` already matches `origin/main`.
- `0 N` → local `main` is only behind. Fast-forward it from the worktree that owns `main` with `git merge --ff-only origin/main`, then re-run the divergence check.
- `N 0` or `N M` with local-only commits → **STOP**. Preserve those local-only commits on an appropriate branch/PR before synchronizing `main`; never silently reset or discard them.

Do not automatically rebase active feature branches just because another PR merged. Update/rebase an active branch only when its dependency, conflict, or strict-main policy requires it.

## Required checks when applicable

- [ ] PR merged into intended base and merge SHA recorded.
- [ ] Current `origin/main` contains the intended change.
- [ ] Local `main` is safely synchronized with `origin/main` before the next task starts (`git rev-list --left-right --count main...origin/main` → `0 0`).
- [ ] Main/exact merged CI is green; inspect the actual workflow run/SHA per [github-actions.md](github-actions.md), not an earlier branch run.
- [ ] Deployment completed successfully.
- [ ] Required route/runtime is available without unexpected 401/403/404/5xx.
- [ ] Signed-out behavior verified when auth changed.
- [ ] Org A vs Org B verified when tenant isolation changed.
- [ ] Live DB/RLS/persistence verified when data behavior changed.
- [ ] UI verified at desktop and ~390px when user-facing UI changed.
- [ ] Residual valid risks have an exact Linear owner.
- [ ] PR URL + merge SHA + runtime evidence recorded in Linear.
## Domain-specific proof

If Supabase changed: verify migration/schema state, RLS, authorized behavior, and cross-org denial.

If CopilotKit changed: verify chat/runtime starts, thread/interrupt/HITL behavior, and no unexpected 5xx.

If Mastra changed: verify the actual agent/workflow path, suspend/resume when relevant, and persistence/restart behavior when persistence is part of the requirement.

If Cloudinary changed: verify upload/retrieval/transformation behavior and that the exact provider resource maps to the correct iPix business record.

If UI changed: verify the real route, normal/empty/error states, responsive layout, and navigation.

## Residual-risk routing

Every remaining finding becomes exactly one of:

```text
FIXED
NOT A PROBLEM — evidence recorded
EXISTING LINEAR OWNER — exact full task reference
NEW LINEAR TASK REQUIRED — only when no owner exists
```

Never leave `future work`, `out of scope`, or `follow up later` without an owner.

Only after all required post-merge checks pass may the task tracker reach `100%` and Linear move to Done.

## Rollback / containment when deployment behavior changed

For deployment-, migration-, runtime-, or integration-affecting tasks, record the safe disable/revert path, the signal that would trigger rollback, and the immediate post-deploy signals to monitor. Do not require a rollback section for docs-only or otherwise non-deploying work.

## Local → preview → production escalation

Do not repeat every test at every environment. Use the cheapest environment that can prove the risk:

```text
localhost → code/UI/auth journey
preview → deployed env/config/middleware/integration differences
production → final smoke on durable real state after merge
```

A local pass does not prove preview environment bindings; a preview pass does not replace exact-main CI; a production page load does not prove tenant/RLS safety unless the task-specific negative path is exercised. Reuse Playwright traces/screenshots and CI artifacts when a post-merge failure needs diagnosis.

## Agent prompt

```text
Verify the merged outcome rather than assuming merge means Done. Fetch current origin/main, record the merge/head SHA, confirm main CI and deployment health, then run the smallest production/runtime smoke journey that proves the task outcome. Before creating the next task branch/worktree, fetch with prune, inspect `main...origin/main`, preserve any local-only commits, fast-forward local `main` only when safe, and require `0 0`; do not automatically rebase unrelated active feature branches. Complete required post-merge checks within 1 business day of merge unless the task explicitly documents a longer window; do not let a merged task sit un-verified indefinitely. Add domain-specific proof for Supabase, CopilotKit, Mastra, Cloudinary, auth/tenant, or UI when those areas changed. Route every residual risk to FIXED, NOT A PROBLEM with evidence, EXISTING LINEAR OWNER, or NEW LINEAR TASK REQUIRED. Update Linear with PR URL, merge SHA, CI/deploy/runtime evidence, and only set 100%/Done when all applicable post-merge checks pass.
```

## Post-merge journey certification

For user-facing or AI-native changes, re-run the minimum critical journey from [user-journey-testing.md](user-journey-testing.md) against merged main/production when safe. Verify the observable business outcome plus domain-specific state. For AI-native journeys, retain separate evidence for system correctness and AI correctness before 100% / Done.
