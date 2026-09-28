---
name: cloudinary
description: >
  Canonical Cloudinary skill for iPix. Use for any Cloudinary task: Next.js/next-cloudinary,
  Node SDK v2, signed uploads, Upload Widget, webhooks, asset administration, delivery URLs,
  transformations, named/eager transforms, responsive media, React SDK, DAM/MediaFlows,
  debugging, or live Cloudinary verification. Start here instead of separate Cloudinary skills;
  load only the relevant references below, verify version-sensitive behavior against installed
  source/types or current official Cloudinary docs, and preserve iPix tenant/security contracts.
version: 4.1.1
metadata:
  priority: 2
  source: cloudinary-devs/skills + iPix-specific contracts
---

# Cloudinary — canonical iPix skill

One triggerable Cloudinary skill. Official Cloudinary packs are preserved under
`references/official/` for progressive loading instead of competing as separate skills.

## Faster/better approach

For every task use the smallest safe path:

`existing iPix code → installed source/types → Cloudinary CLI when it is the cheapest proof → relevant official reference → current docs → MCP/live proof only when needed`.

Do not load every Cloudinary reference. Read only the files needed for the task.
## Source of truth

Current official snapshot from `cloudinary-devs/skills`:

| Area | Local reference | Upstream version |
|---|---|---:|
| Documentation lookup | `references/official/docs/` | 1.1.0 |
| Next.js / next-cloudinary | `references/official/next/` | 1.0.0 |
| React SDK | `references/official/react/` | 1.0.2 |
| Transformations | `references/official/transformations/` | 1.0.4 |
| Node SDK / Admin API | `references/node/` | iPix curated |

Upstream repository: `https://github.com/cloudinary-devs/skills`.
Use current official Cloudinary docs for changing API behavior rather than memory.

## Routing

| Task | Load first |
|---|---|
| Next.js, `next-cloudinary`, `CldImage`, Upload Widget, signed route | `references/official/next/SKILL.md` |
| Transformation URL, crop/effects, named/baseline transforms, AI transforms | `references/official/transformations/SKILL.md` |
| React/Vite, `@cloudinary/react`, `@cloudinary/url-gen` | `references/official/react/SKILL.md` |
| DAM, MediaFlows, webhooks, SDK/API docs, integrations | `references/official/docs/SKILL.md` |
| Official Cloudinary MCP discovery | `references/official/mcp/servers-catalog.md` |
| Upload presets, named transforms, triggers, mappings, streaming profiles | `references/official/mcp/environment-config.md` |
| Structured metadata fields, datasources, rules | `references/official/mcp/structured-metadata.md` |
| Node Admin/upload API details | `references/node/node.md` + relevant Node reference |

For debugging, also load the task-specific troubleshooting/debugging reference.
## iPix non-negotiable contracts

Cloudinary owns media bytes/provider identity. Supabase/Postgres owns durable iPix asset and tenant truth.

For consequential media writes use:

`AI/operator proposes → human-approved action executes → system records durable result`.

For the current signed upload/webhook train preserve the frozen V2 contract unless current repo docs explicitly supersede it:

```text
schema_version = 1
asset_id        = internal public.assets UUID
org_id          = trusted organization UUID
brand_id        = trusted brand UUID
v2_shoot_id     = optional
```

Provider root `asset_id` is Cloudinary's immutable provider identity; context `asset_id` is the internal iPix UUID.
Never infer tenant ownership from `public_id`, folder, delivery URL, or mutable provider metadata.
Existing provider notifications must not retarget organization, brand, or shoot ownership.

### Asset identity invariant

Keep these identifiers distinct:

```text
Cloudinary root asset_id = immutable provider identity
Cloudinary public_id     = mutable delivery/addressing identity
iPix context.asset_id    = internal Supabase public.assets UUID
```

Never substitute one for another. Prefer Cloudinary `asset_id` for lifecycle operations when the current SDK/API supports it. Treat `public_id` as mutable: rename changes delivery URLs and can break durable references in campaigns, products, publishing, or analytics. Do not rename production assets merely as a cleanup technique.

