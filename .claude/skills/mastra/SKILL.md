---
name: mastra
description: "Mastra framework for iPixai: docs lookup, agents, workflows, tools, memory, streaming, PostgresStore, Studio/API, MCP, observability, evals, and Lumina→iPix adaptation. Use whenever editing src/mastra/**, pinning @mastra/* versions, changing agents/tools/workflows/memory/storage/HITL/abort/RequestContext/observability behavior, or verifying Mastra APIs. Always verify installed source/types first; use official Mastra MCP/docs for current concepts and migrations. In this repo use npm run dev:agent and npm run dev:ui separately — never combined npm run dev."
license: Apache-2.0
metadata:
  author: Mastra
  version: "2.2.0-ipix.6"
  basedOn: mastra-ai/skills 2.2.0 @ f79b794df9201b671b6602c6fc8ac0ad95478750 + iPix overlay
  repository: https://github.com/mastra-ai/skills
  title: Mastra framework guide
  impact: HIGH
  impactDescription: Agent/workflow/memory correctness, tenant safety, HITL, runtime reliability, privacy
  tags: mastra, agents, workflows, tools, memory, hitl, streaming, mcp, evals, request-context
  paths:
    - "src/mastra/**"
    - "docs/mastra/**"
    - "**/*mastra*"
---

# Mastra Framework Guide

## How to use this skill

This is the **one canonical Mastra skill for iPix**. Use it for implementation, debugging, upgrades, and PR review; do not create a second `mastra-review` skill that duplicates this guidance.

### Mode selection

- **Implement/debug:** inspect current iPix code and installed `@mastra/*` source/types, then load only the smallest relevant reference.
- **PR review:** review only changed Mastra behavior. Report material correctness, tenant/auth, persistence, HITL/resume, cancellation, idempotency, or package-compatibility regressions with concrete evidence and the cheapest decisive verification. Do not report style-only or speculative findings.
- **Upgrade/API claim:** compare the installed package family to current official Mastra guidance. Latest upstream examples never override pinned installed APIs without an intentional upgrade.

PR review preserves the same iPix safety boundaries as implementation: browser IDs are claims until server-authorized; consequential writes remain human-approved; durable workflows/memory cannot silently fall back to ephemeral state; resume/retry paths are idempotent; sensitive credentials stay out of model/memory/trace context; and CopilotKit/AG-UI compatibility is verified across the installed family.

Do not read every Mastra reference. Start here, classify the risk, then load the smallest owner set from [`references/README.md`](references/README.md).

```text
What am I changing?
→ implementation owner reference
→ testing-gates.md for required proof
→ user-journeys.md when operator-visible business flow changes
→ task-verifier for independent Done evidence
```

Ownership examples:

```text
tool implementation        → tools.md
workflow/HITL              → workflows.md
memory/persistence         → memory.md
Stop/abort                 → streaming.md
auth/RequestContext        → supabase-auth.md
model evals                → evals-feedback.md
pre/post-merge evidence    → testing-gates.md
end-to-end iPix business flow → user-journeys.md
observed failure diagnosis → common-errors.md
package upgrade            → migration-guide.md
```

One reference should not impersonate another: workflow docs explain HOW; testing gates define WHAT must pass; journey docs prove the operator outcome across systems.

## Core rule — verify exact installed behavior

Mastra evolves rapidly. APIs, constructor signatures, workflow semantics, memory behavior, processor contracts, and package-family compatibility change frequently.

For exact-version implementation questions use:

```text
current iPix code + live task owner
→ installed TypeScript types/source
→ embedded docs when that installed package actually ships them
→ this iPix Mastra skill/index
→ official Mastra MCP / current docs
→ official GitHub source/tag/issues when still ambiguous
```

Do not assume every installed `@mastra/*` package ships embedded docs. Do not let latest web examples override pinned installed APIs.

For dependency changes:

```text
record full installed Mastra/CopilotKit/AG-UI family
→ identify proven incompatibility or required feature
→ inspect migration/release guidance
→ choose one compatible target family
→ upgrade only required packages together
→ targeted type/runtime/memory/workflow/streaming regressions
```

Never use `npm update @mastra/core` or install `latest` as a generic troubleshooting step.

## Current iPixai wiring — as built

**Location:** `src/mastra/` in current iPixai. Old Lumina/iPix `app/src/mastra/` is reference material only.

Current shape must be re-checked on the task SHA:

```text
CopilotKit / AG-UI
→ current Next.js auth/session boundary
→ server-derived org + user identity/resourceId
→ Mastra local agents
→ default registry entry resolves to Production Planner
→ typed compute/read tools
→ Mastra Memory
→ shared PostgresStore
→ Supabase `mastra` schema
```

