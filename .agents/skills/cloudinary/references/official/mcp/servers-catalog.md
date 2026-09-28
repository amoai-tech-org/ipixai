# Cloudinary MCP servers catalog

Official discovery source: https://github.com/cloudinary/mcp-servers

Use this as the starting point when a Cloudinary task depends on live account capabilities that are better handled through an official MCP server than through custom scripts.

## iPix routing rule

Choose the narrowest official MCP server that matches the task. Prefer read/list/get operations first, and enable only the scopes/tools needed for the current job.

Current high-value servers for iPix:

| Server | Best use |
|---|---|
| `environment-config-mcp` | upload presets, named transformations, webhook triggers, streaming profiles, upload mappings |
| `structured-metadata-mcp` | metadata fields, datasource values, metadata rules, field ordering |

## Faster/better approach

`existing iPix code → installed SDK/types → narrow MCP read/probe → official docs → approved MCP mutation only when required`

Do not treat MCP as the product runtime or application source of truth. Cloudinary MCP manages provider/account state; Supabase/Postgres remains durable iPix tenant and business truth.
