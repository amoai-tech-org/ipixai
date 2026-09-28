'use server';

import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { getVerifiedOperatorFromCookies } from '@/lib/auth/copilot-hooks';
import { listMembershipOrgIdsFromServerClient, resolveRuntimeTenant } from '@/lib/auth/runtime-org';
import { createClient } from '@/lib/supabase/server';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

/** Reference pattern only: derive namespace from the authenticated tenant, never caller input. */
export async function uploadImage(formData: FormData): Promise<{ publicId: string; url: string }> {
  const operator = await getVerifiedOperatorFromCookies();
  const supabase = await createClient();
  if (!operator || !supabase) throw new Error('unauthorized');
  const tenant = await resolveRuntimeTenant({
    listOrgIds: () => listMembershipOrgIdsFromServerClient(supabase, operator.id),
  });
  if (tenant.status !== 'ok') throw new Error('forbidden');

  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('file_required');
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error('unsupported_file_type');
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new Error('invalid_file_size');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const folder = `ipix/org/${tenant.orgId}/server-uploads`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (error, response) => {
      if (error || !response) return reject(error ?? new Error('upload_failed'));
      resolve(response);
    }).end(buffer);
  });
  return { publicId: result.public_id, url: result.secure_url };
}
