# Anti-fake-Done checklist

Use during **Standard** and **Adversarial** verification. Every applicable row requires current evidence.

| Gate | Required proof |
|---|---|
| Task validity | claimed gap/architecture/dependencies are still current; task is not duplicate/stale |
| Outcome | observable user/business outcome is actually achieved |
| ACs | every required AC is VERIFIED; no FAILED/UNVERIFIED required AC |
| Exact head | evidence applies to current PR/merged SHA, not an older commit |
| Failure modes | material failure points have protection + proof or explicit blocking gap |
| False green | plausible ways for tests to pass while outcome fails are disproved |
| Tests | risk-matched positive/negative/recovery/browser/SQL/runtime tests pass |
| Security | auth/tenant/HITL/secrets/destructive-write boundaries proved when applicable |
| Retry/idempotency | side-effect retries/replays/partial failures cannot corrupt or duplicate durable state |
| Supply chain | dependency/workflow changes are intentional, compatible, and safe when applicable |
| Journey | complete business journey proved for user-facing work |
| AI | system correctness + positive/negative AI correctness proved when AI participates |
| Operations | production-affecting work has detection, recovery, rollback/containment and smoke proof |
| Reviews/CI | substantive findings resolved and required exact-head CI green |
| Post-merge | `.claude/skills/tasks/references/post-merge.md` evidence passed when claiming Done |
| Linear | live issue state/progress matches verified reality |

## Hard rule

```text
code exists != Done
tests pass != automatically Done
PR merged != Done
required observable outcome + adversarial risk proof + applicable post-merge evidence = Done
```

Failure output:

> 🛑 Not Done. Required evidence is missing or failed: <exact gate + proof>. Smallest next action: <action>.

## Agent prompt

```text
Treat every applicable row as a potential false-Done path. Require current evidence, not status/checkmarks. If a row exposes a plausible blocker or unproved high-risk failure mode, keep the task out of Done until the smallest decisive proof or fix closes it.
```
