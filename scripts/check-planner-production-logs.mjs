import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * IPI-1332 · CERT-PROD-001 — independent, provider-side 5xx check for the
 * Production Planner certification window.
 *
 * The browser collector inside `e2e/planner-stop-journey.spec.ts` only sees
 * responses the page actually received. This reads the deployment's own runtime
 * logs instead, so a 5xx that never reached the browser is still caught.
 *
 * Fail closed. An unusable log query, an empty response, a window with no
 * `/api/copilotkit` traffic, or a window that does not contain the
 * certification's own thread all mean "this check did not verify anything" —
 * none of them may be reported as "no 5xx". The workflow previously piped
 * `vercel logs` through `|| true`, which turned a failed query into a pass.
 *
 * `vercel logs` returns the newest `--limit` entries, so the limit decides the
 * real window. Measured on 2026-09-28: `--limit 50` returned 50 entries and
 * `--limit 5000` returned 5000 for the same requested range, while `--limit
 * 20000` returned 6950 for a window where 5000 had returned 5000 — so the
 * ceiling genuinely truncates. Reaching it is reported as a warning, because
 * volume alone does not say whether the JOURNEY was covered: a real run hit the
 * ceiling while still scanning from 791 ms before its first request. Coverage is
 * gated separately and precisely — the certification trace records when its
 * first CopilotKit request went out, and the scan must reach back before it.
 *
 * Why the certification's own thread id is required: Production is live, so
 * `/api/copilotkit` traffic exists whether or not this journey ran. Measured on
 * `479087b1`, a 30-second slice held ~1100 such requests while the journey makes
 * 11, so "some CopilotKit traffic was seen" is satisfied by other operators and
 * would certify a window that never contained the run. The journey publishes the
 * thread ids it named (`e2e/support/cert-trace.ts`) and at least one must appear
 * in the scanned entries.
 */

const COPILOTKIT_PATH = /\/api\/copilotkit/;

/**
 * Slack allowed between the browser stamping its first request and the provider
 * logging it. The log entry is written after the request arrives, so the entry
 * timestamp is normally LATER than the browser's `Date.now()`; this tolerance
 * covers clock skew between the CI runner and Vercel, which would otherwise make
 * a complete scan look like it started slightly too late.
 */
const CLOCK_SKEW_TOLERANCE_MS = 2_000;

/**
 * `vercel logs --json` emits `responseStatusCode` / `requestPath` (verified
 * against 100 real production entries on 2026-09-28: every entry carried those
 * two keys and none carried `statusCode`, `status`, `path`, or `proxy`). The
 * earlier inline version read only `statusCode`/`status`/`proxy.statusCode`, so
 * it resolved every status to `undefined` and could never have detected a 5xx —
 * an invalid green. The alternates are kept only so a future CLI shape change
 * degrades to "reported" rather than silently passing.
 */
const STATUS_KEYS = ["responseStatusCode", "statusCode", "status"];
const PATH_KEYS = ["requestPath", "path"];

function firstNumber(entry, keys) {
  for (const key of keys) {
    const value = entry?.[key];
    if (typeof value === "number") return value;
  }
  const proxyStatus = entry?.proxy?.statusCode;
  return typeof proxyStatus === "number" ? proxyStatus : null;
}

function firstString(entry, keys) {
  for (const key of keys) {
    const value = entry?.[key];
    if (typeof value === "string" && value !== "") return value;
  }
  const proxyPath = entry?.proxy?.path;
  return typeof proxyPath === "string" ? proxyPath : "";
}

function statusOf(entry) {
  return firstNumber(entry, STATUS_KEYS);
}

function pathOf(entry) {
  return firstString(entry, PATH_KEYS);
}

/**
 * Which of the certification's own thread ids appear in the scanned entries.
 *
 * Matched against the serialized entry as well as the named path fields, for
 * the same reason the CopilotKit match is: the id is known to appear in
 * `requestPath` today, but a log shape change must degrade to "not found"
 * (a failure) rather than to a false pass.
 */
