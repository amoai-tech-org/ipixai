import path from "node:path";
import process from "node:process";
import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenvx } from "@dotenvx/dotenvx";

const envTestPath = path.resolve(process.cwd(), ".env.test");
// Intentionally do not ignore MISSING_ENV_FILE: production smoke requires the local
// .env.test source and fails closed through environment.error below.
const environment = loadDotenvx({ path: envTestPath, quiet: true });
const qaEmail = environment.parsed?.E2E_TEST_EMAIL;
const qaPassword = environment.parsed?.E2E_TEST_PASSWORD;

if (
  environment.error ||
  !qaEmail ||
  !qaPassword ||
  process.env.E2E_TEST_EMAIL !== qaEmail ||
  process.env.E2E_TEST_PASSWORD !== qaPassword
) {
  throw new Error(
    "Production smoke requires E2E_TEST_EMAIL / E2E_TEST_PASSWORD from the local .env.test file only.",
  );
}

const PRODUCTION_BASE_URL = "https://www.ipix.co";

if (process.env.E2E_PRODUCTION_SMOKE !== "1") {
  throw new Error(
    "Production Playwright smoke is disabled. Run `npm run e2e:production` to opt in explicitly.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: /production-smoke\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: PRODUCTION_BASE_URL,
    // Production auth artifacts can contain credentials/session material.
    // Keep this smoke observable only through assertions and console output.
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
