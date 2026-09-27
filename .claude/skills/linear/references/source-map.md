# Source map

This file records how the old `linear-*` skills map into the consolidated `linear` skill.

| Old skill | Main value kept | New location |
|-----------|-----------------|--------------|
| `linear-automation` | Issue lifecycle, automation concepts, labels, cycle dashboard ideas | [operations.md](operations.md), [project-management.md](project-management.md) |
| `linear-claude-skill` | MCP/CLI fallback, project/initiative linking, tool selection, security warnings | [operations.md](operations.md), [project-management.md](project-management.md), [security.md](security.md) |
| `linear-implement` | Issue-to-branch implementation flow, context gathering, verification, PR reporting | [implementation-workflow.md](implementation-workflow.md) |
| `linear-initiatives` | Initiative listing and high-level roadmap tracking | [project-management.md](project-management.md) |
| `linear-issue-generator` | Issue draft generation patterns | [issue-generator.md](issue-generator.md), [templates.md](templates.md) |
| `linear-method` | Linear Method philosophy, issue writing, project scope, prioritization | [methodology.md](methodology.md) |
| `linear-milestones` | Milestone list/create/update/delete patterns | [project-management.md](project-management.md) |
| `linear-pm` | PM operations, iron laws, anti-patterns, memory/traceability | [operations.md](operations.md), [project-management.md](project-management.md), [ipix.md](ipix.md) |
| `linear-search` | Safe issue/project search patterns | [search.md](search.md) |

## Deprecated assumptions

The old `linear-implement` skill assumed Rails-specific sub-skills and workflows. This workspace uses React/Vite/Supabase and iPix task lifecycle conventions, so those Rails-specific steps are not part of the consolidated default workflow.

## Consolidation decisions

- Keep `SKILL.md` as a router, not a giant reference dump.
- Keep iPix-specific rules separate from generic Linear guidance.
- Preserve security rules from `linear-claude-skill` but adapt them to this repo's Dotenvx/.env.local patterns.
- Preserve Linear Method guidance from `linear-method` because it is reusable and high value.
- Preserve PM iron laws from `linear-pm`: dedupe, filter, use state IDs, paginate, cache metadata.
- Use `.claude/skills/tasks/SKILL.md` as the canonical iPix task execution/progress standard; legacy lifecycle references are compatibility-only.
