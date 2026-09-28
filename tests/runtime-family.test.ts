import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RequestContext } from "@mastra/core/request-context";
import { TABLE_SCHEMAS } from "@mastra/core/storage/constants";

const require = createRequire(import.meta.url);

function versionTuple(version: string): [number, number, number] {
  const core = version.split("-")[0] ?? "0.0.0";
  const [major = 0, minor = 0, patch = 0] = core.split(".").map((n) => Number.parseInt(n, 10));
  return [major, minor, patch];
}

function compareVersion(
  a: [number, number, number],
  b: [number, number, number],
): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** Matches npm peers like `>=1.63.1-0 <2.0.0-0`. Pre-release suffixes are ignored. */
function coreSatisfiesMastraPeer(coreVersion: string, peerRange: string): boolean {
  const match = peerRange.match(/^>=\s*([0-9][^\s]*)\s+<\s*([0-9][^\s]*)$/);
  if (!match?.[1] || !match[2]) return false;
  const version = versionTuple(coreVersion);
  return (
    compareVersion(version, versionTuple(match[1])) >= 0 &&
    compareVersion(version, versionTuple(match[2])) < 0
  );
}

/** Catalog tables recorded in docs/mastra/db-001-matrix.md (IPI-1043, @mastra/pg@1.12.1 era). */
const IPIX_MASTRA_CATALOG_TABLES = new Set([
  "mastra_agent_versions",
  "mastra_agents",
  "mastra_ai_spans",
  "mastra_background_tasks",
  "mastra_channel_config",
  "mastra_channel_installations",
  "mastra_dataset_items",
  "mastra_dataset_versions",
  "mastra_datasets",
  "mastra_experiment_results",
  "mastra_experiments",
  "mastra_favorites",
  "mastra_mcp_client_versions",
  "mastra_mcp_clients",
  "mastra_mcp_server_versions",
  "mastra_mcp_servers",
  "mastra_messages",
  "mastra_observational_memory",
  "mastra_prompt_block_versions",
  "mastra_prompt_blocks",
  "mastra_resources",
  "mastra_schedule_triggers",
  "mastra_schedules",
  "mastra_scorer_definition_versions",
  "mastra_scorer_definitions",
  "mastra_scorers",
  "mastra_skill_blobs",
  "mastra_skill_versions",
  "mastra_skills",
  "mastra_threads",
  "mastra_workflow_definitions",
  "mastra_workflow_snapshot",
  "mastra_workspace_versions",
  "mastra_workspaces",
]);

const CORE_MEMORY_TABLES = [
  "mastra_threads",
  "mastra_messages",
  "mastra_resources",
  "mastra_workflow_snapshot",
] as const;

