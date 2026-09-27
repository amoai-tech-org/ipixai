import { expect, test } from "@playwright/test";

test("Playwright Test Agent authenticated seed", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app(?:[/?#]|$)/);
});
