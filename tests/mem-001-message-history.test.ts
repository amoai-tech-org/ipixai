import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * IPI-1050 · MEM-001 — prior *normal message history* reaches the next
 * same-thread Planner model call, and a different thread does not inherit it.
 *
 * This file proves the deterministic half of MEM-001: the exact prompt the
 * Planner hands to its language model. It deliberately does NOT claim restart
 * durability — it runs against whatever store the process has, and the store is
 * forced to Mastra's in-memory store below so a developer running this file can
 * never write Planner rows into a real `MASTRA_DATABASE_URL`. The real
 * process-A → process-B restart proof lives in
 * `scripts/mem-001-restart-proof.mjs`.
 *
 * Why the model prompt and not the database: a persisted row (or Working
 * Memory remembering a fact) would be a false green. MEM-001's claim is that the
 * prior turn is *supplied to the model*, so the assertion reads
 * `model.doStreamCalls[n].prompt` — the actual `LanguageModelV2CallOptions` the
 * Planner produced.
 *
 * Two confounds this file rules out on purpose:
 *
 * 1. Working Memory. The Planner configures resource-scoped Working Memory, so
 *    a fact written there would be visible on *every* thread of the resource and
 *    would make the "new thread must not inherit it" assertion impossible to
 *    satisfy honestly. The test therefore never lets the model write Working
 *    Memory, and asserts the fact appears only as a `user` message — never in a
 *    `system` message, which is where Working Memory is injected.
 * 2. Semantic recall. `@mastra/core`'s `memoryDefaultOptions` sets
 *    `semanticRecall: false`, and the Planner passes no embedder/vector, so
 *    recall cannot supply the fact.
 *
 * History window: the Planner does not set `lastMessages`, so Mastra's default
 * applies (`memoryDefaultOptions.lastMessages = 10` at `@mastra/core@1.71.0`).
 * MEM-001 promises bounded recent history, not unbounded context, so every
 * assertion below stays inside that window on purpose.
 */

// Must run before the agent module is evaluated: `getProductionPlannerAgent()`
// builds its Memory once, from `createAgentMemoryStorage()`, and that factory
// reads these at construction time. `vi.hoisted` is the only hook that reliably
// beats the hoisted `import` statements below.
const savedEnv = vi.hoisted(() => {
  const saved = {
    url: process.env.MASTRA_DATABASE_URL,
    hosted: process.env.IPIX_MASTRA_HOSTED,
  };
  delete process.env.MASTRA_DATABASE_URL;
  delete process.env.IPIX_MASTRA_HOSTED;
  return saved;
});

vi.mock(
  "../src/lib/supabase/server",
  async () => (await import("./mocks/supabase")).supabaseMockModule(),
);

import {
  MastraLanguageModelV2Mock,
  simulateReadableStream,
} from "@mastra/core/test-utils/llm-mock";
import { getProductionPlannerAgent } from "../src/mastra/agents";

const USAGE = { inputTokens: 12, outputTokens: 8, totalTokens: 20 };

type StreamPart =
  | { type: "stream-start"; warnings: never[] }
  | { type: "text-start"; id: string }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "text-end"; id: string }
  // Literal, not `string`: the AI SDK's `LanguageModelV2StreamPart` narrows this
  // to `LanguageModelV2FinishReason`, and a widened `string` fails typecheck.
  | { type: "finish"; finishReason: "stop"; usage: typeof USAGE };

/** Every call answers with plain text: no tool call, so no Working Memory write. */
function textTurn(text: string): StreamPart[] {
  return [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: text },
    { type: "text-end", id: "t1" },
    { type: "finish", finishReason: "stop", usage: USAGE },
  ];
}

type MockGenerateResult = Awaited<ReturnType<MastraLanguageModelV2Mock["doGenerate"]>>;

