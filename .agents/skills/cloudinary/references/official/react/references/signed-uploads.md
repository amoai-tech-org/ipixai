# Secure (Signed) Uploads

Complete guide for implementing signed uploads with Cloudinary.

## Golden Rules

1. **Never expose or commit the API secret** - server-only
2. **Never commit API key or secret** - use `server/.env` in `.gitignore`
3. **API key** is not secret (can be sent to client); **API secret** must stay server-only

## Where to Put API Key and Secret

**Do NOT** put in root `.env` used by Vite.

✅ Create `server/.env`:
```
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

✅ Add `server/.env` to `.gitignore`
✅ Load only in server: `dotenv.config({ path: 'server/.env' })`
✅ Read only in server code: `process.env.CLOUDINARY_API_SECRET`
✅ Use Cloudinary Node.js SDK v2: `import { v2 as cloudinary } from 'cloudinary'`

## iPix signed-upload rule

Do **not** copy a generic raw Upload Widget signing example into iPix production. The current iPix signing contract in `src/app/api/cloudinary/sign/route.ts` authenticates the operator, resolves the trusted tenant, verifies brand/shoot ownership, and signs server-owned `upload_preset`, `folder`, `public_id`, `type=authenticated`, `context`, and `overwrite=false`.

The raw Cloudinary Upload Widget supports signed uploads, but its documented `prepareUploadParams` callback can prepare only a defined subset of upload parameters and does **not** list the delivery `type` parameter. Because iPix requires `type=authenticated`, treat the raw React widget as **not production-equivalent until a targeted browser E2E proves the complete signed request**.

For iPix production:

1. Prefer the existing verified iPix upload/signing implementation.
2. For `next-cloudinary`, follow `../next/references/signed-uploads.md`, which uses a brand-scoped authenticated adapter before the production signer.
3. Never send `org_id`, tenant folder/context, `public_id`, delivery type, or overwrite policy from the browser.
4. Do not weaken `src/app/api/cloudinary/sign/route.ts` merely to fit a widget callback.
5. Before adopting a raw React Upload Widget path, prove that the final Cloudinary multipart request contains every server-signed parameter with the matching signature, including authenticated delivery semantics.

## Generic Cloudinary Upload Widget notes

For a non-iPix signed Upload Widget, Cloudinary supports either `uploadSignature` or `prepareUploadParams`. If `prepareUploadParams` is present, Cloudinary ignores `uploadSignature`; return the signature plus every supported prepared parameter that was included in the signature. Use the widget-provided timestamp rather than generating a replacement timestamp.

The official supported prepared fields include `apiKey`, `context`, `folder`, `overwrite`, `publicId`, `resourceType`, `signature`, `uploadPreset`, and `uploadSignatureTimestamp`. Verify the current official Upload Widget docs before implementing because this contract is version-sensitive.

## Security rules

- Keep `CLOUDINARY_API_SECRET` server-only.
- Authenticate and authorize before signing.
- Build tenant-sensitive values from trusted server state.
- Sign exactly the parameters that will be sent in the final upload request.
- Never infer tenant ownership from Cloudinary `public_id`, folder, context, or metadata.
- Do not use unsigned presets for authenticated or tenant-scoped iPix uploads.

## Documentation

- [Upload Widget - Signed Uploads](https://cloudinary.com/documentation/upload_widget.md?install_source=skillspack&referrer=react-skill#signed_uploads)
- [Upload assets in Next.js](https://cloudinary.com/documentation/upload_assets_in_nextjs_tutorial.md?install_source=skillspack&referrer=react-skill)
