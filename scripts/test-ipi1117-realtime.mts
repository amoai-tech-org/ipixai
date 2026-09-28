#!/usr/bin/env node
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DRIVER = fileURLToPath(
  new URL("../tests/fixtures/ipi-1117-realtime-driver.ts", import.meta.url),
);
const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/;
const LOOPBACK_DB = /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)[:/]/;
const PASSWORD = "ipi1117-local-realtime-password";
const ORG_A = "11170000-0000-4000-8000-00000000000a";
const ORG_B = "11170000-0000-4000-8000-00000000000b";
const USER_A = "11170000-0000-4000-8000-000000000001";
const USER_B = "11170000-0000-4000-8000-000000000002";
const EMAIL_A = "ipi1117-a@ipix.test";
const EMAIL_B = "ipi1117-b@ipix.test";
const THREAD = "ipi1117-realtime-thread";

type Status = {
  API_URL?: string;
  DB_URL?: string;
  PUBLISHABLE_KEY?: string;
  ANON_KEY?: string;
  SERVICE_ROLE_KEY?: string;
};

type DriverReply = { id: number; ok: boolean; result?: unknown; error?: string };
type Driver = {
  child: ChildProcess;
  request<T = unknown>(kind: string, fields?: Record<string, unknown>): Promise<T>;
  close(): Promise<void>;
};

function fail(message: string): never {
  throw new Error(`IPI-1117 realtime integration: ${message}`);
}

function localStatus(): Status {
  const raw = execFileSync("supabase", ["status", "--output", "json"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(raw) as Status;
}

async function ensureUser(
  apiUrl: string,
  serviceRoleKey: string,
  user: { id: string; email: string },
) {
  const headers = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
  const create = await fetch(`${apiUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      password: PASSWORD,
      email_confirm: true,
    }),
  });
  if (create.ok) return;
  const update = await fetch(`${apiUrl}/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
  });
  if (!update.ok) {
    fail(`could not create/update local fixture user ${user.email}`);
  }
}

async function accessToken(apiUrl: string, publishableKey: string, email: string) {
  const client = createClient(apiUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session?.access_token) {
    fail(`could not sign in local fixture user ${email}: ${error?.message ?? "no session"}`);
  }
  return data.session.access_token;
}

async function seed(dbUrl: string) {
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(
      `
      insert into public.organizations (id, name, slug, type, owner_id)
      values
        ($1, 'IPI 1117 Org A', 'ipi-1117-org-a', 'brand', $3),
        ($2, 'IPI 1117 Org B', 'ipi-1117-org-b', 'brand', $4)
      on conflict (id) do update
        set name = excluded.name, owner_id = excluded.owner_id, updated_at = now();

      insert into public.org_members (org_id, user_id, role)
      values
        ($1, $3, 'owner'),
        ($2, $4, 'owner')
      on conflict (org_id, user_id) do update set role = excluded.role;
      `,
      [ORG_A, ORG_B, USER_A, USER_B],
    );
  } finally {
    await client.end();
  }
}

async function spawnDriver(input: {
  resourceId: string;
  accessToken: string;
  apiUrl: string;
  publishableKey: string;
  serviceRoleKey: string;
}): Promise<Driver> {
  const child = spawn(
    process.execPath,
    ["--conditions=react-server", "--import", "tsx", DRIVER],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: input.apiUrl,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: input.publishableKey,
        SUPABASE_SECRET_KEY: input.serviceRoleKey,
        IPI1117_RESOURCE_ID: input.resourceId,
        IPI1117_ACCESS_TOKEN: input.accessToken,
      },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    },
  );
  let seq = 0;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }
  >();
  let stderr = "";
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  child.on("message", (raw) => {
    const message = raw as DriverReply & { ready?: boolean };
    if (message.ready) return;
    if (typeof message.id !== "number") return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    clearTimeout(waiter.timer);
    if (message.ok) waiter.resolve(message.result);
    else waiter.reject(new Error(message.error ?? "driver request failed"));
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`driver startup timeout: ${stderr}`)), 5_000);
    const onMessage = (raw: unknown) => {
      const message = raw as { ready?: boolean };
      if (!message.ready) return;
      clearTimeout(timeout);
      child.off("message", onMessage);
      resolve();
    };
    child.on("message", onMessage);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`driver exited during startup (${code}): ${stderr}`));
    });
  });

  const request = <T = unknown>(kind: string, fields: Record<string, unknown> = {}) =>
    new Promise<T>((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`driver ${kind} timeout: ${stderr}`));
      }, 7_500);
      pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
      child.send({ id, kind, ...fields });
    });

  return {
    child,
    request,
    async close() {
      if (child.connected) {
        await request("shutdown").catch(() => undefined);
      }
      if (!child.killed) child.kill("SIGTERM");
    },
  };
}

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs = 2_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
}

