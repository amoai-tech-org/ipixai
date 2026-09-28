import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Page } from "@playwright/test";

import {
  DEFAULT_CERT_TRACE_FILE,
  certTraceFile,
  collectCertThreadIds,
} from "../e2e/support/cert-trace";

/**
 * IPI-1332 · CERT-PROD-001 — the certification must publish the Planner thread
 * ids it actually used, because the Production log check requires one of them to
 * appear in the window it scans. Without that, `/api/copilotkit` traffic from any
 * live operator satisfies the check: measured on `479087b1`, a 30-second slice
 * held ~1100 such requests while this journey makes 11.
 *
 * The stop URL is the source of truth — verified against real Production logs,
 * where the certification's two Stop calls were
 * `POST /api/copilotkit/agent/default/stop/a965d188-06b2-4678-b82b-9af78fa66461`.
 */
function fakePage() {
  const handlers: ((request: { url: () => string }) => void)[] = [];
  const page = {
    on: (event: string, handler: (request: { url: () => string }) => void) => {
      if (event === "request") handlers.push(handler);
    },
  };
  return {
    page: page as unknown as Page,
    emit: (url: string) => handlers.forEach((handler) => handler({ url: () => url })),
  };
}

const REAL_THREAD_ID = "a965d188-06b2-4678-b82b-9af78fa66461";
const tempDirs: string[] = [];

function tempFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cert-trace-"));
  tempDirs.push(dir);
  return path.join(dir, "nested", "planner-cert-trace.json");
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("certification trace", () => {
  it("records the thread id a Stop request names, lowercased and de-duplicated", () => {
    const { page, emit } = fakePage();
    const trace = collectCertThreadIds(page);

    emit(`https://www.ipix.co/api/copilotkit/agent/default/stop/${REAL_THREAD_ID}`);
    emit(`https://www.ipix.co/api/copilotkit/agent/default/stop/${REAL_THREAD_ID.toUpperCase()}`);
    // Ordinary traffic must not be mistaken for a thread.
    emit("https://www.ipix.co/api/copilotkit/agent/default/run");
    emit("https://www.ipix.co/api/planner/threads");

    expect(trace.ids()).toEqual([REAL_THREAD_ID]);
  });

  it("ignores a stop path that is not a thread id", () => {
    const { page, emit } = fakePage();
    const trace = collectCertThreadIds(page);

    // A bogus id would make the log check fail closed against a value no log can
    // contain, so the shape is validated rather than trusted.
    emit("https://www.ipix.co/api/copilotkit/agent/default/stop/not-a-uuid");
    emit("https://www.ipix.co/api/copilotkit/agent/default/stop/");

    expect(trace.ids()).toEqual([]);
  });

  it("writes only thread ids, creating the directory it needs", () => {
    const { page, emit } = fakePage();
    const trace = collectCertThreadIds(page);
    emit(`https://www.ipix.co/api/copilotkit/agent/default/stop/${REAL_THREAD_ID}`);

    const file = tempFile();
    expect(trace.write(file)).toEqual({ threadIds: [REAL_THREAD_ID] });

    const written = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    expect(written).toEqual({ threadIds: [REAL_THREAD_ID] });
  });

  it("writes an empty trace rather than failing when no thread was named", () => {
    const { page } = fakePage();
    const file = tempFile();

    // The spec asserts the count itself, so the writer stays honest here instead
    // of inventing an id or throwing mid-journey.
    expect(collectCertThreadIds(page).write(file)).toEqual({ threadIds: [] });
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({ threadIds: [] });
  });

  it("uses the configured trace path and falls back to the Playwright output dir", () => {
    expect(certTraceFile({ CERT_TRACE_FILE: "/tmp/x.json" })).toBe("/tmp/x.json");
    expect(certTraceFile({ CERT_TRACE_FILE: "  " })).toBe(DEFAULT_CERT_TRACE_FILE);
    expect(certTraceFile({})).toBe(DEFAULT_CERT_TRACE_FILE);
    expect(DEFAULT_CERT_TRACE_FILE).toContain("test-results/");
  });
});

/**
 * The collector only helps if the journey actually publishes it. This is a
 * source-level check on purpose: `playwright.production-cert.config.ts` cannot be
 * loaded here (it throws without `E2E_PRODUCTION_CERT=1`) and the journey needs
 * real credentials and paid model calls, so the wiring is asserted instead.
 */
describe("journey publishes the trace", () => {
  it("imports the collector and writes the trace before its final assertion", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "e2e/planner-stop-journey.spec.ts"),
      "utf8",
    );

    expect(source).toContain('from "./support/cert-trace"');
    expect(source).toContain("collectCertThreadIds(page)");

    const writeIndex = source.indexOf("certTrace.write()");
    const problemsIndex = source.indexOf("no console errors, page errors, or 5xx during the journey");
    expect(writeIndex, "the trace must be written").toBeGreaterThan(-1);
    expect(problemsIndex, "the final assertion must exist").toBeGreaterThan(-1);
    // Written first, so a journey that fails on an unexpected problem still
    // leaves the window it used on disk for the log check to report against.
    expect(writeIndex).toBeLessThan(problemsIndex);
  });
});
