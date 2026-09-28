---
name: pr
description: Manage the iPix GitHub PR lifecycle. Use when the user explicitly invokes /pr to inspect PR status, verify/fix review findings, ship approved changes, resolve review threads, open/ready a PR, or run post-merge proof. Bare /pr is read-only and recommends the safest next subcommand; mutations require an explicit subcommand.
argument-hint: "[status|fix|ship|resolve|open|ready|post-merge] [PR#]"
disable-model-invocation: true
metadata:
  version: "1.0.0"
---

# /pr — iPix PR workflow

Use `.claude/skills/tasks/SKILL.md` as the canonical task/PR contract. Load only the applicable references for the requested phase:

- status / open / ready: `../tasks/references/github-pr.md`
- review findings / resolution: `../tasks/references/review-comments.md`
- verification: `../tasks/references/pre-merge-tests.md`
- post-merge: `../tasks/references/post-merge.md`

## Safety contract

`/pr` is user-invoked only. Do not infer consent to mutate GitHub or git state from a general conversation.

- Bare `/pr` or `/pr status` is **read-only**: inspect current state and recommend the next command.
- `/pr fix` may edit the verified task scope but stops before commit/push.
- `/pr ship` explicitly authorizes the risk-matched verify → allowlisted stage → commit → push path for the current PR branch. It never merges.
- `/pr resolve` explicitly authorizes reply + review-thread resolution only after each finding is verified against the current head.
- `/pr open` may create/update the PR after required verification.
- `/pr ready` may prepare/undraft only after required exact-head evidence; never merge.
- `/pr post-merge` runs the canonical exact-main post-merge proof after the user has merged.

Never merge, publish, pay, delete, mutate production Supabase, or perform unrelated destructive work from this skill.

## Fastest safe path

1. Record branch, PR number, exact head SHA, dirty state, CI state, and unresolved review threads.
2. Treat bot findings as hypotheses; verify each against the current head before changing anything.
3. Route implementation questions to the owning domain skill.
4. Make the smallest justified change.
5. Run the cheapest decisive proof first; broaden only when risk requires it.
6. After a push, discard old exact-head review/CI evidence and re-check the new head.

## Dispatch

| Invocation | Action |
|---|---|
| `/pr` | Read-only state + safest next command |
| `/pr status [N]` | Read-only PR/CI/review dashboard |
| `/pr fix [N]` | Verify findings → edit only → stop before commit |
| `/pr ship [N]` | Verify → allowlisted stage → commit → push → re-check exact head |
| `/pr resolve [N]` | Verify current finding → reply with evidence → resolve thread |
| `/pr open [N]` | Create/update PR using canonical task title/body rules |
| `/pr ready [N]` | Confirm exact-head gates, then prepare/undraft; no merge |
| `/pr post-merge [N]` | Exact-main post-merge verification; no unrelated code changes |

If the branch is `main`, the checkout/worktree is wrong, or local HEAD does not match the intended PR head, stop and report the correction needed before any mutation.

## Built-in accelerators

Reuse Claude Code bundled skills instead of recreating them when available:

- `/code-review` for a focused independent diff/code defect pass.
- `/run` for launching and driving the real application.
- `/verify` for proving the changed behavior against the running application.

These are evidence producers, not Done authorities. `task-verifier` still decides whether the accumulated evidence is sufficient for merge safety / Done.

To capture a repeatable iPix startup recipe as a project skill, or to tune skill descriptions and visibility, use the Claude-provided `skill-creator` skill. This repository ships no `/run-skill-generator` or `/skill-doctor` command; skill structure, triggering, indexing, and provenance are enforced by `npm run skills:registry:check`, `npm run skills:index:check`, `npm run skills:vendor:check`, and `npm run test:skills`.

## Output

Always finish with:

```text
PR: #N
Head: <sha>
State: <draft/open/merged>
CI: <green/pending/failing>
Substantive unresolved findings: <N>
Changes made: <none or concise list>
Evidence: <current-head proof>
Merge decision: READY / NOT READY
Next: <single safest action>
```
