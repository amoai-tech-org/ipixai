/**
 * IPI-1050 · MEM-001 — prove prior normal message history survives a REAL
 * process A -> process B restart and reaches the next Planner model call.
 *
 * Companion to `tests/mem-001-message-history.test.ts`. That test proves the
 * message-history -> model-prompt contract deterministically in one process on
 * Mastra's in-memory store. This script proves the part a single process cannot:
 * an actual OS process exit, followed by a fresh process that has never seen
 * turn 1, reading the thread back out of Postgres and supplying it to the model.
 *
 * Shape is deliberately copied from `scripts/host-pg-001-proof.mjs` (IPI-1124):
 * a parent spawns `write` and `read` children through `npx tsx`, requires a
 * different PID for the read, guards a synthetic namespace, and deletes only the
 * exact synthetic IDs it created. The reusable process/safety machinery is
 * shared by pattern, not duplicated logic.
 *
 * What makes this evidence and not a false green:
 *
 *   - the model is a recording mock, so the assertion reads the ACTUAL
 *     `LanguageModelV2CallOptions` the Planner produced, not the model's prose;
 *   - process B sends ONLY the follow-up message, so the browser cannot be the
 *     thing that carried the history;
 *   - the fact is asserted absent from every `system` message and from the
 *     resource's stored `workingMemory`, ruling out resource-scoped Working
 *     Memory as the explanation;
 *   - a new thread under the SAME resource must not recall the fact;
 *   - the read PID must differ from the write PID;
 *   - the `mastra` schema fingerprint must be byte-identical before and after,
 *     proving no DDL was introduced to make the proof pass.
 *
 * Run (local opt-in; hosted follows AGENTS.md hosted-write rules instead):
 *
 *   MASTRA_DATABASE_URL='postgres://hyperapp_runtime@127.0.0.1:54342/postgres' \
 *     npx tsx scripts/mem-001-restart-proof.mjs
 *
 * Never prints the connection string, a password, or a token.
 */
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { MASTRA_SCHEMA_FINGERPRINT_SQL } from "./mastra-schema-fingerprint.ts";

const NAMESPACE = "MEM-001-TEST-";
const USER_TURN = (nonce) =>
  `Remember this for later: ${nonce} — plan 12 ivory looks in Cartagena.`;
// The follow-up deliberately does NOT contain the nonce. If it did, finding the
// nonce in process B's prompt would be self-fulfilling and would prove nothing
// about message history. The nonce can only reach process B's prompt out of
// stored history — which is exactly the MEM-001 claim.
const FOLLOW_UP = `How many ivory looks did I ask for, and where were we shooting?`;
const FRESH_THREAD_QUESTION = "What did I ask you to remember earlier?";

function redactError(err) {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/:[^:@/]+@/g, ":redacted@");
}

function proofIds(nonce) {
  return {
    resourceId: `org:${NAMESPACE}${nonce}::user:mem-001-proof-user`,
    threadId: `${NAMESPACE}${nonce}-thread`,
    freshThreadId: `${NAMESPACE}${nonce}-fresh-thread`,
  };
}

function assertSynthetic(ids) {
  if (!ids.resourceId.includes(NAMESPACE) || !ids.threadId.startsWith(NAMESPACE)) {
    throw new Error("MEM-001 proof IDs must use the synthetic namespace");
  }
}

/** Structural readers for the two prompt/content shapes (see the unit test). */
function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (part) =>
          part &&
          typeof part === "object" &&
          part.type === "text" &&
          typeof part.text === "string",
      )
      .map((part) => part.text)
      .join("");
  }
  if (content && typeof content === "object") {
    if (typeof content.content === "string" && content.content.length > 0) {
      return content.content;
    }
    if (Array.isArray(content.parts)) return textOf(content.parts);
  }
  return "";
}

function textsWithRole(call, role) {
  return (call.prompt ?? [])
    .filter((message) => message.role === role)
    .map((message) => textOf(message.content));
}

async function loadProofDeps() {
  const { getProductionPlannerAgent } = await import("@/mastra/agents");
  const { MastraLanguageModelV2Mock, simulateReadableStream } = await import(
    "@mastra/core/test-utils/llm-mock"
  );
  const { requireMastraPostgresUrl, getMastraPostgresStore } = await import(
    "../src/mastra/pg-store.ts"
  );
  return {
    getProductionPlannerAgent,
    MastraLanguageModelV2Mock,
    simulateReadableStream,
    requireMastraPostgresUrl,
    getMastraPostgresStore,
  };
}

function requireProofUrl(requireMastraPostgresUrl) {
  if (!process.env.MASTRA_DATABASE_URL) {
    throw new Error(
      "MEM-001 restart proof requires MASTRA_DATABASE_URL; without it the Planner uses in-memory storage and no restart can be proven",
    );
  }
  const url = requireMastraPostgresUrl();
  if (!url) {
    throw new Error("MEM-001 restart proof requires an approved Postgres URL");
  }
  return url;
}

