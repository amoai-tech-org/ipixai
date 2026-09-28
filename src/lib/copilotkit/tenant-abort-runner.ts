import { InMemoryAgentRunner } from "@copilotkit/runtime/v2";
import { EventType, randomUUID } from "@ag-ui/client";
import type { AbstractAgent, BaseEvent } from "@ag-ui/client";
import { Observable } from "rxjs";

import {
  plannerRuntimeInstanceId,
  type PlannerRunControl,
  type PlannerRunOwnerHandle,
} from "./planner-run-control";
import {
  ensureMastraThread,
  getPlannerMemory,
  recallPlannerChatMessages,
  splitRunThreadIds,
} from "@/mastra/thread-persistence";

/**
 * Mastra local agents inherit AbstractAgent.abortRun() as a no-op.
 * CopilotKit clones the registered agent per /run (`cloneAgentForRequest`);
 * clone() is Object.create(prototype) and drops instance abortRun.
 * UI Stop → POST /stop → InMemoryAgentRunner.stop → stored clone.abortRun().
 * detachActiveRun() completes the runAgent takeUntil, which ends the SSE.
 */
export function wrapAbortRun(agent: AbstractAgent): AbstractAgent {
  const previousAbort = agent.abortRun.bind(agent);
  agent.abortRun = () => {
    previousAbort();
    void agent.detachActiveRun();
  };
  const previousClone = agent.clone.bind(agent);
  agent.clone = () => wrapAbortRun(previousClone());
  return agent;
}

export function attachRunnerAbort(agents: Record<string, AbstractAgent>) {
  for (const [id, agent] of Object.entries(agents)) {
    agents[id] = wrapAbortRun(agent);
  }
  return agents;
}

/**
 * Process-global InMemoryAgentRunner is keyed by threadId only. Prefix with the
 * AUTH-002 resourceId so /stop cannot cancel another org/user's run.
 * Bind abort on run() after the store registers the thread (not a one-shot body peek).
 */
/**
 * runnerThreadId → every run on that thread still starting (before super.run
 * registers it). One record per run: a Stop marks only the records whose runId
 * it names, and each run removes only its own record, so overlapping or
 * cancelled starts can never erase or inherit another run's Stop.
 */
type PendingRun = { runId: string | undefined; stopRequested: boolean };
const pendingRuns = new Map<string, Set<PendingRun>>();


export class TenantAbortRunner extends InMemoryAgentRunner {
  constructor(
    private readonly resourceId: string,
    private readonly signal: AbortSignal,
    private readonly runControl?: PlannerRunControl,
  ) {
    super();
  }

  private scope(threadId: string) {
    return splitRunThreadIds(this.resourceId, threadId).runnerThreadId;
  }

  private shouldSkipRun(pending: PendingRun, cancelled: boolean) {
    return cancelled || this.signal.aborted || pending.stopRequested;
  }

