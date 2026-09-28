import { describe, expect, it, vi } from "vitest";

import {
  analyzePlannerProductionLogs,
  evaluatePlannerProductionLogs,
  readCertThreadIdsFromTrace,
  readCertTrace,
  runPlannerProductionLogCheck,
} from "../scripts/check-planner-production-logs.mjs";

/**
 * The thread id the real certification named. Taken from live Production logs on
 * 2026-09-28 (`POST /api/copilotkit/agent/default/stop/a965d188-…`) and from the
 * matching `/api/planner/threads/<id>/messages` reads, so the fixture matches
 * what the log check actually has to find rather than an invented shape.
 */
const CERT_THREAD_ID = "a965d188-06b2-4678-b82b-9af78fa66461";
const OTHER_THREAD_ID = "b17c4e02-1111-4222-8333-444455556666";

function traceJson(threadIds: string[] = [CERT_THREAD_ID]): string {
  return `${JSON.stringify({ threadIds })}\n`;
}

/**
 * IPI-1332 · CERT-PROD-001 — the shapes below are copied from real
 * `vercel logs --json` output (100 production entries, 2026-09-28). Every entry
 * carried `requestPath` + `responseStatusCode`; none carried `statusCode`,
 * `status`, `path` or `proxy`. The earlier inline parser read only the latter
 * set, resolved every status to `undefined`, and so reported "no 5xx" without
 * ever reading a status — the `detects a 5xx on the real vercel logs field
 * names` case below is the guard against repeating that.
 *
 * The default path is the Stop call, because that is the request that carries
 * the certification's thread id in its URL.
 */
function vercelLogEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "nngd5-1790552958225-4a30c6a215c4",
    timestamp: 1790552958225,
    deploymentId: "dpl_example",
    projectId: "prj_example",
    level: "info",
    message: "",
    source: "serverless-middleware",
    domain: "www.ipix.co",
    requestMethod: "POST",
    requestPath: `/api/copilotkit/agent/default/stop/${CERT_THREAD_ID}`,
    responseStatusCode: 200,
    environment: "production",
    branch: "",
    cache: "MISS",
    cacheReason: "",
    pprState: "",
    traceId: "",
    logs: [],
    ...overrides,
  };
}

function asJsonLines(entries: unknown[]): string {
  return `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`;
}

