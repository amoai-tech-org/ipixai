import { describe, expect, it, vi } from "vitest";

import {
  analyzePlannerProductionLogs,
  evaluatePlannerProductionLogs,
  runPlannerProductionLogCheck,
} from "../scripts/check-planner-production-logs.mjs";

/**
 * IPI-1332 · CERT-PROD-001 — the shapes below are copied from real
 * `vercel logs --json` output (100 production entries, 2026-09-28). Every entry
 * carried `requestPath` + `responseStatusCode`; none carried `statusCode`,
 * `status`, `path` or `proxy`. The earlier inline parser read only the latter
 * set, resolved every status to `undefined`, and so reported "no 5xx" without
 * ever reading a status — the `detects a 5xx on the real vercel logs field
 * names` case below is the guard against repeating that.
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
    requestPath: "/api/copilotkit/agent/default/run",
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
    // `NODE_ENV` is required by Next.js's `ProcessEnv` augmentation, so build a
    // complete env rather than spreading a partial one.
    function run(text: string | Error, overrides: Record<string, string> = {}) {
      const log = vi.fn();
      const error = vi.fn();
      const result = runPlannerProductionLogCheck({
        env: { NODE_ENV: "test", PROD_LOG_FILE: "/tmp/logs.jsonl", ...overrides },
        readFile: () => {
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
      expect(run("", { PROD_LOG_FILE: "" }).result.exitCode).toBe(2);
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
