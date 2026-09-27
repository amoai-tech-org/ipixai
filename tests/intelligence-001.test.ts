import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";

import * as agent from "../src/agent";
import { GET, POST } from "../src/app/api/copilotkit/[[...slug]]/route";
import { memoryResourceId } from "../src/lib/auth/verified-operator";

/**
 * IPI-1329 · MASTRA-INPROC-001 — Product `/api/copilotkit` always runs the
 * in-process Production Planner. Managed Intelligence keys and a remote
 * `MASTRA_BASE_URL` are not Product runtime switches: setting them must not
 * select Intelligence mode, call `createRemoteAgents`, or return
 * `503 remote_mastra_unavailable`.
 */

const USER_A = "11111111-1111-4111-8111-111111111111";
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const RESOURCE_A = `org:${ORG_A}::user:${USER_A}`;
const RESOURCE_A_IN_ORG_B = `org:${ORG_B}::user:${USER_A}`;

const REMOTE_ENV = [
  "CPK_INTELLIGENCE_API_KEY",
  "COPILOTKIT_API_KEY",
  "MASTRA_BASE_URL",
  "INTELLIGENCE_API_URL",
  "INTELLIGENCE_GATEWAY_WS_URL",
  "COPILOTKIT_LICENSE_TOKEN",
] as const;

const memberships: { rows: { org_id: string }[] } = { rows: [] };
const claims: { sub?: string; email?: string } = {
  sub: USER_A,
  email: "operator@example.com",
};

vi.mock("../src/lib/supabase/server", () => ({
  createClientFromRequest: () => ({
    auth: {
      getClaims: async () => ({
        data: { claims: { sub: claims.sub, email: claims.email } },
        error: claims.sub ? null : { message: "invalid JWT" },
      }),
      getSession: async () => ({
        data: { session: { access_token: "test-access-token" } },
      }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: async (column: string, value: string) => {
          if (table !== "org_members" || column !== "user_id") {
            return { data: null, error: { message: "unexpected query" } };
          }
          if (value !== claims.sub) return { data: [], error: null };
          return { data: memberships.rows, error: null };
        },
      }),
    }),
  }),
  createClient: async () => null,
}));

function copilotRequest(path: string, method = "GET"): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
  });
}

const REMOTE_CONFIGS: { name: string; env: Partial<Record<(typeof REMOTE_ENV)[number], string>> }[] = [
  {
    name: "CPK_INTELLIGENCE_API_KEY + MASTRA_BASE_URL",
    env: { CPK_INTELLIGENCE_API_KEY: "test-intelligence-key", MASTRA_BASE_URL: "http://mastra.test" },
  },
  {
    name: "COPILOTKIT_API_KEY alias + MASTRA_BASE_URL",
    env: { COPILOTKIT_API_KEY: "test-alias-key", MASTRA_BASE_URL: "http://mastra.test" },
  },
  {
    name: "Intelligence key without MASTRA_BASE_URL (old 503 path)",
    env: { CPK_INTELLIGENCE_API_KEY: "test-intelligence-key" },
  },
  {
    name: "MASTRA_BASE_URL alone",
    env: { MASTRA_BASE_URL: "http://mastra.test" },
  },
  {
    name: "Intelligence key + self-hosted endpoint pair + license token",
    env: {
      CPK_INTELLIGENCE_API_KEY: "test-intelligence-key",
      MASTRA_BASE_URL: "http://mastra.test",
      INTELLIGENCE_API_URL: "https://intelligence.test",
      INTELLIGENCE_GATEWAY_WS_URL: "wss://intelligence.test",
      COPILOTKIT_LICENSE_TOKEN: "test-license-token",
    },
  },
];

describe("IPI-1329 Product /api/copilotkit runs the in-process Planner only", () => {
  beforeEach(() => {
    for (const name of REMOTE_ENV) vi.stubEnv(name, "");
    memberships.rows = [{ org_id: ORG_A }];
  });

  afterEach(() => {
    memberships.rows = [];
    claims.sub = USER_A;
    claims.email = "operator@example.com";
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("encodes Planner identity as org+user, not the JWT user id", () => {
    expect(memoryResourceId({ userId: USER_A, orgId: ORG_A })).toBe(RESOURCE_A);
    expect(memoryResourceId({ userId: USER_A, orgId: ORG_B })).toBe(
      RESOURCE_A_IN_ORG_B,
    );
    expect(RESOURCE_A).not.toBe(USER_A);
  });

  it.each(REMOTE_CONFIGS)(
    "stays on the local default Planner with $name",
    async ({ env }) => {
      for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
      const remote = vi.spyOn(agent, "createRemoteAgents");
      const local = vi.spyOn(agent, "createLocalAgents");
      const intelligenceList = vi.spyOn(CopilotKitIntelligence.prototype, "listThreads");
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const info = await GET(copilotRequest("/api/copilotkit/info"));
      const raw = await info.text();

      expect(info.status).toBe(200);
      expect(raw).not.toContain("remote_mastra_unavailable");
      const payload = JSON.parse(raw) as {
        mode?: string;
        intelligence?: unknown;
        agents?: Record<string, unknown>;
      };
      expect(payload.mode).toBe("sse");
      expect(payload.intelligence).toBeUndefined();
      expect(Object.keys(payload.agents ?? {})).toEqual(["default"]);
      expect(local).toHaveBeenCalledWith(RESOURCE_A);
      expect(remote).not.toHaveBeenCalled();
      expect(intelligenceList).not.toHaveBeenCalled();
      expect(
        fetchSpy.mock.calls.filter(([input]) =>
          /mastra\.test|intelligence\.test|\/ipix\/run-control\//.test(String(input)),
        ),
      ).toHaveLength(0);
    },
  );

  it("keeps the local Planner resource scoped to the verified org when the same user switches org", async () => {
    vi.stubEnv("CPK_INTELLIGENCE_API_KEY", "test-intelligence-key");
    vi.stubEnv("MASTRA_BASE_URL", "http://mastra.test");
    const local = vi.spyOn(agent, "createLocalAgents");
    memberships.rows = [{ org_id: ORG_B }];

    const info = await GET(copilotRequest("/api/copilotkit/info"));

    expect(info.status).toBe(200);
    expect(local).toHaveBeenCalledWith(RESOURCE_A_IN_ORG_B);
    expect(local).not.toHaveBeenCalledWith(RESOURCE_A);
  });

  it("rejects an unauthenticated caller before any Planner is created, even with remote env set", async () => {
    vi.stubEnv("CPK_INTELLIGENCE_API_KEY", "test-intelligence-key");
    vi.stubEnv("MASTRA_BASE_URL", "http://mastra.test");
    const remote = vi.spyOn(agent, "createRemoteAgents");
    const local = vi.spyOn(agent, "createLocalAgents");
    claims.sub = undefined;

    const stop = await POST(
      copilotRequest("/api/copilotkit/agent/default/stop/thread-org-a", "POST"),
    );

    expect(stop.status).toBe(401);
    expect(await stop.text()).not.toContain("remote_mastra_unavailable");
    expect(local).not.toHaveBeenCalled();
    expect(remote).not.toHaveBeenCalled();
  });
});
