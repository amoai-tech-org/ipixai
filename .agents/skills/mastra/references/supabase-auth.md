---
title: Mastra + iPix auth / request context
description: Load when Mastra work touches authentication, tenant context, RequestContext, resource/thread ownership, or a future standalone Mastra server.
parent: mastra
impact: HIGH
impactDescription: Prevents duplicate auth architecture, browser-token authority, cross-tenant context injection, and sensitive trace leakage
tags: mastra, auth, supabase, request-context, tenant
---

# Mastra auth and request context — iPix contract

## Current iPix architecture

Current iPix does **not** use `@mastra/auth-supabase` as the primary product auth boundary. The production Planner is reached through the existing authenticated Next.js `/api/copilotkit` route, which derives the operator and organization server-side before creating/scoping local Mastra agents.

Do not introduce a second standalone Mastra auth server, browser-owned bearer-token flow, or `@mastra/auth-supabase@latest` installation just because official Mastra examples show that pattern.

Current source of truth:

```text
browser request
→ Next.js/CopilotKit server route
→ current iPix session/auth hooks
→ trusted membership/org resolution
→ server-derived resourceId
→ Mastra local agent/runtime
```

Browser `orgId`, `brandId`, `shootId`, `resourceId`, `threadId`, run IDs, or page context are claims until validated by the owning server/domain boundary.

## Authentication != authorization != runtime context

Keep these separate:

```text
authentication = who is the signed-in actor?
authorization  = what org/domain objects may that actor access/change?
RequestContext = request-scoped data available to runtime components
memory         = conversation/agent state; never authority
```

A valid JWT does not prove organization membership, resource ownership, run ownership, or permission to resume/write.

## RequestContext

Mastra RequestContext is useful for request-scoped metadata and can be validated with `requestContextSchema` on supported installed APIs. It may propagate through agents, tools, workflows, tracing, datasets/experiments, and MCP hooks.

Therefore:

- prefer opaque IDs / bounded operational metadata over raw customer payloads;
- never place JWTs, service-role keys, provider secrets, authorization headers, passwords, or session cookies in RequestContext;
- do not copy full Brand DNA, customer records, image binaries, prompt attachments, or other large/sensitive payloads into RequestContext merely for convenience;
- verify tracing/export behavior before adding any sensitive field, because current Mastra can persist RequestContext snapshots with traces;
- if a field is needed only for server authorization, keep it at the server/domain boundary rather than making it model-visible.

## Resource/thread ownership

For current iPix, use the existing trusted resource/thread ownership path. Do not rely on possession of a thread ID or resource ID.

Required negative proof when identity/context changes:

```text
Org A valid thread + Org B authenticated actor
→ denied before protected thread/run/domain data is returned or resumed
```

Also test browser attempts to override org/resource/brand/shoot context; trusted server values must win or the request must fail closed.

## Future standalone Mastra server

If a future explicitly-scoped task introduces a standalone Mastra HTTP server, then evaluate current official Mastra auth primitives (including Supabase auth) against that task. Do not preinstall or prewire them now.

For such a task:

1. verify installed/current auth package compatibility;
2. verify token authentication;
3. add iPix membership/domain authorization separately;
4. define/validate requestContextSchema;
5. prove custom-route auth enforcement;
6. prove cross-org negatives;
7. verify secrets/context are not persisted to traces or model-visible data;
8. use `task-verifier` Adversarial mode.

## Source priority

```text
current iPix auth + planner-session code
→ current Linear owner
→ installed Mastra/CopilotKit source/types
→ official Mastra RequestContext/auth docs
→ official Supabase auth/RLS docs when database authorization is affected
```

Current references:
- https://mastra.ai/docs/server/request-context
- https://mastra.ai/docs/server/auth
- https://mastra.ai/reference/auth/supabase
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/database/postgres/row-level-security