/**
 * The Planner sets `generateTitle: true`, so creating a thread fires one extra
 * `generate()` call. The vendored mock's default `doGenerate` throws
 * "Not implemented", which Mastra catches and logs as `Error generating title` —
 * harmless, but noise that would hide a real title failure later. Supply a real
 * result instead.
 */
function generateResult(text: string) {
  return {
    content: [{ type: "text", text }],
    finishReason: "stop",
    usage: USAGE,
    warnings: [],
    request: { body: undefined },
    response: undefined,
    stream: simulateReadableStream({ chunks: [] }),
  } as unknown as MockGenerateResult;
}

function recordingModel() {
  return new MastraLanguageModelV2Mock({
    provider: "mock",
    modelId: "mock-planner",
    doGenerate: async () => generateResult("Planner chat"),
    doStream: async () => ({
      stream: simulateReadableStream({ chunks: textTurn("Understood.") }),
    }),
  });
}

/** The prompt shape we read from the recorded model calls (structural on purpose). */
type RecordedCall = {
  prompt: Array<{ role: string; content: unknown }>;
};

/**
 * Model prompts carry `content` as a string or a part array; a Mastra *stored*
 * message carries `{ format, parts, content }` instead. Handle both so the same
 * helper can read a recorded prompt and a recalled row.
 */
function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (part): part is { type: string; text: string } =>
          typeof part === "object" &&
          part !== null &&
          (part as { type?: unknown }).type === "text" &&
          typeof (part as { text?: unknown }).text === "string",
      )
      .map((part) => part.text)
      .join("");
  }
  if (typeof content === "object" && content !== null) {
    const record = content as { content?: unknown; parts?: unknown };
    if (typeof record.content === "string" && record.content.length > 0) {
      return record.content;
    }
    if (Array.isArray(record.parts)) return textOf(record.parts);
  }
  return "";
}

function textsWithRole(call: RecordedCall, role: string): string[] {
  return call.prompt.filter((m) => m.role === role).map((m) => textOf(m.content));
}

/** Consume a Planner stream to completion; the assertion targets recorded input. */
async function drain(stream: Awaited<ReturnType<ReturnType<typeof getProductionPlannerAgent>["stream"]>>) {
  for await (const _chunk of stream.fullStream) {
    // no-op — we only need the run to finish and persist
  }
}

// A fact that exists ONLY as a normal user message, never in Working Memory.
const NONCE = `MEM-001-TEST-${randomUUID()}`;
const NONCE_TURN = `Remember this for later: ${NONCE} — plan 12 ivory looks in Cartagena.`;
// The follow-up deliberately does NOT contain NONCE. If it did, finding NONCE in
// the next call's prompt would be self-fulfilling and would prove nothing about
// message history. The nonce can only reach the prompt out of stored history.
const FOLLOW_UP = `How many ivory looks did I ask for, and where were we shooting?`;
const FRESH_THREAD_QUESTION = `What did I ask you to remember earlier?`;

const RESOURCE = `org:mem-001-org::user:mem-001-user`;