function findCertThreadHits(entries, certThreadIds) {
  if (certThreadIds.length === 0) return [];

  const hits = new Set();
  for (const entry of entries) {
    const haystack = `${pathOf(entry)} ${JSON.stringify(entry)}`.toLowerCase();
    for (const id of certThreadIds) {
      if (haystack.includes(id)) hits.add(id);
    }
  }
  return [...hits];
}

/**
 * The certification trace: its thread ids, plus when its first CopilotKit
 * request went out (used to prove the scanned window reaches back before the
 * journey started).
 *
 * @param {string} rawTraceText
 * @returns {{ threadIds: string[], firstCopilotkitRequestAtMs: number | null }}
 */
export function readCertTrace(rawTraceText) {
  let parsed;
  try {
    parsed = JSON.parse(String(rawTraceText ?? ""));
  } catch {
    return { threadIds: [], firstCopilotkitRequestAtMs: null };
  }

  const ids = parsed?.threadIds;
  const first = parsed?.firstCopilotkitRequestAtMs;
  return {
    threadIds: Array.isArray(ids)
      ? ids
          .filter((id) => typeof id === "string" && id.trim() !== "")
          .map((id) => id.trim().toLowerCase())
      : [],
    firstCopilotkitRequestAtMs: typeof first === "number" && Number.isFinite(first) ? first : null,
  };
}

/**
 * @param {string} rawTraceText
 * @returns {string[]} lowercased thread ids, or `[]` when the trace is unusable
 */
export function readCertThreadIdsFromTrace(rawTraceText) {
  return readCertTrace(rawTraceText).threadIds;
}

/**
 * @param {string} rawText raw `vercel logs --json` output (JSON Lines)
 * @param {{ certThreadIds?: string[], firstCertRequestAtMs?: number | null }} [options]
 *   the certification's own thread ids (at least one must appear) and the epoch
 *   ms of its first CopilotKit request (the scan must reach back before it)
 */
export function analyzePlannerProductionLogs(
  rawText,
  { certThreadIds = [], firstCertRequestAtMs = null } = {},
) {
  const lines = String(rawText ?? "")
    .split("\n")
    .filter((line) => line.trim() !== "");

  const entries = [];
  let unparsable = 0;
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      unparsable += 1;
    }
  }

  let copilotkitRequests = 0;
  const copilotkit5xx = [];
  const other5xx = [];
  let windowStartMs = null;
  let windowEndMs = null;

  for (const entry of entries) {
    const status = statusOf(entry);
    const path = pathOf(entry);
    // Match on the serialized entry so a copilotkit request is recognised even
    // when the path sits in a nested field this module does not name.
    const isCopilotkit = COPILOTKIT_PATH.test(path) || COPILOTKIT_PATH.test(JSON.stringify(entry));

    // Reported as evidence: `vercel logs` returns the newest --limit entries, so
    // the span actually scanned is the only honest statement of what the 5xx
    // count covers.
    if (typeof entry?.timestamp === "number") {
      windowStartMs = windowStartMs === null ? entry.timestamp : Math.min(windowStartMs, entry.timestamp);
      windowEndMs = windowEndMs === null ? entry.timestamp : Math.max(windowEndMs, entry.timestamp);
    }

    if (isCopilotkit) copilotkitRequests += 1;
    if (status !== null && status >= 500) {
      const finding = `${status} ${path || "<unknown path>"}`;
      if (isCopilotkit) copilotkit5xx.push(finding);
      else other5xx.push(finding);
    }
  }

  return {
    totalLines: lines.length,
    parsedEntries: entries.length,
    unparsable,
    copilotkitRequests,
    copilotkit5xx,
    other5xx,
    windowStartMs,
    windowEndMs,
    // Recorded so the verdict can tell "no ids were required" apart from
    // "ids were required and none matched".
    certThreadIdsChecked: certThreadIds.length,
    certThreadHits: findCertThreadHits(entries, certThreadIds),
    certFirstRequestAtMs: firstCertRequestAtMs,
  };
}

