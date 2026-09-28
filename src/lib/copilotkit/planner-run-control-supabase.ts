import "server-only";

import { createHmac } from "node:crypto";
import { createClient, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";

import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import { getBackendSecretKey } from "@/lib/supabase/service-role";
import type { Database } from "@/lib/supabase/database.types";
import { splitRunThreadIds } from "@/mastra/thread-persistence";
import {
  isPlannerRunControlMessage,
  PlannerRunControl,
  type PlannerRunControlBus,
  type PlannerRunControlMessage,
} from "./planner-run-control";

const RESOURCE_ID = /^org:([0-9a-f-]{36})::user:([0-9a-f-]{36})$/i;
const EVENT = "planner-run-control";
const SUBSCRIBE_TIMEOUT_MS = 2_000;
const TOPIC_KEY_CONTEXT = "ipix/planner-run-control/topic-key/v1";

function plannerRunTopicKey(secret: string): Buffer {
  return createHmac("sha256", secret).update(TOPIC_KEY_CONTEXT).digest();
}

export function plannerRunControlTopic(resourceId: string, threadId: string, secret: string): string {
  const match = RESOURCE_ID.exec(resourceId);
  if (!match) throw new Error("invalid planner resourceId");
  const [, orgId, userId] = match;
  const canonicalThreadId = splitRunThreadIds(resourceId, threadId).mastraThreadId;
  // Domain-separate topic signing from other uses of the privileged backend key.
  // Topics are intentionally ephemeral: drain active Planner runs before rotating
  // that backend key so a mixed-key deployment cannot split one in-flight run.
  const digest = createHmac("sha256", plannerRunTopicKey(secret))
    .update(resourceId)
    .update("\0")
    .update(canonicalThreadId)
    .digest("hex");
  return `planner-run:${orgId.toLowerCase()}:${userId.toLowerCase()}:${digest}`;
}

async function openSupabaseBus(input: {
  resourceId: string;
  threadId: string;
  accessToken: string;
  secret: string;
}): Promise<PlannerRunControlBus> {
  const config = getPublicSupabaseConfig();
  if (!config) throw new Error("supabase_config_unavailable");
  const client = createClient<Database>(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    accessToken: async () => input.accessToken,
  });

  // Private Realtime authorization is evaluated from the socket JWT. Set it
  // explicitly before joining the channel rather than relying on the generic
  // accessToken callback to propagate into Realtime in every runtime/version.
  await client.realtime.setAuth(input.accessToken);

  const channel = client.channel(plannerRunControlTopic(input.resourceId, input.threadId, input.secret), {
    config: { private: true, broadcast: { ack: true, self: false } },
  });
  const handlers = new Set<(message: PlannerRunControlMessage) => void>();
  channel.on("broadcast", { event: EVENT }, (payload) => {
    const message = payload?.payload;
    if (!isPlannerRunControlMessage(message)) return;
    for (const handler of handlers) handler(message);
  });

  try {
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status, error) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) resolve();
        else if (
          status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
          status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT ||
          status === REALTIME_SUBSCRIBE_STATES.CLOSED
        ) reject(error ?? new Error(`planner_run_channel_${status.toLowerCase()}`));
      }, SUBSCRIBE_TIMEOUT_MS);
    });
  } catch (error) {
    await client.removeChannel(channel).catch(() => undefined);
    throw error;
  }
  let closed = false;
  return {
    async send(message) {
      if (closed) throw new Error("planner_run_channel_closed");
      const status = await channel.send({
        type: "broadcast",
        event: EVENT,
        payload: message,
      });
      if (status !== "ok") throw new Error(`planner_run_broadcast_${status}`);
    },
    onMessage(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    async close() {
      if (closed) return;
      closed = true;
      handlers.clear();
      await client.removeChannel(channel).catch(() => undefined);
    },
  };
}

export function createPlannerRunControl(
  resourceId: string,
  accessToken: string | undefined,
): PlannerRunControl | undefined {
  if (!accessToken?.trim() || !getPublicSupabaseConfig()) return undefined;
  const secret = getBackendSecretKey();
  if (!secret) return undefined;
  return new PlannerRunControl(
    (threadId) => openSupabaseBus({ resourceId, threadId, accessToken, secret }),
    {
      log(message, details) {
        console.warn(`[planner-run-control] ${message}`, details ?? {});
      },
    },
  );
}
