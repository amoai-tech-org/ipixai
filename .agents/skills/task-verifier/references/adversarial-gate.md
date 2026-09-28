# Standard + Adversarial verification protocol

Parent: [`../SKILL.md`](../SKILL.md).

## Standard mode

Use for normal feature/task/PR review. Standard must cover:

1. Task-validity audit.
2. Exact current head/diff.
3. AC-by-AC evidence map.
4. Failure-mode matrix.
5. False-green analysis.
6. Applicable domain best-practice scan.
7. Negative/recovery paths proportional to risk.
8. User journey when user-visible.
9. Exact-head tests/CI/review freshness.
10. Blockers, red flags, failure points, best-practice violations, and smallest fixes.

## Automatic escalation to Adversarial

Escalate without asking when any changed path or AC affects:

- authentication, authorization, RLS, tenant/org boundaries, privileged roles
- HITL, approval bypass, autonomous/consequential AI writes
- migrations, destructive/backfill/schema/data-integrity changes
- publishing, payments, commerce truth, destructive actions
- production configuration, deployment, secrets, webhooks, external callbacks
- dependency manifests/lockfiles/Actions with security or runtime impact
- incidents, releases, or claims of production-ready/Done where failure cost is high

For Supabase specifically, also escalate when the diff touches `supabase/migrations/**`, `supabase/functions/**`, or SQL changes involving `CREATE/ALTER POLICY`, `ENABLE/DISABLE ROW LEVEL SECURITY`, `GRANT/REVOKE`, `SECURITY DEFINER`, `CREATE FUNCTION`, `CREATE TRIGGER`, `CREATE/ALTER/DROP TABLE`, `CREATE INDEX`, `CREATE VIEW`, `CREATE MATERIALIZED VIEW`, `service_role`, or webhook/callback durability.

## Task-validity audit

Try to invalidate the task before implementation evidence is trusted:

| Question | Fail signal |
|---|---|
| Does the claimed gap still exist? | current code/runtime already solves it |
| Are named files/routes/APIs/tables current? | moved/removed/renamed or version mismatch |
| Is the proposed owner correct? | duplicates another system of record/service |
| Is there already an iPix/native/vendor solution? | unnecessary custom implementation |
| Are blockers/dependencies actually satisfied? | dependency open/stale/unverified |
| Do ACs prove the real outcome? | implementation-only ACs, no observable result |
| Does another task already own this? | duplicate issue/PR/workstream |

A materially invalid task is a **BLOCKER · STALE-SPEC/ARCHITECTURE** until corrected.

## Failure-mode matrix

For every material state transition or external boundary, record:

| Failure mode | Trigger | Impact | Existing protection | Evidence/probe | Status |
|---|---|---|---|---|---|
| duplicate write | retry/webhook replay | duplicate durable state | idempotency key/constraint | replay test | VERIFIED/UNVERIFIED/FAILED |

At minimum consider: unauthorized/cross-tenant access, partial success, duplicate/retry, timeout/provider outage, stale state/concurrency, malformed/empty/large input, refresh/back navigation, deployment/env mismatch, and rollback failure.

## False-green gate

Ask explicitly: **Could every currently listed test/check pass while the real user/business outcome is still broken?**

Common false greens:
- component/unit test green but auth/navigation broken
- API test green but RLS cross-tenant denial missing
- Playwright page load green but required durable state not persisted
- AI response test green but wrong tool/action/HITL bypass possible
- migration test green but existing rows/backfill/rollback unsafe
- CI green on an older SHA
- preview green while required production binding/config differs

Each plausible false green becomes a required missing proof or an explicit verified N/A.

## Negative and recovery matrix

When applicable test:

| Axis | Cases |
|---|---|
| Input | valid, empty, malformed, oversized, stale |
| Auth | signed out, wrong role, wrong org, expired session |
| External | timeout, 4xx, 5xx, malformed response, duplicate callback |
| State | concurrent update, retry, refresh/back, duplicate submit |
| Recovery | retry safely, resume, reconcile partial state, operator-visible error |
| AI | should-act, should-not-act, correct/wrong tool, valid/invalid args, approve/reject/no approval, injection/excessive agency |

## Supply-chain review

When dependency/configuration manifests change, verify:
- direct/transitive dependency intent and necessity
- lockfile change matches requested package change
- installed/version compatibility with current stack
- known vulnerability/advisory status when material
- license/provenance for newly introduced packages where relevant
- GitHub Action permissions and reviewed pinning policy
- no unexpected install scripts, binary artifacts, or secret-bearing caches

## Operational readiness

For production-affecting changes require:
- how failure is detected (logs/metric/health/UI)
- retry behavior and idempotency
- containment/feature-disable path where available
- rollback command/path and rollback trigger
- migration forward/backward compatibility when DB changes
- immediate post-deploy smoke/monitoring signals

## Adversarial report

```markdown
## Verdict
🔴 Not ready / 🟡 Conditional / 🟢 Verified

## Top findings
| Severity | Category | Finding | Evidence | Required fix |

## Task validity
Valid / partially stale / invalid + evidence

## Failure-mode analysis
| Failure | Trigger | Impact | Protection | Evidence | Status |

## False-green risks
- ...

## Acceptance criteria
| AC | Evidence | Result |

## Best-practice violations
| Domain | Rule | Violation | Severity | Fix |

## User journey / AI safety
- ...

## Exact-head evidence
- SHA / tests / CI / runtime / reviews

## Missing proof
- ...

## Score
Only when evidence is sufficient; otherwise `provisional` or omitted.

## Next action
Smallest ordered fixes/proofs required.
```

## Agent prompt

```text
Try to make this task fail before you approve it. Validate the task itself, build the failure-mode matrix, identify false-green scenarios, test negative/recovery paths, and escalate automatically for security/tenant/HITL/data-integrity/production-risk work. Prefer the smallest decisive evidence, but do not skip a failure mode merely because the happy path is green. Report blockers and high-impact failure points before optional improvements.
```
