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
 * Fail closed. An unusable log query, an empty response, or a window with no
 * `/api/copilotkit` traffic all mean "this check did not verify anything" — none
 * of them may be reported as "no 5xx". The workflow previously piped
 * `vercel logs` through `|| true`, which turned a failed query into a pass.
 *
 * `vercel logs` defaults to 100 result lines, which truncates the certification
 * window; the workflow raises `--limit` and this module reports how much it
 * actually scanned so a truncated window is visible rather than silent.
 */

const COPILOTKIT_PATH = /\/api\/copilotkit/;

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

export function analyzePlannerProductionLogs(rawText) {
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

  for (const entry of entries) {
    const status = statusOf(entry);
    const path = pathOf(entry);
    // Match on the serialized entry so a copilotkit request is recognised even
    // when the path sits in a nested field this module does not name.
    const isCopilotkit = COPILOTKIT_PATH.test(path) || COPILOTKIT_PATH.test(JSON.stringify(entry));

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
  };
}

/**
 * Turns a summary into a verdict. `ok: false` means the workflow must fail.
 */
export function evaluatePlannerProductionLogs(summary) {
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

  if (summary.copilotkit5xx.length > 0) {
    problems.push(
      `${summary.copilotkit5xx.length} unexpected /api/copilotkit 5xx: ${summary.copilotkit5xx.join(", ")}`,
    );
  }

  return { ok: problems.length === 0, problems };
}

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

  let summary;
  try {
    summary = analyzePlannerProductionLogs(readFile(logFile));
  } catch (cause) {
    error(
      `::error title=Planner production log check failed::${cause instanceof Error ? cause.message : String(cause)}`,
    );
    return { exitCode: 2, summary: null };
  }

  const verdict = evaluatePlannerProductionLogs(summary);
  if (summary.other5xx.length > 0) {
    // Reported, not gated: IPI-1332 Step 6.4 gates on /api/copilotkit 5xx.
    log(`::warning::${summary.other5xx.length} non-copilotkit 5xx observed: ${summary.other5xx.join(", ")}`);
  }
  log(
    `scanned ${summary.parsedEntries} log entr(ies) (${summary.unparsable} unparsable) — ` +
      `/api/copilotkit requests: ${summary.copilotkitRequests}; /api/copilotkit 5xx: ${summary.copilotkit5xx.length}; ` +
      `other 5xx: ${summary.other5xx.length}`,
  );

  if (!verdict.ok) {
    error(`::error title=Planner production certification failed::${verdict.problems.join("; ")}`);
    return { exitCode: 1, summary };
  }

  log("Planner production logs OK: no unexpected /api/copilotkit 5xx in the scanned window.");
  return { exitCode: 0, summary };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  process.exitCode = runPlannerProductionLogCheck().exitCode;
}