describe("planner production log check", () => {
  it("detects a 5xx on the real vercel logs field names", () => {
    const summary = analyzePlannerProductionLogs(
      asJsonLines([
        vercelLogEntry(),
        vercelLogEntry({ responseStatusCode: 500, requestPath: "/api/copilotkit/info" }),
      ]),
    );

    expect(summary.parsedEntries).toBe(2);
    expect(summary.copilotkitRequests).toBe(2);
    expect(summary.copilotkit5xx).toEqual(["500 /api/copilotkit/info"]);
    expect(evaluatePlannerProductionLogs(summary).ok).toBe(false);
  });

  it("still reads the alternate status/path field names if the CLI shape changes", () => {
    const summary = analyzePlannerProductionLogs(
      asJsonLines([{ statusCode: 503, path: "/api/copilotkit/agent/default/run" }]),
    );

    expect(summary.copilotkit5xx).toEqual(["503 /api/copilotkit/agent/default/run"]);
    expect(evaluatePlannerProductionLogs(summary).ok).toBe(false);
  });

  it("passes a real-shaped clean window and reports the scanned volume", () => {
    const entries = [
      ...Array.from({ length: 96 }, () => vercelLogEntry()),
      ...Array.from({ length: 4 }, () =>
        vercelLogEntry({ responseStatusCode: 404, requestPath: "/_vercel/insights/script.js" }),
      ),
    ];

    const summary = analyzePlannerProductionLogs(asJsonLines(entries));

    expect(summary.parsedEntries).toBe(100);
    expect(summary.unparsable).toBe(0);
    expect(summary.copilotkitRequests).toBe(96);
    expect(summary.copilotkit5xx).toEqual([]);
    expect(summary.other5xx).toEqual([]);
    expect(evaluatePlannerProductionLogs(summary).ok).toBe(true);
  });

  // Fail-open was the reported defect: `|| true` turned a failed log query into
  // a pass, because an empty file parsed to zero errors.
  it("fails when the log query returned nothing at all", () => {
    const summary = analyzePlannerProductionLogs("");
    const verdict = evaluatePlannerProductionLogs(summary);

    expect(summary.totalLines).toBe(0);
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(" ")).toContain("could not run");
  });

  it("fails when the returned lines are not parsable log entries", () => {
    const summary = analyzePlannerProductionLogs("not json\nalso not json\n");
    const verdict = evaluatePlannerProductionLogs(summary);

    expect(summary.parsedEntries).toBe(0);
    expect(summary.unparsable).toBe(2);
    expect(verdict.ok).toBe(false);
  });

  it("fails when the window contains no /api/copilotkit traffic to certify", () => {
    const summary = analyzePlannerProductionLogs(
      asJsonLines([vercelLogEntry({ requestPath: "/app", responseStatusCode: 200 })]),
    );
    const verdict = evaluatePlannerProductionLogs(summary);

    expect(summary.copilotkitRequests).toBe(0);
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(" ")).toContain("not observed");
  });

  // The decisive guard. Live Production produces /api/copilotkit traffic from
  // real operators whether or not this journey ran — measured on `479087b1`, a
  // 30-second slice held ~1100 such requests while the journey makes 11 — so
  // "some CopilotKit traffic was seen" can be satisfied by somebody else's
  // session and would certify a window that never contained the run.
  it("fails when the window holds copilotkit traffic but not this certification's thread", () => {
    const summary = analyzePlannerProductionLogs(
      asJsonLines([
        vercelLogEntry({ requestPath: `/api/copilotkit/agent/default/stop/${OTHER_THREAD_ID}` }),
        vercelLogEntry({ requestPath: "/api/copilotkit/agent/default/run" }),
      ]),
      { certThreadIds: [CERT_THREAD_ID] },
    );
    const verdict = evaluatePlannerProductionLogs(summary);

    expect(summary.copilotkitRequests).toBe(2);
    expect(summary.certThreadHits).toEqual([]);
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(" ")).toContain("does not contain the certification");
  });

  it("passes when the certification's own thread appears in the window", () => {
    const summary = analyzePlannerProductionLogs(
      asJsonLines([
        vercelLogEntry({ requestPath: `/api/copilotkit/agent/default/stop/${CERT_THREAD_ID}` }),
        vercelLogEntry({ requestPath: `/api/planner/threads/${CERT_THREAD_ID}/messages` }),
      ]),
      { certThreadIds: [CERT_THREAD_ID] },
    );

    expect(summary.certThreadHits).toEqual([CERT_THREAD_ID]);
    expect(evaluatePlannerProductionLogs(summary).ok).toBe(true);
  });

  // `vercel logs` returns the newest --limit entries, so reaching the ceiling
  // drops the OLDEST entries rather than the journey — and the thread-id guard
  // independently proves the journey is inside the window. Reported, not gated:
  // failing here would reject a window that demonstrably contains the run.
  it("warns without failing when the scan reached the limit", () => {
    const summary = analyzePlannerProductionLogs(
      asJsonLines(Array.from({ length: 50 }, () => vercelLogEntry())),
      { certThreadIds: [CERT_THREAD_ID] },
    );

    const reached = evaluatePlannerProductionLogs(summary, { maxEntries: 50 });
    expect(reached.ok, "a window containing the certification must not fail on volume").toBe(true);
    expect(reached.warnings.join(" ")).toContain("ceiling");

    expect(evaluatePlannerProductionLogs(summary, { maxEntries: 5000 }).warnings).toEqual([]);
  });

  // Evidence for the run log: the span actually scanned is the only honest
  // statement of what the 5xx count covers.
  it("reports the window span it actually scanned", () => {
    const summary = analyzePlannerProductionLogs(
      asJsonLines([
        vercelLogEntry({ timestamp: 1790552958000 }),
        vercelLogEntry({ timestamp: 1790552958225 }),
      ]),
    );

    expect(summary.windowStartMs).toBe(1790552958000);
    expect(summary.windowEndMs).toBe(1790552958225);
    expect(analyzePlannerProductionLogs("{}").windowStartMs).toBeNull();
  });

  // Coverage is gated precisely rather than by volume. Hitting the ceiling alone
  // says nothing about the journey: a real certification run on 2026-09-28 hit
  // the 5000 ceiling while still scanning from 791 ms BEFORE its first request,
  // so failing on volume would have rejected a run that was fully covered. What
  // matters is whether the scan reaches back before the journey began — if it
  // does not, an early `/run` 5xx could have been dropped.
  describe("scan coverage of the journey", () => {
    const FIRST_REQUEST = 1790552958225;

    it("fails when the scan starts after the certification's first request", () => {
      const summary = analyzePlannerProductionLogs(
        asJsonLines([vercelLogEntry({ timestamp: FIRST_REQUEST + 60_000 })]),
        { certThreadIds: [CERT_THREAD_ID], firstCertRequestAtMs: FIRST_REQUEST },
      );

      const verdict = evaluatePlannerProductionLogs(summary);
      expect(verdict.ok).toBe(false);
      expect(verdict.problems.join(" ")).toContain("truncated");
    });

    it("passes when the scan reaches back before the first request", () => {
      const summary = analyzePlannerProductionLogs(
        asJsonLines([vercelLogEntry({ timestamp: FIRST_REQUEST - 791 })]),
        { certThreadIds: [CERT_THREAD_ID], firstCertRequestAtMs: FIRST_REQUEST },
      );

      expect(evaluatePlannerProductionLogs(summary).ok).toBe(true);
    });

    it("tolerates clock skew between the runner and the provider", () => {
      const summary = analyzePlannerProductionLogs(
        asJsonLines([vercelLogEntry({ timestamp: FIRST_REQUEST + 1_500 })]),
        { certThreadIds: [CERT_THREAD_ID], firstCertRequestAtMs: FIRST_REQUEST },
      );

      expect(evaluatePlannerProductionLogs(summary).ok).toBe(true);
    });

    it("skips the coverage gate when the trace predates the stamp", () => {
      const summary = analyzePlannerProductionLogs(
        asJsonLines([vercelLogEntry({ timestamp: FIRST_REQUEST + 60_000 })]),
        { certThreadIds: [CERT_THREAD_ID] },
      );

      expect(summary.certFirstRequestAtMs).toBeNull();
      expect(evaluatePlannerProductionLogs(summary).ok).toBe(true);
    });
  });

  it("reads the first-request stamp from the trace and rejects junk", () => {
    expect(readCertTrace(traceJson()).firstCopilotkitRequestAtMs).toBeNull();
    expect(
      readCertTrace(JSON.stringify({ threadIds: [], firstCopilotkitRequestAtMs: 123 }))
        .firstCopilotkitRequestAtMs,
    ).toBe(123);
    expect(
      readCertTrace(JSON.stringify({ threadIds: [], firstCopilotkitRequestAtMs: "nope" }))
        .firstCopilotkitRequestAtMs,
    ).toBeNull();
    expect(readCertTrace("not json").firstCopilotkitRequestAtMs).toBeNull();
  });

  it("reads thread ids from the certification trace and rejects junk", () => {
    expect(readCertThreadIdsFromTrace(traceJson())).toEqual([CERT_THREAD_ID]);
    expect(readCertThreadIdsFromTrace(traceJson([CERT_THREAD_ID.toUpperCase()]))).toEqual([
      CERT_THREAD_ID,
    ]);
    expect(readCertThreadIdsFromTrace("not json")).toEqual([]);
    expect(readCertThreadIdsFromTrace(JSON.stringify({ threadIds: "nope" }))).toEqual([]);
    expect(readCertThreadIdsFromTrace("")).toEqual([]);
  });

  it("reports non-copilotkit 5xx without gating on them", () => {
    const summary = analyzePlannerProductionLogs(
      asJsonLines([
        vercelLogEntry(),
        vercelLogEntry({ requestPath: "/api/other", responseStatusCode: 502 }),
      ]),
    );

    expect(summary.other5xx).toEqual(["502 /api/other"]);
    expect(summary.copilotkit5xx).toEqual([]);
    expect(evaluatePlannerProductionLogs(summary).ok).toBe(true);
  });

  describe("runPlannerProductionLogCheck", () => {
    const TRACE_PATH = "/tmp/planner-cert-trace.json";

    // `NODE_ENV` is required by Next.js's `ProcessEnv` augmentation, so build a
    // complete env rather than spreading a partial one. `readFile` is
    // path-aware because the check now reads two files: the log dump and the
    // certification trace.
    function run(
      text: string | Error,
      { traceText = traceJson(), env = {} }: { traceText?: string | null; env?: Record<string, string> } = {},
    ) {
      const log = vi.fn();
      const error = vi.fn();
      const result = runPlannerProductionLogCheck({
        env: {
          NODE_ENV: "test",
          PROD_LOG_FILE: "/tmp/logs.jsonl",
          CERT_TRACE_FILE: TRACE_PATH,
          ...env,
        },
        readFile: (path: string) => {
          if (path === TRACE_PATH) {
            if (traceText === null) throw new Error("ENOENT: no such file");
            return traceText;
          }
          if (text instanceof Error) throw text;
          return text;
        },
        log,
        error,
      });
      return { result, log, error };
    }

    it("exits 0 on a clean window", () => {
      const { result, log } = run(asJsonLines([vercelLogEntry()]));
      expect(result.exitCode).toBe(0);
      expect(log.mock.calls.flat().join(" ")).toContain("Planner production logs OK");
    });

    it("exits 1 on a copilotkit 5xx", () => {
      const { result, error } = run(
        asJsonLines([vercelLogEntry({ responseStatusCode: 500 })]),
      );
      expect(result.exitCode).toBe(1);
      expect(error.mock.calls.flat().join(" ")).toContain("::error");
    });

    it("exits 1 when the query returned nothing usable", () => {
      expect(run("").result.exitCode).toBe(1);
      expect(run("garbage\n").result.exitCode).toBe(1);
    });

    it("exits 2 when the log file is missing or unreadable", () => {
      expect(run(new Error("ENOENT")).result.exitCode).toBe(2);
      expect(run("", { env: { PROD_LOG_FILE: "" } }).result.exitCode).toBe(2);
    });

    // Without the certification's thread ids this check cannot tell its own
    // traffic from any other live operator's, so it refuses to run at all
    // rather than report a pass it cannot support.
    it("exits 2 when the certification trace is missing, unreadable or empty", () => {
      const unset = run(asJsonLines([vercelLogEntry()]), { env: { CERT_TRACE_FILE: "" } });
      expect(unset.result.exitCode).toBe(2);
      expect(unset.error.mock.calls.flat().join(" ")).toContain("CERT_TRACE_FILE is required");

      expect(run(asJsonLines([vercelLogEntry()]), { traceText: null }).result.exitCode).toBe(2);
      expect(run(asJsonLines([vercelLogEntry()]), { traceText: traceJson([]) }).result.exitCode).toBe(2);
    });

    it("exits 1 when the window does not contain the certification's own thread", () => {
      const { result, error } = run(
        asJsonLines([vercelLogEntry({ requestPath: `/api/copilotkit/agent/default/stop/${OTHER_THREAD_ID}` })]),
      );
      expect(result.exitCode).toBe(1);
      expect(error.mock.calls.flat().join(" ")).toContain("does not contain the certification");
    });

    it("exits 0 but warns when the scan hit the configured limit", () => {
      const { result, log } = run(asJsonLines([vercelLogEntry()]), { env: { PROD_LOG_LIMIT: "1" } });
      expect(result.exitCode).toBe(0);
      expect(log.mock.calls.flat().join(" ")).toContain("::warning::");
    });

    it("exits 1 when the scan starts after the certification's first request", () => {
      const firstRequest = 1790552958225;
      const { result, error } = run(
        asJsonLines([vercelLogEntry({ timestamp: firstRequest + 60_000 })]),
        {
          traceText: `${JSON.stringify({
            threadIds: [CERT_THREAD_ID],
            firstCopilotkitRequestAtMs: firstRequest,
          })}\n`,
        },
      );

      expect(result.exitCode).toBe(1);
      expect(error.mock.calls.flat().join(" ")).toContain("truncated");
    });

    it("warns about non-copilotkit 5xx while still passing", () => {
      const { result, log } = run(
        asJsonLines([vercelLogEntry(), vercelLogEntry({ requestPath: "/api/x", responseStatusCode: 500 })]),
      );
      expect(result.exitCode).toBe(0);
      expect(log.mock.calls.flat().join(" ")).toContain("::warning::");
    });
  });
});
