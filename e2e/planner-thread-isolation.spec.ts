import { randomUUID } from "node:crypto";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

import { previewBypassHeaders } from "../playwright.config";
import { createCleanContext } from "./support/context";
import { contextForSavedRole } from "./support/login";
import { establishAndProveVercelBypass } from "./support/vercel-bypass";
import { plannerThreadStorageKey } from "../src/mastra/thread-types";

const orgBFile = path.resolve(__dirname, "../playwright/.auth/org-b.json");

/**
 * IPI-1217 · COPILOT-APP-DOCK-002 — gate 9: live Org A / Org B Planner-thread
 * isolation on the canonical `/app` surface.
 *
 * The deterministic route/unit coverage in tests/access-001.test.ts mocks the
 * session and Mastra memory. This spec drives the real `/api/planner/threads`
 * endpoints through two real signed-in Supabase sessions in two real,
 * single-member organizations (usera@ipix.co → iPix QA Org A,
 * userb@ipix.co → iPix QA Org B), so the deny path is proven end to end:
 * session cookie → requirePlannerResourceId → thread ACL → Mastra memory.
 *
 * Invariant under test: threadId *locates*, the stored Mastra `resourceId`
 * (`org:{orgId}::user:{userId}`) *authorizes*. A foreign caller must therefore
 * be denied even when it presents Org A's exact threadId.
 *
 * Org A's thread is created by a real message through the real `/app` dock
 * (the same acceptance path planner-journey.spec.ts uses), because the thread
 * must genuinely exist in Mastra memory for a deny to mean anything. That
 * costs one real model call, so this file lives in the `chromium-ai-smoke`
 * project and is excluded from the deterministic `chromium` suite.
 *
 * Asserts on one specific threadId and one unique message marker — never on
 * thread counts, which grow every run against these shared QA accounts.
 */
test.use({ trace: "off", screenshot: "off" });
test.setTimeout(240_000);
// Never retry: a retry re-sends the real, paid model request.
test.describe.configure({ retries: 0 });

type PlannerThreadRow = { id: string; title: string };
type PlannerChatMessage = { id: string; role: string; content: string };

const THREADS_API = "/api/planner/threads";
const REPLY_TIMEOUT_MS = 120_000;

async function listThreads(page: Page): Promise<{
  resourceId: string;
  threads: PlannerThreadRow[];
}> {
  const response = await page.request.get(THREADS_API);
  expect(
    response.status(),
    "GET /api/planner/threads should succeed for a signed-in, single-org operator",
  ).toBe(200);
  return (await response.json()) as { resourceId: string; threads: PlannerThreadRow[] };
}

function readThreadMessages(page: Page, threadId: string) {
  return page.request.get(`${THREADS_API}/${encodeURIComponent(threadId)}/messages`);
}

