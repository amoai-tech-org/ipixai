// IPI-1217 · COPILOT-APP-DOCK-002 — TenantAbortRunner.connect() must fall
// back to durable Mastra history when the in-memory store has nothing for
// a thread (the common case in a fresh/serverless process after reload).
// See the connect() doc comment in ../tenant-abort-runner.ts for the full
// root-cause citation, and
// ../../../components/operator-panel/copilotkit-reconnect-history.test.tsx
// for the composed proof against real (unmocked) @copilotkit/core.
import { firstValueFrom, Observable, toArray } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AbstractAgent, EventType } from "@ag-ui/client";
import type { BaseEvent, RunAgentInput } from "@ag-ui/client";

import * as threadPersistence from "@/mastra/thread-persistence";
import type { PlannerChatMessage } from "@/mastra/thread-persistence";
import type { PlannerRunControl } from "../planner-run-control";
import { TenantAbortRunner } from "../tenant-abort-runner";

/** Emits a minimal but valid AG-UI run so InMemoryAgentRunner records real
 * historic events for the thread — used to populate the process-local
 * store the way a real /run request does, without a paid model call. */
class RealRunAgent extends AbstractAgent {
  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((subscriber) => {
      subscriber.next({
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      } as BaseEvent);
      subscriber.next({
        type: EventType.MESSAGES_SNAPSHOT,
        messages: [{ id: "stale-1", role: "user", content: "stale-in-memory-only" }],
      } as unknown as BaseEvent);
      subscriber.next({
        type: EventType.RUN_FINISHED,
        threadId: input.threadId,
        runId: input.runId,
      } as BaseEvent);
      subscriber.complete();
    });
  }
  protected connect(): Observable<BaseEvent> {
    throw new Error("not exercised by this test");
  }
}

const ORG_A_RESOURCE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B_RESOURCE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const THREAD_ID = "11111111-1111-4111-8111-111111111111";

