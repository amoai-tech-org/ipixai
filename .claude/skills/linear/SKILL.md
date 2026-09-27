---
name: linear
description: >
  Consolidated Linear hub for linear.app issue/project/cycle/initiative/milestone work, Linear Method planning, issue generation, search, sync, and iPix IPI-### workflows. Use whenever the user mentions Linear, linear.app, IPI-###, PLT-###, COM-###, UI-###, AI-###, DNA-###, issue, project, cycle, roadmap, milestone, backlog, or asks to create/update/search/sync Linear work. Prefer this skill over legacy linear-* skills.
metadata:
  version: "1.0.0"
  # Repo authoring fields. Not in the Agent Skills spec's top-level set, so they
  # live here — `metadata` is explicitly "arbitrary key-value mapping".
  impact: HIGH
  tags: linear, project-management, issues, planning, ipix
---

# Linear Hub

Single entry point for Linear work in this workspace. All 14 legacy linear-* sub-skills have been folded into `references/`.

**Operating model:** keep `SKILL.md` as the router and hard-contract layer. Load one topic reference only when the task needs it.

---

## When to invoke

Use this skill for any substantive Linear task:

| Trigger | Action |
|---------|--------|
| `IPI-###`, `PLT-###`, `COM-###`, `UI-###`, `AI-###`, `DNA-###` | Read [iPix Linear workflow](references/ipix.md) first |
| Create/update/search issues, projects, cycles, milestones | Read [operations](references/operations.md) |
| Plan work, write issues, scope projects, prioritize backlog | Read [methodology](references/methodology.md) |
| Generate issue drafts from specs, PRDs, diagrams, or notes | Read [issue generator](references/issue-generator.md) |
| Implement a Linear issue in code | Read [implementation workflow](references/implementation-workflow.md) |
| Sprint cycle management (status, progress, burndown, velocity) | Read [sprint](references/sprint.md) |
| Manage projects (CRUD, icons, leads, dates, archive) | Read [projects](references/projects.md) |
| Manage project milestones (target dates, naming) | Read [milestones](references/milestones.md) |
| Manage sprint cycles (create, update, complete) | Read [cycles](references/cycles.md) |
| Manage project status updates (health, body, archive) | Read [project-updates](references/project-updates.md) |
| Triage inbox (unassigned issues, claim, snooze) | Read [triage](references/triage.md) |
| Set up automation rules and issue templates | Read [automation](references/automation.md) |
| Manage labels (create, list, delete, color) | Read [labels](references/labels.md) |
| Create GitHub PRs linked to Linear issues | Read [pr](references/pr.md) |
| Manage Linear documents | Read [documents](references/documents.md) |
| View roadmaps | Read [roadmaps](references/roadmaps.md) |
| Start/stop work, git branch, context | Read [workflow](references/workflow.md) |
| Search backlog/projects with safe queries | Read [search](references/search.md) |
| iPix-specific Linear contract | Read [ipix](references/ipix.md) |
| Templates for issues, projects, status updates, PRs | Read [templates](references/templates.md) |
| Manage secrets, MCP config, API keys, CLI auth | Read [security](references/security.md) |
| Update or maintain this skill | Read [skill maintenance](references/skill-maintenance.md) |

Always-on: `.cursor/rules/linear-task-format.mdc`. When creating or rewriting IPI issues, follow `docs/linear/linear-format.md` (verify-before-implement, ≤5 official URLs, every task includes task-verifier).

---

## First actions

1. Classify the request: plan, generate, search, create/update, implement, or maintain.
2. Read the matching reference file from the table above.
3. Check available Linear access:
   - Prefer the official Linear MCP server when present.
   - Use Linear CLI or SDK scripts only as fallback.
   - Never treat missing MCP as a blocker if CLI/SDK access works.
4. For iPix issues, read the local spec in `docs/linear/issues/IPI-*-*.md` when it exists before acting.
5. For any create/update/delete/bulk operation, confirm only when the user intent is ambiguous, destructive, or materially different from the request.

---

## Tool selection

