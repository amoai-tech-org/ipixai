# Cloudinary Environment Config MCP

Official repo: https://github.com/cloudinary/environment-config-mcp
Package: `@cloudinary/environment-config-mcp`

Use for live Cloudinary environment configuration, especially:
- named transformations;
- upload presets;
- adaptive streaming profiles;
- webhook/event triggers;
- upload folder mappings.

## iPix safety

Read/list/get is the default. Create/update/delete is a consequential provider-account write and requires explicit user approval.

Never expose `CLOUDINARY_API_SECRET` in chat, logs, screenshots, fixtures, or committed MCP config. Prefer environment variables or approved secret storage.

## Progressive discovery

For large tool surfaces prefer `--mode dynamic`. This exposes meta-tools such as `list_tools`, `describe_tool_input`, `execute_tool`, and `list_scopes` so the agent loads only what it needs.

Combine dynamic mode with the narrowest applicable scope/tool filter.

## iPix use cases

- inspect/freeze `ipix-signed-upload` preset configuration;
- verify authenticated delivery/named transforms;
- inspect webhook trigger URLs/signing configuration;
- configure future video streaming profiles;
- verify upload mappings when a workflow actually depends on them.
