---
title: Mastra testing gates — pre-merge and post-merge
description: Load when deciding what Mastra tests must run before merge or what runtime proof is required after merge. Converts Mastra failure modes into risk-matched executable evidence.
parent: mastra
impact: HIGH
impactDescription: Prevents false-green agent, workflow, memory, HITL, abort, and persistence releases
tags: mastra, testing, ci, pre-merge, post-merge, evals, hitl, workflows
---

# Mastra testing gates — iPix

Use the **smallest test set that proves every affected risk class**. Do not run every Mastra test for every PR, and do not let one green proof substitute for another.

## Contents

- [Evidence order](#evidence-order)
- [Source/version rule](#sourceversion-rule)
- [A. Registry/config — always when agent wiring changes](#a-registryconfig--always-when-agent-wiring-changes)
- [B. Deterministic tool contracts — when tools or planning logic change](#b-deterministic-tool-contracts--when-tools-or-planning-logic-change)
- [C. Natural-language Planner routing — when prompts/model/tool descriptions/routing change](#c-natural-language-planner-routing--when-promptsmodeltool-descriptionsrouting-change)
- [D. Memory/persistence — when memory/storage/thread scope changes](#d-memorypersistence--when-memorystoragethread-scope-changes)
- [E. Workflow/HITL/resume — when a consequential workflow exists or changes](#e-workflowhitlresume--when-a-consequential-workflow-exists-or-changes)
- [F. Streaming/Stop/abort — when cancellation matters](#f-streamingstopabort--when-cancellation-matters)
- [G. Observability/privacy — when tracing/evals/RequestContext change](#g-observabilityprivacy--when-tracingevalsrequestcontext-change)
- [H. Package-family change — when any Mastra dependency changes](#h-package-family-change--when-any-mastra-dependency-changes)
- [Always for merged Mastra changes](#always-for-merged-mastra-changes)
- [If model/prompt/routing changed](#if-modelpromptrouting-changed)
- [If memory/storage changed](#if-memorystorage-changed)
- [If workflow/HITL changed](#if-workflowhitl-changed)
- [If Stop/abort changed](#if-stopabort-changed)
- [If Mastra package family changed](#if-mastra-package-family-changed)
- [Current iPix executable evidence](#current-ipix-executable-evidence)
- [Official research basis](#official-research-basis)

---

## Evidence order

```text
static registry/config inspection
→ deterministic tool/schema/unit tests
→ targeted agent/runtime contract tests
→ natural-language routing evals when model behavior changed
→ memory/restart tests when persistence changed
→ workflow suspend/resume adversarial tests when HITL/recovery changed
→ abort/downstream-cancellation tests when Stop matters
→ typecheck
→ production build
→ localhost/preview/browser proof only when the real path requires it
→ exact-head CI
→ post-merge exact-main/runtime smoke
```

## Source/version rule

Before choosing tests, record the exact installed Mastra/CopilotKit/AG-UI family and inspect installed source/types for version-sensitive behavior. Current web docs and upstream fixes explain concepts and known failure classes; they do **not** prove the pinned iPix runtime contains the same behavior.

---

# Pre-merge Mastra gate

## A. Registry/config — always when agent wiring changes

Required checks:

- [ ] intended `default` registry entry resolves to the Production Planner;
- [ ] agent ID/name/model/provider are the intended current values;
- [ ] no weather/demo/legacy agent reaches the authenticated product route;
- [ ] exact intended tool inventory is registered;
- [ ] each registered production tool has required input/output schemas;
- [ ] product route derives resource/tenant identity server-side rather than using a shared literal resource.

**Success:** registry/config tests pass on the exact PR head and there is no alternate product-route path that mounts a stale/demo agent.

## B. Deterministic tool contracts — when tools or planning logic change

Required checks when applicable:

- [ ] valid input → valid typed output;
- [ ] malformed/empty input rejected or returns typed `needs_input`;
- [ ] nonfinite values (`NaN`, `Infinity`) rejected before arithmetic;
- [ ] numeric/text/array upper bounds enforced;
- [ ] duplicate channels/IDs do not double-count or hide uncovered items;
- [ ] trusted-reference provenance survives into shot output;
- [ ] live/reference-backed values are distinguished from defaults/assumptions;
- [ ] deterministic input gives deterministic output where the tool promises determinism;
- [ ] compute-only tools have no forbidden write/payment/media/network side effects;
- [ ] wrong or unprivileged tool cannot cross a consequential write boundary.

**Success:** all deterministic contract tests pass with no retry/flaky dependence.

## C. Natural-language Planner routing — when prompts/model/tool descriptions/routing change

Use the versioned Planner routing corpus. Include at minimum:

- should call;
- should not call;
- ambiguous intent;
- missing required input;
- plausible wrong tool;
- untrusted-reference substitution attempt;
- fake approval / approval-bypass request.

A forced `toolChoice` run may diagnose a tool but cannot be the only routing proof.

For comparative evals record:

```text
git SHA
agent/config version
model/provider
Mastra package family
dataset ID + version
scorer/gate/rubric version
relevant runtime flags
```

Mastra gates are appropriate for deterministic agent actions such as whether a tool was called; scorers are appropriate for nondeterministic quality. Keep authorization, schema, idempotency and approval requirements as deterministic tests rather than LLM-judge scores.

**Success:** all hard gates pass; scorer thresholds meet the task-owned baseline; comparison inputs are version-compatible; no launch-critical behavior depends on a soft average hiding a deterministic failure.

## D. Memory/persistence — when memory/storage/thread scope changes

Required proof when applicable:

```text
Process A writes a unique nonce/state
→ Process A exits
→ Process B starts with the same durable store
→ authorized same resource/thread recalls expected state
→ foreign resource/org cannot read or influence it
```

Test message history separately from working memory. A persisted row or same-process re-instantiation is not restart proof.

Also verify:

- [ ] no hosted silent fallback to in-memory/LibSQL when durable state is required;
- [ ] working-memory scope (`resource` vs `thread`) is explicit;
- [ ] new thread does not inherit thread-only state accidentally;
- [ ] memory/RequestContext possession never grants authorization.

**Success:** required state survives a real fresh process and cross-tenant negatives fail closed.

## E. Workflow/HITL/resume — when a consequential workflow exists or changes

Required adversarial cases:

- [ ] first suspend persists the expected small typed snapshot;
- [ ] explicit `approved`, `rejected`, `revision_requested`, `cancelled`, `expired` semantics behave distinctly;
- [ ] `approved:false` never re-enters the “not resumed” suspend path;
- [ ] reviewed artifact ID/revision/hash equals the artifact continued/saved;
- [ ] stale artifact/hash fails closed;
- [ ] wrong run fails closed;
- [ ] wrong suspended step fails closed;
- [ ] wrong tenant/resource fails closed;
- [ ] malformed resume fails closed;
- [ ] duplicate resume is typed no-op/conflict and causes no duplicate effect;
- [ ] concurrent approve/reject produces exactly one terminal result;
- [ ] callback replay/mismatched external job ID fails closed;
- [ ] process restart while suspended can recover if the product contract requires it;
- [ ] write succeeds but HTTP/stream response is lost → retry observes committed state and does not write twice;
- [ ] materially changed rates/config/data after review do not silently replace the approved snapshot;
- [ ] snapshot size remains bounded under realistic payloads; large media/raw crawl/model blobs are stored by reference, not duplicated in workflow snapshots.

Mastra 1.63 introduced atomic resume claiming/409 conflict behavior upstream; verify the installed iPix version/path rather than assuming release notes prove our implementation. Recent upstream issues also demonstrate cold-process resume and large-snapshot failure classes, so those cases remain valid regression tests even when fixed in newer releases.

**Success:** every applicable adversarial case passes with exactly one consequential domain effect and no stale/foreign resume path.

## F. Streaming/Stop/abort — when cancellation matters

Required chain:

```text
operator Stop
→ request AbortSignal
→ agent/workflow stops
→ tool/provider/external request receives cancellation where supported
→ no later protected write/publish/payment occurs
→ UI ends in a recoverable state
```

Ending SSE is not sufficient proof.

**Success:** downstream work actually stops or is proven harmless/idempotent after cancellation, and no protected side effect appears after Stop.

## G. Observability/privacy — when tracing/evals/RequestContext change

Verify:

- [ ] traces identify agent/model/tool/workflow/run outcome sufficiently for diagnosis;
- [ ] RequestContext and trace attributes exclude JWTs, service keys, auth headers, cookies and unnecessary raw customer/brand payloads;
- [ ] eval/dataset records do not silently persist protected content beyond the intended policy;
- [ ] trace “success” is reconciled with the actual operator/business outcome for the tested journey.

**Success:** failures are diagnosable without leaking protected data.

## H. Package-family change — when any Mastra dependency changes

Required:

- [ ] exact before/after package family recorded;
- [ ] migration/release notes reviewed for affected APIs;
- [ ] installed source/types checked after install;
- [ ] registry/tool/runtime tests pass;
- [ ] affected memory/workflow/streaming tests pass;
- [ ] typecheck passes;
- [ ] production build passes;
- [ ] lockfile change is explainable and contains no unintended package-family drift.

**Success:** the exact compatible family is green on targeted regressions + typecheck/build; “latest exists” is never sufficient reason to merge.

---

# Pre-merge STOP conditions

Do **not** declare merge-ready when any of these remain unexplained:

- exact-head registry differs from intended agent/tool configuration;
- a deterministic tool test is flaky or passes only on retry;
- natural-language routing selects a plausible wrong tool on a launch-critical case;
- model test uses forced tool choice as the only routing proof;
- browser/RequestContext tenant claims bypass server verification;
- memory persistence is proved only in the same process;
- cross-org thread/resource access succeeds;
- approval boolean is not bound to an immutable artifact revision/hash;
- reject/cancel/expiry falls into another suspend;
- duplicate/concurrent resume can repeat a consequential effect;
- workflow snapshot grows unexpectedly with realistic payloads;
- Stop closes the UI while external work continues toward a protected side effect;
- provider/model failure surfaces stale prior output as fresh success;
- JWT/service/provider secret appears in memory, snapshot, RequestContext, trace or model-visible state;
- required CI/review evidence is from an older SHA;
- installed package behavior conflicts with assumptions from current web docs.

---

# Post-merge Mastra gate

Merge is not Done. Run only the smallest exact-main/live proof needed for the changed risk.

## Always for merged Mastra changes

- [ ] record merge SHA and exact `origin/main` SHA;
- [ ] exact-main CI is green;
- [ ] production/preview runtime starts without Mastra storage/registry initialization errors;
- [ ] product route exposes the intended Production Planner and expected tool inventory;
- [ ] no unexpected 401/403/404/5xx on the real authenticated Planner route;
- [ ] review deployment/runtime logs for new Mastra/Postgres/AG-UI errors introduced by the merge.

## If model/prompt/routing changed

Run a minimal production-safe sample from the versioned routing corpus against the deployed model path. Do not manufacture production domain writes.

**Success:** expected call/no-call/clarification behavior holds on the merged runtime and no new unsupported claim reaches a protected action.

## If memory/storage changed

Use a unique marker on the merged runtime:

```text
send marker
→ confirm durable persistence
→ restart/new instance/cold path when required
→ same authorized resource recalls marker
→ foreign org/resource denied
```

**Success:** real merged runtime uses the intended durable store and isolation still holds.

## If workflow/HITL changed

Run one safe real suspend → review → resume journey using a non-destructive fixture or test-owned record. Confirm:

- reviewed revision/hash equals resumed revision/hash;
- reject path does not approve/resuspend incorrectly;
- duplicate resume does not duplicate domain state;
- snapshot/recovery errors do not appear in logs;
- resulting domain state matches exactly one approved action.

**Success:** observable operator result + durable state + audit/provenance agree.

## If Stop/abort changed

Run a controlled cancellable operation and inspect downstream evidence.

**Success:** Stop reaches the downstream boundary and there is no later protected side effect.

## If Mastra package family changed

In addition to normal smoke, inspect runtime logs for version-sensitive failures: storage init, workflow snapshot/recovery, tool errors after reload, streaming/abort propagation, registry/tool discovery, and AG-UI/CopilotKit compatibility.

**Success:** no new version-specific error appears under the real merged path.

---

# Post-merge failure handling

If a merged Mastra change fails:

```text
identify exact merge SHA + runtime request/run/thread
→ classify registry / tool / model / auth / memory / storage / workflow / resume / abort / provider / deployment
→ contain protected side effects first
→ reproduce using the cheapest decisive test
→ rollback/disable when the user journey or tenant/data safety is at risk
→ create/update exact Linear owner with evidence
```

Do not fix production symptoms by adding generic retries, switching to an in-memory fallback, broadening tool authority, bypassing approval, or upgrading Mastra opportunistically.

---

# Definition of verified success

A Mastra task/PR is only certified when all **applicable** statements are true:

```text
correct agent is registered
+ correct tools are registered and schema-safe
+ deterministic domain behavior passes
+ natural-language routing is proven when changed
+ tenant/context authority is server-verified
+ memory persists/reloads at the required scope when changed
+ HITL resumes the exact reviewed artifact when applicable
+ duplicate/retry/recovery cannot repeat consequential effects
+ Stop cancels downstream work when promised
+ observability diagnoses failures without leaking secrets
+ exact-head CI is green
+ exact-main/post-merge runtime proof is green when required
```

Anything not applicable should be marked `N/A` with a reason rather than silently skipped.

## Current iPix executable evidence

Use/reuse before creating more tests:

- `tests/mastra-registry-contract.test.ts` — Planner/default registry, demo-agent exclusion, product-route resource handling, tool inventory/schema contracts;
- `tests/tool-001.test.ts` — deterministic planning bounds, malformed/nonfinite/duplicate/provenance cases;
- `tests/fixtures/planner-routing-evals.json` + `tests/planner-routing-eval-corpus.test.ts` — versioned routing corpus structure/completeness;
- existing CopilotKit route/thread/E2E tests for runtime, thread, tenant and streaming behavior;
- future real HITL workflow regression suite owned by `IPI-1084 · APPROVAL-001 — Let Operators Review, Edit, Approve, or Reject AI Plans Before Anything Is Saved` and `IPI-999 · MASTRA-WF-006 — Harden Long-Lived Workflow Recovery, Reconnect & Idempotency`;
- future external cancellation integration when a business-critical cancellable tool exists.

## Official research basis

Current Mastra guidance supports deterministic gates + scorers in normal test runners/CI, multi-turn evals, versioned datasets/experiments, and workflow snapshot/suspend-resume testing. Recent upstream history has included atomic resume-claim fixes, cold-process durable-resume failures, large HITL snapshot pressure, suspended-run memory leaks, stale resume payload issues, and shutdown/storage-order failures. Treat these as **failure classes to test**, not proof that the installed iPix version is affected.

Primary references:
- https://mastra.ai/blog/introducing-gates-and-verdicts
- https://mastra.ai/blog/introducing-multi-turn-evals
- https://mastra.ai/blog/introducing-datasets
- https://mastra.ai/blog/mastra-experiments
- https://github.com/mastra-ai/mastra/releases
- https://github.com/mastra-ai/mastra/issues/18031
- https://github.com/mastra-ai/mastra/issues/17284
- https://github.com/mastra-ai/mastra/issues/16051
- https://github.com/mastra-ai/mastra/issues/21193
