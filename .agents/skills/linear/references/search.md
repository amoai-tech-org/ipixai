# Linear search

Use this reference for finding issues, projects, and backlog items without flooding context.

## Search principles

- Search before creating.
- Use narrow queries.
- Limit result count.
- Use filters for state, team, project, assignee, label, and cycle.
- Prefer JSON output when parsing programmatically.
- Summarize results instead of dumping raw lists.

### CLI search (legacy `linear-cli`)

```bash
linear-cli s issues "authentication bug"
linear-cli s issues "login" --limit 5
linear-cli s issues "error" --output json
linear-cli s issues "crash" --output json --fields identifier,title,state.name
linear-cli s projects "backend"
linear-cli s projects "api" --limit 10
```

### MCP search (preferred)

```bash
linear issues search "password reset" --limit 10
linear issues search "RLS brand profiles" --state Backlog --limit 10
linear issues search "brand-intelligence" --project "Platform Foundation" --limit 10
linear issues search "IPI-16" --limit 10
```

## Project search

```bash
linear projects search "platform" --limit 10
linear projects search "commerce registry" --limit 10
linear projects list --team IPI --limit 50
linear-cli s projects "mobile" --output json
```

## Get details

```bash
linear issues view IPI-123
linear issues view IPI-123 --output json
linear comments list IPI-123
linear projects view "Platform Foundation"
linear-cli i get LIN-123 --output json
linear-cli cm list LIN-123 --output json
```

## List with filters

```bash
linear issues list --state Backlog --limit 50
linear issues list --state "In Progress" --limit 50
linear issues list --team IPI --label blocked --limit 50
linear issues list --cycle current --limit 50
linear-cli i list -t ENG --output json
linear-cli i list -s "In Progress" --output json
```

## Search query construction

Use these filters when available:

| Filter | Use |
|--------|-----|
| `state` | Backlog, Todo, In Progress, In Review, Done |
| `team` | Team key such as `IPI` |
| `project` | Project name or ID |
| `label` | Domain/type/risk label |
| `cycle` | Current or named cycle |
| `assignee` | Person or me |
| `text` | Title/description keywords |

## Result handling

After search:

1. Remove duplicates.
2. Group by state/project.
3. Highlight blockers and high-priority items.
4. Return identifiers.
5. Ask before creating if a likely duplicate exists.

Search is case-insensitive. Use `--limit` to control result count. Combine with `i get` for full details.
