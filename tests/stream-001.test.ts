import { AbstractAgent, type BaseEvent } from "@ag-ui/client";
import { EventType, type RunAgentInput } from "@ag-ui/core";
import { Observable } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as agent from "../src/agent";
import {
  CopilotKitIntelligence,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";

import { GET, POST } from "../src/app/api/copilotkit/[[...slug]]/route";
import { infoListsDefaultAgent } from "../src/lib/auth/copilot-mount";
import { memoryResourceId } from "../src/lib/auth/verified-operator";
import * as threadPersistence from "../src/mastra/thread-persistence";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const RUN_STORE_SEP = "\u001f";

const memberships: { rows: { org_id: string }[] } = { rows: [] };
const claims: { sub?: string; email?: string } = {
  sub: USER_A,
  email: "operator@example.com",
};
const streamStops: Array<() => void> = [];

vi.mock("../src/lib/supabase/server", () => ({
  createClientFromRequest: () => ({
    auth: {
      getClaims: async () => ({
        data: { claims: { sub: claims.sub, email: claims.email } },
        error: claims.sub ? null : { message: "invalid JWT" },
      }),
      // AUTH-002 (IPI-1093): route.ts derives the requestToken-scoped access
      // token via getSession() after the getClaims()-based operator check
      // above already gates the request, so this is only reached once
      // authenticated — a fixed token is enough for these stream tests.
      getSession: async () => ({
        data: { session: { access_token: "test-access-token" } },
      }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: async () => {
          if (table !== "org_members") {
            return { data: null, error: { message: "unexpected table" } };
          }
          return { data: memberships.rows, error: null };
        },
      }),
    }),
  }),
  createClient: async () => null,
}));

afterEach(() => {
  memberships.rows = [];
  claims.sub = USER_A;
  claims.email = "operator@example.com";
  for (const stop of streamStops) stop();
  streamStops.length = 0;
  vi.restoreAllMocks();
});

let runSeq = 0;

function runBody() {
  runSeq += 1;
  return {
    threadId: crypto.randomUUID(),
    runId: `run-stream-001-${runSeq}`,
    state: {},
    messages: [
      {
        id: "msg-user-1",
        role: "user" as const,
        content: "Create a SS26 campaign shoot plan.",
      },
    ],
    tools: [],
    context: [],
    forwardedProps: {},
  };
}

function copilotRequest(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    signal?: AbortSignal;
  } = {},
): Request {
  const method = options.method ?? "POST";
  const init: RequestInit = {
    method,
    headers: { "content-type": "application/json" },
    signal: options.signal,
  };
  if (options.body && method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(options.body);
  }
  return new Request(`http://localhost${path}`, init);
}

type StreamStats = {
  chunksEmitted: number;
  chunksAfterAbort: number;
  aborted: boolean;
  runStarted: boolean;
};

/** Clone() uses Object.create(prototype); keep counters in a closure run() shares. */
function createStreamHarness(options: { finiteChunks?: number } = {}) {
  const finiteChunks = options.finiteChunks ?? 40;
  const stats: StreamStats = {
    chunksEmitted: 0,
    chunksAfterAbort: 0,
    aborted: false,
    runStarted: false,
  };
  let stopTimer = () => {};

  class StreamTestAgent extends AbstractAgent {
    constructor() {
      super({ agentId: "default", description: "stream-001 test agent" });
    }

    override run(input: RunAgentInput): Observable<BaseEvent> {
      const messageId = "msg-assistant-1";
      return new Observable((subscriber) => {
        stats.runStarted = true;
        subscriber.next({
          type: EventType.RUN_STARTED,
          threadId: input.threadId,
          runId: input.runId,
        });
        subscriber.next({
          type: EventType.TEXT_MESSAGE_START,
          messageId,
          role: "assistant",
        });

        let i = 0;
        const timer = setInterval(() => {
          if (stats.aborted) {
            stats.chunksAfterAbort += 1;
            clearInterval(timer);
            return;
          }
          i += 1;
          stats.chunksEmitted += 1;
          subscriber.next({
            type: EventType.TEXT_MESSAGE_CONTENT,
            messageId,
            delta: `chunk-${i} `,
          });
          if (finiteChunks > 0 && i >= finiteChunks) {
            clearInterval(timer);
            subscriber.next({ type: EventType.TEXT_MESSAGE_END, messageId });
            subscriber.next({
              type: EventType.RUN_FINISHED,
              threadId: input.threadId,
              runId: input.runId,
            });
            subscriber.complete();
          }
        }, 20);
        const stop = () => {
          stats.aborted = true;
          clearInterval(timer);
        };
        stopTimer = stop;
        streamStops.push(stop);

        return () => {
          stop();
        };
      });
    }
  }

  return { agent: new StreamTestAgent(), stats };
}

