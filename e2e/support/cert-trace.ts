import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Page } from "@playwright/test";

/**
 * IPI-1332 · CERT-PROD-001 — the certification's own identifiers, published for
 * the provider-side log check.
 *
 * Why this exists. The Production log check reads the deployment's runtime logs
 * and must prove the *certification's* traffic is in the window it scanned.
 * Counting `/api/copilotkit` requests cannot prove that: Production is live, so
 * real operators generate CopilotKit traffic continuously. Measured on
 * `479087b1` on 2026-09-28, a single 30-second slice held ~1100
 * `/api/copilotkit` requests, while this journey makes 11. A window that
 * contained only other people's traffic satisfied the old "some CopilotKit
 * traffic was seen" guard and would have reported a green certification.
 *
 * The journey names its own thread, and the id is in the URL of every
 * `/agent/<agent>/stop/<threadId>` request the browser sends — verified against
 * live Production logs, where the certification's two Stop calls carried
 * `a965d188-06b2-4678-b82b-9af78fa66461` and the same id appears on its
 * `/api/planner/threads/<id>/messages` reads. Publishing those ids lets the log
 * check require a request that belongs to this run, which no other operator can
 * manufacture.
 *
 * The trace holds only thread identifiers. It must never carry credentials,
 * session material, prompts, or model output: `playwright.production-cert.config.ts`
 * keeps trace/screenshot/video off for the same reason.
 */

/** `/agent/<agent>/stop/<threadId>` — the Stop call names the thread it stops. */
const STOP_THREAD_ID = /\/agent\/[^/]+\/stop\/([^/?#]+)/;

/**
 * A UUID, which is what the thread ids are. Validating the shape keeps a
 * malformed path segment (a stray `/stop/` in a query value, a future route
 * shape) out of the trace, because a bogus id would make the log check fail
 * closed against a value no log can contain.
 */
const THREAD_ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Any CopilotKit request, used to stamp the journey's first call.
 *
 * `vercel logs` returns the NEWEST `--limit` entries, so a busy window can drop
 * the OLDEST ones. Measured on 2026-09-28: `--limit 5000` returned 5000 entries
 * and `--limit 20000` returned 6950 for the same window, so the ceiling really
 * does truncate. The log check compares this timestamp against the earliest
 * entry it scanned to prove the scan reaches back before the journey started,
 * which is the only reliable way to know an early 5xx could not have been
 * dropped. A thread id alone would not prove that: the Stop calls are among the
 * journey's LAST requests, so a scan could contain them and still have missed an
 * earlier `/run`.
 */
const COPILOTKIT_REQUEST = /\/api\/copilotkit/;

/**
 * Default trace location. Sits under Playwright's `test-results` output
 * directory, which the repository already gitignores, and is written during the
 * run and read by the following workflow step.
 */
export const DEFAULT_CERT_TRACE_FILE = "test-results/planner-cert-trace.json";

export function certTraceFile(env: Record<string, string | undefined> = process.env): string {
  const configured = env.CERT_TRACE_FILE;
  return typeof configured === "string" && configured.trim() !== ""
    ? configured
    : DEFAULT_CERT_TRACE_FILE;
}

export interface CertTrace {
  /** Thread ids observed so far, lowercased and de-duplicated. */
  ids: () => string[];
  /** Epoch ms of the first `/api/copilotkit` request seen, or null. */
  firstRequestAtMs: () => number | null;
  /** Persists the trace and returns what was written. */
  write: (file?: string) => { threadIds: string[]; firstCopilotkitRequestAtMs: number | null };
}

/**
 * Roots the trace may be written under: the workspace, or the temp directory the
 * unit tests use.
 *
 * `CERT_TRACE_FILE` is set by the certification workflow, so this is defence in
 * depth rather than a live attack path — but an unconstrained environment
 * variable that reaches `fs.writeFileSync` should not be able to place a file
 * anywhere on the machine. Paths are compared AFTER `path.resolve`, so `../`
 * segments are neutralised rather than pattern-matched.
 */
function allowedTraceRoots(): string[] {
  return [path.resolve(process.cwd()), path.resolve(os.tmpdir())];
}

function resolveTraceTarget(file: string): string {
  const target = path.resolve(file);
  const permitted = allowedTraceRoots().some(
    (root) => target === root || target.startsWith(root + path.sep),
  );
  if (!permitted) {
    throw new Error(
      `refusing to write the certification trace outside the workspace or the temp directory: ${target}`,
    );
  }
  return target;
}

/**
 * Records the thread ids this page's requests name, and when its first
 * CopilotKit request went out. Call once per page, before the journey starts, so
 * neither can be missed.
 */
export function collectCertThreadIds(page: Page): CertTrace {
  const threadIds = new Set<string>();
  let firstRequestAtMs: number | null = null;

  page.on("request", (request) => {
    const url = request.url();
    if (firstRequestAtMs === null && COPILOTKIT_REQUEST.test(url)) {
      firstRequestAtMs = Date.now();
    }

    const match = STOP_THREAD_ID.exec(url);
    if (!match) return;
    const id = match[1].toLowerCase();
    if (THREAD_ID_SHAPE.test(id)) threadIds.add(id);
  });

  const ids = () => [...threadIds];

  return {
    ids,
    firstRequestAtMs: () => firstRequestAtMs,
    write(file = certTraceFile()) {
      const target = resolveTraceTarget(file);
      const payload = { threadIds: ids(), firstCopilotkitRequestAtMs: firstRequestAtMs };
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
      return payload;
    },
  };
}
