---
title: Tool search and lazy loading
description: Load when an agent has a large tool catalog and evaluating ToolSearchProcessor to load tools on demand.
parent: mastra
impact: MEDIUM
---

# ToolSearchProcessor

Current Mastra reference: https://mastra.ai/blog/introducing-tool-search-processor

Installed `@mastra/core 1.71.0` exports `ToolSearchProcessor` from `@mastra/core/processors`; verify its exact constructor/options in installed source/types before use. It exposes search/load behavior so a model does not receive every tool definition on every turn.

## iPix use

Not needed for the Core Planner's four deterministic tools. Evaluate only when a later specialist agent or MCP-heavy workflow has a large catalog and measured context/tool-selection problems.

Keep required safety tools/approval boundaries deterministic and guaranteed. Lazy loading is an optimization, not authorization.
