# Linear security and secrets

Use this reference before configuring MCP, CLI, SDK, or scripts that need Linear access.

## Core rule

Never expose Linear credentials, API keys, tokens, `.env` contents, or MCP configuration values in terminal output, comments, PRs, or Linear issue text.

## Safe environment handling

For iPix, prefer the repo's configured secret flow:

- Keep local `LINEAR_API_KEY` in the owning local/tooling env only when needed; deployment credentials stay provider-managed.
- Use `dotenvx run --convention=nextjs -- ...` for local commands that require encrypted env values.
- Use MCP server configuration that reads from environment variables.

## Unsafe commands

Do not run or paste output from:

```bash
echo $LINEAR_API_KEY
printenv | grep LINEAR
cat .env
cat .env.local
linear config show
```

## Safer checks

Use checks that do not reveal secret values:

```bash
test -n "$LINEAR_API_KEY" && echo "LINEAR_API_KEY is set"
```

With Dotenvx:

```bash
dotenvx run --convention=nextjs -- sh -c 'test -n "$LINEAR_API_KEY" && echo "Linear command executed with injected credentials"'
```

## MCP config pattern

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.linear.app/sse"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    }
  }
}
```

Do not paste real key values into this file.

## CLI usage

If using CLI directly:

```bash
LINEAR_API_KEY="${LINEAR_API_KEY:-}" linear issues list --limit 5
```

Prefer secret-manager injection over exporting secrets in shell history.

## Mutation safety

Before create/update/delete/bulk operations:

1. Confirm the user asked for the action.
2. Confirm target project/initiative/cycle when ambiguous.
3. Confirm bulk counts.
4. Avoid destructive updates unless explicitly requested.
5. Keep logs free of credentials.

## iPix secret rule

Never put Linear or Supabase secrets behind `VITE_` environment variables. Client-facing variables must be public-safe only.
