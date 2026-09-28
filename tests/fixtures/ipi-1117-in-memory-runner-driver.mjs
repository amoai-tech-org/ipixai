import readline from "node:readline";
import { randomUUID } from "node:crypto";
import { InMemoryAgentRunner } from "@copilotkit/runtime/v2";
import { AbstractAgent, EventType } from "@ag-ui/client";

class SlowAgent extends AbstractAgent {
  constructor() {
    super({ agentId: "default" });
    this.abortController = null;
  }

  clone() {
    return new SlowAgent();
  }

  abortRun() {
    this.abortController?.abort();
  }

  async runAgent(input, subscribers) {
    this.abortController = new AbortController();
    const { signal } = this.abortController;
    const runId = input.runId ?? randomUUID();
    subscribers.onEvent({ event: { type: EventType.RUN_STARTED, threadId: input.threadId, runId } });
    let tick = 0;
    while (!signal.aborted && tick < 200) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (signal.aborted) break;
      subscribers.onEvent({ event: { type: EventType.CUSTOM, name: "tick", value: ++tick } });
    }
    return { result: undefined, newMessages: [] };
  }
}
const runner = new InMemoryAgentRunner();
const runs = new Map();

function input(threadId, runId) {
  return { threadId, runId, messages: [], tools: [], context: [], state: {}, forwardedProps: {} };
}

function reply(id, payload) {
  if (typeof process.send === "function") process.send({ id, ...payload });
}

function collectConnect(threadId, timeoutMs = 80) {
  return new Promise((resolve, reject) => {
    const events = [];
    const timer = setTimeout(() => {
      sub.unsubscribe();
      resolve(events);
    }, timeoutMs);
    const sub = runner.connect({ threadId }).subscribe({
      next: (event) => {
        events.push(event);
        if (event.type === EventType.CUSTOM) {
          clearTimeout(timer);
          sub.unsubscribe();
          resolve(events);
        }
      },
      complete: () => {
        clearTimeout(timer);
        resolve(events);
      },
      error: reject,
    });
  });
}
process.on("message", async (message) => {
  const { id, command, threadId, runId } = message ?? {};
  try {
    if (command === "start") {
      const agent = new SlowAgent();
      const events = [];
      let doneResolve;
      const done = new Promise((resolve) => (doneResolve = resolve));
      const subscription = runner.run({ threadId, agent, input: input(threadId, runId) }).subscribe({
        next: (event) => events.push(event),
        complete: () => doneResolve(),
        error: () => doneResolve(),
      });
      runs.set(threadId, { agent, events, done, subscription });
      const deadline = Date.now() + 500;
      while (!events.some((event) => event.type === EventType.RUN_STARTED) && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      reply(id, { ok: true, started: events.some((event) => event.type === EventType.RUN_STARTED) });
      return;
    }
    if (command === "isRunning") {
      reply(id, { ok: true, running: await runner.isRunning({ threadId }) });
      return;
    }
    if (command === "connect") {
      const events = await collectConnect(threadId);
      reply(id, { ok: true, events });
      return;
    }
    if (command === "stop") {
      reply(id, { ok: true, stopped: await runner.stop({ threadId, runId }) });
      return;
    }
    if (command === "status") {
      const run = runs.get(threadId);
      reply(id, {
        ok: true,
        running: await runner.isRunning({ threadId }),
        ticks: run?.events.filter((event) => event.type === EventType.CUSTOM).length ?? 0,
        terminal: run?.events.some(
          (event) => event.type === EventType.RUN_FINISHED || event.type === EventType.RUN_ERROR,
        ) ?? false,
      });
      return;
    }
    if (command === "shutdown") {
      for (const run of runs.values()) run.subscription.unsubscribe();
      reply(id, { ok: true });
      setTimeout(() => process.exit(0), 0);
      return;
    }
    reply(id, { ok: false, error: `unknown_command:${command}` });
  } catch (error) {
    reply(id, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

reply("ready", { ok: true });
