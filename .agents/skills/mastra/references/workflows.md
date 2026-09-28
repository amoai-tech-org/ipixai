---
title: Mastra workflows — iPix suspend/resume contract
description: Load when building or verifying Mastra workflows, suspend/resume, durable snapshots, callbacks, or human approval.
parent: mastra
impact: HIGH
impactDescription: Prevents stale approval, replay, duplicate effects, oversized snapshots, and custom workflow infrastructure
tags: mastra, workflows, suspend, resume, hitl, snapshots, idempotency
---

# Mastra workflows — iPix contract

## When to use a workflow

Use a Mastra workflow when the execution order is known and explicit. Use agents for open-ended reasoning and tools/code for deterministic operations.

Do not create a generic workflow framework before current iPix workflows prove repeated conventions worth extracting. `IPI-994 · MASTRA-WF-001 — Establish Reusable iPix Workflow Foundation` remains deferred until that gate is met.

## Native primitives first

Prefer current installed Mastra primitives directly:
- `createWorkflow` / `createStep`;
- native control flow such as `.then()`, `.branch()`, `.parallel()`;
- step `suspend()`;
- typed suspend/resume schemas supported by the installed version;
- persisted workflow snapshots through configured storage;
- run resume/recovery APIs supported by the installed version.

Do not build a custom workflow runner, browser-owned workflow truth, generic status database, Temporal/DurableAgent layer, or second approval framework unless a current proven gap requires it.

## Snapshot discipline

A workflow snapshot is durable execution state, not a convenient blob store.

Store the minimum resumable state:

```text
stable artifact/reference IDs
small typed state
revision/hash/status
external job/run identity
bounded error metadata
```

Avoid copying large Brand profiles, image/video payloads, raw crawl pages, model transcripts, binary/media data, entire provider responses, or duplicated domain records into workflow state/suspend payloads. Store durable domain/media data in its owning system and keep stable references in the snapshot.

Why this matters: snapshots are persisted and loaded during suspend/resume, and large approval payloads can increase database, serialization, memory, and recovery cost. Upstream reports have also shown memory pressure around repeated approval state with large payloads, so large-payload approval must be explicitly tested before production use.

For a large reviewed artifact, prefer:

```text
artifact_id + revision + canonical_hash + minimal display metadata
→ server reloads exact immutable artifact from trusted durable storage when needed
```

Do not trade immutability for snapshot size: the approved hash/revision must still bind to the exact content reviewed.

## CopilotKit bridge choice for HITL — installed adapter truth

Verified 2026-09-28 against installed `@ag-ui/mastra 1.1.4` and CopilotKit React `1.73.3`:

- Mastra **tool** `suspend()` can surface through the adapter as `tool-call-suspended`; the bridge emits a structured AG-UI interrupt and resumes with `resumeStream(... resumeData ...)`. Use CopilotKit `useInterrupt` when the backend contract is this native Mastra suspend checkpoint.
- Use CopilotKit `useHumanInTheLoop` when the contract is a frontend interactive tool whose call waits for the user's response. It is not a replacement for durable workflow state.
- Durable business workflows still own their state with Mastra suspend/resume + persisted workflow snapshots. Do not assume a workflow-step suspension is automatically bridged through the agent-tool interrupt path; verify the exact installed path before wiring UI.

For either UI mechanism, the browser response is a decision payload, **not authorization**. Before a consequential continuation, the server revalidates the authenticated actor, tenant, run/step, exact artifact revision/hash, and current domain state, then executes an idempotent authorized action.

Current upstream proofs for the native tool-suspend bridge:

- https://github.com/CopilotKit/CopilotKit/blob/c14e2270f2dc2b63589d0e84110ef174b2853f91/showcase/integrations/mastra/src/mastra/tools/interrupt.ts
- https://github.com/CopilotKit/CopilotKit/blob/c14e2270f2dc2b63589d0e84110ef174b2853f91/showcase/integrations/mastra/src/app/demos/gen-ui-interrupt/page.tsx
- https://docs.copilotkit.ai/reference/v2/hooks/useInterrupt
- https://docs.copilotkit.ai/reference/v2/hooks/useHumanInTheLoop

CopilotKit currently also serves an older Mastra page claiming native interrupts are unsupported. For this installed iPix family, installed adapter source/types and the maintained upstream example above are the compatibility authority. Reverify after any `@ag-ui/mastra` or CopilotKit upgrade.

