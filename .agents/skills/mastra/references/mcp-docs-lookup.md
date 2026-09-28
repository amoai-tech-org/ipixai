---
title: Mastra docs MCP lookup
description: Load before using the Mastra docs MCP or current remote docs; installed source/types remain authoritative for the pinned runtime.
parent: mastra
impact: HIGH
impactDescription: Prevents latest-doc examples from being applied blindly to the installed Mastra package family
tags: mastra, mcp, docs, versions
---

# Mastra docs — source and MCP lookup matrix

## Core rule

Use Mastra MCP/docs aggressively for current concepts, but do not let latest remote docs override the pinned installed runtime.

```text
exact current iPix code
→ installed package.json/lockfile versions
→ installed source/types
→ embedded docs for that installed package when available
→ current Mastra MCP/docs for concepts/current patterns
→ mastraMigration + release notes for version transitions
→ official GitHub source/issues for unresolved behavior
```

## Embedded docs are package-dependent

Do not assume every installed `@mastra/*` package ships embedded docs. The current docs server may list embedded material for only a subset of packages.

Therefore:
- `listMastraPackages` tells you what embedded docs are actually available;
- an empty `searchMastraDocs` result is **not** evidence that an API/feature does not exist;
- use installed source/types for exact APIs when embedded docs are absent;
- use remote `mastraDocs` for current conceptual documentation.

## Tool selection

| Need | Preferred tool/source | Rule |
| --- | --- | --- |
| Exact pinned method/type/signature | installed source/types, then `getMastraExports`/details if useful | version authority |
| Known current docs page | `mastraDocs` | current concepts; no `projectPath` |
| Search embedded docs | `searchMastraDocs` | requires repo `projectPath`; sparse results possible |
| Browse embedded package docs | `readMastraDocs` | only when package actually exposes embedded docs |
| List embedded packages | `listMastraPackages` | do this before assuming docs exist |
| Breaking version transition | `mastraMigration` + release notes | compare source/target installed families |
| Unclear bug/runtime edge | official GitHub matching version/issue | do not extrapolate from unrelated versions |

Pass `projectPath` only when the tool schema declares it. Use the iPixai repo root, not an old `/home/sk/ipix/app` or mdeai path. `mastraDocs` uses document paths/query keywords and does not take `projectPath`.

## High-value current paths

- `docs/agents/tools`
- `reference/tools/create-tool`
- `docs/server/request-context`
- `docs/memory/overview`
- `docs/memory/working-memory`
- `docs/workflows/suspend-and-resume`
- `docs/workflows/snapshots`
- `docs/streaming/overview`
- `docs/streaming/tool-streaming`
- `docs/agents/agent-approval`
- observability/evals references when those tasks are in scope

## iPix CopilotKit pattern

Generic Mastra/CopilotKit guides may show a standalone Mastra server. Current iPix uses its repository-owned in-process CopilotKit/AG-UI route and local Mastra agents. Current repo code and installed packages win over guide topology.

Do not copy a standalone `/chat`, second Mastra server, Worker/DurableAgent transport, or legacy interrupt shim unless a current task proves the existing in-process architecture cannot meet the requirement.

## RequestContext warning

RequestContext is request-scoped context, not authentication truth by itself. Any values originating from the browser/body must still be verified server-side before becoming trusted org/brand/shoot authority.

When a future standalone Mastra server path is considered, inspect current native server mapping/authorization capabilities first instead of inventing a parallel context layer.

## Migration lookup rule

Before changing a Mastra package family:

1. record exact current installed family;
2. identify target family and reason;
3. run `mastraMigration` / official migration docs;
4. inspect installed/current source for changed APIs;
5. search recent upstream issues for the exact affected feature;
6. update the package family together as required;
7. rerun the risk-specific proof classes, not just typecheck.

## Remote fallbacks

If MCP lookup is incomplete:
1. official Mastra docs/llms index;
2. official Mastra GitHub source matching the relevant version/tag when possible;
3. official issues/releases for behavior changes;
4. secondary sources only when official sources cannot answer the question.

Never use absence from the MCP index as a reason to invent an API or custom implementation.
