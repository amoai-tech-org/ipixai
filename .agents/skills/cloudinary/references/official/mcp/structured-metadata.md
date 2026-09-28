# Cloudinary Structured Metadata MCP

Official repo: https://github.com/cloudinary/structured-metadata-mcp
Package: `@cloudinary/structured-metadata-mcp`

Use for Cloudinary structured metadata administration:
- metadata fields;
- field datasource values;
- metadata rules;
- field ordering.

## iPix ownership boundary

Structured metadata is useful for provider-side organization, search, and DAM workflows. It must not become tenant, approval, campaign, shoot, or asset business truth.

Canonical truth stays in Supabase/Postgres. Examples of provider-side metadata that may be useful:
- `asset_role`;
- `channel`;
- `campaign_type`;
- approved taxonomy labels.

Do not rely on provider metadata alone for `org_id`, `brand_id`, ownership, authorization, or consequential workflow state.

## Safety

Read/list/search is the default. Creating, updating, deleting, restoring, or reordering metadata fields/rules is a consequential provider-account write and requires explicit user approval.

Prefer `--mode dynamic` and the narrowest applicable scope/tool set for progressive discovery.
