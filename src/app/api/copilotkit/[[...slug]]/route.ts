import { CopilotRuntime, createCopilotEndpoint } from "@copilotkit/runtime/v2";
import { createLocalAgents } from "@/agent";
import {
  copilotAuthHooksFor,
  identifyOperator,
} from "@/lib/auth/copilot-hooks";
import { requirePlannerResourceId } from "@/lib/auth/planner-session";
import { handle } from "hono/vercel";
import { requestToken } from "@/lib/request-token";
import { createClientFromRequest } from "@/lib/supabase/server";

import {
  attachRunnerAbort,
  TenantAbortRunner,
} from "@/lib/copilotkit/tenant-abort-runner";

// IPI-1329 · MASTRA-INPROC-001 — the Product Planner always runs in this
// process: server-derived org+user resourceId → createLocalAgents →
// TenantAbortRunner → existing Mastra/Postgres memory. Managed Intelligence
// keys (CPK_INTELLIGENCE_API_KEY / COPILOTKIT_API_KEY) and MASTRA_BASE_URL are
// deliberately NOT read here, so an env change can never silently move the
// Planner to a remote Mastra service. Remote helpers stay in src/agent.ts and
// mastra-control-runner.ts only until IPI-1334 · MASTRA-REMOTE-CLEANUP-001.
async function handleCopilot(request: Request) {
  const session = await requirePlannerResourceId(request);
  if (!session.ok) return session.response;

  const resourceId = session.resourceId;

  const authClient = createClientFromRequest(request);
  const {
    data: { session: authSession },
  } = authClient
    ? await authClient.auth.getSession()
    : { data: { session: null } };
  const accessToken = authSession?.access_token;

  // Installed @copilotkit/runtime also falls back to
  // process.env.COPILOTKIT_LICENSE_TOKEN itself; passing the trimmed value
  // keeps a whitespace-padded env value from being rejected as invalid.
  const licenseToken = process.env.COPILOTKIT_LICENSE_TOKEN?.trim() || undefined;

  const runtime = new CopilotRuntime({
    agents: attachRunnerAbort(createLocalAgents(resourceId)),
    identifyUser: identifyOperator,
    runner: new TenantAbortRunner(resourceId, request.signal),
    ...(licenseToken ? { licenseToken } : {}),
  });

  const app = createCopilotEndpoint({
    runtime,
    basePath: "/api/copilotkit",
    hooks: copilotAuthHooksFor(resourceId),
  });

  // Planner tools read the verified bearer through AsyncLocalStorage.
  return requestToken.run(accessToken ?? "", () => handle(app)(request));
}

// IPI-1210 · COPILOT-TIMEOUT-001 — a prior fix here set maxDuration=60,
// theorizing composeShootPlan's multi-tool turns exceeded the platform
// default. That was wrong and has been reverted. Vercel's documented
// default for every plan with Fluid Compute — the platform default for
// new projects, not independently re-verified against this specific
// project's dashboard setting — is 300s:
// https://vercel.com/docs/functions/configuring-functions/duration#duration-limits.
// So the 60s override, at minimum, didn't add headroom over the documented
// platform default; it cut it by 80%. It also didn't fix the live
// "no response" symptom either way — Supabase query logs during a failed
// live attempt showed zero reads against shot_type_references, proving
// the failure happens before composeShootPlan's tool chain even starts,
// nowhere near a duration ceiling. Root cause is tracked separately in
// IPI-1211 · COPILOT-INTELLIGENCE-RELIABILITY-001. Leave this route on
// the platform default; only add an explicit maxDuration here again if a
// measured p95/p99 Planner turn is shown to actually need more than 300s.

export const GET = handleCopilot;
export const POST = handleCopilot;
export const PATCH = handleCopilot;
export const DELETE = handleCopilot;
