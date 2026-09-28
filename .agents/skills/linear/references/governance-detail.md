# Linear governance — detail (on-demand)

Companion to alwaysApply `.cursor/rules/linear-governance.mdc`. Load this when editing milestones, cycles, HOLD, progress docs, or tooling — not on every chat.

## Plain English + real-world iPix

Linear is the operator delivery board for Lumina Studio. Wrong Done status makes the team think Brand Hub AI chat works when `/api/copilotkit/info` still returns 403 for an operator with no `org_members` row. Live verification prevents that class of mistake.

## Project / initiative ownership

Attach issues to the project that **owns delivery**, not a historical epic. Resolve names via live Linear.

| Project role | Examples (verify live) |
|--------------|------------------------|
| Operator React / design parity | DESIGN V2 — Operator React Parity |
| Launch / onboarding / beta | MVP |
| Cloudflare / DNS / Workers | HOSTING |
| Provider routing | AI Platform — LLM Providers |
| Agents / Copilot | AI Platform — Agents |

Initiatives: attach when the project warrants it — resolve IDs via MCP first.

## Milestones

Pattern: `{PROJECT_PREFIX}-M{n} · {Outcome}` with **targetDate** + ascending **sortOrder**.

Every **active DESIGN V2 delivery issue** → exactly one outcome milestone.

Exceptions: parent trackers, cross-project ownership, intentional backlog, Duplicate/Canceled/completed historical.

- Do not assign milestones only to inflate %
- Remap/re-date only with approval; reassign open set in one pass; verify counts live
- Clear `projectMilestone` on Duplicate/noise when % distorts
- Do not put backend-only tickets in desktop-parity milestones without a stated reason

Dates/names: live Linear (or `tasks/linear/live-workspace-state.md` as non-authoritative cache).

## Cycles

A cycle contains work expected to **start or materially progress** in that window.

Must be: unblocked (or expected to unblock), small enough to progress, owned, capacity-backed.

| Board state | Meaning |
|-------------|---------|
| Backlog | Unscheduled |
| Todo | Ready to start |
| In Progress | Actively executing |

Rules: approved active items only; preserve Done history in cycle; clear stale cycles from Dupes; no overlapping cycle dates; HOLD / DNS cutover stays out of beta cycles.

## Dependencies

| Relation | Meaning |
|----------|---------|
| `blocks` / `blockedBy` | Hard execution order |
| `relatedTo` | Soft link |
| `duplicateOf` | Canonical survivor; loser **Duplicate** |

Prefer `A blocks B` when B cannot ship before A. Scan open issues for circular blocks. Do not remove edges merely because the blocker is Done.

Illustrative patterns (verify live before using): analytics overview → campaign drill-down; matching → Talent Profile → Availability; planner read → safe mutation / responsive QA. Never create an edge only because it appears here.

## HOLD representation

Linear has no native HOLD. “HOLD” means **all** of (verify live):

- Status: **Backlog**
- Project: **HOSTING** (or live hosting project)
- Milestone: DNS cutover
- No active cycle
- Not current execution
- Description or status update says HOLD
- Required blockers unresolved

Example (verify title live): **IPI-631 · CF-MIG-810 — Move ipix.co to Cloudflare**. Do not start HOLD DNS work in beta cleanup.

## Progress documents

For Linear progress docs (e.g. DESIGN V2 HTML→React tracker):

1. Read current document  
2. Patch only outdated sections when supported  
3. Full replace only if complete current content preserved  
4. Re-read after save; confirm links, milestone names, counts, dates  

Repo trackers (`Universal-design-prompt-4/progress.md`, `todo.md`) → separate docs PRs unless asked.

## Project updates

After material governance changes, **propose** a project status update (`onTrack` / `atRisk` / `offTrack`) with a plain-English table when MCP allows.

Do **not** call `save_status_update` automatically. Ask for explicit user approval immediately before posting; skip if declined or MCP unavailable.

## Tool map (discover first)

| Action | Tool (if available) |
|--------|---------------------|
| Read/update issue | `get_issue`, `save_issue` |
| List filter | `list_issues` |
| Project / milestones | `get_project`, `save_project` |
| Cycles | `list_cycles` |
| Documents | `get_document`, `save_document` |
| Status update | `save_status_update` |
| Clear milestone/cycle when MCP lacks null | GraphQL `issueUpdate` (inspected) |

## Live-state file

After material Linear changes (or scheduled refresh), update `tasks/linear/live-workspace-state.md` with verified-at, milestones/dates, active cycle, HOLD gates. Never overrides live Linear.

## Issue body templates

- Agent execution prepend: `docs/process/templates/task-execution-prompt.md`
- Body sections: `docs/process/templates/linear-issue-body.md`
- Team default install: `docs/process/templates/LINEAR-DEFAULT-INSTALL.md`
