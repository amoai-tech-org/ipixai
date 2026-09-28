---
title: Mastra streaming — iPix Stop and abort contract
description: Load when debugging AG-UI/CopilotKit streaming, Stop/cancel behavior, tool streaming, or downstream cancellation.
parent: mastra
impact: HIGH
impactDescription: Prevents false-green Stop behavior where UI closes but work or writes continue
tags: mastra, streaming, abort, stop, sse, ag-ui
---

# Mastra streaming — iPix Stop and abort contract

## Current iPix path

CopilotKit + AG-UI bridge Mastra in-process through the current `/api/copilotkit` route and registered local agents. Verify the exact current route and installed `@ag-ui/mastra` / CopilotKit family before relying on examples.

## Stop is an end-to-end contract

A closed SSE stream or responsive Stop button is not enough.

Required chain:

```text
operator presses Stop
→ request AbortSignal is triggered
→ agent/workflow execution observes cancellation
→ tool execution receives/observes abortSignal
→ downstream fetch/SDK/provider operation is cancelled where supported
→ no later tool result or domain side effect lands
→ stream closes
→ UI reaches a recoverable state
```

If any link is missing, Stop is only cosmetic.

## Tool rule

For tools that call external services:
- use the execution-context abort signal when the installed API provides it;
- pass it into `fetch`/SDK calls where supported;
- define an explicit timeout separately from user cancellation;
- ensure cancellation does not fall through into success handling;
- never commit a consequential write after cancellation unless the commit already happened atomically and retry logic can prove the final state.

## Nested execution

Do not assume AbortSignal propagation through subagents, nested workflows, networks, or adapters. Mastra has had upstream bugs/features in this area. Inspect the exact installed path and prove cancellation behavior when nested execution is used.

If nested cancellation cannot be proven, do not place consequential work behind a UI Stop affordance that implies cancellation.

## Required tests

For any Stop-sensitive path verify:
- Stop before model output;
- Stop during model generation;
- Stop before tool call;
- Stop while external tool call is in flight;
- Stop after tool result but before next model step;
- Stop while a workflow/subworkflow is active when applicable;
- provider ignores/does not support cancellation;
- network disconnect without explicit Stop;
- retry/reconnect after cancellation;
- zero later protected write after successful cancellation.

Use a side-effect sentinel or durable row count when cancellation protects writes. UI timing alone is insufficient.

## Stream recovery

Cancellation/interruption must leave a known state:
- completed;
- cancelled;
- failed/retryable;
- suspended/awaiting review;
- already committed.

Do not automatically replay a partially completed consequential operation with a fresh idempotency identity.

## HITL interaction

A suspended approval workflow is not the same as an actively streaming model call. Stop/close/disconnect while awaiting approval must fail closed and must never synthesize approval. Recovery must reload the correct suspended run/artifact when supported.

## Verification order

```text
static abort propagation path
→ pure abort/cancel unit test
→ external-call cancellation integration test
→ no-late-side-effect proof
→ nested execution proof when applicable
→ UI Stop/browser proof
→ exact deployed runtime proof
```

## Source priority

```text
current iPix route/tool/workflow
→ installed @mastra/core + @ag-ui/mastra source/types
→ current Mastra streaming docs/MCP
→ current upstream issues/releases when propagation is uncertain
```

Useful current docs:
- https://mastra.ai/docs/streaming/overview
- https://mastra.ai/docs/streaming/events
- https://mastra.ai/docs/streaming/tool-streaming
- https://mastra.ai/docs/streaming/workflow-streaming
- https://mastra.ai/reference/streaming/agents/stream