test(
  "org A vs org B: Planner thread API stays tenant-isolated live on /app",
  async ({ browser, page }) => {
    // ---- Org A: the default authenticated fixture (storageState from auth.setup.ts)
    await page.goto("/app");
    // Mirror planner-journey.spec.ts's proven /app sequence exactly: wait
    // for PlannerChatDock's own restore gate (ResolvedChatDock in
    // operator-panel.tsx renders only this status, withholding CopilotChat
    // — and therefore copilot-chat-textarea/copilot-send-button — until
    // RestoreMastraHistory's onSettled fires) before touching the composer.
    // Verified live: without this wait, sending into a resumed thread (this
    // shared QA account almost always has one once any earlier /app test in
    // this CI job has run) could complete the POST .../agent/default/run
    // call (200 OK) without the new message ever landing in Mastra's
    // durable store — while the identical wait-then-click sequence below,
    // copied from planner-journey.spec.ts, persisted correctly every time.
    await expect(page.getByRole("status", { name: "Loading conversation…" })).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    const dock = page.getByTestId("operator-chat-dock");
    await expect(dock).toBeVisible();

    const before = await listThreads(page);
    expect(before.resourceId, "Org A should resolve a server-derived resourceId").toBeTruthy();

    // Resolve the thread PlannerChatDock's own bootstrap actually pins,
    // instead of waiting for a "new" entry to appear in the thread list.
    // resolvePlannerThreadId() (src/mastra/thread-types.ts) *resumes* an
    // existing owned thread (rows[0]) whenever localStorage has no stored
    // id — every fresh Playwright context does, since auth.setup.ts's saved
    // storageState never visits /app — rather than always minting a new
    // one; it only mints fresh when the resource owns zero threads. On this
    // shared, long-lived QA account that's only true for the very first
    // AI-smoke test to touch Org A in a given server process: once
    // planner-journey.spec.ts's /app tests (which run first — see
    // playwright.config.ts's chromium-ai-smoke project) have created a
    // thread, this test's own context resumes THAT thread instead of a new
    // one, so diffing the list for a "new" id never resolves and times out
    // even though the app is behaving exactly as designed. Read back the
    // same resource-scoped storage key the UI persists (the same pattern
    // planner-journey.spec.ts already uses via getStoredPlannerThreadId)
    // so this test works whether Org A's thread is fresh or resumed.
    const orgAStorageKey = plannerThreadStorageKey(before.resourceId);
    const readOrgAThreadId = () =>
      page.evaluate((key) => window.localStorage.getItem(key), orgAStorageKey);
    await expect
      .poll(readOrgAThreadId, {
        timeout: REPLY_TIMEOUT_MS,
        message: "PlannerChatDock should resolve and persist a threadId for Org A",
      })
      .not.toBeNull();
    const orgAThreadId = await readOrgAThreadId();
    if (!orgAThreadId) {
      throw new Error("PlannerChatDock did not resolve a threadId for Org A");
    }
    const ownedOrgAThreadId = orgAThreadId;

    // ---- Step 3: send a message through the real dock into that thread so
    // the deny path below is proven against a thread that genuinely carries
    // content, not an empty one.
    const runMarker = `iso-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const messageText = `Reply with only the word "acknowledged". [${runMarker}]`;
    const textarea = page.getByTestId("copilot-chat-textarea");
    await textarea.click();
    await textarea.fill(messageText);
    await page.getByTestId("copilot-send-button").click();
    // CopilotKit's send button briefly doubles as a "Stop" control while the
    // agent's isRunning flag still reads true (e.g. while reconnecting to a
    // resumed thread — see TenantAbortRunner.connect()) and calls onStop()
    // instead of submitting (CopilotChatInput's handleSendButtonClick).
    // Verified live: a click landing in that window leaves the typed text
    // sitting unsent in the textarea. Its Enter-key handler only stops on
    // Enter when there's no text to send, so it reliably submits even
    // during that window — use it as a fallback only if the click above
    // didn't actually clear the box, rather than always bypassing the real
    // (and normally working — see planner-journey.spec.ts) click path. Wait
    // for the clear via an assertion (not an immediate one-shot read): send()
    // clears the textarea through a React state update, which can lag a
    // beat behind the click — reading inputValue() synchronously right
    // after risks a false "still has text" and firing Enter as well,
    // double-sending the message.
    try {
      await expect(textarea).toHaveValue("", { timeout: 5_000 });
    } catch {
      await textarea.press("Enter");
    }

    // The thread must carry this run's own message — otherwise a later Org B
    // deny would be a false positive against an empty thread.
    let orgAMessages: PlannerChatMessage[] = [];
    await expect
      .poll(
        async () => {
          const response = await readThreadMessages(page, ownedOrgAThreadId);
          if (response.status() !== 200) return false;
          const body = (await response.json()) as {
            threadId: string;
            messages: PlannerChatMessage[];
          };
          if (!body.messages.some((message) => message.content.includes(runMarker))) return false;
          orgAMessages = body.messages;
          return true;
        },
        {
          timeout: REPLY_TIMEOUT_MS,
          message: "Org A's own thread must contain this run's marker before we assert a deny",
        },
      )
      .toBe(true);
    expect(orgAMessages.length, "Org A's thread must expose message ids").toBeGreaterThan(0);
    const orgAMessageIds = orgAMessages.map((message) => message.id);

    // ---- Step 4: a completely isolated context authenticated as Org B.
    const { page: orgBPage, close: closeOrgB } = await contextForSavedRole(
      browser,
      orgBFile,
      "Missing playwright/.auth/org-b.json — set E2E_TEST_EMAIL_ORG_B / E2E_TEST_PASSWORD_ORG_B in .env.test",
    );

    try {
      await orgBPage.goto("/app");

      // ---- Step 5: Org B's listing must not contain Org A's specific thread.
      const orgB = await listThreads(orgBPage);
      expect(
        orgB.resourceId,
        "Org A and Org B must resolve different resourceIds (different org + user)",
      ).not.toBe(before.resourceId);
      expect(
        orgB.threads.some((thread) => thread.id === ownedOrgAThreadId),
        "tenant leak: Org B's /api/planner/threads listing includes Org A's thread",
      ).toBe(false);

      // ---- Steps 6 & 7: read Org A's exact threadId as Org B → denied, no data.
      const forbidden = await readThreadMessages(orgBPage, ownedOrgAThreadId);
      expect(
        forbidden.ok(),
        `Org B must not successfully read Org A's Planner thread; status=${forbidden.status()}`,
      ).toBe(false);
      expect(
        forbidden.status(),
        "a foreign thread read must be denied by the thread ACL (403 thread_forbidden)",
      ).toBe(403);

      const forbiddenBody = (await forbidden.json()) as {
        error?: string;
        reason?: string;
        messages?: unknown;
      };
      // Playwright's APIResponse buffers the body, so .text() below re-reads
      // the same response rather than consuming a stream .json() already
      // drained — needed separately for the raw-content leak checks, which
      // must catch a leak anywhere in the body, not just in typed fields.
      const forbiddenText = await forbidden.text();
      expect(
        forbiddenBody,
        "denial should be the explicit thread_forbidden contract, not a generic error",
      ).toMatchObject({ error: "forbidden", reason: "thread_forbidden" });
      // The deny body must not carry any Org A conversation.
      expect(
        forbiddenBody.messages,
        "deny response must not include a messages payload",
      ).toBeUndefined();
      expect(
        forbiddenText.includes(runMarker),
        "tenant leak: Org A's message content appeared in Org B's denial response",
      ).toBe(false);
      for (const messageId of orgAMessageIds) {
        expect(
          forbiddenText.includes(messageId),
          `Org A message id ${messageId} leaked into Org B's denial response`,
        ).toBe(false);
      }

      // Org B can still read its own (empty) list — the deny above is
      // authorization, not a broken session.
      const orgBAfter = await listThreads(orgBPage);
      expect(
        orgBAfter.threads.some((thread) => thread.id === ownedOrgAThreadId),
        "tenant leak: Org B acquired Org A's thread after the denied read",
      ).toBe(false);

      // ---- Browser-level restore attempt: plant Org A's threadId in Org B's
      // OWN resource-scoped storage key and reload /app. This is the real-world
      // stale/foreign-bookmark attack the resolver exists to stop: the UI must
      // mint a fresh thread rather than adopt (and render) Org A's conversation.
      const findOrgBKey = () =>
        orgBPage.evaluate(
          () =>
            Object.keys(window.localStorage).find((key) =>
              key.startsWith("ipix.planner.threadId:"),
            ) ?? null,
        );
      await expect
        .poll(findOrgBKey, {
          timeout: 30_000,
          message: "Org B should persist its resource-scoped planner storage key",
        })
        .not.toBeNull();
      const orgBKey = await findOrgBKey();
      if (!orgBKey) {
        throw new Error("Org B planner storage key was not initialized");
      }
      expect(
        orgBKey,
        "Org B's storage key must be scoped to Org B's own resourceId, not Org A's",
      ).not.toBe(`ipix.planner.threadId:${before.resourceId}`);

      await orgBPage.evaluate(
        ([key, id]) => {
          window.localStorage.setItem(key, id);
        },
        [orgBKey, ownedOrgAThreadId],
      );
      await orgBPage.reload();
      await expect(orgBPage.getByTestId("operator-chat-dock")).toBeVisible({ timeout: 30_000 });

      // The bootstrap is async (fetch threads → resolve → write back), so poll
      // rather than reading once on mount: resolvePlannerThreadId returns a
      // fresh crypto.randomUUID() for a stored id that is absent from this
      // resource's own list, and the panel then persists that fresh id.
      await expect
        .poll(
          async () => {
            const value = await orgBPage.evaluate(
              (key) => window.localStorage.getItem(key),
              orgBKey,
            );
            return typeof value === "string" && value.length > 0 && value !== ownedOrgAThreadId;
          },
          {
            timeout: 30_000,
            message:
              "tenant leak: Org B's UI did not persist a fresh threadId after rejecting Org A's threadId",
          },
        )
        .toBe(true);
      await expect(
        orgBPage.getByText(runMarker),
        "tenant leak: Org B restored Org A's conversation content in the browser",
      ).toHaveCount(0);
    } finally {
      await closeOrgB();
    }

    // ---- Org A retains access after Org B's attempt (no destructive side effect).
    const orgAAfter = await readThreadMessages(page, ownedOrgAThreadId);
    expect(
      orgAAfter.status(),
      "Org A lost access to its own Planner thread after Org B's attempt",
    ).toBe(200);
  },
);

