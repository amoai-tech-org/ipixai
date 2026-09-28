# CopilotKit Intelligence — iPix reference

CopilotKit Intelligence is an **optional managed platform capability** around threads/persistence, learning, analytics, Channels, hosting, and inspection. It is not the durable source of truth for iPix business domains.

## iPix boundary

Keep these in Supabase/Postgres: Brand, Shoot, Campaign, Asset, Booking, CRM, approvals, tenant membership, and other application truth.

Use Intelligence only when a task explicitly needs a managed CopilotKit capability and the installed/runtime family, licensing, tenancy model, and deployment requirements have been verified.

Before implementation, load the current runtime `intelligence-mode` reference and current official docs. Do not infer availability from a bundled skill alone.

## Upstream skill boundary

`skills/intelligence-docs` is a **CopilotKit monorepo documentation-maintenance skill**. It keeps the upstream Intelligence landing page synchronized when CopilotKit itself adds or moves Intelligence features. It is not an app-integration guide for iPix.

Official upstream skill:
https://github.com/CopilotKit/CopilotKit/tree/main/skills/intelligence-docs

Current product docs should be treated as the capability source for iPix integration decisions.