describe("IPI-1042 runtime family", () => {
  it("pins the peer-compatible Mastra 1.71.0 family", () => {
    const pg = require("@mastra/pg/package.json") as {
      name: string;
      version: string;
      peerDependencies?: { "@mastra/core"?: string };
    };
    const core = require("@mastra/core/package.json") as { version: string };
    const memory = require("@mastra/memory/package.json") as { version: string };
    const client = require("@mastra/client-js/package.json") as { version: string };
    const cli = require("mastra/package.json") as { version: string };
    const agui = require("@ag-ui/mastra/package.json") as { version: string };
    const copilot = require("@copilotkit/runtime/package.json") as { version: string };

    expect(pg.name).toBe("@mastra/pg");
    expect(pg.version).toBe("1.27.1");
    expect(core.version).toBe("1.71.0");
    expect(memory.version).toBe("1.32.1");
    expect(client.version).toBe("1.50.0");
    expect(cli.version).toBe("1.31.3");
    expect(agui.version).toBe("1.1.4");
    expect(copilot.version).toBe("1.73.3");

    const peer = pg.peerDependencies?.["@mastra/core"];
    expect(peer).toBeTruthy();
    expect(coreSatisfiesMastraPeer("1.71.0", peer ?? "")).toBe(true);
    expect(coreSatisfiesMastraPeer("1.63.0", peer ?? "")).toBe(false);
  });

  it("pins one CopilotKit 1.73.3 / AG-UI 0.0.59 family (IPI-1290)", () => {
    // Read manifests from disk: @copilotkit/channels does not export ./package.json.
    const version = (name: string) =>
      (
        JSON.parse(
          readFileSync(new URL(`../node_modules/${name}/package.json`, import.meta.url), "utf8"),
        ) as { version: string }
      ).version;

    expect(version("@copilotkit/runtime")).toBe("1.73.3");
    expect(version("@copilotkit/react-core")).toBe("1.73.3");
    expect(version("@copilotkit/channels")).toBe("0.11.0");
    for (const pkg of ["@ag-ui/client", "@ag-ui/core", "@ag-ui/encoder", "@ag-ui/proto"]) {
      expect(version(pkg)).toBe("0.0.59");
    }
  });

  it("can import PostgresStore from @mastra/pg@1.27.1", async () => {
    const mod = await import("@mastra/pg");
    expect(typeof mod.PostgresStore).toBe("function");
  });

  it("keeps schemaName mastra and disableInit true (no runtime DDL)", () => {
    const src = readFileSync(new URL("../src/mastra/pg-store.ts", import.meta.url), "utf8");
    expect(src).toMatch(/schemaName:\s*"mastra"/);
    expect(src).toMatch(/disableInit:\s*true/);
    expect(src).not.toMatch(/disableInit:\s*false/);
    expect(src).not.toMatch(/public\.mastra_/);
  });

  it("keeps tenant-scoped stop/cancel after the Mastra upgrade", () => {
    // IPI-1217: wrapAbortRun/TenantAbortRunner moved out of the route file
    // into src/lib/copilotkit/tenant-abort-runner.ts so TenantAbortRunner's
    // connect() (durable Mastra history fallback) could be unit-tested
    // directly — Next.js route handler files only allow specific named
    // exports, so the class itself can't be imported from route.ts.
    const runnerSrc = readFileSync(
      new URL("../src/lib/copilotkit/tenant-abort-runner.ts", import.meta.url),
      "utf8",
    );
    expect(runnerSrc).toContain("function wrapAbortRun");
    expect(runnerSrc).toContain("class TenantAbortRunner");
    expect(runnerSrc).toContain("detachActiveRun()");
    expect(runnerSrc).not.toMatch(/ToolSearchProcessor|search_tools|load_tool/);

    const routeSrc = readFileSync(
      new URL("../src/app/api/copilotkit/[[...slug]]/route.ts", import.meta.url),
      "utf8",
    );
    expect(routeSrc).toContain("TenantAbortRunner");
    expect(routeSrc).not.toMatch(/ToolSearchProcessor|search_tools|load_tool/);
  });

  it("Mastra core in-memory fallback constructors work without MASTRA_DATABASE_URL", async () => {
    const { InMemoryStore } = await import("@mastra/core/storage");
    const storage = new InMemoryStore({ id: "mastra-storage" });
    const memory = new InMemoryStore({ id: "weather-agent-memory" });
    expect(storage).toBeDefined();
    expect(memory).toBeDefined();
  });

  it("core memory tables still exist in 1.71.0 TABLE_SCHEMAS and the recorded catalog", () => {
    const schemaTables = new Set(Object.keys(TABLE_SCHEMAS));
    for (const table of CORE_MEMORY_TABLES) {
      expect(schemaTables.has(table), table).toBe(true);
      expect(IPIX_MASTRA_CATALOG_TABLES.has(table), table).toBe(true);
    }
    const additive = [...schemaTables]
      .filter((name) => !IPIX_MASTRA_CATALOG_TABLES.has(name))
      .sort();
    // Additive vs IPI-1043 catalog: not a merge blocker while disableInit stays true.
    // Route IPI-1043 only if Core memory columns change or runtime init is required.
    expect(additive).toEqual([
      "mastra_harness_sessions",
      "mastra_knowledge_activity",
      "mastra_knowledge_cursors",
      "mastra_knowledge_mentions",
      "mastra_knowledge_nodes",
      "mastra_knowledge_records",
      "mastra_knowledge_semantic_outbox",
      "mastra_notifications",
      "mastra_thread_state",
      "mastra_tool_provider_connections",
      "mastra_traces",
    ]);
  });
});