const status = localStatus();
const apiUrl = status.API_URL;
const dbUrl = status.DB_URL;
const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const serviceRoleKey = status.SERVICE_ROLE_KEY;
if (!apiUrl || !dbUrl || !publishableKey || !serviceRoleKey) {
  fail("local Supabase status is missing API_URL / DB_URL / publishable key / service role key");
}
if (!LOOPBACK.test(apiUrl) || !LOOPBACK_DB.test(dbUrl)) {
  fail("refusing to run against a non-loopback Supabase target");
}

await ensureUser(apiUrl, serviceRoleKey, { id: USER_A, email: EMAIL_A });
await ensureUser(apiUrl, serviceRoleKey, { id: USER_B, email: EMAIL_B });
await seed(dbUrl);
const tokenA = await accessToken(apiUrl, publishableKey, EMAIL_A);
const tokenB = await accessToken(apiUrl, publishableKey, EMAIL_B);
const resourceA = `org:${ORG_A}::user:${USER_A}`;

const owner = await spawnDriver({
  resourceId: resourceA,
  accessToken: tokenA,
  apiUrl,
  publishableKey,
  serviceRoleKey,
});
const controller = await spawnDriver({
  resourceId: resourceA,
  accessToken: tokenA,
  apiUrl,
  publishableKey,
  serviceRoleKey,
});
const foreign = await spawnDriver({
  resourceId: resourceA,
  accessToken: tokenB,
  apiUrl,
  publishableKey,
  serviceRoleKey,
});

try {
  await owner.request("own", { threadId: THREAD, runId: "R1" });
  await owner.request("publish", {
    event: { type: "TEXT_MESSAGE_START", messageId: "m1", role: "assistant" },
  });

  const probe = await controller.request<{ runId: string; ownerInstanceId: string } | null>(
    "probe",
    { threadId: THREAD },
  );
  if (probe?.runId !== "R1") fail("controller could not discover R1 across processes");

  const connected = await controller.request<{ runId: string } | null>("connect", {
    threadId: THREAD,
  });
  if (connected?.runId !== "R1") fail("controller could not connect to R1 across processes");
  const replayed = await controller.request<Array<{ type?: string }>>("events");
  if (!replayed.some((event) => event.type === "TEXT_MESSAGE_START")) {
    fail("remote connect did not replay the pre-connect R1 event");
  }

  await owner.request("publish", {
    event: { type: "TEXT_MESSAGE_CONTENT", messageId: "m1", delta: "live" },
  });
  const liveArrived = await waitFor(async () => {
    const events = await controller.request<Array<{ type?: string; delta?: string }>>("events");
    return events.some((event) => event.type === "TEXT_MESSAGE_CONTENT" && event.delta === "live");
  });
  if (!liveArrived) fail("controller did not receive a new live R1 event");

  const stopped = await controller.request<{ stopped: boolean; runId: string } | null>("stop", {
    threadId: THREAD,
    runId: "R1",
  });
  if (!stopped?.stopped || stopped.runId !== "R1") fail("remote exact Stop(R1) was not acknowledged");
  if (!(await owner.request<boolean>("wasStopped", { runId: "R1" }))) {
    fail("Runtime A did not execute the exact R1 stop callback");
  }

  await owner.request("close");
  await owner.request("own", { threadId: THREAD, runId: "R2" });
  const stale = await controller.request("stop", { threadId: THREAD, runId: "R1" });
  if (stale !== null) fail("stale Stop(R1) was acknowledged while R2 owned the thread");
  if (await owner.request<boolean>("wasStopped", { runId: "R2" })) {
    fail("stale Stop(R1) affected R2");
  }

  let foreignDenied = false;
  try {
    await foreign.request("probe", { threadId: THREAD });
  } catch {
    foreignDenied = true;
  }
  if (!foreignDenied) fail("Org B token could open/control Org A's private run channel");

  console.log(
    "IPI-1117 realtime integration PASS: two-process probe/connect/replay/live/stop/stale-stop/tenant-denial",
  );
} finally {
  await Promise.all([owner.close(), controller.close(), foreign.close()]);
}
