'use server';

import { v2 as cloudinary } from 'cloudinary';
import { getVerifiedOperatorFromCookies } from '@/lib/auth/copilot-hooks';
import { listMembershipOrgIdsFromServerClient, resolveRuntimeTenant } from '@/lib/auth/runtime-org';
import { createClient } from '@/lib/supabase/server';

/** Reference pattern only: authorize internal asset identity before provider deletion. */
export async function deleteAsset(assetId: string): Promise<{ result: string }> {
  const operator = await getVerifiedOperatorFromCookies();
  const supabase = await createClient();
  if (!operator || !supabase) throw new Error('unauthorized');

  const tenant = await resolveRuntimeTenant({
    listOrgIds: () => listMembershipOrgIdsFromServerClient(supabase, operator.id),
  });
  if (tenant.status !== 'ok') throw new Error('forbidden');

  const { data: asset, error: assetError } = await supabase
    .from('assets').select('id, brands(org_id)').eq('id', assetId).maybeSingle();
  const brand = Array.isArray(asset?.brands) ? asset.brands[0] : asset?.brands;
  if (assetError || !asset || !brand || brand.org_id !== tenant.orgId) throw new Error('forbidden');

  const { data: mirror, error: mirrorError } = await supabase
    .from('cloudinary_assets').select('public_id, resource_type').eq('asset_id', assetId).maybeSingle();
  if (mirrorError || !mirror?.public_id) throw new Error('cloudinary_asset_not_found');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const result = await cloudinary.uploader.destroy(mirror.public_id, {
    resource_type: mirror.resource_type || 'image',
    invalidate: true,
  });
  return { result: result.result };
}
