---
name: task-verifier
description: >
  Adversarial independent evidence gate for iPix tasks and PRs. Use for task review, merge-safety,
  failure-mode analysis, audits of completion claims, and before Linear Done. Consumes the canonical
  `tasks` standard, exact current code/PR head, tests/CI/runtime, and affected domain skills. It tries
  to disprove unsafe or incomplete claims rather than maintaining a parallel implementation lifecycle.
metadata:
  version: "2.4.0"
---

# task-verifier — adversarial evidence gate

**Core mindset:** **try to disprove Done.** Ask what could make the task wrong, incomplete, unsafe, misleadingly green, or fail in production, then require evidence that eliminates those failure modes.

Do not trust status fields, prior-agent summaries, bot approvals, old task markdown, checked boxes, or earlier green runs without current evidence.

## Ownership

```text
tasks         = define + execute substantial iPix work
domain skills = implementation-specific contracts + domain proof patterns
task-verifier = independently challenge claims and prove merge safety / Done
```

Before substantial verification, read [`../tasks/SKILL.md`](../tasks/SKILL.md). Do not recreate its implementation process.

For Mastra specifically:

```text
task-verifier
= decide WHAT claims/failure modes still need proof

mastra/references/testing-gates.md
= domain-specific pre/post-merge proof pattern

mastra/references/user-journeys.md
= frontend → CopilotKit/AG-UI → Mastra → backend → durable-state journey proof
```

The verifier may require those proofs but must not duplicate their implementation guidance.

## Modes

| Mode | Use when | Depth |
|---|---|---|
| **Quick** | small fix, docs/process, narrow PR/status check | 1–3 decisive probes; stop on blocker |
| **Standard** | normal feature/task/PR review | task validity + AC map + failure modes + false-green + domain checks |
| **Adversarial** | auth/RLS/tenant, HITL/consequential AI, migration/data integrity, production config/release, security-sensitive dependency, destructive/publishing/payment write, Mastra workflow resume/callback/storage/tenant-memory/cancellation/MCP-auth, sensitive RequestContext/observability-export changes | Standard + hostile/negative/recovery/rollback/supply-chain/privacy proof |

Default: **Standard** for `verify/review/audit task`; **Quick** only when the request is explicitly narrow; **Adversarial** automatically for the risk triggers above or when the user asks for production/security readiness.

Active references:
- [Quick gate](references/quick-gate.md)
- [Standard + adversarial protocol](references/adversarial-gate.md)
- [Domain best-practice scan](references/domain-best-practices.md)
- [Full scoring](references/task-spec-rubric.md)
- [Anti-fake-Done](references/anti-fake-done-checklist.md)

Everything under `references/legacy/` and `scripts/legacy/` is historical compatibility material, not current iPix guidance.

## Evidence priority

Use the cheapest authoritative proof that answers the claim:

1. Current runtime/live state when applicable.
2. Exact current branch/PR head and changed code.
3. Targeted tests and exact-head CI.
4. Live Linear acceptance criteria and current task state.
5. `AGENTS.md` + `tasks/SKILL.md`.
6. Affected domain skill and connected live/MCP evidence.
7. Installed dependency source/types/lockfile.
8. Official version-specific vendor docs/repositories when still needed.

Memory, reviewer prose, scores, and status labels are not proof.

### When evidence tiers conflict

The tier order says what outranks what — it does not say what to do when two sources genuinely disagree. Example: Linear marks an AC "Done," but the exact-head code shows the behavior isn't there. When this happens:

1. **State both.** Record what the higher-tier source shows and what the lower-tier source claims — do not silently pick one and omit the disagreement.
2. **Resolve to the higher tier.** The verdict follows the higher-tier evidence (runtime/code/tests outrank Linear prose, which outranks docs).
3. **Flag the lower-tier source as stale.** A wrong Linear status or a stale doc is itself a finding — report it so it gets corrected, not just silently overridden and left to mislead the next reader.

### Citation requirement (every verdict)

A verdict — `VERIFIED`, `PARTIAL`, `UNVERIFIED`, `FAILED`, `NOISE`, or any severity label — is a conclusion, not evidence. It must point at what it is based on. Every verdict requires:

1. **The source**: exact file + line (or commit SHA), the exact command/query run, or the exact test/CI job and its output.
2. **The result**: the specific quote or output that backs the verdict — not a paraphrase, not "looks fine."

