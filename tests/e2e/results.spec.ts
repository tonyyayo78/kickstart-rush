import { test, expect } from "@playwright/test";

const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD;
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "alythcott@northpointconsulting-inc.com";

test.describe("Results entry — authenticated owner", () => {
  test.skip(!OWNER_PASSWORD, "E2E_OWNER_PASSWORD not set");

  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(OWNER_EMAIL);
    await page.getByLabel("Password").fill(OWNER_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/dashboard");
  });

  test("fixtures page loads with tabs", async ({ page }) => {
    await page.goto("/fixtures");
    await expect(page.getByRole("link", { name: "To enter" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Played" })).toBeVisible();
  });

  test("standings page loads with competition tables", async ({ page }) => {
    await page.goto("/standings");
    await expect(page.getByRole("heading", { name: "Standings" })).toBeVisible();
  });

  test("result entry page loads for a scheduled fixture", async ({ page }) => {
    await page.goto("/fixtures");
    const firstFixture = page.locator("ul li a").first();
    const count = await page.locator("ul li a").count();
    if (count === 0) {
      // No scheduled fixtures — skip remainder
      return;
    }
    await firstFixture.click();
    await expect(page.getByRole("button", { name: /save result/i })).toBeVisible();
  });
});