const USAGE = { inputTokens: 12, outputTokens: 8, totalTokens: 20 };

function textTurn(text) {
  return [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: text },
    { type: "text-end", id: "t1" },
    { type: "finish", finishReason: "stop", usage: USAGE },
  ];
}

/** Every call answers with plain text: no tool call, so no Working Memory write. */
function recordingModel(MastraLanguageModelV2Mock, simulateReadableStream) {
  return new MastraLanguageModelV2Mock({
    provider: "mock",
    modelId: "mock-planner",
    doGenerate: async () => ({
      content: [{ type: "text", text: "Planner chat" }],
      finishReason: "stop",
      usage: USAGE,
      warnings: [],
      request: { body: undefined },
      response: undefined,
      stream: simulateReadableStream({ chunks: [] }),
    }),
    doStream: async () => ({
      stream: simulateReadableStream({ chunks: textTurn("Understood.") }),
    }),
  });
}

async function drain(stream) {
  for await (const _chunk of stream.fullStream) {
    // no-op — the run must finish and persist; assertions read the recorded input
  }
}

async function fingerprint(store) {
  const cols = await store.pool.query(MASTRA_SCHEMA_FINGERPRINT_SQL);
  return createHash("sha256").update(String(cols.rows[0].fp)).digest("hex");
}

async function writePhase(ids) {
  assertSynthetic(ids);
  const deps = await loadProofDeps();
  requireProofUrl(deps.requireMastraPostgresUrl);

  const store = deps.getMastraPostgresStore(process.env.MASTRA_DATABASE_URL);
  const beforeFp = await fingerprint(store);

  const nonce = ids.threadId.slice(NAMESPACE.length, -"-thread".length);
  const model = recordingModel(deps.MastraLanguageModelV2Mock, deps.simulateReadableStream);
  const agent = deps.getProductionPlannerAgent();
  agent.__updateModel({ model });

  await drain(
    await agent.stream([{ role: "user", content: USER_TURN(nonce) }], {
      memory: { thread: ids.threadId, resource: ids.resourceId },
    }),
  );

  // Turn 1 must genuinely have reached the model, or the later read proves nothing.
  const wrotePrompt = model.doStreamCalls.length > 0;
  if (!wrotePrompt) throw new Error("process A never invoked the Planner model");

  const afterFp = await fingerprint(store);
  if (beforeFp !== afterFp) throw new Error("schema fingerprint changed during write (DDL?)");

  return { pid: process.pid, threadId: ids.threadId, fingerprint: beforeFp };
}

async function readPhase(ids, expectedFingerprint) {
  assertSynthetic(ids);
  const deps = await loadProofDeps();
  requireProofUrl(deps.requireMastraPostgresUrl);

  const store = deps.getMastraPostgresStore(process.env.MASTRA_DATABASE_URL);
  const fp = await fingerprint(store);
  if (fp !== expectedFingerprint) {
    throw new Error("schema fingerprint changed across restart");
  }

  const nonce = ids.threadId.slice(NAMESPACE.length, -"-thread".length);
  const model = recordingModel(deps.MastraLanguageModelV2Mock, deps.simulateReadableStream);
  const agent = deps.getProductionPlannerAgent();
  agent.__updateModel({ model });

  // Only the follow-up is sent: the browser is not carrying the history.
  await drain(
    await agent.stream([{ role: "user", content: FOLLOW_UP }], {
      memory: { thread: ids.threadId, resource: ids.resourceId },
    }),
  );

  const calls = model.doStreamCalls;
  if (calls.length === 0) throw new Error("process B never invoked the Planner model");

  const carrying = calls.filter((call) =>
    textsWithRole(call, "user").some((text) => text.includes(FOLLOW_UP)),
  );
  if (carrying.length === 0) {
    throw new Error("process B's model calls never contained the follow-up message");
  }

  const historyCarried = carrying.some((call) =>
    textsWithRole(call, "user").some((text) => text.includes(nonce)),
  );
  if (!historyCarried) {
    throw new Error(
      "prior turn's normal message history did NOT reach process B's Planner model call",
    );
  }

  const workingMemoryCarried = carrying.some((call) =>
    textsWithRole(call, "system").some((text) => text.includes(nonce)),
  );
  if (workingMemoryCarried) {
    throw new Error(
      "the fact arrived through a system message (Working Memory), so message history is unproven",
    );
  }

  // The resource row itself must not hold the fact either.
  const storedWm = await store.pool.query(
    'SELECT "workingMemory" AS wm FROM mastra.mastra_resources WHERE id = $1',
    [ids.resourceId],
  );
  const wmText = storedWm.rows
    .map((row) => (row.wm == null ? "" : JSON.stringify(row.wm)))
    .join("\n");
  if (wmText.includes(nonce)) {
    throw new Error("the fact was stored in resource-scoped Working Memory");
  }

  // A new thread under the SAME resource must not inherit a thread-only fact.
  const freshCallsBefore = model.doStreamCalls.length;
  await drain(
    await agent.stream([{ role: "user", content: FRESH_THREAD_QUESTION }], {
      memory: { thread: ids.freshThreadId, resource: ids.resourceId },
    }),
  );
  const freshLeak = model.doStreamCalls
    .slice(freshCallsBefore)
    .some((call) =>
      [...textsWithRole(call, "user"), ...textsWithRole(call, "system")].some((text) =>
        text.includes(nonce),
      ),
    );
  if (freshLeak) throw new Error("a new thread inherited the thread-only fact");

  return {
    pid: process.pid,
    threadId: ids.threadId,
    historyCarried: true,
    workingMemoryCarried: false,
    freshThreadLeak: false,
    fingerprintUnchanged: true,
    appendedUserMessagesOnly: true,
  };
}