describe("IPI-1050 MEM-001: prior normal message history reaches the next Planner model call", () => {
  let model: MastraLanguageModelV2Mock;

  beforeAll(() => {
    model = recordingModel();
    getProductionPlannerAgent().__updateModel({ model });
  });

  afterAll(() => {
    getProductionPlannerAgent().__resetToOriginalModel();
    if (savedEnv.url !== undefined) process.env.MASTRA_DATABASE_URL = savedEnv.url;
    else delete process.env.MASTRA_DATABASE_URL;
    if (savedEnv.hosted !== undefined) process.env.IPIX_MASTRA_HOSTED = savedEnv.hosted;
    else delete process.env.IPIX_MASTRA_HOSTED;
  });

  it("a fresh process with only a follow-up message still sends the prior turn's facts to the model", async () => {
    const agent = getProductionPlannerAgent();
    const threadId = randomUUID();

    // Turn 1 — the fact is stored as an ordinary user message.
    await drain(
      await agent.stream([{ role: "user", content: NONCE_TURN }], {
        memory: { thread: threadId, resource: RESOURCE },
      }),
    );

    // Turn 2 — only the follow-up is sent; Mastra must supply turn 1 underneath.
    const callsBeforeFollowUp = model.doStreamCalls.length;
    await drain(
      await agent.stream([{ role: "user", content: FOLLOW_UP }], {
        memory: { thread: threadId, resource: RESOURCE },
      }),
    );

    const followUpCalls = model.doStreamCalls
      .slice(callsBeforeFollowUp)
      .map((call) => call as unknown as RecordedCall);
    expect(followUpCalls.length).toBeGreaterThan(0);

    const carrying = followUpCalls.filter((call) =>
      textsWithRole(call, "user").some((text) => text.includes(FOLLOW_UP)),
    );
    expect(carrying.length).toBeGreaterThan(0);

    const userText = carrying
      .flatMap((call) => textsWithRole(call, "user"))
      .join("\n");
    expect(userText).toContain(NONCE);
    expect(userText).toContain("12 ivory looks in Cartagena");
  });

  it("supplies the prior turn as a user message, not through resource-scoped Working Memory", async () => {
    const carryCalls = model.doStreamCalls
      .map((call) => call as unknown as RecordedCall)
      .filter((call) =>
        textsWithRole(call, "user").some((text) => text.includes(FOLLOW_UP)),
      );
    expect(carryCalls.length).toBeGreaterThan(0);

    // Working Memory is injected as a system message. If the nonce showed up
    // there, this test would be proving Working Memory, not message history.
    for (const call of carryCalls) {
      for (const systemText of textsWithRole(call, "system")) {
        expect(systemText).not.toContain(NONCE);
      }
    }
  });

  // Deliberately narrow: this recalls through the same in-process Memory that
  // served both model calls, so it proves the turn was *stored under the thread*
  // (and not merely streamed through), not that it survives a process boundary.
  // It cannot distinguish a persisted row from a live cache, and it does not
  // claim to — restart durability is owned solely by
  // `scripts/mem-001-restart-proof.mjs`, which reads the thread back from a
  // second OS process.
  it("stores the prior turn under the thread so it can be recalled by thread id", async () => {
    const agent = getProductionPlannerAgent();
    const memory = await agent.getMemory();
    expect(memory).toBeDefined();
    if (!memory) throw new Error("Planner has no Memory attached");

    // The thread created above is the only one this resource has; recall it back
    // through the same Memory the model call used.
    const listed = await memory.listThreads({ filter: { resourceId: RESOURCE }, perPage: false });
    const threads = listed.threads.filter((t) => t.resourceId === RESOURCE);
    expect(threads.length).toBeGreaterThan(0);

    const recalled = await memory.recall({
      threadId: threads[0].id,
      resourceId: RESOURCE,
      perPage: false,
    });
    const stored = (recalled.messages ?? [])
      .map((message) => textOf((message as { content?: unknown }).content))
      .join("\n");
    expect(stored).toContain(NONCE);
  });

  it("does not leak a thread-only fact into a different thread of the same resource", async () => {
    const agent = getProductionPlannerAgent();

    const callsBefore = model.doStreamCalls.length;
    await drain(
      await agent.stream([{ role: "user", content: FRESH_THREAD_QUESTION }], {
        memory: { thread: randomUUID(), resource: RESOURCE },
      }),
    );

    const freshCalls = model.doStreamCalls
      .slice(callsBefore)
      .map((call) => call as unknown as RecordedCall);
    expect(freshCalls.length).toBeGreaterThan(0);

    for (const call of freshCalls) {
      expect(textsWithRole(call, "user").join("\n")).not.toContain(NONCE);
      expect(textsWithRole(call, "system").join("\n")).not.toContain(NONCE);
    }
  });
});
