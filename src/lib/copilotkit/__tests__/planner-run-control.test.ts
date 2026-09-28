import { EventType, type BaseEvent } from "@ag-ui/client";
import { describe, expect, it, vi } from "vitest";

import {
  PlannerRunControl,
  type OpenPlannerRunControlBus,
  type PlannerRunControlBus,
  type PlannerRunControlMessage,
} from "../planner-run-control";

function network() {
  type TestBus = PlannerRunControlBus & { __deliver(message: PlannerRunControlMessage): void };
  const topics = new Map<string, Set<TestBus>>();
  let closed = 0;
  const openBus: OpenPlannerRunControlBus = async (threadId) => {
    const handlers = new Set<(message: PlannerRunControlMessage) => void>();
    const peers = topics.get(threadId) ?? new Set<TestBus>();
    let bus!: TestBus;
    bus = {
      async send(message) {
        for (const peer of peers) {
          if (peer === bus) continue;
          peer.__deliver(message);
        }
      },
      onMessage(handler) {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      async close() {
        peers.delete(bus);
        handlers.clear();
        closed += 1;
      },
      __deliver(message: PlannerRunControlMessage) {
        for (const handler of handlers) handler(message);
      },
    } as TestBus;
    peers.add(bus);
    topics.set(threadId, peers);
    return bus;
  };
  return { openBus, closed: () => closed };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

describe("PlannerRunControl", () => {
  it("probes a run owned by another runtime and relays new live events", async () => {
    const wire = network();
    const owner = new PlannerRunControl(wire.openBus, { instanceId: "A", timeoutMs: 100 });
    const controller = new PlannerRunControl(wire.openBus, { instanceId: "B", timeoutMs: 100 });
    const handle = await owner.own("thread-1", "R1", async () => true);

    expect(await controller.probe("thread-1")).toMatchObject({ runId: "R1", ownerInstanceId: "A" });
    const connection = await controller.connect("thread-1");
    expect(connection).toMatchObject({ runId: "R1", ownerInstanceId: "A" });

    const received: BaseEvent[] = [];
    connection?.onEvent((event) => received.push(event));
    await handle.publish({ type: EventType.TEXT_MESSAGE_START, messageId: "m1", role: "assistant" } as BaseEvent);
    expect(received).toHaveLength(1);

    await connection?.close();
    await handle.close();
  });

  it("replays active-run events emitted before remote connect, then continues live", async () => {
    const wire = network();
    const owner = new PlannerRunControl(wire.openBus, { instanceId: "A", timeoutMs: 100 });
    const controller = new PlannerRunControl(wire.openBus, { instanceId: "B", timeoutMs: 100 });
    const handle = await owner.own("thread-replay", "R1", async () => true);

    await handle.publish({
      type: EventType.TEXT_MESSAGE_START,
      messageId: "m-replay",
      role: "assistant",
    } as BaseEvent);
    await handle.publish({
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId: "m-replay",
      delta: "before-connect",
    } as BaseEvent);

    const connection = await controller.connect("thread-replay");
    expect(connection).toMatchObject({ runId: "R1", ownerInstanceId: "A" });
    const received: BaseEvent[] = [];
    connection?.onEvent((event) => received.push(event));

    expect(received.map((event) => event.type)).toEqual([
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
    ]);

    await handle.publish({
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId: "m-replay",
      delta: "after-connect",
    } as BaseEvent);
    expect(received).toHaveLength(3);

    await connection?.close();
    await handle.close();
  });

  it("stops only the exact remote run and fences stale Stop(R1)", async () => {
    const wire = network();
    const stopLocal = vi.fn(async (runId: string) => runId === "R2");
    const owner = new PlannerRunControl(wire.openBus, { instanceId: "A", timeoutMs: 100 });
    const controller = new PlannerRunControl(wire.openBus, { instanceId: "B", timeoutMs: 100 });
    const handle = await owner.own("thread-2", "R2", stopLocal);

    expect(await controller.stop("thread-2", "R1")).toBeNull();
    expect(await controller.stop("thread-2", "R2")).toMatchObject({ stopped: true, runId: "R2" });
    expect(stopLocal).toHaveBeenCalledTimes(1);
    expect(stopLocal).toHaveBeenCalledWith("R2");

    await handle.close();
  });

  it("ignores a non-owner Stop acknowledgement when two runs overlap on one thread", async () => {
    const wire = network();
    const stopR1 = vi.fn(async () => true);
    const stopR2 = vi.fn(async () => true);
    const owner1 = new PlannerRunControl(wire.openBus, { instanceId: "A1", timeoutMs: 100 });
    const owner2 = new PlannerRunControl(wire.openBus, { instanceId: "A2", timeoutMs: 100 });
    const controller = new PlannerRunControl(wire.openBus, { instanceId: "B", timeoutMs: 100 });
    const handle1 = await owner1.own("thread-overlap", "R1", stopR1);
    const handle2 = await owner2.own("thread-overlap", "R2", stopR2);

    expect(await controller.stop("thread-overlap", "R1")).toMatchObject({
      stopped: true,
      runId: "R1",
      ownerInstanceId: "A1",
    });
    expect(stopR1).toHaveBeenCalledWith("R1");
    expect(stopR2).not.toHaveBeenCalled();

    await Promise.all([handle1.close(), handle2.close()]);
  });

  it("retries connect when the owner subscribes after the first control broadcast", async () => {
    const wire = network();
    const owner = new PlannerRunControl(wire.openBus, { instanceId: "A", timeoutMs: 350 });
    const controller = new PlannerRunControl(wire.openBus, { instanceId: "B", timeoutMs: 350 });

    const connectionPromise = controller.connect("thread-late-connect");
    await sleep(20);
    const handle = await owner.own("thread-late-connect", "R1", async () => true);

    expect(await connectionPromise).toMatchObject({ runId: "R1", ownerInstanceId: "A" });

    await handle.close();
  });

  it("retries exact Stop when the owner subscribes after the first control broadcast", async () => {
    const wire = network();
    const stopLocal = vi.fn(async () => true);
    const owner = new PlannerRunControl(wire.openBus, { instanceId: "A", timeoutMs: 350 });
    const controller = new PlannerRunControl(wire.openBus, { instanceId: "B", timeoutMs: 350 });

    const stopPromise = controller.stop("thread-late-stop", "R1");
    await sleep(20);
    const handle = await owner.own("thread-late-stop", "R1", stopLocal);

    expect(await stopPromise).toMatchObject({ stopped: true, runId: "R1", ownerInstanceId: "A" });
    expect(stopLocal).toHaveBeenCalledTimes(1);
    expect(stopLocal).toHaveBeenCalledWith("R1");

    await handle.close();
  });

  it("times out safely when no owner exists and closes the temporary bus", async () => {
    const wire = network();
    const controller = new PlannerRunControl(wire.openBus, { instanceId: "B", timeoutMs: 10 });

    expect(await controller.probe("missing")).toBeNull();
    expect(await controller.stop("missing", "R1")).toBeNull();
    expect(await controller.connect("missing")).toBeNull();
    expect(wire.closed()).toBe(3);
  });
});
