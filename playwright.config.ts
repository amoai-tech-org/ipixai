import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenvx } from "@dotenvx/dotenvx";

// E2E credentials and overrides live in .env.test (gitignored, see .env.example).
// CI injects equivalent values as job env vars, so only CI suppresses missing-file errors.
// Local runs surface Dotenvx's MISSING_ENV_FILE error immediately for better setup diagnostics.
const missingEnvIgnore =
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Codacy cannot resolve Node's built-in process type in this config; tsc and Playwright do.
  process.env.CI ? ["MISSING_ENV_FILE"] : undefined;
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- @dotenvx/dotenvx@2.30.0 publishes config() types; Codacy does not resolve them in this config.
loadDotenvx({ path: ".env.test", quiet: true, ignore: missingEnvIgnore });
// NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY for direct read-only REST calls
// from spec files (e.g. tenant-isolation.spec.ts's org-identity check) — the
// webServer's spawned Next process reads the Next.js convention itself, but the Playwright
// test runner process does not; load the canonical local runtime file here too.
// CI supplies these as real job env vars; local runs should visibly report a missing canonical file.
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- @dotenvx/dotenvx@2.30.0 publishes config() types; Codacy does not resolve them in this config.
loadDotenvx({ path: ".env.local", quiet: true, ignore: missingEnvIgnore });

const hasExplicitBaseURL = Boolean(process.env.E2E_BASE_URL);
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3015";

// These tests perform real sign-ins with real credentials — fail closed
// rather than let a misconfigured/malicious E2E_BASE_URL point that at
// production (ipix.co), someone else's vercel.app deployment, or any other
// host. Only localhost and this project's own Vercel previews are allowed —
// verified live (not guessed) from this repo's own PR deployment comments:
// ipixai-5y1wsa98w-amoco.vercel.app (verified from the current Vercel project).
// Project "ipixai" under the "amoco" Vercel team/scope — any other
// vercel.app subdomain, including a bare one, is rejected.
const ALLOWED_PREVIEW_HOST = /^ipixai(-[a-z0-9-]+)?-amoco\.vercel\.app$/i;

const LOCAL_TARGET = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/;

export function isLocalE2ETarget(candidate: string): boolean {
  return LOCAL_TARGET.test(candidate);
}

export function isAllowedE2EBaseUrl(candidate: string): boolean {
  if (isLocalE2ETarget(candidate)) return true;

  const parsedCandidate = new URL(candidate);
  return parsedCandidate.protocol === "https:" && ALLOWED_PREVIEW_HOST.test(parsedCandidate.hostname);
}

const isLocalTarget = isLocalE2ETarget(baseURL);

if (!isAllowedE2EBaseUrl(baseURL)) {
  throw new Error(
    `E2E_BASE_URL "${baseURL}" is not localhost or an ipixai/amoco Vercel preview — refusing to run real sign-in against it.`,
  );
}

/**
 * Vercel Deployment Protection serves an SSO screen in front of a Preview, so a
 * real sign-in can never reach `/login` and every `page.request` JSON call parses
 * that HTML instead (observed as `SyntaxError: Unexpected token '<'`). The
 * project's existing `VERCEL_AUTOMATION_BYPASS_SECRET` ("Protection Bypass for
 * Automation",
 * https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)
 * clears it. Vercel also documents `x-vercel-set-bypass-cookie: true` for
 * "follow-up requests (e.g. for in-browser testing)": it makes Vercel set the
 * bypass as a cookie, which the browser then scopes to the deployment host.
 *
 * These headers are meant to be sent on **one** request — see
 * `e2e/auth.setup.ts`, which establishes the cookie for every later project.
 * They must NOT be handed to Playwright's context-wide `extraHTTPHeaders`:
 * that attaches them to every request the browser makes, including cross-origin
 * calls to Supabase and Cloudinary. Measured against the installed Playwright
 * with a two-origin probe, a context-wide `extraHTTPHeaders` did reach
 * cross-origin `fetch`, `<img>` and `<script>` requests, and forced a CORS
 * preflight that the third party must then allow. That both leaks the
 * deployment-protection secret to third parties and can silently break those
 * requests — a documented footgun (see
 * https://dev.to/forrestmiller/one-playwright-header-broke-every-websocket-test-2m8g).
 *
 * Fail closed: a Preview target with no secret would otherwise fail much later
 * as a confusing auth/JSON error. Local runs need no secret and get no headers.
 */
export function previewBypassHeaders(
  candidate: string,
  secret: string | undefined,
): Record<string, string> | undefined {
  if (isLocalE2ETarget(candidate)) return undefined;
  // A whitespace-only secret is truthy; sending it would push the run all the
  // way to Vercel's SSO boundary instead of failing closed here.
  const trimmedSecret = secret?.trim();
  if (!trimmedSecret) {
    throw new Error(
      "VERCEL_AUTOMATION_BYPASS_SECRET is required for Vercel Preview E2E: without it Vercel Deployment Protection answers with an SSO screen instead of the app.",
    );
  }
  return {
    "x-vercel-protection-bypass": trimmedSecret,
    "x-vercel-set-bypass-cookie": "true",
  };
}