| Tool path | Use when |
|-----------|----------|
| Official Linear MCP (`mcp__linear__*`) | Most reads, creates, updates, comments, project/cycle operations |
| Linear CLI (`linear*` / `linear-cli*`) | MCP is unavailable or CLI output is easier to parse |
| SDK/helper scripts | Bulk operations, loops, migrations, custom transformations |
| GraphQL API | Operation is not supported by MCP/CLI/scripts |
| GitHub CLI | PR creation, PR checks, issue/PR linking when requested |

Use the actual tool names available in the current session. Do not assume a tool exists without checking.

---

## Hard contracts

- **Secrets:** never expose `LINEAR_API_KEY`, tokens, `.env` contents, or MCP config values in output.
- **Deduplication:** search by title/identifier before creating issues.
- **Filtered reads:** never fetch all team issues without filters.
- **State transitions:** use stable workflow state IDs when available; state names are fallback only.
- **Pagination:** respect cursors and limits.
- **iPix traceability:** every executable iPix issue should connect `IPI-###`, `SPEC-ID`, `docs/linear/issues/`, `todo.md`, code changes, and Linear state.
- **No blind automation:** do not run destructive bulk updates or create PRs without explicit user intent.
- **No outdated Rails-only workflow:** the old `linear-implement` skill referenced Rails/TDD sub-skills that do not apply to this Vite/React/Supabase repo unless the user explicitly asks for that workflow.

---

## Reference router

| Need | Reference |
|------|-----------|
| MCP/CLI operations | [operations](references/operations.md) |
| Sprint management (status, progress, burndown, velocity, carry-over) | [sprint](references/sprint.md) |
| Projects (CRUD, icons, dates, leads, archive) | [projects](references/projects.md) |
| Milestones (create, update, target dates) | [milestones](references/milestones.md) |
| Cycles (create, update, complete) | [cycles](references/cycles.md) |
| Project updates (health status, body) | [project-updates](references/project-updates.md) |
| Triage inbox (claim, snooze) | [triage](references/triage.md) |
| Automation rules, issue templates, GitHub integration | [automation](references/automation.md) |
| Labels (create, list, delete) | [labels](references/labels.md) |
| GitHub PRs linked to Linear issues | [pr](references/pr.md) |
| Documents (create, update, list) | [documents](references/documents.md) |
| Roadmaps (view) | [roadmaps](references/roadmaps.md) |
| Start/stop work, git branch, context | [workflow](references/workflow.md) |
| Search backlog/projects | [search](references/search.md) |
| Issue generation (drafts, sub-issue breakdowns) | [issue-generator](references/issue-generator.md) |
| Implementation from issue to branch/PR | [implementation-workflow](references/implementation-workflow.md) |
| Linear Method issue/project planning | [methodology](references/methodology.md) |
| iPix-specific contract | [ipix](references/ipix.md) |
| AlwaysApply rule detail (milestones, HOLD, tool map) | [governance-detail](references/governance-detail.md) |
| Templates (issues, projects, status updates) | [templates](references/templates.md) |
| Agent task_execution prepend SSOT | `docs/process/templates/task-execution-prompt.md` |
| Security and secret handling | [security](references/security.md) |
| Skill structure and maintenance | [skill-maintenance](references/skill-maintenance.md) |
| Iron laws, anti-patterns, tool catalog | [pm](references/pm/SKILL.md) (enterprise skill scaffold) |
| Old skill mapping | [source-map](references/source-map.md) |

---

## Output expectations

For Linear operations, report:

1. What changed or was planned.
2. Linear identifiers/URLs when returned by the tool.
3. Any skipped actions and why.
4. Follow-up commands or verification evidence.
5. Next recommended step, without asking a question unless blocked.

For generated Linear content, return a ready-to-paste issue/project spec with title, description, labels, project/initiative, priority, acceptance criteria, and verification steps.

---

## Verification patterns

Use project-specific commands from the active workspace. For iPix platform work, typical gates are:

```bash
npm run test
npm run typecheck
npm run build
# For migration/RLS work:
supabase start
supabase db reset --local
# Then run affected targeted SQL/security tests.
```

Run only the commands relevant to the touched area. Use local Supabase/Docker for destructive migration verification; use live Supabase only for explicit read-only inspection unless an approved task says otherwise.