`"Verified against AGENTS.md"` is a claim. `AGENTS.md:158 — "TASK-ID is the real spec identifier such as MIGRATE-TEMPLATE"` is proof — it lets anyone (including a later pass by this same skill) re-check the verdict in seconds instead of re-deriving it from scratch. A verdict published without a citation is itself unproven and must be treated as `UNVERIFIED`, never accepted at face value.

### Bot findings are hypotheses, not facts

CodeRabbit, Kilo, Macroscope, and similar review bots produce hypotheses to check, not verdicts to apply. Before acting on any bot-reported finding:

1. Re-fetch the exact file(s) the finding names **at the PR's current head** — not the state implied by the bot's comment, which can already be several commits stale.
2. Confirm the finding still describes what is actually there.
3. Cross-check against the higher-tier sources in Evidence priority above (code/PR head > tests/CI > Linear > `AGENTS.md`/`tasks` > domain skill) before fixing or dismissing it.
4. If the finding is wrong, dismiss it as `NOISE` with the citation that disproves it (per Citation requirement above) — do not fix a bot-hallucinated issue just because a bot asked, and do not silently ignore it either.

Example: a review bot flagged a PR title as violating format ("must say `SPEC`, not `TASK-ID`"). Re-checking `AGENTS.md`, `CLAUDE.md`, and `docs/linear/linear-format.md` at the PR's current head showed all three require literal `TASK-ID` (e.g. `MIGRATE-TEMPLATE`). The finding was `NOISE`, confirmed by citation — not fixed by assumption.

### Bot calibration log (track false-positive rate per bot)

A one-off catch teaches nothing by itself; a pattern does. Keep a lightweight running log — in the task/PR record, not memory — of every bot finding actually checked:

| Bot | Finding category | Confirmed / False | Date | Citation |
|---|---|---|---|---|
| CodeRabbit | title-format | False | 2026-09-09 | `AGENTS.md:158` |
| CodeRabbit | routing-bypass | Confirmed | 2026-09-09 | `.claude/skills/worktrees/SKILL.md` diff |

This is not extra ceremony for its own trend to review only — it changes how the next finding from the same bot/category is treated. If a bot has a known high false-positive rate on a specific check (e.g. title-format), treat its next finding of that type with extra scrutiny before acting, and say so in the verdict. If a category is consistently confirmed, it can be trusted faster.

### Web search evidence (tier 8 — last resort, not first move)

Web search is the cheapest-proof-first list's *fallback*, used only when runtime/code/tests/CI/Linear/domain-skill/installed-source evidence (tiers 1–7) cannot answer the question. When it is used:

1. **Version-pin every query.** Search `"next.js 16 server actions revalidation"`, not `"next.js server actions"` — a generic query returns majority-version docs that can contradict what is actually installed.
2. **Cross-check installed source first.** If `node_modules/<pkg>` source/types already answer the question, searching is redundant and risks introducing a wrong-version answer.
3. **Prefer primary sources.** Official docs > official GitHub repo/changelog/release notes > third-party blogs/forums. A low-trust source is worse than no source — it manufactures false confidence, which is exactly what this skill exists to reject.
4. **Search to falsify, not confirm.** The implementation already believes its approach works; search for known failure modes, breaking changes, or security advisories against that approach rather than evidence that it "works."
5. **Record the query and what the source said, not just the conclusion.** "Verified against docs" with no citation is itself an unproven claim — cite the query and the specific fact it established in the research packet (see `tasks/references/research-evidence.md`).

## Required verification flow

