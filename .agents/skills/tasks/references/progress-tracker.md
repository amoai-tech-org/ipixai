# Progress tracker standard

Place the tracker at the top of every substantial executable task.

```markdown
# Progress Tracker — mandatory and continuously updated

**Overall completion: 0%**

| # | Section / workflow | Done | Evidence / status |
| -- | -- | -- | -- |
| 1 | Current-state audit | [ ] | |
| 2 | Pre-implementation gates | [ ] | |
| 3 | File/workflow group 1 | [ ] | |
| 4 | File/workflow group 2 | [ ] | |
| 5 | Targeted verification | [ ] | |
| 6 | Pre-commit readiness | [ ] | |
| 7 | PR opened with evidence | [ ] | |
| 8 | Review comments classified/resolved | [ ] | |
| 9 | Exact-head CI | [ ] | |
| 10 | Post-merge production proof | [ ] | |
```

Expand implementation into one row per real file or tightly coupled group before coding.

## File tracker

| Target file/group | Instruction | Implementation | Verification | Done |
| -- | -- | -- | -- | -- |
| `<file>` | `<explicit action>` | [ ] | [ ] | [ ] |

`Done [x]` requires both Implementation and Verification `[x]`. Implementation and Verification are gates, not separate percentage units.

## Rules

- Check a row only after its success criteria and verification checkpoint pass.
- Record concrete evidence: SHA, test result, Supabase audit, browser proof, PR, CI, or deployment.
- Use `IN PROGRESS` in status text; do not check early.
- If a completed item regresses, uncheck it and reduce progress.
- Verified `N/A` rows are excluded from the denominator.
- **Only leaf `Done` rows count toward the percentage.** Parent workflow rows are roll-up/display only when their work is expanded into child rows.
- Never count a parent workflow row and its child file/workflow rows at the same time.
- Implementation and Verification checkboxes do not independently increase the percentage; the leaf unit counts once when `Done [x]`.
- `100%` requires post-merge production verification.

Formula:

```text
verified applicable leaf units with `Done [x]`
÷ total applicable leaf units
× 100
```

After each completed checkpoint update the issue with:

```text
Progress: <old %> → <new %>
Completed: <file/workflow>
Verification: <exact proof>
Evidence: <SHA/test/CI/browser/Supabase>
Next: <next file/workflow>
Blocked: <none or blocker>
```


## Current handoff state

Keep this near the tracker for long-running or multi-agent tasks:

```text
Current progress: <NN%>
Current commit/head: <SHA>
Last verified checkpoint: <exact row/file/workflow>
Current file/workflow: <what is in progress>
Next exact action: <single next step>
Known blocker: <none or blocker>
Do not redo: <already-proven evidence>
```

A new agent should be able to resume from this state plus the tracker without reconstructing completed work.

## Agent prompt

```text
Maintain the Linear progress tracker as verified state, not estimated effort. Expand work into leaf file/workflow rows before implementation. A leaf row counts once toward progress only when its Implementation and Verification gates both pass; parent rows are roll-ups and must not be double-counted. Record concrete evidence after every checkpoint, reduce progress if a verified item regresses, exclude only proven N/A rows, and keep the handoff state current. Never set 100% until exact-head PR checks, merge, deployment, and applicable post-merge proof pass.
```