describe("IPI-1042 weather tool", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("executes get-weather under the upgraded createTool API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const href = String(url);
        if (href.includes("geocoding")) {
          return new Response(
            JSON.stringify({
              results: [{ latitude: 1, longitude: 2, name: "Testville" }],
            }),
          );
        }
        return new Response(
          JSON.stringify({
            current: {
              time: "t",
              temperature_2m: 21,
              apparent_temperature: 20,
              relative_humidity_2m: 50,
              wind_speed_10m: 3,
              wind_gusts_10m: 5,
              weather_code: 0,
            },
          }),
        );
      }),
    );

    const { weatherTool } = await import("../src/mastra/tools");
    expect(weatherTool.id).toBe("get-weather");
    const execute = weatherTool.execute;
    expect(execute).toBeTypeOf("function");
    const result = await execute!(
      { location: "Testville" },
      { requestContext: new RequestContext() } as Parameters<NonNullable<typeof execute>>[1],
    );
    expect(result).toEqual({
      temperature: 21,
      feelsLike: 20,
      humidity: 50,
      windSpeed: 3,
      windGust: 5,
      conditions: "Clear sky",
      location: "Testville",
    });
  });
});

/**
 * IPI-1368 · DOC-PINS-001 — documented runtime pins must track the installed family.
 *
 * The drift this prevents is not hypothetical. `docs/prd.md` claimed Next.js
 * `16.1.2` / CopilotKit `1.68.1` / `@mastra/core` `1.63.2`, and
 * `github/mastra/mastra-repos.md` claimed CopilotKit `1.68.1` / `@mastra/core`
 * `1.41.0`, long after the repository had moved on — so a developer reading either
 * would write against APIs the installed runtime no longer has.
 *
 * Structure, not prose: the canonical table is parsed row by row, and the two
 * living docs are required to *point at* it rather than restate it. Asserting a
 * prose sentence would pin wording instead of truth and would break on any edit.
 */
