import { describe, expect, it } from "vitest";

import { plannerRunControlTopic } from "../planner-run-control-supabase";

const RESOURCE =
  "org:11111111-1111-4111-8111-111111111111::user:22222222-2222-4222-8222-222222222222";
const THREAD = "33333333-3333-4333-8333-333333333333";

describe("plannerRunControlTopic", () => {
  it("derives a stable private topic from server identity, thread, and secret", () => {
    const topic = plannerRunControlTopic(RESOURCE, THREAD.toUpperCase(), "server-secret");
    expect(topic).toMatch(
      /^planner-run:11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222:[0-9a-f]{64}$/,
    );
    expect(topic).toBe(plannerRunControlTopic(RESOURCE, THREAD, "server-secret"));
    expect(topic).not.toBe(plannerRunControlTopic(RESOURCE, THREAD, "other-secret"));
  });

  it("rejects a resource id that was not server-derived in the canonical format", () => {
    expect(() => plannerRunControlTopic("org-a:user-a", THREAD, "server-secret")).toThrow(
      "invalid planner resourceId",
    );
  });
});
