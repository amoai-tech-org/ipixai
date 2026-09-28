import { test, expect } from "@playwright/test";

import { collectBrowserProblems, isAgentRun as isRun, isAgentStop as isStop } from "./support/browser-problems";
import { collectCertThreadIds } from "./support/cert-trace";

/**
 * IPI-1290 · COPILOTKIT-UPGRADE-001 — the real browser Stop journey.
 *
 * R1 streams → user presses Stop → R2 is sent → the exact Stop(R1) request is
 * replayed while R2 streams → R2 must still finish. Also proves the browser's
 * /stop body names the run, and that the whole journey produces no console
 * errors, uncaught page errors, or 5xx responses.
 *
 * Makes real, paid model calls through the Planner, so it lives in the
 * chromium-ai-smoke project (see playwright.config.ts), never in required CI.
 */
const NAV_TIMEOUT_MS = 30_000;
const RESPONSE_TIMEOUT_MS = 90_000;

/**
 * IPI-1339 · PLANNER-PAYLOAD-001 — Vercel rejects a function request body above
 * 4.5 MB with `413 FUNCTION_PAYLOAD_TOO_LARGE`. A single Planner turn measured
 * ~1-9 KB, so this ceiling is generous while still catching the amplification
 * that produced an 8.5 MB body (one persisted 8,410,422-byte tool message).
 */
const BOUNDED_RUN_BODY_BYTES = 64 * 1024;
/** Distinctive text from R1; only the newest turn may be forwarded on a run. */
const R1_PROMPT = "Write a detailed 800-word creative brief for a linen dress lookbook shoot, section by section.";