/** The body under an exact heading line, up to the next heading of any level. */
function sectionUnder(text: string, heading: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,6} /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/** Everything before the first `##` heading. */
function preambleOf(text: string): string {
  const lines = text.split("\n");
  const end = lines.findIndex((line) => /^## /.test(line));
  return (end === -1 ? lines : lines.slice(0, end)).join("\n");
}

describe("documented runtime pins match the installed family (IPI-1368)", () => {
  const read = (relativePath: string) =>
    readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

  const installedVersion = (name: string) =>
    (
      JSON.parse(
        readFileSync(new URL(`../node_modules/${name}/package.json`, import.meta.url), "utf8"),
      ) as { version: string }
    ).version;

  const FAMILY = [
    "@copilotkit/runtime",
    "@copilotkit/react-core",
    "@copilotkit/channels",
    "@ag-ui/client",
    "@ag-ui/mastra",
    "@mastra/core",
    "@mastra/memory",
    "@mastra/pg",
    "@mastra/client-js",
    "mastra",
    // `next` is included because the PRD named a Next.js version among the stale
    // pins, so a framework row is checked by the same rule rather than only by the
    // prose check below.
    "next",
  ] as const;

  it("the canonical table matches every installed family package", () => {
    // Parse the table row by row rather than building one pattern per package.
    // Structural parsing cannot be confused by a regex metacharacter in a package
    // name, and no pattern is ever constructed from data.
    const rows = new Map<string, string>();
    for (const line of read("docs/mastra/runtime-family.md").split("\n")) {
      const cells = line.split("|").map((cell) => cell.trim());
      if (cells.length < 4) continue;
      const nameCell = cells[1] ?? "";
      const versionCell = cells[2] ?? "";
      if (!nameCell.startsWith("`") || !nameCell.endsWith("`")) continue;
      if (!/^[0-9]/.test(versionCell)) continue;
      rows.set(nameCell.slice(1, -1), versionCell);
    }
    const mismatched = FAMILY.flatMap((name) => {
      const installed = installedVersion(name);
      const documented = rows.get(name);
      if (documented === undefined) return [{ name, documented: "(no row)", installed }];
      return documented === installed ? [] : [{ name, documented, installed }];
    });
    expect(
      mismatched,
      "A row in docs/mastra/runtime-family.md disagrees with the installed package. " +
        "That table is the single place a runtime version is written down; update it " +
        "when the pinned family changes.",
    ).toEqual([]);
  });

  it("iPix's own family statement does not restate a version", () => {
    // A reader-facing label paired with the version actually installed for it.
    // `next` is included because the PRD named a Next.js version too.
    const labelled: Array<[string, string]> = [
      ["Next.js", installedVersion("next")],
      ["CopilotKit", installedVersion("@copilotkit/runtime")],
      ["@ag-ui/mastra", installedVersion("@ag-ui/mastra")],
      ["@mastra/core", installedVersion("@mastra/core")],
      ["@mastra/pg", installedVersion("@mastra/pg")],
    ];
    // Scope matters. These documents legitimately record *upstream* versions —
    // `mastra-repos.md` notes that `mastra-ai/ui-dojo` "uses Core `1.50.0` and
    // CopilotKit `1.62.1`, not the iPix family". Flagging those would be a false
    // positive and would push real third-party context out of the file. So the
    // rule applies only to the region where the document speaks for iPix.
    const regions: Array<[string, string]> = [
      ["docs/prd.md", sectionUnder(read("docs/prd.md"), "### 1.2 Stack truth (this repo)")],
      ["github/mastra/mastra-repos.md", preambleOf(read("github/mastra/mastra-repos.md"))],
    ];
    // One static pattern, applied to a window sliced around each occurrence of the
    // label, so no pattern is built from the data being checked. Backticks around
    // the version are optional: the house style uses them, but a plain-text
    // restatement is the same defect and requiring backticks would let it through.
    //
    // Every occurrence of every label is examined and every version found is
    // reported, so the failure lists all of them rather than the first. The
    // detection itself did not depend on this: the assertion requires an empty
    // list, so *any* restatement — matching or stale — already failed the suite.
    // Reporting only the first made the comment above untrue and hid the rest.
    //
    // The window is bounded by the end of the line, so a label at the end of one
    // line with a version at the start of the next is not matched. Left as-is:
    // widening across lines would pair a label with an unrelated version more
    // often than it would catch a real restatement.
    const VERSION = /`?(\d+\.\d+\.\d+)`?/;
    const restated = regions.flatMap(([path, text]) =>
      labelled.flatMap(([label, installed]) => {
        const found: Array<{ path: string; label: string; documented: string; installed: string }> =
          [];
        let from = 0;
        for (;;) {
          const at = text.indexOf(label, from);
          if (at === -1) break;
          const lineEnd = text.indexOf("\n", at);
          const windowEnd = Math.min(
            lineEnd === -1 ? text.length : lineEnd,
            at + label.length + 24,
          );
          const documented = VERSION.exec(text.slice(at + label.length, windowEnd))?.[1];
          if (documented !== undefined) found.push({ path, label, documented, installed });
          from = at + label.length;
        }
        return found;
      }),
    );
    expect(
      restated,
      "An iPix family statement restates a runtime pin. Point at " +
        "docs/mastra/runtime-family.md instead: two copies is how they drift apart.",
    ).toEqual([]);
  });

  it("still locates the iPix family statements it guards", () => {
    // Without this, renaming either heading would silently empty the region and
    // make the assertion above vacuously true — the failure mode this repository
    // has hit more than once.
    expect(
      sectionUnder(read("docs/prd.md"), "### 1.2 Stack truth (this repo)").length,
      "The `### 1.2 Stack truth (this repo)` section was renamed or removed.",
    ).toBeGreaterThan(0);
    expect(
      preambleOf(read("github/mastra/mastra-repos.md")).length,
      "github/mastra/mastra-repos.md no longer has a preamble before its first `##`.",
    ).toBeGreaterThan(0);
  });
});
