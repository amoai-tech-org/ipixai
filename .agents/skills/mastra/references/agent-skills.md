---
title: Agent-level skills
description: Load when attaching reusable skills directly to a Mastra Agent, defining createSkill(), filesystem skills, or request-scoped skill resolution.
parent: mastra
impact: HIGH
---

# Agent-level skills

**Authority:** installed `@mastra/core` embedded docs first: `node_modules/@mastra/core/dist/docs/references/docs-skills.md`.
Official docs: https://mastra.ai/docs/skills

Current installed Mastra supports first-class agent `skills`:

| Capability | Current behavior |
| --- | --- |
| `Agent({ skills: [...] })` | Attach skills directly to one agent |
| `createSkill()` | Define an inline skill in TypeScript |
| Filesystem paths | Load skills without creating a Workspace |
| Dynamic resolver | Resolve skills from `requestContext` / tracing context |
| Workspace + agent skills | Merge both sources; agent-level skill wins on a name conflict |
| `agent.getSkill()` | Read one resolved skill from application code |
| `agent.listSkills()` | List the merged resolved skill set |

Verify exact signatures in installed `docs-skills.md`, `reference-agents-createSkill.md`, `reference-agents-getSkill.md`, and `reference-agents-listSkills.md` before implementation.

## iPix use

Prefer agent-level skills for narrowly scoped reusable domain guidance that belongs to one agent and does not require a shared filesystem workspace. Example candidates: fashion-production guidance for Production Planner, evidence-quality guidance for Brand Intelligence, booking-policy guidance for Booking Coordinator.

Do **not** move hard authorization, RLS, write permissions, deterministic calculations, schema validation, or approval gates into skills. Those remain code/data controls. Start with ordinary instructions when the rule is small; introduce a skill only when reuse/discovery/context savings justify it.