test.describe("planner stop journey (authenticated) @S6b1f0290", () => {
  // Never retry: each attempt re-sends real, paid model requests.
  test.describe.configure({ retries: 0 });

  test("Stop ends only its own run; a late Stop(R1) leaves R2 running to completion", async ({ page }) => {
    test.setTimeout(RESPONSE_TIMEOUT_MS * 3 + NAV_TIMEOUT_MS * 6);
    const problems = collectBrowserProblems(page);
    // Recorded before the first send so no Stop request can be missed. The
    // provider-side log check requires this journey's own thread id to appear in
    // the Production window it scans; CopilotKit traffic from other live
    // operators must not be able to satisfy that check.
    const certTrace = collectCertThreadIds(page);
    const marker = `r2-${Date.now().toString(36)}`;

    await page.goto("/app");
    await expect(page.getByRole("status", { name: "Loading conversation…" })).toHaveCount(0, {
      timeout: NAV_TIMEOUT_MS,
    });
    const dock = page.getByTestId("operator-chat-dock");
    const textarea = dock.getByTestId("copilot-chat-textarea");
    const sendOrStop = dock.getByTestId("copilot-send-button");
    const assistant = dock.getByTestId("copilot-assistant-message");

    // R1: stopped while it is still running. The composer is empty after
    // send, so an enabled button can only be Stop; waiting for text first let
    // a short answer finish before the click (the button went back to a
    // disabled Send and Stop could never be pressed).
    await textarea.fill(R1_PROMPT);
    const r1Run = page.waitForRequest(isRun);
    await sendOrStop.click();
    await r1Run;
    // CopilotKit 1.73.3 marks Stop mode only by swapping the arrow for a
    // Square icon (no aria-label or data attribute), so assert that too.
    await expect(sendOrStop.locator("svg.lucide-square"), "R1 is running, so the button is Stop").toBeVisible({
      timeout: NAV_TIMEOUT_MS,
    });
    await expect(sendOrStop).toBeEnabled();

    const stopRequest = page.waitForRequest(isStop);
    await sendOrStop.click(); // the send button is the Stop button while a run streams
    const stop = await stopRequest;
    const stopBody = stop.postDataJSON() as { runId?: unknown } | null;
    expect(typeof stopBody?.runId, "browser Stop must name the exact run").toBe("string");
    expect(String(stopBody?.runId)).not.toBe("");
    const stopResponse = await stop.response();
    expect(stopResponse?.status(), "Stop(R1) must be accepted").toBe(200);

    // R2: send, then replay the exact Stop(R1) while R2 streams.
    await expect(textarea).toBeEditable({ timeout: NAV_TIMEOUT_MS });
    // An accepted Stop is not the same as a settled client: CopilotKit returns
    // the composer to send-ready only once R1's terminal event arrives, which
    // is bounded but not instant (measured ~0.5-1.5 s on a warm instance,
    // longer on a cold one). Clicking while the button is still Stop sends a
    // second Stop instead of R2's run, and the journey then waits out its
    // timeout for a /run that was never sent.
    // `toBeHidden` passes when the Stop icon is unmounted *or* merely not
    // visible, so it holds whichever way CopilotKit swaps the affordance.
    await expect(
      sendOrStop.locator("svg.lucide-square"),
      "R1 must return to send-ready before the next message is sent",
    ).toBeHidden({ timeout: NAV_TIMEOUT_MS });
    await textarea.fill(
      `List 8 one-line shot ideas for a linen dress collection. After the list, end with the exact line ${marker}`,
    );
    const r2Run = page.waitForRequest(isRun);
    await sendOrStop.click();
    const r2 = await r2Run;
    // IPI-1339: R2 carries only its own turn even though R1's exchange is
    // already in the client transcript.
    expect(
      r2.postData() ?? "",
      "a run must not resend earlier turns now that Mastra owns the thread",
    ).not.toContain(R1_PROMPT);
    const replay = await page.request.post(stop.url(), {
      data: stop.postData() ?? "",
      headers: { "content-type": "application/json" },
    });
    // 200 + stopped:false is CopilotKit's "nothing to stop" answer, so an auth
    // or not-found rejection cannot pass for a stale Stop that was ignored.
    expect(replay.status(), "the late Stop(R1) is accepted as a no-op").toBe(200);
    expect(((await replay.json()) as { stopped?: unknown }).stopped, "the late Stop(R1) stops nothing").toBe(false);

    await expect(assistant.last(), "R2 must finish despite the late Stop(R1)").toContainText(marker, {
      timeout: RESPONSE_TIMEOUT_MS,
    });

    // History: after reload the R2 turn restores exactly once.
    await page.reload();
    await expect(page.getByRole("status", { name: "Loading conversation…" })).toHaveCount(0, {
      timeout: NAV_TIMEOUT_MS,
    });
    await expect(dock.getByTestId("copilot-user-message").filter({ hasText: marker })).toHaveCount(1, {
      timeout: NAV_TIMEOUT_MS,
    });
    await expect(assistant.filter({ hasText: marker })).toHaveCount(1, {
      timeout: NAV_TIMEOUT_MS,
    });

    // IPI-1339 · PLANNER-PAYLOAD-001 — the decisive run: after reload the client
    // holds the whole restored transcript, so this is the request that used to
    // grow with stored history until Vercel rejected it. Measure the real
    // browser body rather than estimating it.
    await expect(textarea).toBeEditable({ timeout: NAV_TIMEOUT_MS });
    const followUpMarker = `r3-${Date.now().toString(36)}`;
    await textarea.fill(`Reply with only this token, nothing else: ${followUpMarker}`);
    const r3Run = page.waitForRequest(isRun);
    const r3Response = page.waitForResponse((response) => isRun(response.request()));
    await sendOrStop.click();
    const [followUp, followUpResponse] = await Promise.all([r3Run, r3Response]);

    expect(
      followUpResponse.status(),
      "the restored-thread run must be accepted, not rejected as FUNCTION_PAYLOAD_TOO_LARGE",
    ).toBe(200);
    const { requestBodySize } = await followUp.sizes();
    expect(
      requestBodySize,
      "the run body must stay far below Vercel's 4.5 MB function payload ceiling",
    ).toBeLessThan(BOUNDED_RUN_BODY_BYTES);
    expect(
      followUp.postData() ?? "",
      "restored durable history must not be re-sent — only the newest turn is forwarded",
    ).not.toContain(R1_PROMPT);
    await expect(assistant.last(), "the follow-up after restore must still be answered").toContainText(
      followUpMarker,
      { timeout: RESPONSE_TIMEOUT_MS },
    );

    // Published before the final assertion: a journey that fails on an
    // unexpected problem still leaves the window it used on disk, so the log
    // check reports against the real ids instead of failing as misconfigured.
    // An empty trace is a hard failure — without a thread id the log check
    // cannot tie the scanned window to this run, and a check that cannot tie
    // them proves nothing.
    const written = certTrace.write();
    expect(
      written.threadIds.length,
      "the journey must name at least one Planner thread for the Production log check",
    ).toBeGreaterThan(0);
    // The provider-side check needs this to prove the scanned log window reaches
    // back over the whole journey. Fail here — where the cause is obvious —
    // rather than letting the log check discover an unusable trace afterwards.
    expect(
      typeof written.firstCopilotkitRequestAtMs,
      "the journey must record when its first CopilotKit request went out",
    ).toBe("number");

    expect(problems, "no console errors, page errors, or 5xx during the journey").toEqual([]);
  });
});
