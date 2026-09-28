---
title: Harness and Agent Controller
description: Load when evaluating long-running, steerable agent products with sessions, modes, approvals, subagents, persisted state, or live UI events.
parent: mastra
impact: MEDIUM
---

# Harness and Agent Controller

Official docs: https://mastra.ai/docs/harness/overview
Current interactive control primitive: https://mastra.ai/docs/harness/agent-controller

Mastra uses **harness** for the broader capabilities around long-running agent work: durability, background tasks, goals, schedules, signals, and interactive control. `AgentController` is the current API for an interactive experience around an agent, including sessions, modes, state, approvals, subagents, model switching, persisted threads, and UI events.

Installed `@mastra/core 1.71.0` exposes the canonical `AgentController` entrypoint under `@mastra/core/agent-controller`. The `@mastra/core/harness` entrypoint is retained for backwards compatibility, while `Harness`, `MastraConfig.harnesses`, and `get/listHarness*` aliases are deprecated in installed types. New iPix work should use `AgentController`, `agentControllers`, and the `get/listAgentController*` APIs after verifying the exact installed signature.

## iPix use

Treat this as **advanced / optional**, not Planner Core. Consider it only when iPix needs a durable, long-running operator session that must survive interruptions and remain steerable across modes or subagents.

Do not use AgentController to replace Supabase domain truth, RLS, approval RPCs, or ordinary Mastra workflows. A defined production process with known gates remains a workflow; an open-ended interactive agent experience may justify AgentController.