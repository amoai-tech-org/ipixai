# Linear operations

Use this reference for MCP/CLI operations against Linear.

## Tool order

1. Official Linear MCP server.
2. Linear CLI, if MCP is unavailable.
3. SDK/helper scripts for bulk or custom operations.
4. GraphQL API as fallback.

If MCP tools are unavailable, do not stop. Use the CLI or SDK fallback.

## Read operations

| Operation | MCP pattern | CLI pattern |
|-----------|-------------|-------------|
| Get issue | `mcp__linear__get_issue(id)` | `linear issues view IPI-123` |
| Search issues | `mcp__linear__search_issues(query, filters)` | `linear issues search "..." --limit 10` |
| List issues | `mcp__linear__list_issues(filters)` | `linear issues list --state Backlog --limit 50` |
| List projects | `mcp__linear__list_projects(filters)` | `linear projects list --limit 50` |
| List cycles | `mcp__linear__list_cycles(team)` | `linear cycles list --team ENG` |
| List initiatives | `mcp__linear__list_initiatives()` | `linear initiatives list` |
| List milestones | `mcp__linear__list_milestones(project)` | `linear milestones list --project "Name"` |

Always use filters, limits, and pagination.

## Create/update operations

| Operation | Notes |
|-----------|-------|
| Create issue | Search first to avoid duplicates |
| Update issue | Confirm when intent is ambiguous or bulk |
| Add comment | Use for traceability after meaningful changes |
| Set state | Prefer workflow state ID when available |
| Assign issue | Confirm if assignee is not obvious |
| Add labels | Use existing labels; create new labels only when requested or clearly needed |
| Link project/initiative | Required for iPix executable work |
| Create/update project | Confirm scope before creating |
| Update cycle/milestone | Confirm date or scope changes |

## Mutation safety

Before creating or updating Linear entities:

1. Verify the target team/project/initiative.
2. Search for duplicates when creating.
3. Confirm if the operation is bulk, destructive, or not explicitly requested.
4. Preserve existing fields unless the user asks to overwrite them.
5. Add a comment only when it helps traceability.

## State transitions

Use stable workflow state IDs when the tool exposes them. Typical fallback names:

- `Backlog`
- `Todo`
- `In Progress`
- `In Review`
- `Done`
- `Canceled`

If a state name is ambiguous, list candidates and ask before updating.

## Label rules

Prefer one type label and one or two domain labels.

| Type | Examples |
|------|----------|
| Type | `feature`, `bug`, `refactor`, `chore`, `spike` |
| Domain | `frontend`, `backend`, `supabase`, `edge`, `design`, `commerce`, `ai` |
| Risk | `blocked`, `security`, `breaking-change`, `tech-debt` |

Do not invent labels if existing team labels already express the category.

## API limits

- Avoid unbounded issue searches.
- Cache team/project/state metadata in the session.
- Use pagination cursors.
- Keep outputs summarized; do not dump hundreds of issues into the response.

## Example: create issue safely

1. Search existing issues by title.
2. Resolve project/initiative IDs.
3. Create issue with title, description, priority, labels, project, initiative.
4. Return identifier and URL.
5. Add local tracker note if this is iPix work.

## Example: move issue to In Progress

1. Get issue.
2. Resolve team workflow state ID for `In Progress`.
3. Update issue state.
4. Add a comment only if the team workflow expects it.

## Example: bulk status update

Use a script or MCP batch when available. Before running:

- List target identifiers.
- Confirm target state.
- Confirm count.
- Execute.
- Return successes and failures.