// Evaluated at config load purely to fail closed before any test runs.
previewBypassHeaders(baseURL, process.env.VERCEL_AUTOMATION_BYPASS_SECRET);

export default defineConfig({
  testDir: "./e2e",
  // Production smoke has its own guarded config and must never run as part of
  // the normal localhost/Preview certification suite.
  // approval-001-tenant-review is the IPI-1084 local-stack proof: it needs the
  // local Supabase fixtures, so it belongs to playwright.approval.config.ts
  // (npm run e2e:approval) and must never run against these hosted accounts.
  testIgnore: [/production-smoke\.spec\.ts/, /approval-001-tenant-review\.spec\.ts/],
  // End cleanly before the 15-minute GitHub Actions hard stop so reporters
  // and traces have time to flush instead of being killed mid-write.
  globalTimeout: process.env.CI ? 12 * 60_000 : undefined,
  // The canonical suite shares one real Org A account and one Next dev server.
  // Keep it deterministic locally and in CI; opt into parallelism only for
  // future tests with isolated accounts/backend state.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // One worker avoids shared-account races and Turbopack cold-compile storms.
  workers: 1,
  // https://playwright.dev/docs/ci-intro — 'github' annotates failures
  // directly on the Actions run; keep 'html' for runner-local diagnostics.
  // Authenticated CI workflows must not publish the generated report artifacts.
  reporter: process.env.CI ? [["github"], ["html"]] : "html",
  use: {
    baseURL,
    trace: process.env.CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    // Deliberately NOT `extraHTTPHeaders`: a context-wide bypass header leaks
    // the secret to cross-origin services and breaks their CORS preflight. The
    // Preview bypass is established once as a cookie in e2e/auth.setup.ts.
  },

  projects: [
    // Authenticates once via the real UI and persists storageState — every
    // other project depends on this instead of signing in per test.
    // https://playwright.dev/docs/auth
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
      // Real, paid OpenAI calls live in their own "chromium-ai-smoke" project
      // so `npm run e2e` — the deterministic release suite — never depends
      // on hosted AI-provider availability. Run them explicitly via
      // `npm run e2e:ai-smoke` or .github/workflows/ai-smoke.yml.
      testIgnore: [
        /production-smoke\.spec\.ts/,
        /planner-journey\.spec\.ts/,
        /copilot-intelligence-isolation\.spec\.ts/,
        /planner-thread-isolation\.spec\.ts/,
        /planner-stop-journey\.spec\.ts/,
        /planner-workflows\.spec\.ts/,
        /brand-intelligence-journey\.spec\.ts/,
        // Local-stack only (see the global testIgnore note above).
        /approval-001-tenant-review\.spec\.ts/,
      ],
    },
    {
      name: "chromium-ai-smoke",
      testMatch: [
        /planner-journey\.spec\.ts/,
        /copilot-intelligence-isolation\.spec\.ts/,
        /planner-thread-isolation\.spec\.ts/,
        /planner-stop-journey\.spec\.ts/,
        /planner-workflows\.spec\.ts/,
        /brand-intelligence-journey\.spec\.ts/,
      ],
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
    },
    {
      name: "mobile-chromium",
      // ~390px viewport (iPhone 12/13/14 width) on the Chromium engine
      // already cached locally — no extra browser download needed.
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
      // login-journey does its own real UI login (not storageState) —
      // one extra hosted sign-in beyond setup is enough; running it per
      // viewport too would sign into the real account 3× per full run.
      // planner-journey and copilot-intelligence-isolation each make one real
      // hosted GPT-4o call — same reasoning, once per suite, not once per
      // viewport.
      // Keep the production-only smoke excluded here too because project-level
      // testIgnore replaces the inherited/global value.
      testIgnore: [
        /login-journey\.spec\.ts/,
        /production-smoke\.spec\.ts/,
        /planner-journey\.spec\.ts/,
        /session-reuse\.spec\.ts/,
        /copilot-intelligence-isolation\.spec\.ts/,
        /planner-thread-isolation\.spec\.ts/,
        /planner-stop-journey\.spec\.ts/,
        /planner-workflows\.spec\.ts/,
        /brand-intelligence-journey\.spec\.ts/,
        // Local-stack only (see the global testIgnore note above).
        /approval-001-tenant-review\.spec\.ts/,
      ],
    },
  ],

  // With no explicit E2E_BASE_URL, Playwright owns a dedicated :3015 server.
  // It never reuses the developer-owned :3000 process, which could be another
  // branch. Any explicit URL is caller-owned and must already be running.
  // CI sets E2E_SERVER=production after `npm run build`: a production server
  // uses ~1-2 GB, while `next dev` compiling routes on demand grew to ~13 GB
  // and got the 16 GB runner killed mid-suite.
  webServer: isLocalTarget && !hasExplicitBaseURL
    ? {
        // E2E_SERVER=production needs `npm run build` first (CI does this);
        // without a build, `next start` exits at once with Next's own error.
        command: process.env.E2E_SERVER === "production" ? "npm run start:e2e" : "npm run dev:e2e",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 60_000,
        // Marks this server as Playwright-started; the test-only seed route
        // requires it in a production build (src/lib/planner/seed-routes.ts).
        env: { IPIX_E2E_WEBSERVER: "playwright" },
      }
    : undefined,
});
