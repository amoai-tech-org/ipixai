import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../supabase/migrations/20260928055117_ipi_1117_planner_run_realtime_auth.sql", import.meta.url),
  "utf8",
);

describe("IPI-1117 Planner run Realtime authorization", () => {
  it("authorizes only authenticated broadcast traffic for the same user and org", () => {
    expect(sql).toContain("planner.can_use_run_channel");
    expect(sql).toContain("(select auth.uid()) = split_part(p_topic, ':', 3)::uuid");
    expect(sql).toMatch(/public\.is_org_member\(split_part\(p_topic, ':', 2\)::uuid\)/);
    expect(sql).toMatch(/realtime\.messages\.extension = 'broadcast'/g);
    expect(sql).toContain("to authenticated");
    expect(sql).not.toMatch(/to anon|to public/i);
  });

  it("pins the topic to org, user, and a fixed server-HMAC digest", () => {
    expect(sql).toContain("^planner-run:");
    expect(sql).toContain("[0-9a-f]{64}$");
  });

  it("uses the exact channel-authorizer instead of a broad planner-run prefix policy", () => {
    expect(sql).not.toContain("like 'planner-run:%'");
    expect(sql.match(/planner\.can_use_run_channel\(realtime\.topic\(\)\)/g)).toHaveLength(2);
  });
});
