import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as Sentry from "@sentry/node";
import { afterEach, describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

afterEach(async () => {
  await Sentry.close(0);
});

describe("Sentry Mastra observability contract", () => {
  it("installs the compatible Mastra observability package", () => {
    const pkg = JSON.parse(read("package.json")) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies?.["@mastra/core"]).toBe("1.71.0");
    expect(pkg.dependencies?.["@mastra/observability"]).toBe("1.18.1");
    expect(pkg.dependencies?.["@sentry/node"]).toBe("11.0.0");
  });

  it("initializes Sentry before the standalone Mastra CLI constructs its runtime", () => {
    const entry = read("src/mastra/index.ts");
    const sentry = read("src/mastra/sentry.ts");

    expect(entry.indexOf('import "./sentry"')).toBeGreaterThanOrEqual(0);
    expect(entry.indexOf('import "./sentry"')).toBeLessThan(entry.indexOf('import { getMastra } from "./runtime"'));
    expect(sentry).toContain('from "@sentry/node"');
    expect(sentry).toContain("Sentry.mastraIntegration()");
    expect(sentry).toContain("genAI: { inputs: false, outputs: false }");
  });

  it("enables first-party Mastra instrumentation only on the server", () => {
    const server = read("sentry.server.config.ts");
    const edge = read("sentry.edge.config.ts");
    const client = read("instrumentation-client.ts");

    expect(server).toContain("Sentry.mastraIntegration()");
    expect(edge).not.toContain("mastraIntegration");
    expect(client).not.toContain("mastraIntegration");
  });

  it("does not create a second Mastra runtime for telemetry", () => {
    const server = read("sentry.server.config.ts");
    const runtime = read("src/mastra/runtime.ts");

    expect(server).not.toContain("new Mastra");
    expect(server).not.toContain("getMastra(");
    expect(runtime.match(/new Mastra\(/g)).toHaveLength(1);
  });

  it("emits an errored Mastra span without synthetic prompt or response payloads", async () => {
    const envelopes: unknown[] = [];
    Sentry.init({
      dsn: "https://public@example.invalid/1",
      tracesSampleRate: 1,
      defaultIntegrations: false,
      dataCollection: { genAI: { inputs: false, outputs: false } },
      transport: () => ({
        send: async envelope => {
          envelopes.push(envelope);
          return { statusCode: 200 };
        },
        flush: async () => true,
      }),
    });

    const exporter = new Sentry.SentryMastraExporter();
    const startTime = new Date();
    const exportedSpan = {
      id: "synthetic-agent-span",
      name: "synthetic-agent",
      type: "agent_run",
      startTime,
      entityName: "Planner",
      input: "SYNTHETIC_SECRET_PROMPT",
      output: "SYNTHETIC_SECRET_RESPONSE",
      attributes: {
        prompt: "SYNTHETIC_SECRET_PROMPT",
        instructions: "SYNTHETIC_SECRET_PROMPT",
      },
      errorInfo: { name: "Error", message: "synthetic failure" },
    } as const;

    await exporter.exportTracingEvent({ type: "span_started", exportedSpan });
    await exporter.exportTracingEvent({
      type: "span_ended",
      exportedSpan: { ...exportedSpan, endTime: new Date() },
    });
    await exporter.flush();

    const payload = JSON.stringify(envelopes);
    expect(envelopes).toHaveLength(1);
    expect(payload).toContain('"status":"error"');
    expect(payload).toContain("synthetic failure");
    expect(payload).not.toContain("SYNTHETIC_SECRET_PROMPT");
    expect(payload).not.toContain("SYNTHETIC_SECRET_RESPONSE");
  });
});