For authenticated delivery, prefer named/eager derivatives already allowed by the account contract; do not assume arbitrary on-the-fly authenticated transformations are creatable.
## Security rules

- Never expose `CLOUDINARY_API_SECRET` to browser code or `NEXT_PUBLIC_*`.
- Use Cloudinary Node SDK v2 only on server/Node runtime: `import { v2 as cloudinary } from 'cloudinary'`.
- Prefer signed uploads for authenticated production workflows; generate signatures server-side.
- Treat upload preset, folder, public ID and webhook payload as untrusted unless covered by the signed contract.
- Verify Cloudinary webhook signatures before durable writes.
- Validate webhook timestamp freshness as well as the signature.
- Cloudinary notifications may use legacy HMAC (`X-Cld-Signature`), EdDSA v2 (`X-Cld-Signature_v2`), or a configured mode that emits both. Inspect the live trigger/account mode before changing verification and preserve backward compatibility during migrations.
- Where supported, prefer a dedicated API key for webhook verification rather than assuming the upload key is also the webhook key.
- Preserve service-role-only database RPC boundaries where the current iPix implementation uses them.
- Never put API secrets, tokens, signatures, or signed URLs into logs, PR descriptions, fixtures, or screenshots.
- Do not mutate live Cloudinary account configuration unless the task requires it and the user has approved the consequential write.

## Next.js rules

Use `next-cloudinary` for Next.js components/helpers and the official Next reference for exact prop/event names.

- Client boundary: Upload Widget, video-player UI, React event handlers.
- Server Component is fine for static `CldImage`; move client-only state/events behind `'use client'`.
- Do not import the Cloudinary Node SDK into Client Components or Edge runtime code.
- Use `onSuccess` for Upload Widget success unless the installed version proves otherwise.
- For deletes use provider/public identity expected by the API, include `resource_type` where needed, and use invalidation only when required.

Before changing code, inspect installed `cloudinary` and `next-cloudinary` package versions/types because framework APIs can change.

## Upload preset governance

Treat production upload presets as versioned infrastructure contracts. Before relying on a preset, verify the live/current values for:
- signed vs unsigned mode;
- delivery type;
- overwrite behavior;
- public ID policy;
- context/metadata behavior;
- incoming transformations;
- eager transformations;
- notification configuration.

Do not assume request parameters always override preset parameters or vice versa; check Cloudinary's current precedence/merge rules for the specific field. Preserve the current iPix signed-upload contract (`schema_version=1`, authenticated delivery, `overwrite=false`) until a reviewed task intentionally changes it.

For expensive image/video derivatives, prefer asynchronous eager generation with an eager notification callback when it avoids blocking upload completion. Do not treat `original uploaded` and `all derivatives ready` as the same lifecycle state.

## Asset lifecycle and deletion

Distinguish four separate proofs:
1. provider asset deleted/renamed;
2. CDN invalidation/expiration;
3. Supabase archived/deleted state;
4. UI disappearance.

Deletion success does not imply immediate global CDN disappearance. Do not use CDN disappearance as the only deletion proof. For destructive operations, verify the correct `resource_type`, provider identity, version semantics, and whether invalidation is actually required.

### Verified iPix destroy rule

IPI-1113 production certification proved the current destroy path must sign `public_id`; signing `asset_id` alone returned HTTP 400. Do not generalize that result beyond the current SDK/API path: inspect installed SDK types/current Cloudinary docs before changing deletion logic, and sign exactly the fields required by that operation.

## Authenticated delivery policy

For private/pre-release fashion assets, default to authenticated delivery unless a product requirement explicitly makes the asset public. For authenticated assets:
- use approved eager/named derivatives;
- persist exact provider `asset_id`, `public_id`, `version`, `resource_type`, and delivery `type` needed by the app contract;
- sign delivery URLs server-side;
- do not let the browser choose arbitrary transformation strings for protected originals;
- do not downgrade to public `upload` merely to simplify preview URLs.

For pre-release media, consider `X-Robots-Tag: noindex` where supported and appropriate. Treat it only as defense-in-depth; it never replaces authenticated/private access control.

## Transformation rules

Load `references/official/transformations/SKILL.md` before constructing non-trivial transformation syntax.

