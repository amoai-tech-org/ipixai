---
name: cloudinary-node
description: >
  Cloudinary Node.js SDK (cloudinary npm) — upload, Admin API, server-side transforms,
  signed upload signatures, asset management. Use when building or debugging Cloudinary
  on the server (Next.js route handlers, Supabase edge-adjacent Node scripts, Mastra
  tools, webhooks) — even if the user says "upload from backend" or "generate signature"
  without naming Cloudinary.
license: MIT
metadata:
  author: cloudinary
  hub: cloudinary
  topic: node
  version: '1.0.0'
---

# Cloudinary Node.js SDK

Entry guide for the `cloudinary` npm package. Load **one** sub-reference below — do not
paste full doc bodies into context.

## When to Use

- Server-side upload (`cloudinary.uploader.upload`), Admin API, asset management
- Generating **signed upload** signatures for frontend widgets
- Node/Express/Next.js Route Handler integration
- Programmatic transformation URL building from Node

## Quick Start

```bash
npm install cloudinary
```

```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
```

Prefer server-only environment variables injected by local Dotenvx or the deployment provider — never expose
`api_secret` client-side.

## Reference map — load on demand

| Task | Reference |
|------|-----------|
| Install, configure, SDK overview | [node_integration.md](node_integration.md) |
| 5-minute end-to-end walkthrough | [node_quickstart.md](node_quickstart.md) |
| Upload API, streaming, large files | [node_image_and_video_upload.md](node_image_and_video_upload.md) |
| Image transformation URLs from Node | [node_image_manipulation.md](node_image_manipulation.md) |
| Video transformation URLs from Node | [node_video_manipulation.md](node_video_manipulation.md) |
| Admin API, rename, delete, tags | [node_asset_administration.md](node_asset_administration.md) |
| Sample apps | [node_sample_projects.md](node_sample_projects.md) |

## Cross-topic routing

| Also need | Load |
|-----------|------|
| Raw transformation URL syntax, `f_auto/q_auto` | [../transformations/transformations.md](../transformations/transformations.md) |
| Next.js `CldImage` / Upload Widget UI | [../nextjs/nextjs.md](../nextjs/nextjs.md) |
| React widget (legacy Vite) | [../react/react.md](../react/react.md) |
| Webhooks, DAM, MediaFlows, llms.txt lookup | [../docs/docs.md](../docs/docs.md) |

## iPix note

- `CLOUDINARY_*` / upload secrets: local Dotenvx or provider-managed server env only — never in client bundles.
- Signed upload routes belong in Next.js Route Handlers or edge functions, not browser code.