  override run(request: Parameters<InMemoryAgentRunner["run"]>[0]) {
    const { runnerThreadId, mastraThreadId } = splitRunThreadIds(
      this.resourceId,
      request.threadId,
    );
    const input = request.input
      ? { ...request.input, threadId: mastraThreadId }
      : request.input;
    const agent = request.agent;
    const runAgent = agent.runAgent.bind(agent);
    agent.runAgent = (runInput, subscribers) => {
      if (this.signal.aborted) {
        agent.abortRun();
        return Promise.resolve({ result: undefined, newMessages: [] });
      }
      this.signal.addEventListener(
        "abort",
        () => {
          agent.abortRun();
        },
        { once: true },
      );
      return runAgent(runInput, subscribers);
    };
    const pending: PendingRun = { runId: request.input?.runId, stopRequested: false };
    const threadPending = pendingRuns.get(runnerThreadId) ?? new Set<PendingRun>();
    threadPending.add(pending);
    pendingRuns.set(runnerThreadId, threadPending);
    return new Observable<BaseEvent>((subscriber) => {
      let inner: { unsubscribe: () => void } | undefined;
      let owner: PlannerRunOwnerHandle | undefined;
      let publishQueue = Promise.resolve();
      let cancelled = false;
      const runId = typeof input?.runId === "string" ? input.runId : undefined;
      const ownerPromise =
        this.runControl && runId
          ? this.runControl
              .own(request.threadId, runId, (remoteRunId) =>
                this.stopLocal({ threadId: request.threadId, runId: remoteRunId }),
              )
              .catch((error) => {
                console.warn("[planner-run-control] owner_open_failed", {
                  error: error instanceof Error ? error.message : String(error),
                });
                return undefined;
              })
          : Promise.resolve(undefined);
      // Remove only this run's record; another run starting on the same
      // thread keeps its own record (and any Stop already marked on it).
      const releasePending = () => {
        threadPending.delete(pending);
        // Cleanup can run twice (finish, then teardown). The identity check
        // stops a second pass from deleting a newer run's replacement set.
        if (threadPending.size === 0 && pendingRuns.get(runnerThreadId) === threadPending) {
          pendingRuns.delete(runnerThreadId);
        }
      };
      // A user Stop that lands while the run is still starting must still end
      // the stream the way a normal Stop does. The browser sends its next
      // message only after the stopped run reports RUN_FINISHED; an empty
      // stream left the chat "running" and R2 never left the browser (seen on
      // a Vercel Preview, where memory setup is slow enough for Stop to win).
      // A disconnected client (cancelled / request aborted) gets nothing.
      const endSkippedRun = () => {
        releasePending();
        void ownerPromise.then((handle) => handle?.close());
        if (pending.stopRequested && !cancelled && !this.signal.aborted) {
          const runId = input?.runId ?? randomUUID();
          subscriber.next({
            type: EventType.RUN_STARTED,
            threadId: mastraThreadId,
            runId,
          } as BaseEvent);
          subscriber.next({
            type: EventType.RUN_FINISHED,
            threadId: mastraThreadId,
            runId,
          } as BaseEvent);
        }
        subscriber.complete();
      };
      void (async () => {
        if (this.shouldSkipRun(pending, cancelled)) {
          endSkippedRun();
          return;
        }
        const memory = await getPlannerMemory();
        if (this.shouldSkipRun(pending, cancelled)) {
          endSkippedRun();
          return;
        }
        if (!memory) {
          releasePending();
          subscriber.error(new Error("memory_unavailable"));
          return;
        }
        await ensureMastraThread(memory, {
          threadId: mastraThreadId,
          resourceId: this.resourceId,
        });
        if (this.shouldSkipRun(pending, cancelled)) {
          endSkippedRun();
          return;
        }
        owner = await ownerPromise;
        if (this.shouldSkipRun(pending, cancelled)) {
          endSkippedRun();
          return;
        }
        const publish = (event: BaseEvent) => {
          if (!owner) return;
          publishQueue = publishQueue
            .then(() => owner?.publish(event))
            .catch((error) => {
              console.warn("[planner-run-control] event_publish_failed", {
                error: error instanceof Error ? error.message : String(error),
              });
            });
        };
        const finish = async (callback: () => void) => {
          await publishQueue;
          await owner?.close().catch(() => undefined);
          if (!cancelled) callback();
        };
        inner = super.run({ ...request, threadId: runnerThreadId, input }).subscribe({
          next: (event) => {
            subscriber.next(event);
            publish(event);
          },
          error: (error) => void finish(() => subscriber.error(error)),
          complete: () => void finish(() => subscriber.complete()),
        });
        releasePending();
      })().catch((error) => {
        // Setup failed after the user already stopped this run: end it as
        // stopped, not as an error, so the browser can send the next message.
        if (pending.stopRequested && !inner) {
          endSkippedRun();
          return;
        }
        releasePending();
        if (!cancelled) subscriber.error(error);
      });
      return () => {
        cancelled = true;
        releasePending();
        inner?.unsubscribe();
        void ownerPromise.then((handle) => handle?.close());
      };
    });
  }

  private async stopLocal(request: Parameters<InMemoryAgentRunner["stop"]>[0]) {
    const runnerThreadId = this.scope(request.threadId);
    // IPI-1290: a Stop scoped to another run (e.g. a late Stop(R1) while R2
    // is still starting) must not cancel the pending run.
    let stopsPending = false;
    for (const pending of pendingRuns.get(runnerThreadId) ?? []) {
      if (request.runId === undefined || request.runId === pending.runId) {
        pending.stopRequested = true;
        stopsPending = true;
      }
    }
    const stopped = await super.stop({ ...request, threadId: runnerThreadId });
    return Boolean(stopped) || stopsPending;
  }

