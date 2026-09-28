# iPix Linear workflow

Use this reference for all iPix Linear work.

## Context

- Team: `IPI`
- Issue format: `IPI-###`
- Task/progress source of truth: live Linear issue
- Canonical task standard: `.claude/skills/tasks/SKILL.md`

## Read first for iPix tasks

1. `.claude/skills/tasks/SKILL.md`.
2. Live Linear issue, dependencies, and current progress.
3. Graphify before codebase exploration when the graph exists.
4. Current repository/runtime evidence relevant to the task.
5. Affected domain skills.

## Executable Linear description

Every substantial executable iPix issue should include the canonical `tasks` sections plus a Mermaid reasoning pass and risk-matched verification.

```markdown
## TASK-ID — short title

**In plain terms:** …
**Blocked by:** … · **Unblocks:** …
**Skills:** `tasks` · `task-verifier` · <affected domain skills>

### Flow
```mermaid
flowchart TD
  …
```

### Completion steps
- [ ] Scope/setup — proof
- [ ] Implement — proof
- [ ] Integrate — proof
- [ ] Verify — proof
- [ ] Ship/post-merge — proof
```

## Plain-language rules

| Do not write | Write |
|--------------|-------|
| Add RLS policies | Operator cannot read another org's brands |
| Deploy edge function | Operator action succeeds without exposing server secrets |
| Validate env vars | App fails fast with a clear missing-variable error |

Personas: **Operator**, **Engineer**, **Shopper** (commerce only).

## Verification gates

Use `.claude/skills/tasks/references/pre-merge-tests.md` plus the affected domain skill. Re-read current `package.json` / CI before naming commands; do not maintain a second command matrix here.

## Done definition

An iPix issue is Done only when applicable ACs are proved, risk-matched verification passes, required post-merge proof passes, Linear matches reality, and task-verifier has no unresolved BLOCKER.
