# AI agent instruction standard

Use this when creating or enriching a substantial executable Linear task.

## Agent Contract

Put this near the top of the issue:

```text
Goal: <one sentence>
User outcome: <one observable result>
Do: <required actions>
Do not: <scope boundaries>
Source of truth: <repo / DB / service / issue>
Stop successfully when: <observable Done condition>
Stop and update Linear if: <facts that invalidate the plan>
```


## Plain-English task header

Every substantial task starts with an understandable title and short real-world description:

```text
IPI-NNN · SPEC — <what the operator can now do>

Why this matters: <2–4 plain-English lines>.
Real-world example: <actor → action → visible/durable result>.
```

Avoid titles that describe internal refactors instead of the user/system outcome unless the task is purely platform/internal.

Immediately below the title add the **Top Task Snapshot** from `task-format.md`: what changes, real-world example, faster/better approach, current status/progress, affected stack, required skills/MCPs, and the one-sentence production-ready condition.

## Current-state audit and findings

Before implementation, record: current setup, affected stack, existing code to reuse, errors, red flags, failure points, blockers, missing pieces, fixes/improvements, and what must not be rebuilt. If scoring helps, use evidence-backed /100 scores and mark incomplete-evidence scores provisional.

## Skills / MCP / stack

Name only the tools actually required. Example: `tasks` + `task-verifier` + `graphify`; add `ipix-supabase`, `mastra`, `copilotkit`, GitHub/Linear/Supabase MCP, Playwright, Cloudinary, etc. only when the task crosses those boundaries. Also list the affected tech stack so the implementer knows which runtime/contracts must be verified.

## Real-world workflow + Mermaid

For user-facing, cross-system, or AI-native work, include the real journey near the top and a small Mermaid diagram. Add architecture/trust/failure diagrams only when they expose ownership, authorization, HITL, callback, persistence, or recovery risks.

## Separate outcome from implementation

State the requirement independently from the current implementation recommendation:

```text
Requirement: what the user/system must be able to do.
Recommended implementation: current smallest safe path.
Invariant: behavior/security/data rule that must remain true.
Plan may change if: current code/live evidence proves a newer canonical contract.
```
## Known context

Give the agent relevant starting context, but require it to verify before trusting it:

```text
Current route:
Current auth gate:
Current tenant resolver:
Current DAL/service:
Current source of truth:
Current tests:
Reference implementation:
Known blocker:
Known non-blocker:
```

Do not preserve stale historical discussion that no longer changes implementation.

## Required agent output

For implementation/review handoff, report: changed files, verified facts, assumptions, exact commands/evidence, blockers, and the next action. Keep this compact and evidence-backed.

## Decision branches

Write explicit IF → THEN rules for likely edge cases:

- IF current iPix already solves the requirement → reuse it and update the task before duplicating code.
- IF live state differs from the issue → stop and update Linear.
- IF a migration/RPC/new service appears necessary unexpectedly → stop and prove why existing contracts are insufficient.
- IF a reviewer suggestion conflicts with stronger evidence → investigate; do not blindly implement.
- IF verification fails → do not advance progress.
## Examples beat vague verbs

For ambiguous migration/reuse work, include one good and one bad example.

```text
GOOD: COPY + CLEAN — copy the proven card composition, remove sample media and old routes, bind the current iPix DTO.
GOOD: REIMPLEMENT USING CURRENT iPix PATTERN — use Lumina only for UX intent; use current iPix auth/DAL/routing.
BAD: Adapt the Lumina component.
BAD: Port as needed.
```

## Tool selection

Use the cheapest authoritative source that answers the question reliably:

- Graphify for cross-file dependency/blast-radius discovery.
- Supabase MCP when live schema/RLS/RPC/index/data truth matters.
- Installed source/types before web docs for package behavior.
- Official docs/GitHub only when current API/version guidance is needed.
- Browser/runtime only when the observable journey must be proven.
- Parallel agents only for genuinely independent workstreams that do not edit the same files or depend on unresolved shared state.

## Named checkpoint requirement

Every implementation group must end with a literal `Checkpoint:` block naming Success, Verify, Evidence, and STOP-if conditions. Do not advance until it passes, unless the task explicitly records safe parallel work.

## Checkpoint self-check

Before marking a checkpoint complete ask:

1. Did the exact success criterion pass?
2. Did I stay in scope?
3. Did I introduce fake, stale, duplicate, or unverified behavior?
4. Is the evidence from the current code/runtime state?
5. Is there a cheaper unresolved proof still required?

## Agent prompt

```text
Turn the current Linear issue into an executable AI-agent contract. State the goal, user outcome, known relevant context, explicit actions, non-goals, source of truth, acceptance criteria, IF → THEN edge cases, successful stop condition, invalid-assumption STOP conditions, and exact output/evidence expected. Keep instructions clear and direct, break complex work into bounded steps, include examples only where ambiguity is likely, and avoid prescribing unnecessary reasoning. Verify referenced files/contracts before making claims.
```

## Prompt-authoring best practices

Use these rules when writing or updating any agent prompt in this skill:

- Start with the goal, then add specific requirements, relevant context, and exact acceptance criteria.
- Break complex work into bounded actions when order matters; do not micromanage reasoning that the agent can derive safely.
- Name relevant files/services/contracts when known, but require verification before trusting stale task context.
- State the expected output/evidence and a clear stopping condition.
- Add examples for ambiguous formats/actions and IF → THEN branches for common edge cases.
- Tell the agent which tools/skills to use when the choice matters; prefer direct evidence over broad exploration.
- Require investigation before codebase/API claims and validation of generated changes before acceptance.
- Keep history/context relevant; remove obsolete instructions rather than stacking contradictory guidance.

Current guidance references:
- Anthropic: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompt-templates-and-variables
- GitHub: https://docs.github.com/en/copilot/concepts/prompting/prompt-engineering
- GitHub coding-agent tasks: https://docs.github.com/en/copilot/tutorials/cloud-agent/get-the-best-results
- OpenAI agents: https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/
