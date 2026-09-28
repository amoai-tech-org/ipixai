---
title: Mastra skill — reference index
description: Load to pick the smallest Mastra reference set for the task. Use progressive disclosure; do not read the whole skill tree by default.
parent: mastra
impact: HIGH
impactDescription: Prevents stale reference routing, duplicated guidance, and unnecessary context loading
tags: mastra, index, references, routing, ownership
---

# Mastra references index

Use this file as the **routing table** for the Mastra skill.

Do not read the whole reference directory. Pick the smallest owner set for the current problem.

## Ownership model

```text
SKILL.md
= current iPix Mastra architecture + global safety rules + topic routing

implementation references
= HOW to build or change one Mastra capability

verification references
= WHAT evidence is required before merge / after merge / for a business journey

troubleshooting references
= diagnose known failures after a proof fails

optional references
= advanced upstream capabilities, not current iPix defaults
```

### Non-overlap rule

Use one primary owner and add a second reference only when the task crosses boundaries.

| Need | Primary owner | Do not substitute with |
| --- | --- | --- |
| Build/change a workflow, suspend/resume, HITL, snapshot handling | [`workflows.md`](workflows.md) | `testing-gates.md` alone |
| Decide pre-merge/post-merge tests and STOP criteria | [`testing-gates.md`](testing-gates.md) | `workflows.md` alone |
| Certify a real operator business flow across frontend → Mastra → backend | [`user-journeys.md`](user-journeys.md) | one Playwright test or one tool test |
| Design/run model-quality evals, datasets, scorers, experiments | [`evals-feedback.md`](evals-feedback.md) | journey E2E alone |
| Diagnose an observed Mastra failure | [`common-errors.md`](common-errors.md) | adding generic retries/upgrades |
| Implement tool schemas/authority/routing contracts | [`tools.md`](tools.md) | model evals alone |
| Implement memory/working-memory/persistence scope | [`memory.md`](memory.md) | browser replay alone |
| Implement Stop/AbortSignal propagation | [`streaming.md`](streaming.md) | stream-close assertion alone |
| Auth/tenant/RequestContext boundary | [`supabase-auth.md`](supabase-auth.md) | memory/resource IDs as authority |
| Package-family upgrade | [`migration-guide.md`](migration-guide.md) | `latest` docs or ad-hoc npm update |

## Core implementation references

| File | Load when |
| --- | --- |
| [`topic-routing.md`](topic-routing.md) | Unsure which Mastra reference/docs path applies |
| [`embedded-docs.md`](embedded-docs.md) | Need exact installed API/source lookup |
| [`mcp-docs-lookup.md`](mcp-docs-lookup.md) | Using Mastra docs MCP/current remote docs |
| [`core-concepts.md`](core-concepts.md) | Agent vs tool vs workflow vs memory/storage decision |
| [`tools.md`](tools.md) | `createTool`, schemas, authority, natural-language selection |
| [`workflows.md`](workflows.md) | Workflows, snapshots, HITL, suspend/resume, callbacks, idempotency |
| [`memory.md`](memory.md) | Message history, working memory, resource/thread scope, persistence |
| [`streaming.md`](streaming.md) | AG-UI/SSE, Stop, AbortSignal propagation |
| [`supabase-auth.md`](supabase-auth.md) | Current iPix auth/tenant/RequestContext boundary |
| [`migration-guide.md`](migration-guide.md) | Mastra package-family/version upgrades |

## Verification and quality references

| File | Owns |
| --- | --- |
| [`testing-gates.md`](testing-gates.md) | Pre-merge tests, post-merge proof, failure matrix, STOP conditions, exact success criteria |
| [`user-journeys.md`](user-journeys.md) | Full iPix frontend → CopilotKit/AG-UI → Mastra → backend → durable-state journeys |
| [`evals-feedback.md`](evals-feedback.md) | Versioned datasets, gates/scorers, experiments, multi-turn quality regression |
| [`trace-query.md`](trace-query.md) | Advanced exact trace selection with recursive predicates and cursor pagination |
| [`trace-intelligence.md`](trace-intelligence.md) | Aggregate production trace themes; advanced/conditional |

## Troubleshooting / operational references

| File | Load when |
| --- | --- |
| [`common-errors.md`](common-errors.md) | A test/runtime path failed and you need failure-specific diagnosis |
| [`mastra-api.md`](mastra-api.md) | Local Studio/API inspection; use the installed local CLI only |

