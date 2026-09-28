import { randomUUID } from "node:crypto";
import type { BaseEvent } from "@ag-ui/client";

export type PlannerRunControlMessage =
  | { kind: "probe"; requestId: string }
  | { kind: "probe_ack"; requestId: string; runId: string; ownerInstanceId: string }
  | { kind: "connect"; requestId: string }
  | { kind: "connect_ack"; requestId: string; runId: string; ownerInstanceId: string }
  | { kind: "stop"; requestId: string; runId: string }
  | { kind: "stop_ack"; requestId: string; runId: string; stopped: boolean; ownerInstanceId: string }
  | { kind: "event"; runId: string; event: BaseEvent; replayFor?: string };

export interface PlannerRunControlBus {
  send(message: PlannerRunControlMessage): Promise<void>;
  onMessage(handler: (message: PlannerRunControlMessage) => void): () => void;
  close(): Promise<void>;
}

export type OpenPlannerRunControlBus = (threadId: string) => Promise<PlannerRunControlBus>;

function boundedString(value: unknown, max = 256): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

export function isPlannerRunControlMessage(value: unknown): value is PlannerRunControlMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  const kind = message.kind;
  if (kind === "probe" || kind === "connect") return boundedString(message.requestId, 128);
  if (kind === "probe_ack" || kind === "connect_ack") {
    return boundedString(message.requestId, 128) && boundedString(message.runId) && boundedString(message.ownerInstanceId, 128);
  }
  if (kind === "stop") return boundedString(message.requestId, 128) && boundedString(message.runId);
  if (kind === "stop_ack") {
    return boundedString(message.requestId, 128) && boundedString(message.runId) && typeof message.stopped === "boolean" && boundedString(message.ownerInstanceId, 128);
  }
  if (kind === "event") {
    const event = message.event;
    return boundedString(message.runId) &&
      (message.replayFor === undefined || boundedString(message.replayFor, 128)) &&
      !!event &&
      typeof event === "object" &&
      !Array.isArray(event) &&
      boundedString((event as Record<string, unknown>).type, 128);
  }
  return false;
}

export type PlannerRunControlLogger = (message: string, details?: Record<string, unknown>) => void;

const DEFAULT_TIMEOUT_MS = 1_500;
const RETRY_FRACTIONS = [0.05, 0.15, 0.3, 0.3] as const;
export const plannerRuntimeInstanceId = randomUUID();
export interface PlannerRunOwnerHandle {
  publish(event: BaseEvent): Promise<void>;
  close(): Promise<void>;
}

export interface PlannerRemoteRunConnection {
  readonly runId: string;
  readonly ownerInstanceId: string;
  onEvent(handler: (event: BaseEvent) => void): () => void;
  close(): Promise<void>;
}

type ProbeAck = Extract<PlannerRunControlMessage, { kind: "probe_ack" }>;
type ConnectAck = Extract<PlannerRunControlMessage, { kind: "connect_ack" }>;
type StopAck = Extract<PlannerRunControlMessage, { kind: "stop_ack" }>;

type Settler<T> = {
  promise: Promise<T>;
  settle: (value: T) => void;
  cancel: () => void;
  isSettled: () => boolean;
};

function settleAfter<T>(timeoutMs: number, fallback: T): Settler<T> {
  let settled = false;
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => (resolvePromise = resolve));
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    resolvePromise(fallback);
  }, timeoutMs);
  timer.unref?.();
  return {
    promise,
    settle(value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise(value);
    },
    cancel() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise(fallback);
    },
    isSettled: () => settled,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}

async function sendUntilSettled<T>(
  bus: PlannerRunControlBus,
  message: PlannerRunControlMessage,
  waiter: Settler<T>,
  timeoutMs: number,
): Promise<void> {
  await bus.send(message);
  for (const fraction of RETRY_FRACTIONS) {
    if (waiter.isSettled()) return;
    const waitMs = Math.max(10, Math.floor(timeoutMs * fraction));
    await Promise.race([waiter.promise.then(() => undefined), delay(waitMs)]);
    if (waiter.isSettled()) return;
    await bus.send(message);
  }
}