Rules:

- **Auth:** current product auth is the existing Next.js/CopilotKit server boundary. Do not add a second standalone Mastra auth architecture or browser-owned bearer-token authority without an explicit task.
- **Context:** browser org/brand/shoot/thread/run/page IDs are claims until server verified. `RequestContext` is request-scoped runtime metadata, not authorization.
- **Agent registry:** do not reintroduce weather/demo agents or duplicate aliases without a current caller requirement.
- **Storage:** hosted paths requiring durable Mastra state fail closed when approved Postgres config is unavailable. No silent in-memory/LibSQL durability claims.
- **Postgres:** reuse existing shared/process-scoped store/pool configuration; do not create a new pool/store per request unless a proven installed-runtime constraint requires it.
- **Model/provider:** use current V2 ownership; do not port Lumina Cloudflare `resolveAgentModel` because it existed historically.
- **Tools:** typed input/output schemas; consequential domain writes require server/domain authorization and approval boundaries.
- **Dev:** `npm run dev:agent` (`:4111`) and `npm run dev:ui` (`:3000`) separately — never combined `npm run dev`.
- **MCP:** pass `projectPath` only to tools whose schema requires it and use this repo root. Do not pass it to `mastraDocs`.

`docs/archive/mastra/10-mastra-convert.md` is historical migration research. Current AI runtime authority starts at `docs/copilotkit-mastra/README.md`.

## Lumina → iPix adaptation rule

Lumina is useful for **business invariants, deterministic logic, schemas, fixtures, and failure lessons**. It is not runtime authority.

Never classify an entire mixed Lumina Mastra file as one `PORT`/`DROP` unit. Follow `../tasks/references/migration-lumina.md` and classify each symbol/behavior independently.

Typical decisions:

```text
Planner business sequencing           → EXTRACT + REUSE
least-privilege tool selection         → REIMPLEMENT on current registry
pure compute logic + tests             → PORT / ADAPT after current-data verification
browser page-context trust model       → REIMPLEMENT with current server verification
workflow stage ordering                → REUSE invariant
suspend/resume transport               → REIMPLEMENT on installed current stack
Cloudflare model router                → DROP
DurableAgent/old Worker glue            → DROP unless current reproduced need
JWT/service key in tool/workflow data   → DROP
legacy direct DB write tools            → REIMPLEMENT at current domain/server boundary
```

Known Lumina traps that must become tests:
- `approved: false` must not suspend again as if no decision exists;
- approval binds to exact validated artifact/revision/hash;
- resume cannot silently recompute a materially different proposal;
- browser IDs/context are untrusted until server verified;
- credentials never enter workflow/suspend/memory/trace/model context;
- callback resume validates expected run + external job identity and rejects replay;
- provider failure fails closed and cannot surface stale prior output as fresh success.

## Mastra risk classes

At task start classify applicable concerns:

`agent registry/identity` · `model/provider` · `tool schema` · `tool authority` · `external side effect` · `RequestContext/tenant context` · `memory scope` · `persistent storage` · `streaming/Stop/abort` · `workflow` · `suspend/resume` · `HITL approval` · `MCP` · `observability/evals` · `package-family change`.

Tenant identity, memory ownership, consequential tools, approval/resume, callbacks, persistent storage, cancellation, authenticated MCP, sensitive RequestContext/observability fields, or package-family changes require Adversarial `task-verifier` coverage.

## Independent proof classes

| Proof class | What it proves |
| -- | -- |
| Registry/config | intended agent/model/tool/workflow is actually selected |
| Deterministic primitive | tool/step/schema logic works without model nondeterminism |
| Model behavior | natural language selects the right primitive/arguments |
| Authority/context | caller/org/context is server verified; foreign claims fail |
| Memory | correct thread/resource scope and no tenant bleed |
| Persistence/restart | required state survives a real new process/instance |
| HITL artifact | human approved exact immutable revision/hash |
| Resume/recovery | stale/duplicate/foreign/malformed resume cannot advance/duplicate |
| Streaming/abort | cancellation reaches downstream work, not only visible SSE |
| Side-effect idempotency | retry/double-resume/lost-response creates at most one effect |
| Observability/evals | diagnosable and reproducible without protected-data leakage |
| Exact runtime | exact deployed SHA performs the operator journey |

Invalid substitutions:

```text
tool unit test passes       ≠ model routing proof
model routes correctly      ≠ authorization proof
message persisted           ≠ restart recall proof
approved=true               ≠ exact artifact approval
stream ends                 ≠ downstream abort proof
single write succeeds       ≠ retry safety
trace exists                ≠ privacy-safe business evidence
higher eval score           ≠ comparable regression proof without versioned inputs
```

## Tools

