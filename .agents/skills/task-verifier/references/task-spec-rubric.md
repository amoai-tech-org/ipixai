# Standard / Adversarial verification scoring

Use only when evidence is sufficiently complete. Scores summarize evidence; they never override a BLOCKER.

| Dimension | Weight | What is proved |
|---|---:|---|
| Outcome / AC proof | 30 | every applicable AC maps to current evidence and real user/business outcome |
| Implementation correctness | 20 | current code/architecture implements the required behavior without contradictory paths |
| Test / verification evidence | 20 | risk-matched positive, negative, recovery, exact-head and runtime proof is current/reproducible |
| Security / tenant / safety | 15 | authz, tenant, HITL, secrets, destructive-write and abuse boundaries when applicable |
| Architecture / SSOT alignment | 10 | current runtime/code/Linear/task/domain ownership agree; no duplicate truth |
| Process / skill compliance | 5 | applicable task/domain rules followed without ritual overhead |

## Interpretation

| Overall | Meaning |
|---:|---|
| 95–100 | Strongly verified for the current pre-merge scope; production-ready may be claimed only after required post-merge Production Verified evidence |
| 90–94 | Ready for the next applicable gate; only minor non-blocking observations |
| 80–89 | Needs fixes/evidence before Done |
| <80 | Not ready |

Any unresolved **BLOCKER** = **Not ready regardless of score**.

Do not invent precision. If material evidence is incomplete, label the score **provisional** or omit it and lower verification confidence. A missing required AC/exact-head/security/post-merge proof cannot be hidden by averaging unrelated green checks.

## Agent prompt

```text
Score only what the evidence supports. A blocker overrides the numeric total. Never call work production-ready from a pre-merge score alone; require the applicable post-merge Production Verified evidence first. Penalize missing risk-matched proof and false-green exposure, not cosmetic style. If evidence is materially incomplete, mark the score provisional or omit it rather than inventing precision.
```