/**
 * Turns a summary into a verdict. `ok: false` means the workflow must fail.
 *
 * @param {object} summary the value returned by `analyzePlannerProductionLogs`
 * @param {{ maxEntries?: number | null }} [options] `maxEntries` is the `--limit`
 *   the workflow passed to `vercel logs`; reaching it is reported as a warning,
 *   because that fetch keeps the newest entries and the journey is the newest
 *   activity, so the thread-id guard — not the volume — is what proves coverage.
 */
export function evaluatePlannerProductionLogs(summary, { maxEntries = null } = {}) {
  const problems = [];

  if (summary.totalLines === 0) {
    problems.push(
      "the log query returned no lines, so the 5xx check could not run (a failed or unauthorized `vercel logs` must not pass)",
    );
  } else if (summary.parsedEntries === 0) {
    problems.push(
      `none of the ${summary.totalLines} returned line(s) were parsable log entries, so the 5xx check could not run`,
    );
  }

  if (summary.parsedEntries > 0 && summary.copilotkitRequests === 0) {
    problems.push(
      "no /api/copilotkit request appeared in the scanned window, so the certification traffic was not observed and the 5xx check proves nothing",
    );
  }

  // The decisive guard. `/api/copilotkit` traffic exists on live Production
  // whether or not this journey ran, so only the journey's own thread id ties
  // the scanned window to the certification. Skipped when no ids were supplied
  // so the parser/verdict unit tests can exercise the other rules in isolation;
  // `runPlannerProductionLogCheck` is the entry point that refuses to run
  // without a trace, so the workflow cannot reach this branch with no ids.
  if (summary.certThreadIdsChecked > 0 && summary.certThreadHits.length === 0) {
    problems.push(
      `none of the ${summary.certThreadIdsChecked} certification thread id(s) appeared in the ${summary.parsedEntries} scanned entr(ies), so this window does not contain the certification and the 5xx check proves nothing`,
    );
  }

  // Coverage, gated. Hitting the `--limit` ceiling means the OLDEST entries were
  // dropped, but that alone says nothing about whether the JOURNEY was covered:
  // measured on 2026-09-28 a real certification run hit the 5000 ceiling while
  // still scanning from 2026-09-28T01:22:02.072Z — 791 ms BEFORE its first
  // `/api/copilotkit` request at 01:22:02.863Z — so failing on volume would have
  // rejected a run whose coverage was complete. What actually matters is whether
  // the scan reaches back before the journey began; if it does not, an early
  // `/run` 5xx could have been dropped and the pass would be unsound.
  if (
    summary.certFirstRequestAtMs !== null &&
    summary.windowStartMs !== null &&
    summary.windowStartMs > summary.certFirstRequestAtMs + CLOCK_SKEW_TOLERANCE_MS
  ) {
    problems.push(
      `the scan starts at ${new Date(summary.windowStartMs).toISOString()}, after the certification's first /api/copilotkit request at ${new Date(summary.certFirstRequestAtMs).toISOString()}, so the beginning of the journey was truncated and an earlier 5xx could have been missed`,
    );
  }

  // Reported, not gated: the ceiling was reached but coverage is proven above.
  const warnings = [];
  if (maxEntries !== null && summary.totalLines >= maxEntries) {
    warnings.push(
      `the scan returned ${summary.totalLines} entr(ies) at the --limit ${maxEntries} ceiling, so entries older than ${summary.windowStartMs === null ? "<unknown>" : new Date(summary.windowStartMs).toISOString()} were dropped; coverage of the journey itself is proven by the checks above`,
    );
  }

  if (summary.copilotkit5xx.length > 0) {
    problems.push(
      `${summary.copilotkit5xx.length} unexpected /api/copilotkit 5xx: ${summary.copilotkit5xx.join(", ")}`,
    );
  }

  return { ok: problems.length === 0, problems, warnings };
}

