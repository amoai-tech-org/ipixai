import { getVerifiedOperatorForRequest } from "@/lib/auth/copilot-hooks";
import {
  listMembershipOrgIdsFromServerClient,
  resolveRuntimeTenant,
  runtimeTenantDenied,
} from "@/lib/auth/runtime-org";
import {
  badRequestResponse,
  configUnavailableResponse,
  forbiddenResponse,
  membershipLookupFailedResponse,
  unauthorizedResponse,
} from "@/lib/auth/unauthorized";
import {
  assertBrandOwnedByOrg,
  assertV2ShootOwnedByBrand,
  isUuid,
} from "@/lib/cloudinary/ownership";
import {
  buildSignedUploadParams,
  rejectClientSignParams,
  resolveSignedUploadPreset,
  signUploadParams,
  toSignResponse,
} from "@/lib/cloudinary/sign-upload";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";

// This is the production iPix signer, NOT a drop-in CldUploadWidget signatureEndpoint.
// CldUploadWidget posts only { paramsToSign }; use the brand-scoped adapter documented
// in references/signed-uploads.md so brand_id is injected before this route is called.

/**
 * IPI-1110 · CLD-SIGN-001 — thin auth wrapper around Cloudinary
 * `api_sign_request` for next-cloudinary `{ paramsToSign }` → `{ signature }`.
 *
 * Signing creates no Supabase asset row. Webhook (IPI-1111) correlates via
 * signed context: org_id, brand_id, asset_id, schema_version, optional v2_shoot_id.
 */
export async function POST(request: Request): Promise<Response> {
  const operator = await getVerifiedOperatorForRequest(request);
  if (!operator) return unauthorizedResponse();

  const supabase = createClientFromRequest(request);
  if (!supabase) return unauthorizedResponse();

  const tenant = await resolveRuntimeTenant({
    listOrgIds: () =>
      listMembershipOrgIdsFromServerClient(supabase, operator.id),
  });
  if (tenant.status !== "ok") return runtimeTenantDenied(tenant);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequestResponse("invalid_json");
  }
  // null / array / primitive must 400 — request.json() succeeds for JSON null.
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return badRequestResponse("invalid_body");
  }
  const body = raw as Record<string, unknown>;

  // Never trust body.org_id — tenant.orgId is the only org identity.
  if (body.org_id != null) {
    return badRequestResponse("unauthorized_param:org_id");
  }

  if (!isUuid(body.brand_id)) return badRequestResponse("brand_id_required");
  const brandId = body.brand_id;

  let v2ShootId: string | undefined;
  if (body.v2_shoot_id != null && body.v2_shoot_id !== "") {
    if (!isUuid(body.v2_shoot_id)) {
      return badRequestResponse("invalid_v2_shoot_id");
    }
    v2ShootId = body.v2_shoot_id;
  }

  const clientParamsCheck = rejectClientSignParams(body.paramsToSign);
  if (!clientParamsCheck.ok) {
    return badRequestResponse(clientParamsCheck.reason);
  }

  const brandCheck = await assertBrandOwnedByOrg(supabase, {
    brandId,
    orgId: tenant.orgId,
  });
  if (brandCheck === "lookup_failed") return membershipLookupFailedResponse();
  if (brandCheck === "forbidden") return forbiddenResponse("ownership");

  if (v2ShootId) {
    const shootCheck = await assertV2ShootOwnedByBrand(supabase, {
      v2ShootId,
      brandId,
    });
    if (shootCheck === "lookup_failed") return membershipLookupFailedResponse();
    if (shootCheck === "forbidden") return forbiddenResponse("ownership");
  }

  const preset = resolveSignedUploadPreset();
  if (!preset.ok) return configUnavailableResponse(preset.reason);

  // Read secret each request — do not rely on a previously configured singleton.
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  if (!apiSecret || !apiKey || !cloudName) {
    return configUnavailableResponse("cloudinary_config_missing");
  }

  const { contextFields, params } = buildSignedUploadParams({
    orgId: tenant.orgId,
    brandId,
    v2ShootId,
    uploadPreset: preset.preset,
    clientParams: clientParamsCheck.params,
  });

  const signature = signUploadParams(params, apiSecret);
  const payload = toSignResponse({
    signature,
    params,
    contextFields,
    apiKey,
    cloudName,
  });

  // Defense: never leak secret even if a future field is added.
  const json = JSON.stringify(payload);
  if (json.includes(apiSecret) || "api_secret" in payload) {
    return configUnavailableResponse("secret_isolation_failed");
  }

  return Response.json(payload);
}