1. **Task validity audit:** prove the gap still exists; detect stale assumptions, duplicate work, wrong architecture, obsolete APIs/files/routes, and ACs that do not prove the real user outcome.
2. **Exact head:** record branch/PR SHA and changed paths before evaluating implementation evidence.
3. **PR ↔ Linear cross-check:** confirm the PR's actual diff implements what the live Linear task specifies — not just that the PR is internally consistent. Pull the current Linear ACs, walk the real diff/changed files against each one, and record any AC the PR does not touch, any PR change with no corresponding AC, and any place Linear and the diff disagree (apply the tier-conflict rule above when they do).
4. **AC map:** classify every applicable AC as `VERIFIED`, `PARTIAL`, `UNVERIFIED`, or `FAILED` with concrete, cited evidence (see Citation requirement).
5. **Adversarial pre-mortem:** identify likely failure points and record a failure-mode matrix: trigger, impact, protection, proof, status.
6. **False-green gate:** ask whether all listed tests could pass while the operator/business outcome is still broken; convert plausible false greens into missing proof.
7. **Domain best practices:** load only affected domain skills and run the relevant checks from [domain-best-practices.md](references/domain-best-practices.md).
   - For material Supabase/Postgres changes, determine which independent proof classes apply: **catalog, behavioral, authorization/tenant, migration replay, performance/exposure, live read-only**. Do not substitute one proof class for another; use `ipix-supabase/references/verification-matrix.md` for HOW.
   - For material Mastra changes, determine which independent proof classes apply: **registry/config, deterministic primitive, model behavior, authority/context, memory, persistence/restart, HITL artifact, resume/recovery, streaming/abort, side-effect idempotency, observability/evals, exact runtime**. Do not substitute one proof class for another; use `mastra/references/testing-gates.md` for risk-matched proof and `mastra/references/user-journeys.md` when the operator/business flow is affected.
8. **Negative/recovery:** verify malformed/empty/stale/large input, provider/network failure, retry, idempotency, partial failure, refresh/back/navigation, and unauthorized/cross-tenant behavior when applicable.
9. **AI behavior:** for AI-native work test positive and negative behavior: should-act/should-not-act, correct/wrong tool, valid/invalid arguments, approval granted/rejected/absent, prompt-injection/excessive-agency attempts, and no durable write before approval.
10. **Privacy/retention:** when RequestContext, traces, workflow snapshots, suspend payloads, datasets, feedback, or observability exporters change, verify sensitive/large payloads are minimized, retention/export behavior is understood, and secrets/auth headers cannot leak.
11. **Supply chain:** when manifests, lockfiles, actions, containers, or external SDK versions change, review unexpected dependencies, compatibility, vulnerabilities, permissions, licensing, and pinning/upgrade risk.
12. **Operations:** for deployment-affecting work prove failure detection, retry safety, rollback/containment, rollback triggers, migration compatibility, and immediate monitoring signals.
13. **Journey:** for user-facing work verify the complete business journey using [`../tasks/references/user-journey-testing.md`](../tasks/references/user-journey-testing.md); when Mastra participates, use the Mastra journey map for the AI/runtime/backend decomposition rather than duplicating it here.
14. **Exact-head proof:** required CI/reviews/tests must apply to the current head; older green evidence is stale after a push.
15. **Post-merge:** when claiming Done require applicable [`../tasks/references/post-merge.md`](../tasks/references/post-merge.md) evidence. Merge alone is insufficient.
16. **Verdict:** blockers first, then high/medium findings, then improvements. Every verdict is cited (see Citation requirement). Missing required evidence means not Done.

## Mastra false-green gate

When Mastra participates, explicitly ask whether all current tests could pass while any of these remain broken:

```text
forced toolChoice passes but natural language selects the wrong tool
shared/stale thread makes persistence look correct
message row persists but a new process never uses it
browser-supplied org/brand/shoot context is trusted without server verification
RequestContext looks harmless but leaks protected fields into traces/datasets/exporters
approved revision N differs from revision/hash actually resumed or saved
approved:false/cancel/close falls back into another suspend path
a proposal is materially recomputed after the operator approved it
workflow/HITL works functionally but realistic snapshots are huge or memory-unsafe
Stop closes the UI stream but external/provider/tool work keeps running
duplicate callback/resume repeats a write/payment/publish/booking
provider failure falls through to stale output that appears successful
JWT/service/provider secret lands in workflow snapshot, memory, trace, or model context
eval score improves only because dataset/model/agent/scorer version changed
trace reports success while the operator/business outcome failed
```

If any scenario is plausible, require a decisive proof before PASS.

## Mastra proof non-substitution rules

```text
tool unit test passes        ≠ model routing proof
model routes correctly       ≠ caller authorization proof
resource/thread ID known     ≠ ownership proof
message persisted            ≠ restart recall proof
approved=true                ≠ exact artifact approval
resume succeeds              ≠ stale/duplicate/foreign resume safety
stream ends                  ≠ downstream abort proof
single write succeeds        ≠ retry/idempotency proof
trace exists                 ≠ privacy-safe useful observability
higher eval score            ≠ comparable regression improvement without versioned inputs
```

## Severity taxonomy

