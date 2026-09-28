---
title: Mastra core concepts
description: Load when choosing agent vs workflow vs AgentController vs skill vs tool vs memory vs storage.
parent: mastra
impact: HIGH
impactDescription: Pick the right Mastra primitive before coding
tags: mastra, agents, workflows, agent-controller, skills, tools, memory, storage
source: https://github.com/mastra-ai/skills/blob/e43c0af58bcd982b21fb0037a4275830d0f2552c/skills/mastra/references/core-concepts.md
---

# Core Concepts Reference

Upstream base: [mastra-ai/skills `core-concepts.md` @ e43c0af](https://github.com/mastra-ai/skills/blob/e43c0af58bcd982b21fb0037a4275830d0f2552c/skills/mastra/references/core-concepts.md) (skill 2.1.0), with iPix additions for current installed primitives.

Use this when deciding which Mastra primitive to use or when explaining the high-level shape of a Mastra application.

## Agents vs workflows vs AgentController

Agent: Autonomous, makes decisions, uses tools.
Use for open-ended tasks such as support, research, analysis, and tool-using assistants.

Workflow: Structured sequence of steps.
Use for defined processes such as pipelines, approvals, ETL, multi-step business logic, and resumable processes.

AgentController: Interactive control layer around long-running agent work with sessions, modes, approvals, subagents, persisted state, and UI events. Use only when the product needs a durable, steerable agent experience; it does not replace an ordinary workflow for a known production process.

## Key components

- Tools: Extend agent capabilities through APIs, databases, external services, and deterministic functions.
- Memory: Maintain context through message history, working memory, semantic recall, and observational memory.
- Storage: Persist data with providers such as Postgres, LibSQL, and MongoDB.

## iPixai

- **Current registry:** starter `weather-agent` (`default` → that agent). **Conversion-plan target:** Production Planner (`production-planner`, plus `default` alias) — not registered until the convert plan lands it.
- Tools stay **compute-only** until HITL RPCs; domain writes go through SECURITY DEFINER RPCs + user JWT.
- Storage on the real path is **PostgresStore** (`schemaName: "mastra"`, `disableInit: true`). Missing `MASTRA_DATABASE_URL` must **abort startup** — do not construct in-memory LibSQLStore. LibSQL is allowed only when a task marks the env as disposable preview. The current starter still warns-and-falls-back; do not copy that into production.


## Skill

Use a skill for reusable instructions/reference material an agent should discover or load as needed. Use agent-level skills for self-contained capabilities; workspace skills for filesystem/shared discovery. Do not use skills for authorization, durable business truth, deterministic calculations, or mandatory approval gates. See `agent-skills.md` and `workspace-skills.md`.