## iPix HITL state model

Never represent mandatory review as a boolean truthiness shortcut.

Use an explicit discriminated state, for example:

```text
awaiting_review
approved
rejected
revision_requested
cancelled
expired
```

`approved: false` must not be indistinguishable from "not resumed yet".

## Approval must bind to the exact artifact

For consequential continuation, record and validate the reviewed proposal identity:

```text
artifact_id
revision
canonical_hash
actor
org/resource ownership
workflow run
suspended step / resume target
approval timestamp
```

The exact validated snapshot may live in the owning durable domain store rather than being duplicated wholesale into the workflow snapshot.

Invariant:

```text
artifact rendered for review
=
artifact explicitly approved
=
artifact allowed to continue to the domain commit
```

Any material edit, recomputation, changed trusted reference, changed budget, changed deliverable set, changed rate/config input, or regenerated proposal creates a new revision/hash and requires new approval.

Do not silently recompute a materially different proposal after resume.

## Authorization is outside the prompt

Before resume or callback continuation:
- derive the authenticated actor server-side;
- derive the trusted organization/resource server-side;
- verify ownership of the run/artifact/domain object;
- verify the expected suspended step/resume target;
- validate typed resume data.

Browser-supplied run IDs, org IDs, brand IDs, shoot IDs, artifact IDs, and page context are claims until verified.

## Callback/webhook resume

External async continuation must bind both sides:

```text
expected workflow run
+
expected external job/crawl/provider operation ID
```

Reject mismatched, stale, duplicate, forged, or already-consumed callbacks. Authenticate provider callbacks where supported. Never let a callback bypass human review to write approved domain truth.

## Side-effect rule

Workflow snapshot persistence does not provide exactly-once business effects by itself.

Every consequential write must have a domain-level uniqueness/idempotency invariant. Test:
- duplicate resume;
- concurrent resume;
- approve vs reject race;
- failure before commit;
- failure after commit but before response;
- process restart before resume;
- retry after response loss.

The safe result after a post-commit response loss is: retry observes the already-committed state and does not repeat the write.

## Fail-closed provider behavior

Provider/model/network failure must not advance the workflow with stale or partial prior data unless the product contract explicitly allows a clearly marked degraded result.

Bound/redact upstream error text before persisting it into workflow state or logs.

## Secrets and sensitive data

Do not persist JWTs, service-role keys, provider credentials, sensitive headers, session cookies, or equivalent secrets in workflow input, suspend/resume data, snapshots, working memory, model-visible state, or tracing payloads. Derive privileged capability at the server boundary.

RequestContext and tracing may persist request-scoped metadata depending on configuration. Keep workflow/request metadata minimal and avoid raw customer/brand payloads unless the task explicitly proves the retention/export policy is safe.

## Required adversarial matrix for consequential workflows

At minimum verify:
- approve;
- reject;
- revision requested;
- close/cancel/timeout/disconnect;
- malformed resume;
- stale artifact revision;
- wrong run;
- wrong step;
- wrong tenant/resource;
- duplicate resume;
- concurrent resume;
- process restart while suspended;
- external callback replay/mismatch;
- provider failure after approval;
- commit succeeds but response is lost;
- no secret in persisted workflow state;
- snapshot remains bounded for realistic production payloads;
- exact approved artifact reaches the commit boundary.

## Proof order

```text
static workflow/side-effect inventory
→ pure schema/step tests
→ suspend/resume contract test
→ authorization/tenant negatives
→ duplicate/concurrency/idempotency
→ realistic snapshot-size/payload check
→ real storage close/reopen
→ provider/callback failure paths
→ typecheck/build
→ real operator HITL/browser proof only when required
→ exact deployed runtime proof
```

## Source priority

```text
current iPix workflow + task owner
→ installed @mastra/core source/types
→ embedded docs
→ current Mastra docs/MCP
→ migration notes/releases/issues for version-specific behavior
```

Current docs:
- https://mastra.ai/docs/workflows/overview
- https://mastra.ai/docs/workflows/control-flow
- https://mastra.ai/docs/workflows/snapshots
- https://mastra.ai/docs/workflows/suspend-and-resume
- https://mastra.ai/docs/workflows/error-handling