function parseSseEvents(
  text: string,
): Array<{ type?: string; delta?: string; threadId?: string }> {
  const events: Array<{ type?: string; delta?: string; threadId?: string }> = [];
  for (const block of text.split("\n\n")) {
    const dataLine = block
      .split("\n")
      .find((line) => line.startsWith("data:"));
    if (!dataLine) continue;
    const payload = dataLine.slice("data:".length).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      events.push(JSON.parse(payload) as { type?: string; delta?: string });
    } catch {
      // ignore keep-alives / non-JSON frames
    }
  }
  return events;
}

async function readSseUntil(
  response: Response,
  predicate: (events: Array<{ type?: string }>) => boolean,
  timeoutMs = 4000,
): Promise<{
  text: string;
  events: Array<{ type?: string; delta?: string; threadId?: string }>;
}> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("missing SSE body");
  const decoder = new TextDecoder();
  let text = "";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const chunk = await Promise.race([
      reader.read().then((result) => ({ kind: "read" as const, result })),
      new Promise<{ kind: "timeout" }>((resolve) =>
        setTimeout(() => resolve({ kind: "timeout" }), remaining),
      ),
    ]);
    if (chunk.kind === "timeout") break;
    if (chunk.result.value) {
      text +=
        typeof chunk.result.value === "string"
          ? chunk.result.value
          : decoder.decode(chunk.result.value, { stream: true });
    }
    const events = parseSseEvents(text);
    if (predicate(events) || chunk.result.done) {
      return { text, events };
    }
  }
  return { text, events: parseSseEvents(text) };
}

