import { EventType, type BaseEvent } from "@ag-ui/client";
import { describe, expect, it } from "vitest";

import {
  PlannerRunControl,
  type OpenPlannerRunControlBus,
  type PlannerRunControlBus,
  type PlannerRunControlMessage,
} from "../planner-run-control";

function network(): OpenPlannerRunControlBus {
  type TestBus = PlannerRunControlBus & { deliver(message: PlannerRunControlMessage): void };
  const topics = new Map<string, Set<TestBus>>();
  return async (threadId) => {
    const handlers = new Set<(message: PlannerRunControlMessage) => void>();
    const peers = topics.get(threadId) ?? new Set<TestBus>();
    let bus!: TestBus;
    bus = {
      async send(message) {
        for (const peer of peers) if (peer !== bus) peer.deliver(message);
      },
      onMessage(handler) {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      async close() {
        peers.delete(bus);
        handlers.clear();
      },
      deliver(message) {
        for (const handler of handlers) handler(message);
      },
    };
    peers.add(bus);
    topics.set(threadId, peers);
    return bus;
  };
}

describe("PlannerRunControl resilience", () => {
  it("delivers a fallback terminal event when an owner closes before publishing one", async () => {
    const openBus = network();
    const owner = new PlannerRunControl(openBus, { instanceId: "A", timeoutMs: 100 });
    const controller = new PlannerRunControl(openBus, { instanceId: "B", timeoutMs: 100 });
    const handle = await owner.own("thread-owner-close", "R1", async () => true);
    const connection = await controller.connect("thread-owner-close");
    expect(connection).not.toBeNull();

    const received: BaseEvent[] = [];
    connection?.onEvent((event) => received.push(event));

    await handle.close();

    expect(received).toEqual([
      expect.objectContaining({
        type: EventType.RUN_ERROR,
        message: "planner_run_owner_closed",
      }),
    ]);
    await connection?.close();
  });
});