| Severity | Meaning | Effect |
|---|---|---|
| **BLOCKER** | tenant/secret/data-loss/destructive-write/HITL/unsafe-migration/required-AC/exact-head critical failure | Not ready regardless of score |
| **HIGH** | likely production correctness/reliability/security failure with meaningful impact | fix before Done unless explicitly proven non-blocking |
| **MEDIUM** | material weakness or unproved edge case that does not invalidate the main outcome | document/fix before Done when required by AC/risk |
| **IMPROVEMENT** | maintainability/efficiency/readability with no current outcome risk | non-blocking |
| **OUT-OF-SCOPE** | valid issue owned elsewhere | cite exact owner; do not hide a blocker here |
| **NOISE** | incorrect, stale, or non-actionable finding | dismiss with evidence |

Finding categories: `CORRECTNESS`, `SECURITY`, `DATA-INTEGRITY`, `RELIABILITY`, `ARCHITECTURE`, `USER-JOURNEY`, `AI-SAFETY`, `TEST-GAP`, `OPERATIONS`, `PERFORMANCE`, `PRIVACY`, `MAINTAINABILITY`, `STALE-SPEC`.

## Scoring rule

Only **Standard** or **Adversarial** may publish a score, and only when the evidence is sufficiently complete. If material evidence is missing, label the score **provisional** or omit it. Never let a high score override a BLOCKER.

## Verifier self-audit (spot-check)

The verifier catches implementation drift; nothing today catches verifier drift itself — a Standard-mode `PASS`/`VERIFIED` verdict that quietly goes unre-checked forever. Apply a light periodic self-audit: roughly 1 in 10 published Standard-mode verdicts should get a second, independent pass — re-derive the verdict from the current evidence without reading the original verdict first, then compare. A mismatch is itself a finding: report it, correct the original verdict, and note what caused the drift (missed evidence tier, stale citation, an unchecked bot finding). This is cheap insurance against the verifier developing the same blind spot repeatedly.

## Hard Done rule

`code exists` ≠ Done
`tests pass` ≠ automatically Done
`PR merged` ≠ Done
**required observable outcome + risk-matched adversarial evidence + applicable post-merge proof = Done**

## Agent prompt

```text
Independently review this task and try to disprove Done. Read the live Linear task and `.claude/skills/tasks/SKILL.md`. Verify the task itself is still valid before evaluating implementation. Record the exact current branch/PR SHA. Cross-check the PR's actual diff against the live Linear task's acceptance criteria: which ACs the diff proves, which it does not touch, and any PR change with no corresponding AC. When Linear and the exact-head code disagree, state both, resolve to the higher-tier evidence, and flag the lower-tier source as stale rather than silently picking one. Map every AC to current evidence. Build a failure-mode matrix and identify plausible false-green scenarios where tests could pass but the real user outcome would still fail. Load only affected domain skills and check their current best-practice/security contracts. Automatically use Adversarial mode for auth/RLS/tenant, HITL/consequential AI, migrations/data integrity, production config/release, security-sensitive dependency changes, publishing/payments, destructive writes, and Mastra workflow resume/callback/storage/tenant-memory/cancellation/MCP-auth/sensitive-RequestContext changes. For material Mastra work identify the independent applicable proof classes and use the Mastra testing-gates/user-journeys references for domain proof patterns rather than recreating them. Do not substitute tool tests for routing, persistence for restart recall, stream closure for abort, or approval booleans for exact reviewed-artifact proof. If RequestContext/tracing/snapshots/evals changed, verify privacy/retention, realistic payload size, and reproducible versioned eval inputs. Test retry/idempotency/partial-failure/recovery where state can change; review supply-chain risk when manifests/lockfiles/actions change; require rollback/monitoring proof for deployment-affecting work. When tiers 1-7 cannot answer a load-bearing question, use web search only to falsify the current approach (known failure modes, breaking changes, advisories) with version-pinned queries against primary sources, and record the query and what it established. Every verdict — including NOISE dismissals of bot findings — must cite the exact file/line/commit/command/test output it is based on; re-check any bot-reported finding against the current PR head before acting on it, since bot findings are hypotheses, not facts, and log confirmed/false findings per bot/category to calibrate trust over time. Classify findings by severity and category. Treat missing required evidence as not Done. Use numeric scores only when evidence is complete enough to justify them. Roughly 1 in 10 Standard-mode verdicts should get an independent self-audit re-check to catch verifier drift. End with the smallest fixes/proofs required to reach verified Done.
```