describe("IPI-1045 · STREAM-001 authenticated planner stream", () => {
  it("returns 401 for an unsigned POST before creating agents", async () => {
    const spy = vi.spyOn(agent, "createLocalAgents");
    claims.sub = undefined;
    const response = await POST(
      copilotRequest("/api/copilotkit", { body: runBody() }),
    );
    expect(response.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 403 needs_onboarding when the user has zero memberships", async () => {
    const spy = vi.spyOn(agent, "createLocalAgents");
    memberships.rows = [];
    const response = await POST(
      copilotRequest("/api/copilotkit", { body: runBody() }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "forbidden",
      reason: "needs_onboarding",
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 403 membership_conflict when the user has multiple memberships", async () => {
    const spy = vi.spyOn(agent, "createLocalAgents");
    memberships.rows = [{ org_id: ORG_A }, { org_id: ORG_B }];
    const response = await POST(
      copilotRequest("/api/copilotkit", { body: runBody() }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "forbidden",
      reason: "membership_conflict",
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("starts a stream for a single-org user with tenant resourceId and default agent", async () => {
    const { agent: streamAgent, stats } = createStreamHarness();
    const spy = vi
      .spyOn(agent, "createLocalAgents")
      .mockReturnValue({ default: streamAgent });
    memberships.rows = [{ org_id: ORG_A }];

    const info = await GET(copilotRequest("/api/copilotkit/info", { method: "GET" }));
    expect(info.status).toBe(200);
    expect(info.headers.get("content-type")).toMatch(/json/);
    expect(infoListsDefaultAgent(await info.json())).toBe(true);

    const body = runBody();
    const response = await POST(
      copilotRequest("/api/copilotkit/agent/default/run", { body }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/event-stream/);
    expect(spy).toHaveBeenCalledWith(
      memoryResourceId({ userId: USER_A, orgId: ORG_A }),
    );
    expect(spy).toHaveBeenCalledWith(`org:${ORG_A}::user:${USER_A}`);

    const { events } = await readSseUntil(
      response,
      (seen) => seen.some((event) => event.type === EventType.RUN_STARTED),
    );
    expect(events.map((event) => event.type)).toContain(EventType.RUN_STARTED);
    expect(
      events.find((event) => event.type === EventType.RUN_STARTED)?.threadId,
    ).toBe(body.threadId);
    expect(stats.runStarted).toBe(true);
  });

  it("emits AG-UI lifecycle and incremental TEXT_MESSAGE_CONTENT over CopilotKit SSE", async () => {
    const { agent: streamAgent } = createStreamHarness();
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: streamAgent,
    });
    memberships.rows = [{ org_id: ORG_A }];

    const response = await POST(
      copilotRequest("/api/copilotkit/agent/default/run", { body: runBody() }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/event-stream/);
    expect(response.headers.get("content-type")).not.toMatch(/text\/plain/);

    const { text, events } = await readSseUntil(
      response,
      (seen) =>
        seen.filter((event) => event.type === EventType.TEXT_MESSAGE_CONTENT)
          .length >= 2 &&
        seen.some((event) => event.type === EventType.RUN_FINISHED),
    );

    expect(text).toMatch(/^data:/m);
    expect(events.map((event) => event.type)[0]).toBe(EventType.RUN_STARTED);
    expect(
      events.some((event) => event.type === EventType.TEXT_MESSAGE_START),
    ).toBe(true);
    const content = events.filter(
      (event) => event.type === EventType.TEXT_MESSAGE_CONTENT,
    );
    expect(content.length).toBeGreaterThan(1);
    expect(content.every((event) => typeof event.delta === "string" && event.delta.length > 0)).toBe(
      true,
    );
    expect(events.some((event) => event.type === EventType.TEXT_MESSAGE_END)).toBe(
      true,
    );
    expect(events.some((event) => event.type === EventType.RUN_FINISHED)).toBe(
      true,
    );
  });

  it("aborts the SSE run cleanly without further agent chunks", async () => {
    const { agent: streamAgent, stats } = createStreamHarness({
      finiteChunks: 0,
    });
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: streamAgent,
    });
    memberships.rows = [{ org_id: ORG_A }];

    const controller = new AbortController();
    const response = await POST(
      copilotRequest("/api/copilotkit/agent/default/run", {
        body: runBody(),
        signal: controller.signal,
      }),
    );
    expect(response.status).toBe(200);
    const reader = response.body?.getReader();
    expect(reader).toBeTruthy();
    const decoder = new TextDecoder();
    let text = "";
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      const { done, value } = await reader!.read();
      if (value) {
        text +=
          typeof value === "string"
            ? value
            : decoder.decode(value, { stream: true });
      }
      const events = parseSseEvents(text);
      if (
        events.some((event) => event.type === EventType.TEXT_MESSAGE_CONTENT) ||
        done
      ) {
        break;
      }
    }
    const emittedBeforeAbort = stats.chunksEmitted;
    expect(emittedBeforeAbort).toBeGreaterThan(0);

    const started = Date.now();
    controller.abort();
    expect(Date.now() - started).toBeLessThan(100);

    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(stats.aborted).toBe(true);
    expect(stats.chunksAfterAbort).toBe(0);
    expect(stats.chunksEmitted).toBeLessThanOrEqual(emittedBeforeAbort + 1);
    expect(stats.chunksEmitted).toBeLessThan(20);
  });

  it("stops the in-flight run through POST /agent/default/stop/:threadId", async () => {
    const { agent: streamAgent, stats } = createStreamHarness({
      finiteChunks: 0,
    });
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: streamAgent,
    });
    memberships.rows = [{ org_id: ORG_A }];
    const stopSpy = vi.spyOn(InMemoryAgentRunner.prototype, "stop");
    const detachSpy = vi.spyOn(AbstractAgent.prototype, "detachActiveRun");
    const body = runBody();

    const runResponse = await POST(
      copilotRequest("/api/copilotkit/agent/default/run", { body }),
    );
    expect(runResponse.status).toBe(200);
    await readSseUntil(runResponse, (seen) =>
      seen.some((event) => event.type === EventType.TEXT_MESSAGE_CONTENT),
    );
    expect(stats.chunksEmitted).toBeGreaterThan(0);
    const emittedBeforeStop = stats.chunksEmitted;

    const stopResponse = await POST(
      copilotRequest(
        `/api/copilotkit/agent/default/stop/${encodeURIComponent(body.threadId)}`,
        { method: "POST" },
      ),
    );
    expect(stopResponse.status).toBe(200);
    expect(await stopResponse.json()).toMatchObject({ stopped: true });
    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: `${memoryResourceId({ userId: USER_A, orgId: ORG_A })}${RUN_STORE_SEP}${body.threadId}`,
      }),
    );
    expect(detachSpy).toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(stats.aborted).toBe(true);
    expect(stats.chunksAfterAbort).toBe(0);
    expect(stats.chunksEmitted).toBeLessThanOrEqual(emittedBeforeStop + 1);

    const nextBody = runBody();
    const nextResponse = await POST(
      copilotRequest("/api/copilotkit/agent/default/run", { body: nextBody }),
    );
    expect(nextResponse.status).toBe(200);
    const { events } = await readSseUntil(nextResponse, (seen) =>
      seen.some((event) => event.type === EventType.RUN_STARTED),
    );
    expect(events.map((event) => event.type)).toContain(EventType.RUN_STARTED);
  });

  it("does not stop another organization's in-flight run", async () => {
    const { agent: streamAgent, stats } = createStreamHarness({
      finiteChunks: 0,
    });
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: streamAgent,
    });
    memberships.rows = [{ org_id: ORG_A }];
    const body = runBody();

    const runResponse = await POST(
      copilotRequest("/api/copilotkit/agent/default/run", { body }),
    );
    expect(runResponse.status).toBe(200);
    await readSseUntil(runResponse, (seen) =>
      seen.some((event) => event.type === EventType.TEXT_MESSAGE_CONTENT),
    );

    claims.sub = USER_B;
    memberships.rows = [{ org_id: ORG_B }];
    const stopResponse = await POST(
      copilotRequest(
        `/api/copilotkit/agent/default/stop/${encodeURIComponent(body.threadId)}`,
        { method: "POST" },
      ),
    );
    expect(stopResponse.status).toBe(403);
    expect(await stopResponse.json()).toEqual({
      error: "forbidden",
      reason: "thread_forbidden",
    });
    expect(stats.aborted).toBe(false);

    claims.sub = USER_A;
    memberships.rows = [{ org_id: ORG_A }];
    const ownerStop = await POST(
      copilotRequest(
        `/api/copilotkit/agent/default/stop/${encodeURIComponent(body.threadId)}`,
        { method: "POST" },
      ),
    );
    expect(await ownerStop.json()).toMatchObject({ stopped: true });
  });

  it("does not start the agent when planner memory is unavailable", async () => {
    const { agent: streamAgent, stats } = createStreamHarness();
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: streamAgent,
    });
    vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue(
      undefined,
    );
    memberships.rows = [{ org_id: ORG_A }];

    const response = await POST(
      copilotRequest("/api/copilotkit/agent/default/run", { body: runBody() }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "unavailable",
      reason: "claim_unavailable",
    });
    expect(stats.runStarted).toBe(false);
  });

  it("does not start a run stopped while thread storage is initializing", async () => {
    const { agent: streamAgent, stats } = createStreamHarness({
      finiteChunks: 0,
    });
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: streamAgent,
    });
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue({
      getThreadById: async () => null,
    } as unknown as Awaited<ReturnType<typeof threadPersistence.getPlannerMemory>>);
    vi.spyOn(threadPersistence, "ensureMastraThread").mockImplementation(
      async () => {
        await gate;
        return { created: true };
      },
    );
    memberships.rows = [{ org_id: ORG_A }];
    const body = runBody();

    const runPromise = POST(
      copilotRequest("/api/copilotkit/agent/default/run", { body }),
    );
    await new Promise((resolve) => setTimeout(resolve, 40));
    const stopResponse = await POST(
      copilotRequest(
        `/api/copilotkit/agent/default/stop/${encodeURIComponent(body.threadId)}`,
        { method: "POST" },
      ),
    );
    expect(stopResponse.status).toBe(200);
    expect(await stopResponse.json()).toMatchObject({ stopped: true });
    release();
    const runResponse = await runPromise;
    expect(runResponse.status).toBe(200);
    const reader = runResponse.body?.getReader();
    expect(reader).toBeTruthy();
    const deadline = Date.now() + 2000;
    let streamEnded = false;
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      const chunk = await Promise.race([
        reader!.read().then((result) => ({ kind: "read" as const, result })),
        new Promise<{ kind: "timeout" }>((resolve) =>
          setTimeout(() => resolve({ kind: "timeout" }), remaining),
        ),
      ]);
      if (chunk.kind === "timeout") {
        await reader!.cancel().catch(() => undefined);
        break;
      }
      if (chunk.result.done) {
        streamEnded = true;
        break;
      }
    }
    expect(streamEnded).toBe(true);
    expect(stats.runStarted).toBe(false);
  });

  it("still preflights Mastra thread storage when only COPILOTKIT_LICENSE_TOKEN is set", async () => {
    const previousLicense = process.env.COPILOTKIT_LICENSE_TOKEN;
    const previousIntelligence = process.env.CPK_INTELLIGENCE_API_KEY;
    process.env.COPILOTKIT_LICENSE_TOKEN = "test-license-token";
    delete process.env.CPK_INTELLIGENCE_API_KEY;
    const { agent: streamAgent, stats } = createStreamHarness();
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: streamAgent,
    });
    const ensureSpy = vi
      .spyOn(threadPersistence, "ensureMastraThread")
      .mockResolvedValue({ created: true });
    vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue({
      getThreadById: async () => null,
    } as unknown as Awaited<ReturnType<typeof threadPersistence.getPlannerMemory>>);
    memberships.rows = [{ org_id: ORG_A }];
    try {
      const body = runBody();
      const response = await POST(
        copilotRequest("/api/copilotkit/agent/default/run", { body }),
      );
      expect(response.status).toBe(200);
      await readSseUntil(response, (seen) =>
        seen.some((event) => event.type === EventType.RUN_STARTED),
      );
      expect(ensureSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ threadId: body.threadId }),
      );
      expect(stats.runStarted).toBe(true);
    } finally {
      if (previousLicense === undefined) {
        delete process.env.COPILOTKIT_LICENSE_TOKEN;
      } else {
        process.env.COPILOTKIT_LICENSE_TOKEN = previousLicense;
      }
      if (previousIntelligence === undefined) {
        delete process.env.CPK_INTELLIGENCE_API_KEY;
      } else {
        process.env.CPK_INTELLIGENCE_API_KEY = previousIntelligence;
      }
    }
  });

  it("whitespace-padded license and whitespace-only Intelligence key stay on SSE", async () => {
    const previousLicense = process.env.COPILOTKIT_LICENSE_TOKEN;
    const previousIntelligence = process.env.CPK_INTELLIGENCE_API_KEY;
    const previousAlias = process.env.COPILOTKIT_API_KEY;
    // IPI-1329: the Product route never reads Intelligence keys; a stray
    // (here whitespace-only) key must not construct CopilotKitIntelligence.
    process.env.COPILOTKIT_LICENSE_TOKEN = "  test-license-token  ";
    process.env.CPK_INTELLIGENCE_API_KEY = " \t ";
    delete process.env.COPILOTKIT_API_KEY;
    const { agent: streamAgent } = createStreamHarness();
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: streamAgent,
    });
    const connectSpy = vi.spyOn(
      CopilotKitIntelligence.prototype,
      "ɵconnectThread",
    );
    memberships.rows = [{ org_id: ORG_A }];
    try {
      const info = await GET(
        copilotRequest("/api/copilotkit/info", { method: "GET" }),
      );
      expect(info.status).toBe(200);
      const payload = (await info.json()) as {
        mode?: string;
        intelligence?: unknown;
      };
      expect(payload.mode).toBe("sse");
      expect(payload.intelligence).toBeUndefined();

      const response = await POST(
        copilotRequest("/api/copilotkit/agent/default/connect", {
          body: runBody(),
        }),
      );
      expect(connectSpy).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toMatch(/text\/event-stream/);
    } finally {
      if (previousLicense === undefined) {
        delete process.env.COPILOTKIT_LICENSE_TOKEN;
      } else {
        process.env.COPILOTKIT_LICENSE_TOKEN = previousLicense;
      }
      if (previousIntelligence === undefined) {
        delete process.env.CPK_INTELLIGENCE_API_KEY;
      } else {
        process.env.CPK_INTELLIGENCE_API_KEY = previousIntelligence;
      }
      if (previousAlias === undefined) {
        delete process.env.COPILOTKIT_API_KEY;
      } else {
        process.env.COPILOTKIT_API_KEY = previousAlias;
      }
    }
  });

  it("stops a run even when abort arrives before runner registration", async () => {
    const { agent: streamAgent, stats } = createStreamHarness({
      finiteChunks: 0,
    });
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: streamAgent,
    });
    memberships.rows = [{ org_id: ORG_A }];
    const controller = new AbortController();
    const pending = POST(
      copilotRequest("/api/copilotkit/agent/default/run", {
        body: runBody(),
        signal: controller.signal,
      }),
    );
    controller.abort();
    const response = await pending;
    expect(response.status).toBe(200);
    const deadline = Date.now() + 1000;
    while (Date.now() < deadline && stats.runStarted && !stats.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(stats.aborted || !stats.runStarted).toBe(true);
    const settled = stats.chunksEmitted;
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(stats.chunksEmitted).toBe(settled);
  });
});
