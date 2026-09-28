import path from "node:path";
import { test as setup } from "@playwright/test";

import { signInAsE2ETestOperator } from "./support/login";

/**
 * IPI-1332 · CERT-PROD-001 — authenticated session for the production Planner
 * certification only.
 *
 * The committed `e2e/auth.setup.ts` imports `previewBypassHeaders` from
 * `playwright.config.ts`, which demands `VERCEL_AUTOMATION_BYPASS_SECRET` for
 * any non-local target. Production is not behind Vercel Deployment Protection,
 * so that path cannot produce a production session. This setup signs in with
 * plain credentials, exactly like the committed `production-smoke.spec.ts`.
 *
 * Trace/screenshot/video stay off: a production session artifact would retain
 * real operator credentials and session material.
 */
const authFile = path.resolve(__dirname, "../playwright/.auth/production-cert-user.json");

setup.use({ trace: "off", screenshot: "off", video: "off" });
setup.setTimeout(90_000);

setup("authenticate as the E2E QA operator against Production", async ({ page }) => {
  await signInAsE2ETestOperator(page);
  await page.context().storageState({ path: authFile });
});
