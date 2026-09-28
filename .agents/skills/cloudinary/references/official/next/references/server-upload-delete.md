# Server-side upload and delete

Use this for Server Actions or route handlers that upload or delete assets using the Cloudinary Node SDK v2.


## Server-side upload (Server Action / route handler)

Use the Node SDK v2 directly. This is for: uploading a file you already have on the server (e.g. a Server Action receiving a `FormData`), uploading a remote URL, scheduled jobs, etc.

```ts
// Start from the hardened reference asset instead of a caller-scoped upload:
// references/official/next/assets/server-action-upload.ts
// It authenticates, resolves the trusted tenant, derives the provider namespace server-side,
// and enforces image type + size limits before upload.
```

- ✅ **`"use server"`** at the top of the file (Server Actions) **or** put this in a route handler — never in a client file.
- ✅ Use `upload_stream` with a `Buffer` for `File`/`Blob` inputs from `FormData`. For URL or base64 string inputs, use `cloudinary.uploader.upload(input, options)`.
- ✅ `resource_type: 'auto'` works for both images and videos.
- ✅ Configure `cloudinary` at module scope (top of the file) — config is idempotent.
- ❌ **Don't** call `cloudinary.uploader.upload` from a Client Component.
- ❌ **Don't** use the Edge runtime for routes/actions that import `cloudinary` — it will fail. Default Node runtime is fine.
- ❌ **Don't** read or stream the file before converting to `Buffer`/base64 — `File` objects from `FormData` don't pass directly to `upload`.

## Delete an asset (Server Action / route handler)

```ts
// Start from the hardened reference asset:
// references/official/next/assets/server-action-delete.ts
// Accept an internal iPix asset ID, authorize it through authenticated tenant ownership,
// then load provider public_id/resource_type from the trusted mirror before destroy.
```

- ✅ **Authorization takes an internal iPix asset ID, not a Cloudinary public ID.** Resolve the owned asset and trusted mirror first; only then pass the mirror `public_id` to `destroy`.
- ✅ Pass `resource_type: 'video'` for video assets, `'raw'` for non-image/non-video. The default is `'image'`.
- ✅ Pass `invalidate: true` to evict the CDN cache (one of the most common follow-up bug reports).
- ✅ A successful response is `{ result: 'ok' }`; a missing asset is `{ result: 'not found' }` — handle both.
- ❌ **Do not** authorize from `public_id`, folder, URL, or Cloudinary metadata.
- ❌ **Don't** call `destroy` from the client — it requires `api_secret`.
- ❌ **Don't** confuse `destroy` (single asset) with `delete_resources` (admin API, batch).
