# Authoritative research and evidence

Research must answer a concrete load-bearing question. Do not collect links without a decision purpose.

## Evidence order

1. Current runtime/live behavior.
2. Current task branch code and exact diff.
3. Current clean `origin/main`.
4. Installed package source/types and lockfile.
5. Live iPix schema/RLS/config read safely.
6. Connected MCP for the domain: GitHub MCP for repo/commit/code search and source provenance (e.g. checking a pinned Lumina commit, finding how a pattern is used elsewhere); Mastra knowledge MCP for Mastra-specific agent/tool/workflow behavior; Supabase MCP for live schema/RLS/config truth. Name the MCP actually used — "connected MCP" alone is not a citable source.
7. Version-specific official documentation.
8. Official vendor GitHub repository/release/example.
9. Reviewer/bot/model suggestion.

## Research packet

For each uncertain external contract, record:

| Question | Current version/state | Authoritative source | What it proves | Decision |
| -- | -- | -- | -- | -- |
| `<exact question>` | `<version>` | `<URL/MCP/source>` | `<fact>` | `<keep/change/block>` |

Cap normal task-specific external references at five. Exceed this only when the task genuinely spans more independent load-bearing contracts.

The research packet is a **summary/index only**. Any source that affects implementation must also appear as a full URL inside the exact dependency-ordered implementation step that consumes it, with explicit migration/adaptation instructions and a checkpoint. Do not make an agent jump from a detached research table to unrelated implementation steps.

When a source enters the executable runbook, apply [external-reference-mapping.md](external-reference-mapping.md) as the supplemental mapping checklist; `task-format.md` and `tasks/SKILL.md` remain authoritative for required fields and implementation actions.

## Rules

- Prefer installed source/types over generic web examples for package behavior.
- Use official vendor docs and official GitHub only for changing APIs/security/version guidance.
- Fetch/open each reference before trusting it.
- Do not present reviewer text as proof.
- If critical evidence cannot be verified, mark the finding `NEEDS-RESEARCH` or `BLOCKED`; do not guess.

## Agent prompt

```text
Research only the load-bearing questions the task or PR cannot answer from current code/live state. For each question, start with installed version/source/types, then the named MCP for the domain (GitHub MCP for repo/commit/code search and provenance, Mastra knowledge MCP for Mastra behavior, Supabase MCP for schema/RLS/live state) when available, then version-specific official docs and official GitHub examples/releases. Keep the reference set bounded and record what each source proves, including which MCP tool answered it. Distinguish verified fact, inference, and unresolved uncertainty. Return: question, current version/state, authoritative evidence, decision, implementation impact, and remaining risk. Do not replace direct repo/runtime evidence with generic web advice.
```
