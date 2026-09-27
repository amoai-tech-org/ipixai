import { defineConfig, devices } from "@playwright/test";

import baseConfig from "./playwright.config";

function requiredProject(name: string) {
  const project = baseConfig.projects?.find((candidate) => candidate.name === name);
  if (!project) throw new Error(`Playwright agent config requires the ${name} project`);
  return project;
}

export default defineConfig({
  ...baseConfig,
  // Keep the MCP-visible project set intentionally small. The root config does
  // not include playwright-agent, so ordinary `npx playwright test` can never
  // execute its authenticated seed accidentally.
  projects: [
    requiredProject("setup"),
    requiredProject("chromium"),
    {
      name: "playwright-agent",
      testDir: "./e2e/agents",
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
});
