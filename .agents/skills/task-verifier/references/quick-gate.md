# Quick gate — minimum decisive evidence

Use only for explicitly narrow PR/merge safety, docs/process changes, small fixes, and status checks. Parent: [`../SKILL.md`](../SKILL.md).

## Rule

Use **1–3 decisive probes** whenever possible. Stop at the first confirmed blocker. Quick does not replace Standard/Adversarial review for a substantial task.

```text
current task/outcome
→ exact current head/diff
→ smallest relevant proof
→ affected domain skill only if needed
→ Safe / Not ready
```

## Minimum checks

| Change | Typical minimum |
|---|---|
| Docs/process | exact diff, internal consistency, relevant links/commands exist |
| Code fix | exact diff, targeted regression test, typecheck when TS contract changed |
| UI | targeted test + browser proof when observable behavior changed |
| Supabase/security | **escalate to Adversarial** when boundary/write policy changed |
| PR state | exact-head CI/review freshness + unresolved substantive threads |

Escalate to **Standard** when reviewing a normal substantial feature/task. Escalate to **Adversarial** for auth/RLS/tenant, HITL/consequential AI, migration/data-integrity, production/release, security-sensitive dependency, publishing/payment/destructive-write risk, or conflicting evidence.

## Report

```markdown
## Gate — IPI-XXX · TASK-ID — Full Task Name

**Verdict:** ✅ Safe / 🛑 Not ready
**Confidence:** High / Medium / Low

| Claim | Evidence | Result |
|---|---|---|
| ... | ... | ✅ / 🟡 / 🔴 |

### Blockers
- ...

### Missing evidence / risks
- ...

### Next action
- <smallest action required>
```

Do not publish a numeric score in Quick mode.

## Agent prompt

```text
Run only the minimum decisive checks needed for this narrow request. Record exact-head evidence, stop on the first blocker, and escalate instead of pretending Quick proves a substantial/security/production task is complete.
```