For named transformations, distinguish delivery syntax from SDK/API names. IPI-1113 verified that the delivery URL form is `t_asset-masonry`, while the SDK/API transformation name is `asset-masonry`. Do not pass the `t_` delivery prefix to APIs that expect the transformation name.

Core defaults when compatible with the request:
- use an explicit crop mode;
- use `g_auto` for smart crop only with compatible crop modes;
- use `f_auto/q_auto` for normal optimized image delivery unless account/defaults or output requirements say otherwise;
- keep format/quality outside named transforms when Cloudinary restrictions require it;
- verify asset-type-specific parameters instead of assuming image and video syntax are interchangeable;
- warn before expensive generative transformations and prefer baseline/named transformations when reuse materially reduces cost.

Never invent transformation parameter names. Check the official Transformation Reference for uncertain or changing syntax.

## Responsive delivery

For public or approved web assets:
- prefer framework-native responsive image generation;
- provide correct `srcset`/`sizes` behavior through the chosen component/API;
- avoid delivering original-resolution shoot files into cards and grids;
- provide explicit dimensions/aspect ratio to reduce layout shift;
- use high fetch priority only for genuine LCP/hero media.

Do not make Client Hints the default responsive strategy unless current browser/platform requirements justify it.

## iPix media intelligence

Cloudinary analysis may supplement, but never replace, iPix Asset DNA. Prefer Cloudinary for objective media properties and cheap preflight signals such as dimensions, aspect ratio, format, resource type, file size, and available quality/focus analysis. Use iPix/Gemini for brand fit, campaign intent, creative judgment, and business decisions.

Example: a technically soft image can still be highly on-brand; surface both facts instead of collapsing them into one score. Keep beta or plan-dependent analyses (for example accessibility analysis) out of the Core path unless a task explicitly adopts and verifies them.

## Documentation lookup

When details are not fully proven by installed source/types, use the matching specialized product sub-file listed in `references/official/docs/SKILL.md` first. Use `https://cloudinary.com/documentation/llms.txt` only for cross-product or unclear tasks, then open only the specific pages needed. Do not broad-crawl the docs.

### Official Cloudinary MCP references

Use `references/official/mcp/` when the task depends on live Cloudinary account configuration or structured metadata. Prefer the narrowest server/reference and progressive discovery.

- `servers-catalog.md` — official MCP server discovery/index.
- `environment-config.md` — upload presets, named transformations, webhook triggers, streaming profiles, upload mappings.
- `structured-metadata.md` — metadata fields, datasource values, metadata rules, field ordering.

MCP manages provider/account state; it never replaces Supabase/Postgres as iPix tenant or business truth. Read/list/get is the default. Create/update/delete operations require explicit user approval.

### CLI and MCP

Prefer the Cloudinary CLI for disposable read/probe operations when it proves the same thing more cheaply than a custom Node script, such as inspecting asset metadata, delivery/resource type, upload responses, or transformation behavior. Do not use CLI writes against production unless the task requires them and the consequential action is approved.

Use live Cloudinary MCP/account inspection only when the answer depends on actual account state such as:
- upload preset mode/config;
- named transformation existence/settings;
- asset/provider metadata;
- notification configuration;
- live delivery behavior.

For new MCP configurations prefer Cloudinary's current Streamable HTTP `/mcp` endpoint. Do not create new deprecated `/sse` configurations unless the specific Cloudinary server still requires it. Enable only the MCP tools needed for the current task to reduce context and accidental mutation surface.

## Production troubleshooting order

Before changing Cloudinary application code for production failures, verify configuration first:

`env vars present → cloud name valid against live account → credentials valid → upload preset exists/config correct → named transformation exists → webhook/trigger config → application code`

IPI-1113 proved a stale `CLOUDINARY_CLOUD_NAME` can surface as sign HTTP 503 and delivery HTTP 404. Do not trust secret-manager values merely because they exist; validate the live provider identity/account when production behavior conflicts with local assumptions.

## Verified iPix certification path

For the signed upload/webhook lifecycle, the production-proven journey is:

