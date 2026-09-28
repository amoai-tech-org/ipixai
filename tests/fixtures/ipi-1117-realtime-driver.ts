import type { BaseEvent } from "@ag-ui/client";

import { createPlannerRunControl } from "../../src/lib/copilotkit/planner-run-control-supabase";
import type {
  PlannerRemoteRunConnection,
  PlannerRunOwnerHandle,
} from "../../src/lib/copilotkit/planner-run-control";

type Command =
  | { id: number; kind: "own"; threadId: string; runId: string }
  | { id: number; kind: "publish"; event: BaseEvent }
  | { id: number; kind: "probe"; threadId: string }
  | { id: number; kind: "connect"; threadId: string }
  | { id: number; kind: "events" }
  | { id: number; kind: "stop"; threadId: string; runId: string }
  | { id: number; kind: "wasStopped"; runId: string }
  | { id: number; kind: "close" }
  | { id: number; kind: "shutdown" };

const resourceId = process.env.IPI1117_RESOURCE_ID;
const accessToken = process.env.IPI1117_ACCESS_TOKEN;
if (!resourceId || !accessToken) {
  throw new Error("IPI1117_RESOURCE_ID and IPI1117_ACCESS_TOKEN are required");
}

const control = createPlannerRunControl(resourceId, accessToken);
if (!control) throw new Error("planner run control is unavailable");

let owner: PlannerRunOwnerHandle | undefined;
let connection: PlannerRemoteRunConnection | undefined;
let unsubscribe: (() => void) | undefined;
const stoppedRuns = new Set<string>();
const events: BaseEvent[] = [];

function reply(id: number, result?: unknown, error?: unknown) {
  process.send?.({
    id,
    ok: error === undefined,
    result,
    error: error instanceof Error ? error.message : error === undefined ? undefined : String(error),
  });
}

async function closeHandles() {
  unsubscribe?.();
  unsubscribe = undefined;
  if (connection) await connection.close();
  connection = undefined;
  if (owner) await owner.close();
  owner = undefined;
  events.length = 0;
}

process.on("message", (raw) => {
  const command = raw as Command;
  void (async () => {
    try {
      switch (command.kind) {
        case "own":
          if (owner) await owner.close();
          stoppedRuns.delete(command.runId);
          owner = await control.own(command.threadId, command.runId, async (runId) => {
            if (runId !== command.runId) return false;
            stoppedRuns.add(runId);
            return true;
          });
          reply(command.id, true);
          return;
        case "publish":
          if (!owner) throw new Error("owner_not_started");
          await owner.publish(command.event);
          reply(command.id, true);
          return;
        case "probe":
          reply(command.id, await control.probe(command.threadId));
          return;
        case "connect": {
          if (connection) await connection.close();
          events.length = 0;
          connection = (await control.connect(command.threadId)) ?? undefined;
          if (connection) unsubscribe = connection.onEvent((event) => events.push(event));
          reply(
            command.id,
            connection
              ? { runId: connection.runId, ownerInstanceId: connection.ownerInstanceId }
              : null,
          );
          return;
        }
        case "events":
          reply(command.id, events);
          return;
        case "stop":
          reply(command.id, await control.stop(command.threadId, command.runId));
          return;
        case "wasStopped":
          reply(command.id, stoppedRuns.has(command.runId));
          return;
        case "close":
          await closeHandles();
          reply(command.id, true);
          return;
        case "shutdown":
          await closeHandles();
          reply(command.id, true);
          process.disconnect?.();
          return;
      }
    } catch (error) {
      reply(command.id, undefined, error);
    }
  })();
});

process.send?.({ ready: true });