Review material tools across four independent dimensions:

```text
schema correctness
+ business correctness
+ authority/context correctness
+ agent-selection correctness
```

Use current `createTool` source/types. Prefer both input and output schemas where supported. Current Mastra validates declared tool output schemas at runtime, but installed-version proof still wins.

For external/expensive tools, propagate `abortSignal` when the installed integration supports it. A forced `toolChoice` test may supplement deterministic coverage but cannot be the only natural-language routing proof.

## Memory

Keep separate:

```text
message history = conversation turns
working memory  = structured state at configured scope
resource/thread = identity/partition keys
authorization   = server/domain truth, never memory
```

Prove message history restart, working-memory scope, foreign-resource denial, and hosted durable storage independently.

Do not enable semantic recall or Observational Memory merely because upstream supports it; require a dedicated use case with quality, latency/cost, concurrency, restart, privacy and rollback proof.

## Workflows / HITL / snapshot discipline

Default consequential flow:

```text
AI proposal
→ canonical artifact/revision/hash
→ suspend + human review
→ server verifies approver/org/run/step/artifact
→ explicit approve/reject
→ resume exact revision/hash
→ revalidate current domain state
→ idempotent domain commit
→ record result/audit
```

Workflow snapshots are durable execution state, not blob storage. Keep them bounded: stable IDs, hashes, small typed state and minimal resume metadata. Keep raw crawl pages, large model/provider responses, full media payloads and duplicated domain records in their owning durable system and reference them by stable ID.

Large HITL payloads require realistic snapshot/storage/memory proof. Size optimization must never weaken exact-artifact approval provenance.

## Streaming / Stop

Where cancellation is required, prove:

```text
Stop
→ request/runtime AbortSignal
→ agent/workflow
→ tool/provider/MCP/external call where supported
→ no later protected side effect
→ stream closes cleanly
```

Upstream Mastra has fixed several abort-propagation gaps over time; do not assume current-main behavior exists in the pinned installed family.

## RequestContext / privacy

Mastra can propagate RequestContext through agents/tools/workflows and into tracing/datasets depending on configuration. Therefore:

- keep fields minimal and bounded;
- never include JWTs, auth headers, session cookies, service keys, provider secrets or passwords;
- avoid raw customer/brand records or large prompt/media payloads when IDs suffice;
- verify exporter/retention behavior before adding sensitive context;
- keep authorization checks at the server/domain boundary.

See [`references/supabase-auth.md`](references/supabase-auth.md).

## Observability / evals

Use traces/evals to diagnose and improve real business behavior, not to create decorative scores.

For comparative eval evidence record:

```text
exact git SHA
agent/config version
model/provider
Mastra family
dataset ID + version
scorer/rubric version
material runtime flags
```

Prefer deterministic tests for safety/authorization/idempotency. Build datasets from real iPix failure modes and inspect per-case failures/variance before promoting a scorer threshold to a hard CI gate.

## Quick topic routing

| Question | Primary reference |
|---|---|
| Full reference ownership/index | [`references/README.md`](references/README.md) |
| Current docs/MCP lookup | [`references/mcp-docs-lookup.md`](references/mcp-docs-lookup.md) |
| Tools | [`references/tools.md`](references/tools.md) |
| Workflows/HITL/snapshots | [`references/workflows.md`](references/workflows.md) |
| Memory/persistence | [`references/memory.md`](references/memory.md) |
| Streaming/abort | [`references/streaming.md`](references/streaming.md) |
| Auth/RequestContext | [`references/supabase-auth.md`](references/supabase-auth.md) |
| Evals/feedback/model quality | [`references/evals-feedback.md`](references/evals-feedback.md) |
| Pre-merge/post-merge tests + success criteria | [`references/testing-gates.md`](references/testing-gates.md) |
| End-to-end iPix Mastra user journeys | [`references/user-journeys.md`](references/user-journeys.md) |
| Failure diagnosis | [`references/common-errors.md`](references/common-errors.md) |
| Mastra version migration | [`references/migration-guide.md`](references/migration-guide.md) |
| Advanced trace selection | [`references/trace-query.md`](references/trace-query.md) |
| Lumina migration | `../tasks/references/migration-lumina.md` |

## Mastra docs MCP / Studio / CLI

Use installed source/types for exact pinned APIs and official Mastra MCP/docs for current concepts/migrations. An empty embedded-doc search does not prove an API is absent.

Use repository-owned dev commands and local CLI only:

```bash
npm run dev:agent
npm run dev:ui
npx --no-install mastra --version
npx --no-install mastra api --help
```

Never use a bare `npx mastra` that can fetch a newer package unexpectedly, and do not overwrite this iPix overlay with upstream skills wholesale.
