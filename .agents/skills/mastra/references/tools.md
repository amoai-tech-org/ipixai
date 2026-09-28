---
title: Mastra tools — iPix authority and routing contract
description: Load when defining createTool, tool schemas, agent tool lists, external side effects, or natural-language tool routing.
parent: mastra
impact: HIGH
impactDescription: Prevents schema, authority, provenance, routing, and excessive-agency failures
tags: mastra, tools, zod, authority, routing
---

# Mastra tools — iPix contract

## Use tools for deterministic capabilities

Use a tool when the agent needs typed, deterministic access to data, code, or an external capability. Keep the agent's tool set least-privilege: exposing a tool is granting a capability, not merely improving convenience.

## Verify the installed execute signature

Mastra evolves quickly. Inspect installed `@mastra/core` source/types before copying web examples. Current Mastra tool docs use an execution shape equivalent to validated input plus an execution context that can include request context, tracing context, abort signal, suspend/resume data, and related runtime values.

Do not mechanically rewrite current iPix code to match the latest docs when the pinned installed family differs.

## Every production tool needs four independent proofs

### 1. Schema correctness

Prove:
- input schema validates required/optional fields;
- numbers are finite and bounded;
- arrays/text are bounded where material;
- enums come from current domain truth;
- output schema reflects the contract consumers use;
- malformed/hostile inputs fail safely.

### 2. Business correctness

A schema-valid result can still be wrong.

Verify current iPix truth for:
- channel/format values;
- rates/pricing assumptions;
- reference IDs/provenance;
- duplicate handling;
- coverage rules;
- rounding/currency;
- current database/reference-table values.

Lumina constants and fixtures are regression references, not authority.

### 3. Authority correctness

Prompt instructions are not authorization.

For tools that read or write tenant data:
- derive authenticated actor and org/resource server-side;
- verify browser/page context IDs before use;
- do not accept user/org authority from model-visible tool arguments;
- never accept JWT/service-role/provider credentials as ordinary model tool input;
- consequential writes must remain behind the current domain authorization/HITL boundary.

### 4. Agent-selection correctness

A passing direct `tool.execute()` does not prove the model will use the tool correctly.

Test natural-language behavior independently:
- should call;
- should not call;
- plausible wrong tool;
- missing required input;
- ambiguous intent;
- malformed/adversarial request.

Forced `toolChoice` can test transport/tool execution but cannot be the only routing proof.

## Tool descriptions are routing controls, not security controls

Descriptions and schemas should clearly say what the tool does and when it is appropriate. They help model selection. They do not prevent an unauthorized or stale call from executing.

## Request/page context

Browser-supplied `brand_id`, `shoot_id`, active page IDs, route context, or AG-UI context are claims. Resolve/verify them server-side before returning `verified: true` context to the model or using them in a tool.

No consequential tool should act on an unverified identifier merely because the page supplied it.

## Abort and timeout

External-call tools should:
- consume the runtime abort signal when available in the installed API;
- pass it to `fetch`/SDK calls where supported;
- use bounded timeouts;
- distinguish cancellation from provider failure where behavior differs;
- prove no protected side effect occurs after successful cancellation.

See `streaming.md` for the full Stop chain.

## Consequential write tools

Default iPix rule:

```text
AI proposes
→ operator reviews exact artifact
→ explicit approval binds artifact/revision/hash
→ server revalidates actor/org/artifact
→ idempotent domain service/RPC executes
→ result/audit recorded
```

Do not copy Lumina patterns where a tool itself accepts an access token, interprets prompt/schema wording as approval, or writes from a browser-authoritative payload.

## Tool result shaping

When supported by the installed version:
- use `toModelOutput` to keep model context small while preserving full application output;
- use safe transforms/redaction for browser/transcript payloads;
- never expose secrets or oversized raw provider payloads to model/UI just because the tool returned them.

## Provenance

When outputs depend on trusted references, include stable provenance sufficient for downstream verification. Do not allow the model to invent reference IDs, source labels, approval state, or durable object identity.

## Agent/tool inventory gate

For every agent change, verify the actual registered tool inventory. A tool removed from instructions but still registered remains available to the model.

For Production Planner specifically, keep the tool surface narrower than booking/CRM/publishing/payment capabilities unless a task explicitly changes authority.

## Direct test vs agent test

```text
pure tool test
→ proves deterministic implementation

agent turn with natural language
→ proves model selection/arguments

authorized integration test
→ proves tenant/authority boundary

HITL/idempotency test
→ proves consequential-write safety
```

Do not substitute one for another.

## Source priority

```text
current iPix tool + domain truth
→ installed @mastra/core source/types
→ embedded docs when present
→ current Mastra docs/MCP
→ migration notes/releases/issues when version behavior matters
```

Useful current docs:
- https://mastra.ai/docs/agents/tools
- https://mastra.ai/reference/tools/create-tool
- https://mastra.ai/docs/server/request-context
- https://mastra.ai/docs/agents/agent-approval
- https://mastra.ai/docs/streaming/tool-streaming