async function cleanupPhase(ids) {
  assertSynthetic(ids);
  const deps = await loadProofDeps();
  requireProofUrl(deps.requireMastraPostgresUrl);
  const store = deps.getMastraPostgresStore(process.env.MASTRA_DATABASE_URL);

  if (!ids.threadId.startsWith(NAMESPACE) || !ids.freshThreadId.startsWith(NAMESPACE)) {
    throw new Error("cleanup refuses IDs outside the synthetic namespace");
  }
  await store.pool.query("DELETE FROM mastra.mastra_messages WHERE thread_id = ANY($1)", [
    [ids.threadId, ids.freshThreadId],
  ]);
  await store.pool.query("DELETE FROM mastra.mastra_threads WHERE id = ANY($1)", [
    [ids.threadId, ids.freshThreadId],
  ]);
  await store.pool.query("DELETE FROM mastra.mastra_resources WHERE id = $1", [ids.resourceId]);
}

const phase = process.argv[2] ?? "parent";
const keep = process.argv.includes("--keep");

try {
  if (phase === "write") {
    const result = await writePhase(proofIds(process.argv[3]));
    console.log("WRITE_OK", JSON.stringify(result));
  } else if (phase === "read") {
    const result = await readPhase(proofIds(process.argv[4]), process.argv[3]);
    console.log("READ_OK", JSON.stringify(result));
  } else if (phase === "cleanup") {
    await cleanupPhase(proofIds(process.argv[3]));
    console.log("CLEANUP_OK");
  } else {
    const script = fileURLToPath(import.meta.url);
    const nonce = randomUUID();
    let wrote = false;
    let primaryError = null;
    try {
      const write = spawnSync("npx", ["tsx", script, "write", nonce], {
        env: process.env,
        encoding: "utf8",
      });
      if (write.status !== 0) throw new Error(redactError(write.stderr || write.stdout));
      wrote = true;
      const writePayload = JSON.parse(
        write.stdout.trim().split("\n").at(-1).replace(/^WRITE_OK\s/, ""),
      );

      const read = spawnSync(
        "npx",
        ["tsx", script, "read", writePayload.fingerprint, nonce],
        { env: process.env, encoding: "utf8" },
      );
      if (read.status !== 0) throw new Error(redactError(read.stderr || read.stdout));
      const readPayload = JSON.parse(
        read.stdout.trim().split("\n").at(-1).replace(/^READ_OK\s/, ""),
      );

      if (readPayload.pid === writePayload.pid) {
        throw new Error("expected a different PID for the continuation process");
      }

      console.log(
        "PASS restart-memory-history",
        JSON.stringify({
          writePid: writePayload.pid,
          readPid: readPayload.pid,
          historyCarried: readPayload.historyCarried,
          workingMemoryCarried: readPayload.workingMemoryCarried,
          freshThreadLeak: readPayload.freshThreadLeak,
          fingerprintUnchanged: readPayload.fingerprintUnchanged,
          browserResentHistory: false,
          namespace: NAMESPACE,
        }),
      );
    } catch (err) {
      primaryError = err;
    } finally {
      if (wrote && !keep) {
        const cleanup = spawnSync("npx", ["tsx", script, "cleanup", nonce], {
          env: process.env,
          encoding: "utf8",
        });
        if (cleanup.status !== 0) {
          console.error("CLEANUP_FAILED", redactError(cleanup.stderr || cleanup.stdout));
          if (!primaryError) process.exit(cleanup.status ?? 1);
        }
      }
    }
    if (primaryError) {
      console.error(redactError(primaryError));
      process.exit(1);
    }
  }
} catch (err) {
  console.error(redactError(err));
  process.exit(1);
}
