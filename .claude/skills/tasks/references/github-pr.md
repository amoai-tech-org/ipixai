# GitHub PR quality standard

The PR stage is part of the same Linear task. Use this after implementation checkpoints pass and before the task can approach Done.

## PR readiness

Before commit/opening a PR:

1. Re-read the Linear goal, scope, and Definition of Done.
2. Inspect the exact diff and changed-file list.
3. Run the pre-commit gate in [pre-commit.md](pre-commit.md).
4. Confirm every changed path belongs to this task.
5. Load the domain skills required by the changed paths.
6. Verify load-bearing external API assumptions with installed source/types and official sources.
7. Run the cheapest targeted proof for the actual change.
8. Run the risk-matched pre-merge matrix in [pre-merge-tests.md](pre-merge-tests.md).
9. Update Linear progress/evidence before commit.

## PR body

A reviewer should understand the change quickly. Include:

- user/business outcome
- faster/better implementation choice
- real user journey
- architecture/data-flow Mermaid when useful
- files changed and purpose
- source/reuse decisions
- auth/tenant/RLS/HITL impact when relevant
- external contracts/versions verified
- exact tests and results
- reviewer fast path: 3–5 files to inspect first
- explicit non-goals
- post-merge checks

## PR shape and exact-head rule

Keep the PR to one reviewable outcome. Split unrelated schema, infra, or second-task work before opening the PR. The body must link the exact Linear task and give reviewers a fast path to the 3–5 highest-risk files.

After any pushed fix, treat earlier green checks as stale evidence. Record the new head SHA and require the relevant checks/reviews on that exact head (or GitHub test-merge commit when the repository reports checks there). If branch protection requires the branch to be current with `main`, update it and rerun checks before merge.

Do not treat a skipped workflow as proof that the covered behavior was tested; verify that every task-required check actually ran.

## Automated-review freshness

Before merge, record whether each required reviewer/check evaluated the current head:

| Reviewer/check | Required? | Reviewed/tested SHA | Current? | Blocking findings |
| -- | -- | -- | -- | -- |
| CodeRabbit | yes/no | `<SHA>` | yes/no | `<N>` |
| Qodo | yes/no | `<SHA>` | yes/no | `<N>` |
| CI | yes | `<SHA>` | yes/no | `<N>` |
| Preview | when applicable | `<SHA>` | yes/no | `<N>` |

A bot summary or approval on an older SHA is stale evidence after a push.

## PR troubleshooting rule

A review comment is a hypothesis, not authority. Follow the concrete re-check procedure in [`task-verifier/SKILL.md` § "Bot findings are hypotheses, not facts"](../../task-verifier/SKILL.md) — re-fetch the exact file(s) a bot names at the PR's current head before fixing or dismissing anything it reports; this file does not duplicate that procedure.

For every actionable comment:

```text
comment
→ classify
→ identify domain
→ load domain skill
→ inspect current code/version/live state
→ use MCP / official docs / official GitHub when needed
→ decide valid / invalid / stale / out-of-scope
→ smallest safe fix if valid
→ targeted verification
→ reply with evidence
→ resolve thread
```

Do not resolve because code was merely edited. Resolve only after proof is recorded.

## Completion gate

PR work is complete only when:

- all substantive comments are classified
- valid in-scope findings are fixed and verified
- invalid/stale/out-of-scope/noise findings are resolved with evidence or ownership
- exact-head CI is green
- no unresolved blocker thread remains
- the PR body's pre-merge checklist has been reviewed and updated so every tick reflects verified evidence at the current head (no stale or assumed ticks)
- the PR body's success criteria have been reviewed and updated against that same evidence, with unprovable or descoped criteria marked explicitly rather than deleted
- **explicit human approval for the exact current head SHA is recorded** — this is a hard gate; an agent never performs the merge itself (see `AGENTS.md` § PR instructions → Merge authority)
- post-merge checks are defined before merge

## Agent prompt

```text
Prepare or troubleshoot this PR as part of the same Linear task. Re-read the task goal/DoD, inspect the exact diff versus current base, run the pre-commit and pre-merge gates, and verify every changed file belongs to scope. Build a reviewer-friendly PR body with outcome, architecture/reuse decisions, security/tenant impact, exact verification, reviewer fast path, non-goals, and post-merge checks. Inventory every substantive review thread, classify each before editing, route uncertain claims through the owning skill/MCP/official source, apply the smallest verified fix, rerun targeted proof, reply with evidence, and resolve only after proof. Before acting on any bot-reported finding, follow task-verifier/SKILL.md's bot-recheck procedure: re-fetch the exact file at the current head and confirm the finding still holds. You may prepare the PR fully, but you must never merge it: merging requires current-head required checks green, no blocker thread, the PR checklist and success criteria reviewed and updated against verified evidence at that exact head, and explicit human approval for that same head SHA. Green CI is the precondition for asking, not a substitute for approval.
```
