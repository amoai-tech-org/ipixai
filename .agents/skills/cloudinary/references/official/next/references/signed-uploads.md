# Signed uploads

Use this when the user needs secure browser uploads through `CldUploadWidget` with a server-side signature endpoint.


## Signed uploads (App Router) — canonical pattern

When the user wants signed/secure uploads, do this end-to-end:

**1. Pass `signatureEndpoint` to the widget instead of `uploadPreset`-only:**

```tsx
'use client';
import { CldUploadWidget } from 'next-cloudinary';

<CldUploadWidget
  signatureEndpoint={`/api/brands/${brandId}/cloudinary/sign`}
  uploadPreset="ipix-signed-upload"
  // Do not send tenant folder/context/public ID from the browser.
  options={{ sources: ['local'] }}
  onSuccess={(result) => console.log(result.info)}
>
  {({ open }) => <button onClick={() => open()}>Upload</button>}
</CldUploadWidget>;
```

**2. Add a brand-scoped adapter at `app/api/brands/[brandId]/cloudinary/sign/route.ts`:**

```ts
import { POST as signUpload, runtime } from '@/app/api/cloudinary/sign/route';

export { runtime };

type Context = { params: Promise<{ brandId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { brandId } = await params;
  const raw = await request.json();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  // CldUploadWidget sends { paramsToSign }. Inject brand_id server-side from the
  // authenticated route context; the production signer still verifies ownership.
  const forwarded = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ ...raw, brand_id: brandId }),
  });
  return signUpload(forwarded);
}
```

**Rules**:
- ✅ Authenticate and authorize before signing; never sign arbitrary browser-provided fields.
- ✅ Tenant namespace, preset, context, ownership IDs, and overwrite policy are server-owned.
- ✅ `CldUploadWidget` posts only `{ paramsToSign }`; use a brand-scoped authenticated adapter to inject `brand_id` before calling the production iPix signer.
- ✅ Return shape **must include** `{ signature }`. Do **not** wrap it (`{ data: { signature } }` will not work).
- ✅ Use the **Node SDK v2** (`import { v2 as cloudinary } from 'cloudinary'`). Do not use v1.
- ✅ The route runs on the Node.js runtime by default — fine. If you set `export const runtime = 'edge'`, **switch back** to Node: the Node SDK depends on Node-only APIs.
- ❌ **Never** read `process.env.CLOUDINARY_API_SECRET` in a Client Component or anywhere it could be bundled to the browser.
- ❌ **Don't** add the secret as `NEXT_PUBLIC_CLOUDINARY_API_SECRET` — that exposes it.
- ❌ **Don't** invent a custom signature shape — the widget calls the endpoint and expects `{ signature }`. If you also want timestamp/api_key, return them too, but the field name `signature` is required.

**Pages Router equivalent**: use an authenticated brand-scoped API route that injects trusted/validated brand context before delegating to the same production signing contract.
