/**
 * IPI-1346 · PLANNER-AGENT-STRUCTURE-001 — direct characterization tests for
 * the extracted `formatActiveWorkspaceContext()`.
 *
 * `tests/planner-001.test.ts` already proves the context reaches the model
 * end-to-end through `getProductionPlannerAgent().getInstructions()`. These
 * tests pin the parser's own contract so the extraction is provably
 * behavior-preserving and future edits to the agent factory cannot silently
 * change context formatting:
 *
 *   - no RequestContext / no registered AG-UI context  → empty string
 *   - one valid entry                                  → header + JSON
 *   - multiple valid entries                           → original order kept
 *   - description present / absent                     → header only when present
 *   - malformed JSON                                   → omitted, never throws
 *   - mixed valid + malformed / empty                  → only valid survive
 *
 * Security note: this function formats request-scoped context data. It is
 * never an authorization source — see the module JSDoc.
 */

import { RequestContext } from "@mastra/core/request-context";
import { describe, expect, it } from "vitest";

import { formatActiveWorkspaceContext } from "../src/mastra/agents/active-workspace-context";

const HEADER = "\n\n## Active workspace context\n\n";

function withAgUi(context: unknown): RequestContext {
  const requestContext = new RequestContext();
  requestContext.setRaw("ag-ui", { context });
  return requestContext;
}

describe("IPI-1346 formatActiveWorkspaceContext — empty inputs", () => {
  it("returns an empty string when no RequestContext is supplied", () => {
    expect(formatActiveWorkspaceContext()).toBe("");
    expect(formatActiveWorkspaceContext(undefined)).toBe("");
  });

  it("returns an empty string when RequestContext has no ag-ui key", () => {
    expect(formatActiveWorkspaceContext(new RequestContext())).toBe("");
  });

  it("returns an empty string when the ag-ui context array is empty", () => {
    expect(formatActiveWorkspaceContext(withAgUi([]))).toBe("");
  });

  it("returns an empty string when ag-ui is present but context is missing", () => {
    const requestContext = new RequestContext();
    requestContext.setRaw("ag-ui", {});
    expect(formatActiveWorkspaceContext(requestContext)).toBe("");
  });
});

describe("IPI-1346 formatActiveWorkspaceContext — single entry", () => {
  it("renders the description header followed by the parsed JSON body", () => {
    const requestContext = withAgUi([
      {
        description: "The Shoot the operator currently has open.",
        value: JSON.stringify({ scopeKey: "shoot:s1", shoot: { name: "Shoot 104" } }),
      },
    ]);

    expect(formatActiveWorkspaceContext(requestContext)).toBe(
      `${HEADER}The Shoot the operator currently has open.\n${JSON.stringify({
        scopeKey: "shoot:s1",
        shoot: { name: "Shoot 104" },
      })}`,
    );
  });

  it("omits the header line when the entry has no description", () => {
    const requestContext = withAgUi([{ value: JSON.stringify({ scopeKey: "brand:b1" }) }]);

    expect(formatActiveWorkspaceContext(requestContext)).toBe(
      `${HEADER}${JSON.stringify({ scopeKey: "brand:b1" })}`,
    );
  });

  it("re-serialises the parsed value rather than echoing the raw string", () => {
    // CopilotKit stringifies before addContext, so whitespace/key order in the
    // incoming value must not leak into the prompt.
    const requestContext = withAgUi([{ value: '{ "b": 2,\n  "a": 1 }' }]);

    expect(formatActiveWorkspaceContext(requestContext)).toBe(
      `${HEADER}${JSON.stringify({ b: 2, a: 1 })}`,
    );
  });
});

describe("IPI-1346 formatActiveWorkspaceContext — multiple entries", () => {
  it("preserves the registration order of the entries", () => {
    const requestContext = withAgUi([
      { description: "First", value: JSON.stringify({ n: 1 }) },
      { description: "Second", value: JSON.stringify({ n: 2 }) },
      { description: "Third", value: JSON.stringify({ n: 3 }) },
    ]);

    expect(formatActiveWorkspaceContext(requestContext)).toBe(
      `${HEADER}First\n${JSON.stringify({ n: 1 })}\n\nSecond\n${JSON.stringify({
        n: 2,
      })}\n\nThird\n${JSON.stringify({ n: 3 })}`,
    );
  });
});

describe("IPI-1346 formatActiveWorkspaceContext — malformed entries fail closed by omission", () => {
  it("omits an entry whose value is not valid JSON, without throwing", () => {
    const requestContext = withAgUi([{ description: "bad", value: "{not json" }]);

    const result = formatActiveWorkspaceContext(requestContext);

    expect(result).toBe("");
    expect(result).not.toContain("bad");
  });

  it("omits entries with a missing or empty value", () => {
    expect(formatActiveWorkspaceContext(withAgUi([{ description: "no value" }]))).toBe("");
    expect(formatActiveWorkspaceContext(withAgUi([{ description: "empty", value: "" }]))).toBe("");
  });

  it("keeps only the valid entries from a mixed list, in order", () => {
    const requestContext = withAgUi([
      { description: "valid-1", value: JSON.stringify({ n: 1 }) },
      { description: "broken", value: "{oops" },
      { description: "missing-value" },
      { description: "valid-2", value: JSON.stringify({ n: 2 }) },
    ]);

    const result = formatActiveWorkspaceContext(requestContext);

    expect(result).toBe(`${HEADER}valid-1\n${JSON.stringify({ n: 1 })}\n\nvalid-2\n${JSON.stringify({ n: 2 })}`);
    expect(result).not.toContain("broken");
    expect(result).not.toContain("missing-value");
  });

  it("does not throw when the ag-ui value is not the expected shape", () => {
    const requestContext = new RequestContext();
    requestContext.setRaw("ag-ui", "not-an-object");
    expect(() => formatActiveWorkspaceContext(requestContext)).not.toThrow();
    expect(formatActiveWorkspaceContext(requestContext)).toBe("");
  });
});

// IPI-1363 · PLANNER-CONTEXT-002 — the *container* can be malformed too, not
// just its entries. This landed while IPI-1346 was open, so it is covered here
// at the direct-parse level as well as through the agent in
// tests/planner-001.test.ts.
describe("IPI-1363 formatActiveWorkspaceContext — malformed container fails closed by omission", () => {
  it("does not throw and adds nothing when context is a truthy non-array", () => {
    for (const malformed of ["not-an-array", { not: "an array" }, 42, true]) {
      const requestContext = withAgUi(malformed);
      const label = `context was ${JSON.stringify(malformed)}`;
      expect(() => formatActiveWorkspaceContext(requestContext), label).not.toThrow();
      expect(formatActiveWorkspaceContext(requestContext), label).toBe("");
    }
  });

  it("still formats a valid array in registration order (control for the container guard)", () => {
    const requestContext = withAgUi([
      { description: "First", value: JSON.stringify({ n: 1 }) },
      { description: "Second", value: JSON.stringify({ n: 2 }) },
    ]);

    expect(formatActiveWorkspaceContext(requestContext)).toBe(
      `${HEADER}First\n${JSON.stringify({ n: 1 })}\n\nSecond\n${JSON.stringify({ n: 2 })}`,
    );
  });
});