`trusted sign → SDK upload → signed webhook → Supabase Ready → exact-version signed preview → destroy → archived/deleted mirror → provider gone → cross-org 403`

Treat each boundary as an observable proof. A green CI run alone does not certify the production media lifecycle.

## Engineering workflow

For repository tasks:

1. Inspect current iPix code/contracts before assuming a gap.
2. Discover affected paths/dependencies first; read only load-bearing files.
3. Reuse existing implementation or installed package behavior before adding helpers.
4. Check the relevant official reference in this skill.
5. Use current official docs only for version-sensitive or uncovered behavior.
6. Make the smallest correct change.
7. Verify cheapest proof first: static inspection → targeted unit/integration → typecheck → build → E2E/live only if needed. Use Cloudinary CLI before a custom probe script when it proves the same fact more cheaply.
8. For live writes, separate implementation proof from approved production deployment/certification.
9. For notification changes, prove signature mode + timestamp handling + idempotent/stale-event behavior explicitly.

Real-world iPix path:

```text
Shoot asset
→ signed upload
→ Cloudinary media/provider identity
→ verified webhook
→ Supabase asset mirror + tenant ownership
→ org-safe preview
→ Assets / Campaign workflows
```

## Review checklist

Prioritize findings in this order:
1. secret exposure / auth bypass;
2. cross-org ownership or retargeting risk;
3. signature/webhook trust mistakes, signature-mode drift, or missing timestamp freshness;
4. server/client/runtime boundary errors;
5. wrong provider identity/public-id/version semantics;
6. incorrect preset precedence, API/component/event/transform syntax;
7. idempotency/stale-event/delete/CDN lifecycle behavior;
8. missing targeted verification.
## Reference map

### Official Next.js pack
`references/official/next/`
- `SKILL.md` — workflow and hard rules
- `references/upload-widget.md` — browser uploads
- `references/signed-uploads.md` — App Router signature endpoint
- `references/server-upload-delete.md` — Node SDK upload/delete
- `references/cldimage*.md` — image delivery and transforms
- `references/video-player.md` — player setup
- `references/troubleshooting.md` — common failures
- `assets/` — reusable official templates

### Official transformations pack
`references/official/transformations/`
- `SKILL.md` — transformation rules
- `references/named-transformations.md`
- `references/ai-transformations.md`
- `references/video-transformations.md`
- `references/debugging.md`
- `references/transformation-costs.md`

### Official React pack
`references/official/react/`
Use only for non-Next React/Vite or direct `@cloudinary/react` / `@cloudinary/url-gen` work.

### Official docs pack
`references/official/docs/SKILL.md`
Use for current Cloudinary docs discovery across Image & Video APIs, Assets/DAM, MediaFlows, and integrations.

### iPix Node references
`references/node/`
Use for Node SDK/Admin/upload API detail not already covered by the official framework references.

## Updating this consolidated skill

Do not reinstall upstream skills as top-level triggerable directories.
Refresh upstream into a temporary directory, compare versions/diffs, then sync only the official snapshots under `references/official/`. Before changing Cloudinary integration behavior, compare local official-reference version metadata with `cloudinary-devs/skills` and check current Cloudinary release/documentation notes for the affected feature.
After any refresh, verify this canonical `SKILL.md` still preserves the iPix-specific security and ownership contracts above. Never overwrite the canonical iPix overlay automatically with upstream content.


## PR review invariants

Use this canonical Cloudinary skill for implementation and review; do not route to a separate reviewer skill.

- Verify exact installed Cloudinary SDK behavior before API claims.
- API secrets never reach browser, model, or logs; client uploads use server-authorized signed parameters where required.
- Signature inputs, timestamp/expiry, folder/public ID ownership, transformations, and upload presets must not be caller-escalatable across tenants.
- Verify provider authenticity before webhook state changes and make replay/idempotent delivery safe.
- Supabase stores durable application metadata while Cloudinary owns media bytes; foreign provider asset IDs require authorization before mapping.
- Destructive media operations require server-side tenant authorization and deterministic proof.
- Transformation/delivery changes must not silently make private media public or bypass intended restrictions.
- Run the cheapest decisive signature/webhook/tenant test instead of generic media-style review.