/**
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   readFile?: (path: string) => string,
 *   log?: (...args: unknown[]) => void,
 *   error?: (...args: unknown[]) => void,
 * }} [options]
 */
export function runPlannerProductionLogCheck({
  env = process.env,
  readFile = (path) => readFileSync(path, "utf8"),
  log = console.log,
  error = console.error,
} = {}) {
  const logFile = env.PROD_LOG_FILE;
  if (!logFile) {
    error("::error title=Planner production log check misconfigured::PROD_LOG_FILE is required");
    return { exitCode: 2, summary: null };
  }

  // Required, not optional. Without the journey's own thread ids this check
  // cannot tell the certification's traffic from any other live operator's, and
  // reporting a pass would claim a proof it never made. A missing or empty trace
  // is a misconfiguration (exit 2), not a certification failure (exit 1).
  const traceFile = env.CERT_TRACE_FILE;
  if (!traceFile) {
    error("::error title=Planner production log check misconfigured::CERT_TRACE_FILE is required so the scanned window can be tied to this certification");
    return { exitCode: 2, summary: null };
  }

  let trace;
  try {
    trace = readCertTrace(readFile(traceFile));
  } catch (cause) {
    error(
      `::error title=Planner production log check failed::the certification trace at ${traceFile} could not be read: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    return { exitCode: 2, summary: null };
  }
  if (trace.threadIds.length === 0) {
    error(
      `::error title=Planner production log check misconfigured::the certification trace at ${traceFile} contains no thread ids, so the scanned window cannot be tied to this run`,
    );
    return { exitCode: 2, summary: null };
  }

  // Optional: the `--limit` the workflow used. Absent means "do not gate on
  // truncation", which keeps the parser/verdict tests independent of it.
  const configuredLimit = Number(env.PROD_LOG_LIMIT);
  const maxEntries = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : null;

  let summary;
  try {
    summary = analyzePlannerProductionLogs(readFile(logFile), {
      certThreadIds: trace.threadIds,
      firstCertRequestAtMs: trace.firstCopilotkitRequestAtMs,
    });
  } catch (cause) {
    error(
      `::error title=Planner production log check failed::${cause instanceof Error ? cause.message : String(cause)}`,
    );
    return { exitCode: 2, summary: null };
  }

  const verdict = evaluatePlannerProductionLogs(summary, { maxEntries });
  if (summary.other5xx.length > 0) {
    // Reported, not gated: IPI-1332 Step 6.4 gates on /api/copilotkit 5xx.
    log(`::warning::${summary.other5xx.length} non-copilotkit 5xx observed: ${summary.other5xx.join(", ")}`);
  }
  for (const warning of verdict.warnings) {
    log(`::warning::${warning}`);
  }
  const span =
    summary.windowStartMs !== null && summary.windowEndMs !== null
      ? `${new Date(summary.windowStartMs).toISOString()}..${new Date(summary.windowEndMs).toISOString()}`
      : "<no timestamps>";
  log(
    `scanned ${summary.parsedEntries} log entr(ies) (${summary.unparsable} unparsable, limit ${maxEntries ?? "ungated"}) ` +
      `covering ${span} — ` +
      `/api/copilotkit requests: ${summary.copilotkitRequests}; /api/copilotkit 5xx: ${summary.copilotkit5xx.length}; ` +
      `other 5xx: ${summary.other5xx.length}; ` +
      `certification thread ids matched: ${summary.certThreadHits.length}/${summary.certThreadIdsChecked}`,
  );

  if (!verdict.ok) {
    error(`::error title=Planner production certification failed::${verdict.problems.join("; ")}`);
    return { exitCode: 1, summary };
  }

  log(
    `Planner production logs OK: no unexpected /api/copilotkit 5xx in the scanned window, and it contains this certification's own thread (${summary.certThreadHits.join(", ")}).`,
  );
  return { exitCode: 0, summary };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  process.exitCode = runPlannerProductionLogCheck().exitCode;
}