  override async stop(request: Parameters<InMemoryAgentRunner["stop"]>[0]) {
    if (await this.stopLocal(request)) return true;
    if (!this.runControl || request.runId === undefined) return false;
    try {
      const remote = await this.runControl.stop(request.threadId, request.runId);
      if (remote?.stopped) {
        console.info("[planner-run-control] remote_stop_succeeded", {
          controllerInstanceId: plannerRuntimeInstanceId,
          ownerInstanceId: remote.ownerInstanceId,
          crossInstance: remote.ownerInstanceId !== plannerRuntimeInstanceId,
        });
      }
      return Boolean(remote?.stopped);
    } catch (error) {
      console.warn("[planner-run-control] remote_stop_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * IPI-1217 · COPILOT-APP-DOCK-002: CopilotKitCore.connectAgent()
   * (@copilotkit/core) unconditionally clears agent.messages on the FIRST
   * connect of any explicit thread in a fresh browser JS heap — that
   * tracking map is CLIENT-side, so this happens on every page reload
   * regardless of whether the SERVER process happens to still be warm.
   * It then expects the gateway's connect() to "ask... for a full replay"
   * (that file's own doc comment on _lastConnectedThreadIdsByAgent).
   *
   * A prior version of this fix only consulted durable Mastra history when
   * the in-memory replay produced ZERO events ("cold process"). That
   * missed the more common case this exact CI job hits: a single
   * long-lived server process where the in-memory store DOES still have
   * historic events from the original run, so the durable fallback never
   * engaged — leaving the same reload-restoration defect live for the
   * ordinary same-process case (proven red by
   * e2e/planner-journey.spec.ts's "...and it survives reload" job on PR
   * #171 head 9be9f55, and by the missing "warm process" case in
   * tenant-abort-runner.test.ts).
   *
   * Fix: source replay from durable Mastra history (via the same
   * authorized recallPlannerChatMessages() helper
   * /api/planner/threads/:id/messages already uses) whenever the thread is
   * NOT currently running — never from the process-local in-memory store,
   * which is "bounded and non-durable by design" per its own guidance
   * string (@copilotkit/runtime dist/v2/runtime/runner/in-memory.mjs) and
   * therefore not a reliable source of truth for a finished conversation
   * even within the same process. Only a thread with a genuinely active
   * run reconnects to the live in-memory stream. resourceId is
   * this.resourceId, server-derived from requirePlannerResourceId in
   * handleCopilot, never client-supplied, and recallPlannerChatMessages
   * itself fails closed (returns []) when the thread belongs to another
   * resource.
   */
  override connect(request: Parameters<InMemoryAgentRunner["connect"]>[0]) {
    const { mastraThreadId } = splitRunThreadIds(
      this.resourceId,
      request.threadId,
    );
    const resourceId = this.resourceId;
    return new Observable<BaseEvent>((subscriber) => {
      let cancelled = false;
      let inner: { unsubscribe: () => void } | undefined;
      void (async () => {
        const localRunning = await super.isRunning({ threadId: this.scope(request.threadId) });
        if (cancelled) return;
        if (localRunning) {
          inner = super
            .connect({ ...request, threadId: this.scope(request.threadId) })
            .subscribe(subscriber);
          return;
        }
        if (this.runControl) {
          try {
            const remote = await this.runControl.connect(request.threadId);
            if (cancelled) {
              await remote?.close();
              return;
            }
            if (remote) {
              let off = () => {};
              off = remote.onEvent((event) => {
                subscriber.next(event);
                if (event.type === EventType.RUN_FINISHED || event.type === EventType.RUN_ERROR) {
                  off();
                  void remote.close();
                  subscriber.complete();
                }
              });
              inner = {
                unsubscribe() {
                  off();
                  void remote.close();
                },
              };
              return;
            }
          } catch (error) {
            console.warn("[planner-run-control] remote_connect_failed", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        const memory = await getPlannerMemory();
        if (cancelled) return;
        const messages = memory
          ? await recallPlannerChatMessages(memory, {
              threadId: mastraThreadId,
              resourceId,
            })
          : [];
        if (cancelled) return;
        if (messages.length > 0) {
          const runId = randomUUID();
          subscriber.next({
            type: EventType.RUN_STARTED,
            threadId: mastraThreadId,
            runId,
          } as BaseEvent);
          subscriber.next({
            type: EventType.MESSAGES_SNAPSHOT,
            messages,
          } as unknown as BaseEvent);
          subscriber.next({
            type: EventType.RUN_FINISHED,
            threadId: mastraThreadId,
            runId,
          } as BaseEvent);
        }
        subscriber.complete();
      })().catch((error) => {
        if (!cancelled) subscriber.error(error);
      });
      return () => {
        cancelled = true;
        inner?.unsubscribe();
      };
    });
  }

  override async isRunning(request: Parameters<InMemoryAgentRunner["isRunning"]>[0]) {
    if (await super.isRunning({ threadId: this.scope(request.threadId) })) return true;
    if (!this.runControl) return false;
    try {
      return await this.runControl.isRunning(request.threadId);
    } catch (error) {
      console.warn("[planner-run-control] remote_probe_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  override getThreadMessages(threadId: string) {
    return super.getThreadMessages(this.scope(threadId));
  }

  override getThreadEvents(threadId: string) {
    return super.getThreadEvents(this.scope(threadId));
  }

  override getThreadState(threadId: string) {
    return super.getThreadState(this.scope(threadId));
  }

  override listThreads() {
    const prefix = splitRunThreadIds(this.resourceId, "").runnerThreadId;
    return super
      .listThreads()
      .filter((thread) => thread.id.startsWith(prefix))
      .map((thread) => ({ ...thread, id: thread.id.slice(prefix.length) }));
  }
}
