import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const prd = read("docs/prd.md");
const platform = read("docs/ipix-platform/00-platform/IPIX-PLATFORM-ARCHITECTURE.md");
const aiPattern = read("docs/ipix-platform/00-platform/IPIX-AI-FEATURE-PATTERN.md");

function section(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) {
    throw new Error(`Missing section boundary: ${start} → ${end}`);
  }
  return source.slice(startIndex, endIndex);
}

describe("IPI-1373 · DOC-PRD-TRUTH-001", () => {
  it("separates product, implementation, and execution truth", () => {
    expect(prd).toContain("**Product intent truth:**");
    expect(prd).toContain("**Implementation truth:**");
    expect(prd).toContain("**Execution truth:**");
    expect(prd).toContain("`[IMPLEMENTED]`");
    expect(prd).toContain("`[CERTIFIED]`");
  });

  it("documents the actual in-process Planner topology without stale fallbacks", () => {
    expect(prd).not.toContain("in-memory LibSQL");
    expect(prd).toContain("createLocalAgents(resourceId)");
    expect(prd).toContain("TenantAbortRunner");
    expect(prd).not.toContain("Mastra --> GW");
    expect(prd).not.toContain("GenUI -->|human approve| SB");
  });

  it("pins stable HITL, security, privacy, and accessibility invariants", () => {
    expect(prd).toContain("exact artifact/revision/hash");
    expect(prd).toContain("durable readback");
    expect(prd).toContain("SECURITY INVOKER");
    expect(prd).toContain("set search_path = ''");
    expect(prd).toContain("WCAG 2.2 AA");
    expect(prd).not.toContain("WCAG 2.1 AA");
    expect(prd).toContain("operational evidence");
    expect(prd).toContain("auth headers");
  });

  it("keeps product KPIs separate from release and security gates", () => {
    const kpis = section(prd, "## 3. Vision, principles, KPIs", "## 4. Goals and non-goals");
    expect(kpis).not.toContain("Cross-tenant leakage");
    expect(kpis).not.toContain("Duplicate domain commits");
    expect(kpis).not.toContain("Domain mutations audited");
    expect(kpis).not.toContain("Critical journeys E2E green");

    const acceptance = section(prd, "## 14. Acceptance criteria", "## 15. Test strategy");
    expect(acceptance).toContain("Cross-tenant leakage");
    expect(acceptance).toContain("Duplicate domain commits");
    expect(acceptance).toContain("Domain mutations audited");
    expect(acceptance).toContain("Critical journeys E2E green");
    expect(acceptance).toContain("requested active run");
  });

  it("does not reserve future ADR numbers or placeholder Linear IDs", () => {
    expect(prd).not.toContain("IPI-TBD");
    const adrs = section(prd, "## 16. ADRs", "## 17. Risks");
    expect(adrs).toContain("Candidate ADR topics");
    expect(adrs).not.toMatch(/^\|\s*00[5-9]\s*\|/m);
    expect(adrs).not.toMatch(/^\|\s*010\s*\|/m);
  });

  it("keeps current platform companion docs delegated to the runtime-family SSOT", () => {
    const currentStack = section(platform, "## 2. Current verified stack", "## 3. System boundaries");
    expect(currentStack).toContain("docs/mastra/runtime-family.md");
    expect(currentStack).not.toMatch(/CopilotKit `\d+\.\d+\.\d+`/);
    expect(currentStack).not.toMatch(/Mastra core `\d+\.\d+\.\d+`/);
    expect(currentStack).not.toMatch(/@mastra\/pg `?\d+\.\d+\.\d+/);
    expect(currentStack).not.toContain("CopilotKit Intelligence path");
    expect(currentStack).toContain("createLocalAgents(resourceId)");

    expect(aiPattern).toContain("docs/mastra/runtime-family.md");
    expect(aiPattern).not.toMatch(/current(?:ly)? installed `@copilotkit\/react-core \d+\.\d+\.\d+`/);
    expect(aiPattern).not.toMatch(/installed `@mastra\/core \d+\.\d+\.\d+` types/);
    expect(aiPattern).not.toMatch(/Compare with iPix Mastra `\d+\.\d+\.\d+`/);
  });
});