const history: PlannerChatMessage[] = [
  { id: "m1", role: "user", content: "alpha-fact" },
  { id: "m2", role: "assistant", content: "remembered" },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TenantAbortRunner.connect()", () => {
  it("replays durable Mastra history when the in-memory store has nothing for this thread (cold process)", async () => {
    vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof threadPersistence.getPlannerMemory>>,
    );
    const recall = vi
      .spyOn(threadPersistence, "recallPlannerChatMessages")
      .mockResolvedValue(history);

    const runner = new TenantAbortRunner(ORG_A_RESOURCE, new AbortController().signal);
    const events = await firstValueFrom(
      runner.connect({ threadId: THREAD_ID }).pipe(toArray()),
    );

    expect(events.map((e) => (e as BaseEvent).type)).toEqual([
      EventType.RUN_STARTED,
      EventType.MESSAGES_SNAPSHOT,
      EventType.RUN_FINISHED,
    ]);
    expect((events[1] as unknown as { messages: PlannerChatMessage[] }).messages).toEqual(
      history,
    );

    // Server-derived resourceId only — never a client-supplied value.
    expect(recall).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ resourceId: ORG_A_RESOURCE }),
    );
  });

  // This is the case a plain browser reload hits in CI: a single
  // long-lived server process where the original run already left this
  // thread's events in InMemoryAgentRunner's process-local store. The
  // earlier version of this fix only consulted durable Mastra history
  // when the in-memory replay was EMPTY ("cold process"), so this exact
  // "warm, same-process" case fell straight back to the stale in-memory
  // replay and never engaged the durable fallback — reproducing the
  // reload-restoration defect this whole fix exists to close. See
  // e2e/planner-journey.spec.ts's "...and it survives reload" job, which
  // failed against this exact gap on PR #171 head 9be9f55.
  it("sources replay from durable Mastra even when the in-memory store already has this thread's events from an earlier run in the same process", async () => {
    // Own threadId: InMemoryAgentRunner's backing store is a process-wide
    // singleton (ɵGLOBAL_STORE), shared across every test in this file —
    // reusing THREAD_ID here would leak this test's seeded run into the
    // others.
    const warmThreadId = "22222222-2222-4222-8222-222222222222";
    vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof threadPersistence.getPlannerMemory>>,
    );
    vi.spyOn(threadPersistence, "ensureMastraThread").mockResolvedValue({ created: true });
    vi.spyOn(threadPersistence, "recallPlannerChatMessages").mockResolvedValue(history);

    const runner = new TenantAbortRunner(ORG_A_RESOURCE, new AbortController().signal);
    const agent = new RealRunAgent({ agentId: "default", threadId: warmThreadId });

    // Drive a real run() through the runner so its process-local store
    // now genuinely holds historic events for warmThreadId (the "stale-1"
    // message from RealRunAgent.run(), above) — not a run() someone else
    // mocked away.
    await firstValueFrom(
      runner
        .run({
          threadId: warmThreadId,
          agent,
          input: {
            threadId: warmThreadId,
            runId: "seed-run",
            messages: [],
            state: {},
            tools: [],
            context: [],
            forwardedProps: {},
          },
        })
        .pipe(toArray()),
    );

    const events = await firstValueFrom(
      runner.connect({ threadId: warmThreadId }).pipe(toArray()),
    );

    // Must reflect the durable Mastra history ("history"), never the
    // in-memory run's own "stale-1" message — proves connect() no longer
    // treats "the in-memory store emitted something" as a reason to skip
    // the durable, authoritative source for a thread that isn't running.
    expect((events[1] as unknown as { messages: PlannerChatMessage[] }).messages).toEqual(
      history,
    );
  });

  it("starts durable history loading while remote discovery is still pending", async () => {
    let resolveRemote!: (value: null) => void;
    const remotePending = new Promise<null>((resolve) => {
      resolveRemote = resolve;
    });
    const getMemory = vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof threadPersistence.getPlannerMemory>>,
    );
    vi.spyOn(threadPersistence, "recallPlannerChatMessages").mockResolvedValue(history);
    const connect = vi.fn(() => remotePending);
    const runControl = { connect } as unknown as PlannerRunControl;
    const runner = new TenantAbortRunner(
      ORG_A_RESOURCE,
      new AbortController().signal,
      runControl,
    );

    const eventsPromise = firstValueFrom(
      runner.connect({ threadId: THREAD_ID }).pipe(toArray()),
    );

    await vi.waitFor(() => expect(connect).toHaveBeenCalledWith(THREAD_ID));
    await vi.waitFor(() => expect(getMemory).toHaveBeenCalledTimes(1));
    resolveRemote(null);

    const events = await eventsPromise;
    expect(events.map((event) => event.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.MESSAGES_SNAPSHOT,
      EventType.RUN_FINISHED,
    ]);
  });

  it("emits nothing when there is no durable history either (genuinely new/empty thread)", async () => {
    vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof threadPersistence.getPlannerMemory>>,
    );
    vi.spyOn(threadPersistence, "recallPlannerChatMessages").mockResolvedValue([]);

    const runner = new TenantAbortRunner(ORG_A_RESOURCE, new AbortController().signal);
    const events = await firstValueFrom(
      runner.connect({ threadId: THREAD_ID }).pipe(toArray()),
    );

    expect(events).toEqual([]);
  });

  it("fails closed (no replay) when Mastra memory is unavailable, instead of throwing", async () => {
    vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue(undefined);
    const recall = vi.spyOn(threadPersistence, "recallPlannerChatMessages");

    const runner = new TenantAbortRunner(ORG_A_RESOURCE, new AbortController().signal);
    const events = await firstValueFrom(
      runner.connect({ threadId: THREAD_ID }).pipe(toArray()),
    );

    expect(events).toEqual([]);
    expect(recall).not.toHaveBeenCalled();
  });

  it("never lets one org's runner replay another org's thread history — resourceId is fixed at construction, not client-supplied", async () => {
    // recallPlannerChatMessages itself fails closed on a resourceId
    // mismatch (see thread-persistence.ts); this test proves the CALLER
    // side never gives it a chance to leak by using anything other than
    // the runner's own constructor-bound resourceId, regardless of which
    // threadId string is requested.
    vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof threadPersistence.getPlannerMemory>>,
    );
    const recall = vi
      .spyOn(threadPersistence, "recallPlannerChatMessages")
      .mockResolvedValue([]);

    const orgBRunner = new TenantAbortRunner(ORG_B_RESOURCE, new AbortController().signal);
    await firstValueFrom(orgBRunner.connect({ threadId: THREAD_ID }).pipe(toArray()));

    expect(recall).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ resourceId: ORG_B_RESOURCE }),
    );
    expect(recall).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ resourceId: ORG_A_RESOURCE }),
    );
  });
});
