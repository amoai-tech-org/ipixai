---
title: Mastra API CLI
description: Load when inspecting or calling a running Mastra server via `npx --no-install mastra api` (agents, tools, traces, threads).
parent: mastra
impact: HIGH
impactDescription: Agent-readable inspect/call loop against Studio/API
tags: mastra, cli, api, studio
source: https://github.com/mastra-ai/skills/blob/f79b794df9201b671b6602c6fc8ac0ad95478750/skills/mastra/references/mastra-api.md
---

# Mastra API CLI Reference

Upstream: [mastra-ai/skills `mastra-api.md` @ f79b794](https://github.com/mastra-ai/skills/blob/f79b794df9201b671b6602c6fc8ac0ad95478750/skills/mastra/references/mastra-api.md) (skill 2.2.0). Official CLI: [`mastra api`](https://mastra.ai/reference/cli/mastra.md). Develop loop: [Develop](https://mastra.ai/docs/getting-started/develop.md).

## iPixai — how the local server is started

Official Mastra examples say `npm run dev` or `npx mastra dev` for Studio on `:4111`. In **this repo** that is **`npm run dev:agent`** (it runs `mastra dev` after a port guard). Combined **`npm run dev` is blocked** (DEV-STAB-001). Next.js UI is **`npm run dev:ui`** on `:3000` in a **second terminal**.

```bash
# Terminal A — Mastra Studio + API
npm run dev:agent

# Use the repo-pinned CLI only (package.json `mastra`). Never bare `npx mastra`.
npx --no-install mastra --version
npx --no-install mastra api --help
```

If `api` exists, with `:4111` up:

```bash
npx --no-install mastra api --url http://localhost:4111 agent list
npx --no-install mastra api --url http://localhost:4111 trace list '{"page":0,"perPage":20}'
```

If `api` is missing from this pin, do **not** run a newer registry CLI. Fallback: `http://localhost:4111/swagger-ui` or the curl preflight below.

Do **not** point `mastra api` at `:3000`. Observability commands that default to `https://observability.mastra.ai` are **Mastra Cloud** — skip unless this project is actually on that platform.

---

How to use the `mastra api` CLI to interact with Mastra servers. Prefer fast, focused commands and compact JSON projections. Treat the installed CLI and server schema as the source of truth when discovery is needed.

Use this reference when the user asks to inspect or call agents, workflows, tools, MCP servers, memory threads, traces, logs, metrics, scores, datasets, experiments, or to debug/test `mastra api` commands.

## Setup

The CLI can interact with any reachable Mastra server:

- Local iPixai agent: `http://localhost:4111` from `npm run dev:agent`
- Mastra platform deployment: Use the deployment URL
- Remote/self-hosted server: Use the server URL
- Hosted Mastra Platform Observability: `https://observability.mastra.ai` (auto-targeted by `trace`, `log`, `score`, and `metric` commands — **not** iPixai Core)

For local servers, `mastra api` defaults to `http://localhost:4111`:

```bash
npx --no-install mastra api agent list
```

For Mastra platform or remote servers, pass `--url`. For the sake of brevity in examples, `$MASTRA_URL` is used as a placeholder:

```bash
npx --no-install mastra api --url $MASTRA_URL agent list
```

Verify the server once with a cheap check before resource calls. Unauthenticated local Studio: a headerless curl is enough. If the server requires auth, a 401/403 is **not** “unreachable” — send the same headers the CLI would, from **already-configured env**, never by asking the user to paste a token into chat.

```bash
MASTRA_URL="${MASTRA_URL:-http://localhost:4111}"
# Local unauthenticated Studio: headerless curl is enough.
# Explicit platform URL: both env vars required (--url does not load .mastra-project.json).
if [ "$MASTRA_URL" != "http://localhost:4111" ]; then
  : "${MASTRA_PLATFORM_ACCESS_TOKEN:?set in local env — do not paste into chat}"
  : "${MASTRA_PROJECT_ID:?set in local env — do not paste into chat}"
  curl -fsS \
    -H "Authorization: Bearer ${MASTRA_PLATFORM_ACCESS_TOKEN}" \
    -H "X-Mastra-Project-Id: ${MASTRA_PROJECT_ID}" \
    "$MASTRA_URL/api/system/api-schema" >/dev/null
else
  code=$(curl -sS -o /tmp/mastra-api-schema.json -w "%{http_code}" "$MASTRA_URL/api/system/api-schema")
  if [ "$code" = "401" ] || [ "$code" = "403" ]; then
    echo "Server is up but requires auth. Confirm MASTRA_PLATFORM_ACCESS_TOKEN and MASTRA_PROJECT_ID are set in the local env — do not paste secrets into chat." >&2
    exit 1
  fi
  [ "$code" = "200" ]
fi
```

If the TCP connection fails, start `npm run dev:agent` or confirm the URL. For authenticated CLI calls against an explicit `--url`, pass **both** headers from env (do not request credential values):

```bash
: "${MASTRA_PLATFORM_ACCESS_TOKEN:?set in local env}"
: "${MASTRA_PROJECT_ID:?set in local env}"
npx --no-install mastra api --url "$MASTRA_URL" \
  --header "Authorization: Bearer ${MASTRA_PLATFORM_ACCESS_TOKEN}" \
  --header "X-Mastra-Project-Id: ${MASTRA_PROJECT_ID}" agent list
```

### Target resolution

Runtime commands (`agent`, `workflow`, `tool`, `mcp`, `thread`, `memory`, `dataset`, `experiment`) resolve the target in this order:

1. `--url` for an explicit remote or self-hosted server.
2. `http://localhost:4111` for a local `mastra dev` server.
3. `.mastra-project.json` for a Mastra platform project.

Observability commands (`trace`, `log`, `score`, `metric`) target `https://observability.mastra.ai` by default instead of a project deployment URL. For **local** traces on iPixai, pass `--url http://localhost:4111` (see [Develop](https://mastra.ai/docs/getting-started/develop.md)).

The CLI resolves Mastra Cloud credentials in this order:

1. Explicit `Authorization` and `X-Mastra-Project-Id` headers passed with `--header`.
2. `MASTRA_PLATFORM_ACCESS_TOKEN` and `MASTRA_PROJECT_ID` from the environment.
3. Project metadata from `.mastra-project.json` for the project ID.
4. The Mastra CLI login token as an auth fallback.

## Decision flow

0. **Target gate (mutations):** `create`, `update`, `delete`, `run`, `resume`, and `execute` are allowed only against `http://localhost:4111` from `npm run dev:agent`, or a **verified preview** URL. If `$MASTRA_URL` / `.mastra-project.json` might be production or the project/read-write boundary is unclear — **stop**. Do not discover or run mutating commands.
1. Clear read-only request (`list X`, `latest X`, `get X`, `summarize recent X`): infer the resource and use the fast path first.
2. Mutating request (after the target gate), unclear resource/action, failed fast path, or exact syntax requested: use narrow CLI discovery.
3. JSON input uncertain: use command-specific `--schema`.
4. Route behavior confusing: inspect `/api/system/api-schema`.

Start with these command groups when present; verify with `mastra api --help` if the group fails.

```text
agent workflow tool mcp thread memory trace log metric score dataset experiment
```

## Fast path for read-only requests

Use conventional `list`/`get` commands first. Keep pages small and pipe through `jq` immediately.

Latest item:

```bash
npx --no-install mastra api <resource> list '{"page":0,"perPage":1}' \
  | jq '.data[0]'
```

Recent items:

```bash
npx --no-install mastra api <resource> list '{"page":0,"perPage":10}' \
  | jq '.data[]'
```

When the shape is known, project only the fields needed for the task:

```bash
npx --no-install mastra api <resource> list '{"page":0,"perPage":10}' \
  | jq '.data[] | {id, name, createdAt, status}'
```

Get details:

```bash
npx --no-install mastra api <resource> get <id> \
  | jq '.data'
```

If a resource does not support the conventional shape, fall back to narrow `--help` for that resource/action.

## Output control

- Do not use unfiltered `--pretty` during exploration.
- Always project list/get output with `jq` before reading details.
- Use `perPage:1` for latest and `perPage:10` or less for recent lists.
- If output is truncated or noisy, rerun with a narrower `jq` projection.
- Fetch full JSON only when the user asks for raw output or compact projections are insufficient.

## Fallback discovery

Use the narrowest discovery command that can answer the question. Example for traces:

```bash
npx --no-install mastra api trace --help
npx --no-install mastra api trace list --help
npx --no-install mastra api trace query --help
npx --no-install mastra api trace query --schema
npx --no-install mastra api trace list --schema
```

Use top-level help only when the resource is unknown:

```bash
npx --no-install mastra api --help
```

Read `--schema` output as the contract:

- `command`: usage string
- `examples`: known-good examples
- `positionals`: required path/identity arguments
- `input.required`: whether JSON input is required
- `input.schema`: accepted CLI JSON input, including query/body fields
- `schemas`: raw server route schemas for deeper debugging

## JSON and output contract

`mastra api` accepts at most one inline JSON object as input. Do not use stdin or files unless the user explicitly asks.

For non-GET routes, the CLI splits the one JSON object into query parameters and request body according to the server route schema.

Output envelopes:

```json
{ "data": {} }
{ "data": [], "page": { "total": 0, "page": 0, "perPage": 0, "hasMore": false } }
{ "error": { "code": "...", "message": "...", "details": {} } }
```

## Error handling

- `INVALID_JSON`: fix shell quoting; input must be one JSON object.
- `MISSING_INPUT`: run the same command with `--schema` and supply required JSON.
- `MISSING_ARGUMENT`: provide the positional shown by `--help` / `--schema`.
- `HTTP_ERROR`: inspect `error.details`, then compare against `--schema` or route schema.
- `REQUEST_TIMEOUT`: retry with larger `--timeout`, especially for workflow execution.
- `SERVER_UNREACHABLE`: verify `:4111` is up (`npm run dev:agent`) or pass the correct `--url`.

## Route-level debugging

If CLI behavior seems wrong, inspect the route-derived schema manifest instead of guessing.

Find routes by path:

```bash
curl -fsS "$MASTRA_URL/api/system/api-schema" \
  | jq '.routes[] | select(.path | contains("/memory"))'
```

Inspect one route:

```bash
curl -fsS "$MASTRA_URL/api/system/api-schema" \
  | jq '.routes[] | select(.method == "POST" and .path == "/tools/:toolId/execute") | {pathParamSchema, queryParamSchema, bodySchema, responseShape}'
```

## Known notes

- Tool and MCP tool execution accept raw tool input; explicit `{ "data": ... }` also works.
- Workflow resume only works for suspended workflow runs.
- Working memory update requires the agent's memory to have working memory enabled.
- Empty lists may simply mean the server has no matching stored data yet.
- `trace list` and `trace get` return lightweight payloads by default (no span input, output, attributes, or metadata). Pass `--verbose` to fetch full span records, or use `trace span` to fetch one specific span in full.

## Advanced trace query

Use `trace query` instead of `trace list` when selection requires recursive predicates, metadata filters, or conditions over related spans, scores, or feedback. First confirm the repo-pinned CLI exposes the command with `npx --no-install mastra api trace query --help` and `--schema`. Preserve opaque pagination cursors unchanged. See [`trace-query.md`](trace-query.md).
