---
title: Mastra troubleshooting
description: Load when Mastra runtime, agent, tool, memory, workflow, or streaming behavior is wrong or unexpectedly green.
parent: mastra
impact: HIGH
impactDescription: iPix-specific failure patterns and version-safe debugging order
tags: mastra, errors, debugging, hitl, memory, streaming
---

# Mastra troubleshooting — iPix failure-first guide

## Start here

Do not guess from training data or generic examples.

```text
reproduce the exact failure
→ identify the proof class that failed
→ inspect current iPix path
→ inspect installed package source/types
→ use embedded docs when present
→ use current remote Mastra docs/MCP for concepts
→ use migration/release notes only when versions changed
→ make the smallest correction
→ rerun the cheapest decisive proof
```

For iPix development use `npm run dev:agent` and `npm run dev:ui` separately. **Never use combined `npm run dev` as the default troubleshooting command.**

## Package-family rule

Never fix a Mastra error with `npm update @mastra/core` alone.

When dependency behavior may be involved:

1. Record the exact installed `@mastra/*`, `mastra`, `@ag-ui/mastra`, and CopilotKit versions from `package.json` + lockfile.
2. Inspect installed source/types for the failing API.
3. Check `mastraMigration` / official migration notes for the version transition.
4. Change the **smallest compatible package family**, not one arbitrary package.
5. Typecheck and run the affected runtime contract before broad tests.

## High-value iPix failure patterns

### Agent/registry drift

Symptoms: wrong agent appears, `default` resolves unexpectedly, tests import a concrete agent while runtime uses registry lookup.

Proof:
- inspect the canonical registry and `Mastra` registration;
- prove both expected registry key and agent `id`;
- search for direct imports that bypass the registry;
- run the real route/runtime lookup, not only unit construction.

### Tool unit test passes but Planner still behaves wrongly

A passing `tool.execute()` proves the deterministic primitive only. It does **not** prove natural-language selection.

Test independently:
- should call;
- should not call;
- plausible wrong tool;
- missing/ambiguous input;
- malformed/hostile input.

Do not use forced `toolChoice` as the only routing proof.

### Tool/schema is plausible but business-wrong

Check current iPix domain truth before trusting constants copied from Lumina or examples. Validate bounded finite numbers, enum/domain values, duplicate prevention, provenance/reference coverage, and output schemas.

### Browser page context is trusted as authority

`org_id`, `brand_id`, `shoot_id`, active page IDs, and similar browser context are claims. Verify them server-side against the authenticated actor/org before allowing model/tool use. Strip or reject unverified identifiers.

### Memory appears persistent but test is contaminated

A shared QA thread can already contain the expected answer.

Use:
- a fresh thread;
- a unique nonce unknown before process A writes it;
- process A exits;
- process B reloads the same owned thread/resource and recalls the nonce;
- wrong resource/org is denied.

Message history, working memory, and authorization are separate proof classes.

### Hosted runtime silently falls back to ephemeral storage

Hosted iPix must fail closed when durable Mastra Postgres configuration is required. Do not treat process-local LibSQL/in-memory success as hosted persistence proof. Reuse the process-wide store/pool; do not create a new Postgres pool/store per request.

### HITL reject loops back into suspension

Never use `if (!resumeData?.approved)` to distinguish first execution from rejection. Use a discriminated result such as `approved | rejected | revision_requested | cancelled | expired`.

### Operator approves one artifact but another executes

Approval must bind to an immutable artifact identity/revision/canonical hash and exact validated snapshot. A code/config/rate change or recomputation after resume must not silently alter the approved proposal. Mutation requires a new revision and new approval.

### Duplicate/stale/foreign resume repeats work

For long-lived workflows test duplicate and concurrent resume, wrong run, wrong step, wrong tenant, stale revision, malformed resume, callback replay, process restart, and failure after commit before response. Consequential effects require domain-level idempotency/uniqueness.

### Provider failure becomes a false success

A provider timeout, DNS/network failure, non-2xx, contract mismatch, or partial result must not fall through to a stale prior draft or `ready` state. Fail closed and preserve bounded diagnostic context.

### Stop closes the stream but work continues

UI/SSE closure is not cancellation proof. Trace the chain:

```text
operator Stop
→ request AbortSignal
→ agent/workflow execution
→ tool execution context abortSignal
→ downstream fetch/SDK cancellation
→ no later tool result/write
→ stream closes/recoverable UI state
```

Mastra has had upstream abort-propagation gaps across nested execution paths, so prove the exact installed path rather than assuming cancellation propagates. See current source/issues when nested workflows/subagents are involved.

### Secrets enter workflow or model state

Never place JWTs, service-role keys, provider credentials, sensitive headers, or equivalent secrets in model-visible tool arguments, workflow input, suspend/resume payloads, working memory, snapshots, transcript payloads, or traces. Derive identity/privileged clients server-side.

## Debugging evidence order

Prefer:

1. exact runtime symptom and current SHA;
2. targeted deterministic test;
3. installed source/types;
4. registry/context/storage inspection;
5. targeted integration/restart/resume/abort proof;
6. current official Mastra docs/MCP;
7. upstream issues/releases only when needed;
8. browser/live proof only when the actual journey requires it.

Studio is useful for inspection, not authority. A successful Studio turn does not replace tenant, persistence, HITL, abort, or exact deployed-runtime proof.
