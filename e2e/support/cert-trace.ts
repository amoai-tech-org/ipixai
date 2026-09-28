import fs from "node:fs";
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
  /** Persists the ids and returns what was written. */
  write: (file?: string) => { threadIds: string[] };
}

/**
 * Records the thread ids this page's requests name. Call once per page, before
 * the journey starts, so no Stop request can be missed.
 */
export function collectCertThreadIds(page: Page): CertTrace {
  const threadIds = new Set<string>();

  page.on("request", (request) => {
    const match = STOP_THREAD_ID.exec(request.url());
    if (!match) return;
    const id = match[1].toLowerCase();
    if (THREAD_ID_SHAPE.test(id)) threadIds.add(id);
  });

  const ids = () => [...threadIds];

  return {
    ids,
    write(file = certTraceFile()) {
      const target = path.resolve(file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `${JSON.stringify({ threadIds: ids() }, null, 2)}\n`);
      return { threadIds: ids() };
    },
  };
}
