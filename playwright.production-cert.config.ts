import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenvx } from "@dotenvx/dotenvx";

/**
 * IPI-1332 · CERT-PROD-001 — repeatable, signed-in Production Planner
 * certification: send → Stop → new turn → stale Stop no-op → reload once.
 *
 * Why a dedicated config:
 *
 * - `playwright.config.ts` deliberately fails closed for any non-local,
 *   non-preview `E2E_BASE_URL`, so the real Planner journeys cannot reach
 *   Production through it.
 * - `playwright.production.config.ts` matches only the non-destructive
 *   `production-smoke.spec.ts`, which never touches the Planner and therefore
 *   cannot certify a Mastra/Planner change.
 *
 * IPI-1332 Step 6.3 requires the signed-in Production Planner journey, and
 * IPI-1329's CP7 ran it ad-hoc from a laptop. This config makes that proof
 * repeatable instead of improvised.
 *
 * Opt-in only: `npm run e2e:production-cert`. Trace, screenshot and video are
 * off because a Production session artifact would retain real operator session
 * material.
 *
 * SIDE EFFECTS (documented so nobody runs it casually): this drives the real
 * hosted Planner with the dedicated QA account, which makes real paid model
 * calls and persists one Planner thread for that account. It creates no
 * accounts, organizations, memberships, brands, shoots or payments, and never
 * writes to a hosted brand.
 */
export const PRODUCTION_ORIGIN = "https://www.ipix.co";

const missingEnvIgnore =
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Codacy cannot resolve Node's built-in process type in this config; tsc and Playwright do.
  process.env.CI ? ["MISSING_ENV_FILE"] : undefined;
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- @dotenvx/dotenvx@2.30.0 publishes config() types; Codacy does not resolve them in this config.
loadDotenvx({ path: ".env.test", quiet: true, ignore: missingEnvIgnore });
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- see above.
loadDotenvx({ path: ".env.local", quiet: true, ignore: missingEnvIgnore });

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Codacy cannot resolve Node's built-in process type in this config; tsc and Playwright do.
if (process.env.E2E_PRODUCTION_CERT !== "1") {
  throw new Error(
    "Production Planner certification is disabled. Run `npm run e2e:production-cert` to opt in explicitly.",
  );
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- see above.
if (!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD) {
  throw new Error(
    "Production certification requires E2E_TEST_EMAIL / E2E_TEST_PASSWORD from the local .env.test file.",
  );
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Codacy does not resolve Playwright's defineConfig types in this config; tsc and Playwright do.
export default defineConfig({
  testDir: "./e2e",
  // Named specs only. `planner-stop-journey` owns the whole acceptance
  // journey (R1 → Stop → R2 → stale Stop no-op → reload → follow-up body
  // bound), and ends by asserting no console errors, page errors or 5xx.
  testMatch: [/production-cert\.setup\.ts/, /planner-stop-journey\.spec\.ts/],
  fullyParallel: false,
  workers: 1,
  // Each attempt makes real, paid model calls; a retry would also hide the
  // exact timing behaviour this certification exists to prove.
  retries: 0,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- see above.
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Codacy does not resolve Playwright's device descriptors here.
    ...devices["Desktop Chrome"],
    baseURL: PRODUCTION_ORIGIN,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "production-cert-setup",
      testMatch: /production-cert\.setup\.ts/,
    },
    {
      name: "production-cert-planner",
      testMatch: /planner-stop-journey\.spec\.ts/,
      use: { storageState: "playwright/.auth/production-cert-user.json" },
      dependencies: ["production-cert-setup"],
    },
  ],
});
