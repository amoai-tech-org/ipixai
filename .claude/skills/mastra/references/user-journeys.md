---
title: Mastra user journeys — iPix end-to-end verification
description: Load when a Mastra change affects a real operator journey across frontend, CopilotKit/AG-UI, agents, tools/workflows, backend services, Supabase, or human approval.
parent: mastra
impact: HIGH
impactDescription: Prevents certifying isolated agent tests while the real iPix business journey is broken
keywords: mastra, journeys, frontend, backend, copilotkit, ag-ui, workflows, hitl, planner, brand intelligence
---

# Mastra user journeys — iPix

A Mastra feature is not production-ready because an agent answers or a tool unit test passes. Verify the real operator outcome across every layer the journey touches.

## Contents

- [Core journey model](#core-journey-model)
- [J1 — Production Planner chat → real planning tool → visible result → reload](#j1-production-planner-chat-real-planning-tool-visible-result-reload)
- [J2 — Planner missing/ambiguous input → ask instead of invent](#j2-planner-missingambiguous-input-ask-instead-of-invent)
- [J3 — Same-org continuity + cross-org denial](#j3-same-org-continuity-cross-org-denial)
- [J4 — Structured shoot plan → operator review/edit → exact approval → single save](#j4-structured-shoot-plan-operator-reviewedit-exact-approval-single-save)
- [J5 — Brand URL → evidence → draft Brand DNA → review → atomic promotion](#j5-brand-url-evidence-draft-brand-dna-review-atomic-promotion)
- [J6 — Approved assets → campaign content/publishing](#j6-approved-assets-campaign-contentpublishing)

---

## Core journey model

```text
Operator
→ iPix frontend
→ CopilotKit / AG-UI
→ authenticated /api/copilotkit boundary
→ server-derived org/resource context
→ Mastra Production Planner / workflow
→ deterministic tools / external providers
→ approval / suspend-resume when consequential
→ domain backend / Supabase / Cloudinary owner
→ durable state
→ frontend reflects the committed outcome
```

For every affected journey prove both:

1. **system correctness** — UI, auth, tenant, protocol, backend, persistence, recovery;
2. **AI correctness** — relevant response, correct tool choice/arguments, no invented facts, no excessive agency, HITL obeyed.

A green Playwright test without AI/runtime proof is incomplete. A green Mastra tool test without the real frontend/backend journey is also incomplete.

---

# Journey review template

For each task fill this table before implementation and again before Done:

| Layer | Question | Evidence |
| --- | --- | --- |
| Actor | Who is acting and in which org/role? | fixture/account + org |
| Frontend | Can the operator start/continue the journey from the real route? | Playwright/user-visible assertion |
| CopilotKit/AG-UI | Does the correct thread/agent/event path run? | route/runtime events |
| Auth/context | Are org/resource/brand/shoot/thread IDs server verified? | route/auth negative test |
| Mastra agent | Is the intended agent active with the intended model/tools? | registry contract |
| Tool/workflow | Did the correct primitive run with validated inputs? | deterministic test/tool trace |
| AI behavior | Did natural language choose the right action or ask for missing input? | versioned routing/eval case |
| HITL | Did consequential action wait for exact human approval? | artifact/revision/hash proof |
| Backend/domain | Did the owning server/RPC enforce the write? | integration/RPC test |
| Durable state | Was exactly the intended state persisted once? | DB/readback/idempotency evidence |
| UI result | Does the frontend show the durable outcome after refresh/navigation? | Playwright reload/readback |
| Recovery | What happens on retry, provider failure, disconnect, stale state? | targeted failure test |
| Tenant safety | Can Org B access/influence Org A state? | negative Org A/Org B proof |

---

# Current executable journeys

## J1 — Production Planner chat → real planning tool → visible result → reload

**Current status:** executable now.

Current path (IPI-1225 · PLANNER-ROUTE-RETIRE-001 retired `/planner` to a
compatibility redirect — `/app` is the single production Planner surface and
has no "New thread" control, so it restores the resource's persisted thread
rather than guaranteeing a fresh one):

```text
Operator logs in
→ /app
→ resolved thread (fresh or restored — /app has no "New" control)
→ prompt asks for a budget / planning action
→ CopilotKit sends request to /api/copilotkit
→ server derives authenticated resourceId
→ Mastra default = productionPlannerAgent
→ Planner naturally selects a planning tool
→ tool returns typed result
→ assistant renders result
→ thread persists
→ browser reload
→ same conversation is restored
```

Required proof:

- [ ] signed-in operator reaches `/app`;
- [ ] the resolved thread id is unique to this resource, whether fresh or restored;
- [ ] authenticated product route uses server-derived resource ID;
- [ ] canonical `production-planner` is active; no weather/demo agent;
- [ ] expected tool is available and schema-valid;
- [ ] natural-language prompt produces the expected call/clarification behavior when routing changed;
- [ ] response is user-visible and structurally consistent with the tool result;
- [ ] reload restores this run's thread, not stale shared QA state;
- [ ] no durable production-domain write occurs from compute-only planning tools;
- [ ] provider failure is distinguished from deterministic code failure.

Current repository evidence to reuse:

- `tests/mastra-registry-contract.test.ts`;
- `tests/tool-001.test.ts`;
- `tests/fixtures/planner-routing-evals.json`;
- `tests/planner-routing-eval-corpus.test.ts`;
- `e2e/planner-journey.spec.ts`.

**Success:** operator sees the expected planning result, the correct Planner/tool path ran, and the same isolated conversation survives reload without unauthorized writes.

## J2 — Planner missing/ambiguous input → ask instead of invent

**Current status:** executable now at deterministic/routing level; browser/live-model proof only when routing behavior changes.

```text
Operator gives incomplete or ambiguous request
→ Planner evaluates available context
→ correct tool is not forced with fabricated arguments
→ Planner asks for missing consequential input OR tool returns typed needs_input
→ UI shows clarification
→ no downstream write/approval claim
```

Required cases:

- ambiguous shoot type;
- missing crew/studio/shot inputs for budget;
- plausible wrong tool available;
- fake approval statement in prompt;
- user supplies untrusted reference angle/details.

**Success:** no invented production fact, no fake approval, no protected write, and the next required operator input is explicit.

## J3 — Same-org continuity + cross-org denial

**Current status:** partially executable now; use existing thread/tenant tests and restart owner tasks.

```text
Org A creates Planner thread
→ refresh/navigation/process restart when required
→ Org A can continue
→ Org B attempts same thread/resource
→ denied before Mastra memory/domain state is exposed
```

Required proof:

- same authorized resource works;
- foreign org/resource fails closed;
- resource/thread ID possession alone is not authorization;
- memory/RequestContext are not treated as authority;
- if persistence changed, fresh-process proof uses a unique nonce.

**Success:** continuity works only for the authorized tenant and foreign access cannot read, resume, or influence state.

---

# Journeys that activate when current V2 workflows land

Do not create fake E2E tests before the real path exists. Add these when their owner task introduces the corresponding runtime.

## J4 — Structured shoot plan → operator review/edit → exact approval → single save

**Activation owners:**
- `IPI-1081 · PLAN-001 — Make the Planner Return a Complete Structured Shoot Plan`
- `IPI-1084 · APPROVAL-001 — Let Operators Review, Edit, Approve, or Reject AI Plans Before Anything Is Saved`
- `IPI-1083 · SHOOT-SAVE-001 — Save an Approved Shoot Once and Under the Correct Organization`
- `IPI-999 · MASTRA-WF-006 — Harden Long-Lived Workflow Recovery, Reconnect & Idempotency`

Target journey:

```text
Brand/campaign context
→ Planner tools produce structured ShootPlan
→ frontend renders exact revision
→ operator edits
→ mutation creates new revision/hash
→ workflow suspends for review
→ operator approves exact artifact
→ validated resume for exact run/step/tenant
→ server reloads approved artifact
→ idempotent domain RPC commits once
→ UI shows saved Shoot
→ refresh reads durable saved state
```

Mandatory negative/recovery cases:

- reject is terminal/revision path, not another suspend;
- close/disconnect/expiry is not approval;
- stale revision/hash rejected;
- wrong run/step/tenant rejected;
- duplicate resume causes no duplicate save;
- concurrent approve/reject yields one terminal result;
- code/rate change after suspend cannot alter approved artifact;
- write success + response loss does not write twice;
- provider failure after approval cannot convert stale output into success.

**Success:** displayed hash = approved hash = committed hash, exactly one authorized Shoot is saved, and the UI reflects that durable state.

## J5 — Brand URL → evidence → draft Brand DNA → review → atomic promotion

**Activation owner:** `IPI-1093 · BRAND-INTEL-001 — Turn a Brand Website Into an Approved Brand DNA Profile`.

Target journey:

```text
Operator enters Brand URL
→ authenticated server starts Brand Intelligence workflow
→ external crawl/job ID is bound to this run
→ evidence collected and bounded
→ model produces validated structured draft
→ draft persisted before approval
→ frontend shows evidence + exact draft revision
→ operator approves/rejects
→ exact approved draft promoted atomically
→ Brand Brain reads approved profile
```

Mandatory negatives:

- provider/crawl/model failure fails closed;
- callback with wrong/replayed crawl/job ID denied;
- JWT/service/provider secret absent from workflow/snapshot/model-visible state;
- stale prior draft cannot be promoted after a failed run;
- cross-org Brand IDs denied;
- rejection/discard is idempotent;
- duplicate promotion cannot create duplicate current profiles.

**Success:** approved Brand Brain is traceable to the exact reviewed draft/evidence, with no secret leakage or callback replay path.

## J6 — Approved assets → campaign content/publishing

**Activation:** only when a current Mastra agent/workflow is allowed to participate in publishing preparation or approval. External publishing remains owned by the publishing/domain system.

Target principle:

```text
approved assets
→ AI proposes content/publish plan
→ operator reviews exact proposal
→ approval required
→ domain publishing integration executes
→ provider result reconciled with iPix state
```

Mandatory rule: Mastra never turns a chat statement into autonomous publish authority. Publishing failures/retries must be provider-idempotent and auditable.

---

# Frontend journey checks

For Mastra-related user-facing changes verify when applicable:

- [ ] real route loads authenticated state;
- [ ] loading/empty/error/retry states are understandable;
- [ ] tool/workflow progress is represented without inventing completion;
- [ ] interruption/approval UI shows exactly what is being reviewed;
- [ ] rejection/revision/cancel states are distinct;
- [ ] reconnect/reload does not duplicate messages/actions;
- [ ] browser back/refresh does not lose the intended durable state;
- [ ] mobile ~390px preserves critical review/approval controls;
- [ ] error text does not leak secrets/provider internals.

# Backend/runtime journey checks

- [ ] auth/session resolved before Mastra authority-sensitive execution;
- [ ] org/resource/brand/shoot/thread/run IDs revalidated server-side;
- [ ] intended agent/tool/workflow is active on the exact SHA;
- [ ] tool schemas reject malformed/oversized/nonfinite values;
- [ ] compute tools cannot write;
- [ ] consequential writes happen only at the domain boundary after approval;
- [ ] durable write is idempotent against retries/response loss;
- [ ] provider callbacks bind to expected run/job IDs;
- [ ] workflow snapshots remain bounded and secret-free;
- [ ] logs/traces are sufficient to identify run/tool/outcome without leaking protected data.

# AI behavior checks

For each critical journey include cases for:

- should call expected tool;
- should not call any tool;
- ambiguous intent;
- missing required information;
- plausible but wrong tool;
- prompt attempting to bypass approval;
- unsupported fact/reference injection;
- operator correction on a later turn;
- provider/tool failure;
- stale previous result in thread history.

Hard authorization, approval, schema, idempotency and tenant guarantees must remain deterministic checks, not soft LLM scorer averages.

# Journey failure triage

When a journey fails, classify the first broken boundary:

```text
frontend state/navigation
CopilotKit / AG-UI transport
server auth/context
Mastra registry/model
natural-language routing
Tool schema/business logic
workflow/HITL resume
external provider
backend/domain write
Supabase/RLS/persistence
durable replay/reconnect
observability/test oracle
```

Fix the first broken authoritative boundary. Do not compensate by broadening agent authority, trusting browser IDs, retrying consequential writes blindly, or weakening assertions.

# Pre-merge journey success rule

For each affected critical journey:

```text
all deterministic layer contracts green
+ required natural-language behavior green
+ frontend happy/negative path proven
+ tenant/approval boundaries proven
+ durable state/readback proven when writes exist
+ retry/recovery path proven when material
+ exact-head CI green
```

Mark not-yet-existing workflow layers `N/A — owner task not landed`, not PASS.

# Post-merge journey certification

After merge, run the smallest production/preview-safe journey that proves the changed risk on exact main. Record:

- merge SHA;
- environment;
- actor/org fixture;
- thread/run/artifact IDs where relevant;
- expected agent/tool/workflow;
- visible operator outcome;
- durable state/readback when applicable;
- negative/tenant result when risk changed;
- relevant logs/trace IDs;
- rollback/containment trigger for runtime-affecting changes.

Only call the journey certified when frontend result, Mastra/runtime evidence and backend durable state agree.