## Optional / advanced — not current critical path unless a task explicitly activates them

| File | Capability |
| --- | --- |
| [`agents-supervisor.md`](agents-supervisor.md) | supervisors/subagents |
| [`agent-controller.md`](agent-controller.md) | Harness / long-lived steerable agent product patterns |
| [`advanced-runtime.md`](advanced-runtime.md) | dynamic workflows, channels, pub/sub, code mode |
| [`browser.md`](browser.md) | Agent Browser / Stagehand |
| [`agent-skills.md`](agent-skills.md) | first-class Mastra agent skills |
| [`skill-search.md`](skill-search.md) | lazy skill discovery |
| [`tool-search.md`](tool-search.md) | lazy large-tool-catalog discovery |
| [`workspace.md`](workspace.md) / [`workspace-skills.md`](workspace-skills.md) | Mastra workspace/filesystem skills |
| [`mcp.md`](mcp.md) / [`mcp-apps.md`](mcp-apps.md) | MCP client/server/apps |
| [`rag-mastra.md`](rag-mastra.md) / [`rag-pgvector.md`](rag-pgvector.md) | RAG/vector work |

Do not pull these capabilities into Core merely because upstream Mastra supports them.

## Legacy/example material

The reference directory also contains upstream/example-oriented files that are intentionally **not primary iPix owners**. Examples include older CopilotKit/display/headless/create-Mastra/provider notes.

Rules:

- if a file is not listed above as a primary owner, treat it as supporting/example material only;
- it must not override current iPix code, installed source/types, this index, or the current domain owner;
- do not delete upstream-derived references just to make the directory look smaller unless an explicit cleanup task proves they are unused;
- when an older reference conflicts with a Core owner, the Core owner wins and the conflict should be corrected or the older file clearly marked historical.

## Common routing recipes

### Change a Planner tool

```text
tools.md
→ testing-gates.md
→ user-journeys.md only if operator-visible behavior changed
→ evals-feedback.md only if natural-language routing/quality changed
```

### Add or change HITL workflow behavior

```text
workflows.md
→ supabase-auth.md when tenant/authority is involved
→ testing-gates.md
→ user-journeys.md
→ common-errors.md only if a proof fails
```

### Change memory/persistence

```text
memory.md
→ supabase-auth.md for ownership/isolation
→ testing-gates.md
→ user-journeys.md when refresh/restart behavior is operator-visible
```

### Upgrade Mastra packages

```text
migration-guide.md
→ installed source/types
→ affected capability references only
→ testing-gates.md
→ user-journeys.md only for affected production flows
```

### Diagnose a production failure

```text
identify failed journey/risk class
→ owning implementation reference
→ common-errors.md
→ installed source/types/logs
→ smallest reproducer
→ testing-gates.md for regression proof
```

## CopilotKit boundary

Current iPix uses CopilotKit/AG-UI in-process around local Mastra agents. For CopilotKit v2 UI/protocol behavior, use the `copilotkit` skill. Mastra-local CopilotKit/display/headless example references must not override current iPix wiring.

## Current runtime reminder

As of the current PR branch, the product agent is the **Production Planner** behind the load-bearing `default` registry path; the old weather-agent text is historical/stale. Always re-check current code on the task SHA rather than treating this index as runtime truth.

Current installed family must also be re-read from `package.json`/lockfile; do not copy version numbers from an old reference file or install `latest` by default.

## Source priority

```text
current iPix code + live Linear owner
→ installed package versions/source/types
→ embedded docs where available
→ this iPix Mastra skill/index
→ Mastra docs MCP/current official docs
→ official release/migration notes/issues for version-specific questions
```

## Global safety reminders

- browser IDs/context are claims until server verified;
- memory/RequestContext are not authorization;
- RequestContext may appear in traces/datasets—keep it minimal and non-secret;
- workflow snapshots are durable state—store references, not giant duplicated payloads;
- consequential approval binds to exact artifact/revision/hash;
- Stop UI success is not proof downstream work stopped;
- one green proof class cannot substitute for another;
- latest upstream capability is not automatically an iPix requirement;
- before merge or Done, use [`testing-gates.md`](testing-gates.md);
- for operator-visible AI workflows, also use [`user-journeys.md`](user-journeys.md).
