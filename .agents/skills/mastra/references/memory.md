---
title: Mastra memory — iPix proof model
description: Load when configuring or verifying Mastra message history, working memory, resource/thread scope, or durable storage.
parent: mastra
impact: HIGH
impactDescription: Separates message history, working memory, tenant ownership, and hosted persistence proof
tags: mastra, memory, working-memory, persistence, tenant
---

# Mastra memory — iPix proof model

## Current iPix rule

Current iPix uses the Production Planner with durable Mastra Postgres storage. Do **not** treat old weather-agent/thread-only starter text as current architecture.

Message history, working memory, and authorization are different contracts:

```text
message history
= what happened in one conversation thread

working memory
= structured state the agent carries for the configured scope

authorization / tenant truth
= server-derived application authority outside model memory
```

Never use memory as authorization or durable business truth.

## Scope must be explicit

Before changing working memory, inspect the current `Memory` configuration and installed `@mastra/memory` source/types.

Record whether state is scoped to:
- `thread`; or
- `resource`.

Do not infer scope from old docs or Lumina. A change from thread → resource or resource → thread is a product behavior change and requires its own tests.

Current official Mastra concepts distinguish thread identity from resource ownership; current remote docs are useful for concepts, but the installed package family defines the exact API available to this repository.

## Independent proof contracts

### 1. Message-history persistence

```text
fresh thread + unique nonce
→ process A writes conversation
→ process A exits
→ process B loads same owned thread/resource
→ agent recalls nonce from persisted message history
```

A database row existing is not enough; prove a new process actually uses it.

### 2. Working-memory behavior

Test the configured scope directly.

For thread scope:
- same thread restores state;
- different thread does not inherit it unless explicitly designed.

For resource scope:
- a new thread under the same resource can use intended shared state;
- a foreign resource cannot read or influence it.

### 3. Tenant ownership

Same thread ID under a foreign resource/org must fail closed. Never accept browser-supplied resource identity as authority.

### 4. Hosted durability

Hosted proof requires Postgres-backed storage across a real process/runtime restart. Process-local LibSQL/in-memory fallback is not evidence of production durability.

## Production Planner working memory

Lumina contained useful production-state concepts such as brand, shoot type, approved concepts, and pending decisions. Treat those as **product candidates**, not a schema to copy.

If `IPI-1020 · COPILOT-PERSIST-001 — Keep iPix AI Conversations and Working Memory Across Refreshes, Restarts, and Cloudflare Isolates` retains a working-memory scope after audit, define the smallest current typed Planner schema against current V2 needs.

Rules:
- bounded fields;
- no secrets;
- no auth/role/permission authority;
- no duplicate domain records;
- no approved artifact treated as valid merely because memory says it was approved;
- explicit migration behavior if schema changes existing persisted rows/state.

## Observational Memory / semantic recall

Do not enable Observational Memory, semantic recall, or multi-user-thread behavior on the current critical path just because current Mastra supports them.

Use a separate product task with:
- quality benefit;
- latency/cost evidence;
- restart/concurrency proof;
- tenant/resource isolation;
- prompt-injection/data-retention analysis;
- rollback.

Recent Mastra history has included fixes around memory concurrency and advanced memory features, so installed-version proof is mandatory before adoption.

## Source priority

```text
current iPix memory config
→ installed @mastra/memory + @mastra/pg source/types
→ embedded docs when that package ships them
→ current Mastra docs/MCP for concepts
→ migration notes/releases/issues when version behavior matters
```

The local docs MCP may not contain embedded docs for every installed package. An empty embedded search is not evidence that an API does not exist.

## Useful current docs

- https://mastra.ai/docs/memory/overview
- https://mastra.ai/docs/memory/message-history
- https://mastra.ai/docs/memory/working-memory
- https://mastra.ai/docs/memory/storage
- https://mastra.ai/docs/memory/observational-memory
- https://mastra.ai/docs/memory/semantic-recall
- https://mastra.ai/docs/memory/multi-user-threads
- https://mastra.ai/docs/server/request-context