export class PlannerRunControl {
  constructor(
    private readonly openBus: OpenPlannerRunControlBus,
    private readonly options: {
      instanceId?: string;
      timeoutMs?: number;
      log?: PlannerRunControlLogger;
    } = {},
  ) {}

  private get instanceId(): string {
    return this.options.instanceId ?? plannerRuntimeInstanceId;
  }

  private get timeoutMs(): number {
    return this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private log(message: string, details?: Record<string, unknown>) {
    this.options.log?.(message, details);
  }

  async own(
    threadId: string,
    runId: string,
    stopLocal: (runId: string) => Promise<boolean>,
  ): Promise<PlannerRunOwnerHandle> {
    const bus = await this.openBus(threadId);
    const stopRequests = new Map<string, Promise<StopAck>>();
    const connectRequests = new Set<string>();
    const replayBuffer: BaseEvent[] = [];
    let remoteListener = false;
    let closed = false;
    let sendQueue = Promise.resolve();
    const enqueue = (message: PlannerRunControlMessage): Promise<void> => {
      const send = sendQueue.then(() => {
        if (closed) return;
        return bus.send(message);
      });
      sendQueue = send.catch(() => undefined);
      return send;
    };
    const off = bus.onMessage((message) => {
      const respond = async () => {
        if (closed) return;
        if (message.kind === "probe") {
          await enqueue({
            kind: "probe_ack",
            requestId: message.requestId,
            runId,
            ownerInstanceId: this.instanceId,
          });
          return;
        }
        if (message.kind === "connect") {
          remoteListener = true;
          const firstDelivery = !connectRequests.has(message.requestId);
          connectRequests.add(message.requestId);

          // On the first delivery, queue replay events specifically for the
          // controller that requested them before sending its ACK. Other
          // controllers on the same thread ignore the tagged replay while
          // untagged live events continue to fan out to all listeners.
          let response = Promise.resolve();
          if (firstDelivery) {
            for (const event of replayBuffer) {
              response = enqueue({
                kind: "event",
                runId,
                event,
                replayFor: message.requestId,
              });
            }
          }
          response = enqueue({
            kind: "connect_ack",
            requestId: message.requestId,
            runId,
            ownerInstanceId: this.instanceId,
          });
          await response;
          return;
        }
        if (message.kind === "stop") {
          // Multiple starts can overlap briefly on one thread. Only the owner
          // of the requested run may acknowledge the Stop; otherwise a newer
          // run could race the real owner and incorrectly return stopped:false.
          if (message.runId !== runId) return;
          let response = stopRequests.get(message.requestId);
          if (!response) {
            response = stopLocal(message.runId).then((stopped) => ({
              kind: "stop_ack" as const,
              requestId: message.requestId,
              runId: message.runId,
              stopped,
              ownerInstanceId: this.instanceId,
            }));
            stopRequests.set(message.requestId, response);
          }
          const ack = await response;
          if (!closed) await enqueue(ack);
        }
      };
      void respond().catch((error) => {
        this.log("owner_control_message_failed", {
          kind: message.kind,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });

    return {
      publish: async (event) => {
        if (closed) return;
        // Match CopilotKit's active-run ReplaySubject semantics for a remote
        // reconnect: a controller receives the run from its beginning, then
        // continues with live events. The buffer lives only for this active run.
        replayBuffer.push(event);
        if (remoteListener) {
          await enqueue({ kind: "event", runId, event });
        }
      },
      close: async () => {
        if (closed) return;
        closed = true;
        stopRequests.clear();
        connectRequests.clear();
        replayBuffer.length = 0;
        off();
        await sendQueue.catch(() => undefined);
        await bus.close();
      },
    };
  }

  private async request<T extends ProbeAck | StopAck>(
    threadId: string,
    message: Extract<PlannerRunControlMessage, { kind: "probe" | "stop" }>,
    matches: (message: PlannerRunControlMessage) => message is T,
  ): Promise<T | null> {
    const bus = await this.openBus(threadId);
    const waiter = settleAfter<T | null>(this.timeoutMs, null);
    const off = bus.onMessage((incoming) => {
      if (matches(incoming)) waiter.settle(incoming);
    });
    try {
      await sendUntilSettled(bus, message, waiter, this.timeoutMs);
      return await waiter.promise;
    } finally {
      waiter.cancel();
      off();
      await bus.close();
    }
  }

  async probe(threadId: string): Promise<ProbeAck | null> {
    const requestId = randomUUID();
    return this.request(
      threadId,
      { kind: "probe", requestId },
      (message): message is ProbeAck =>
        message.kind === "probe_ack" && message.requestId === requestId,
    );
  }

  async isRunning(threadId: string): Promise<boolean> {
    return (await this.probe(threadId)) !== null;
  }

  async stop(threadId: string, runId: string): Promise<StopAck | null> {
    const requestId = randomUUID();
    return this.request(
      threadId,
      { kind: "stop", requestId, runId },
      (message): message is StopAck =>
        message.kind === "stop_ack" &&
        message.requestId === requestId &&
        message.runId === runId,
    );
  }

  async connect(threadId: string): Promise<PlannerRemoteRunConnection | null> {
    const bus = await this.openBus(threadId);
    const requestId = randomUUID();
    const waiter = settleAfter<ConnectAck | null>(this.timeoutMs, null);
    const buffered: Array<{ runId: string; event: BaseEvent }> = [];
    const listeners = new Set<(event: BaseEvent) => void>();
    let activeRunId: string | undefined;
    let closed = false;
    const off = bus.onMessage((message) => {
      if (message.kind === "connect_ack" && message.requestId === requestId) {
        activeRunId = message.runId;
        waiter.settle(message);
        return;
      }
      if (message.kind !== "event") return;
      if (message.replayFor !== undefined && message.replayFor !== requestId) return;
      if (activeRunId && message.runId !== activeRunId) return;
      if (listeners.size === 0) {
        buffered.push({ runId: message.runId, event: message.event });
        return;
      }
      if (message.runId === activeRunId) {
        for (const listener of listeners) listener(message.event);
      }
    });

    try {
      await sendUntilSettled(bus, { kind: "connect", requestId }, waiter, this.timeoutMs);
      const ack = await waiter.promise;
      if (!ack) {
        off();
        await bus.close();
        return null;
      }
      activeRunId = ack.runId;
      return this.remoteConnection(bus, off, ack, buffered, listeners, () => closed, (value) => {
        closed = value;
      });
    } catch (error) {
      waiter.cancel();
      off();
      await bus.close();
      throw error;
    }
  }

  private remoteConnection(
    bus: PlannerRunControlBus,
    off: () => void,
    ack: ConnectAck,
    buffered: Array<{ runId: string; event: BaseEvent }>,
    listeners: Set<(event: BaseEvent) => void>,
    isClosed: () => boolean,
    setClosed: (value: boolean) => void,
  ): PlannerRemoteRunConnection {
    return {
      runId: ack.runId,
      ownerInstanceId: ack.ownerInstanceId,
      onEvent(handler) {
        if (isClosed()) return () => {};
        listeners.add(handler);
        const pending = buffered.splice(0, buffered.length);
        for (const item of pending) {
          if (item.runId === ack.runId) handler(item.event);
        }
        return () => listeners.delete(handler);
      },
      async close() {
        if (isClosed()) return;
        setClosed(true);
        listeners.clear();
        buffered.length = 0;
        off();
        await bus.close();
      },
    };
  }
}
