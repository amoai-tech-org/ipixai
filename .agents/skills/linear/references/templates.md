# Linear templates

Use these as starting points. Keep them concise and remove sections that do not apply. Canonical execution/verification lives in `.claude/skills/tasks/`.

## Issue template

```markdown
# IPI-NNN · TASK-ID — Plain-English outcome

**Blocked by:** … · **Unblocks:** …
**Skills:** `tasks` · `task-verifier` · <affected domain skills>

## Purpose
One or two sentences.

## Current state / evidence
- …

## User outcome
- …

## Acceptance criteria
- [ ] Observable outcome — proof

## Implementation checkpoints
- [ ] Smallest safe step — proof

## Verification
Use `.claude/skills/tasks/references/pre-merge-tests.md`; record only the risk-matched commands/evidence that apply.
```

## Bug issue template

```markdown
# IPI-NNN · TASK-ID — Bug outcome

## What is broken
Plain-language description.

## Reproduction
1. Step
2. Step
3. Step

## Expected
What should happen.

## Actual
What happens instead.

## Evidence
- Logs, screenshots, Linear comments, or Sentry reference

## Acceptance criteria
- [ ] Repro no longer occurs — proof
- [ ] Regression test added if practical — proof
```

## Status update template

```markdown
## Status update — YYYY-MM-DD

### Completed
- …
### In progress
- …
### Blocked
- …
### Next
- …
### Evidence
- exact SHA / CI / test / runtime proof
```

## PR template

Canonical PR/review/CI/post-merge behavior lives in `.claude/skills/tasks/`; this is only a body skeleton.

```markdown
## Summary
- …

## Changes
- …

## Linear
IPI-NNN · TASK-ID — Full Task Name

## Verification
- Risk-matched evidence from `.claude/skills/tasks/references/pre-merge-tests.md`

## Notes
- Breaking changes, screenshots, residual risks or follow-ups
```