test("planner thread API rejects unauthenticated requests", async ({ browser, baseURL }) => {
  // createCleanContext is mandatory here: browser.newContext() inherits the
  // project's `use.storageState`, which would silently make this an
  // *authenticated* Org A request and turn a real 401 into a false 200.
  const context = await createCleanContext(browser);
  try {
    const page = await context.newPage();

    const cookies = await context.cookies();
    expect(cookies, "the unauthenticated context must carry no cookies").toHaveLength(0);

    // IPI-1329: on a protected Vercel Preview a cookie-less request never
    // reaches iPix — Vercel answers with its own "Protected Deployment" login
    // page (HTTP 200 HTML), a false 200 for this assertion. Clear Deployment
    // Protection only (not iPix auth), then prove no Supabase session exists.
    const bypass = previewBypassHeaders(
      baseURL ?? "",
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    );
    if (bypass && baseURL) {
      await establishAndProveVercelBypass({
        context,
        page,
        deploymentOrigin: new URL(baseURL).origin,
        headers: bypass,
      });
      const sessionCookies = (await context.cookies()).filter((cookie) =>
        cookie.name.startsWith("sb-"),
      );
      expect(sessionCookies, "the bypass must not carry a Supabase session").toHaveLength(0);
    }

    const list = await page.request.get(THREADS_API);
    expect(
      list.status(),
      "unauthenticated GET /api/planner/threads must be rejected with 401",
    ).toBe(401);
    expect(await list.json()).toMatchObject({ error: "unauthorized" });

    const read = await page.request.get(
      `${THREADS_API}/00000000-0000-0000-0000-000000000000/messages`,
    );
    expect(
      read.status(),
      "unauthenticated thread read must be rejected with 401",
    ).toBe(401);
  } finally {
    await context.close();
  }
});
