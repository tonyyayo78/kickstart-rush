import { test, expect, type Page } from "@playwright/test";

const OWNER_EMAIL =
  process.env.E2E_OWNER_EMAIL ?? "alythcott@gmail.com";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(OWNER_EMAIL);
  await page.getByLabel("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("Player CRUD", () => {
  test.skip(!OWNER_PASSWORD, "E2E_OWNER_PASSWORD not set");

  test("add, edit, and delete a player", async ({ page }) => {
    await signIn(page);

    // Navigate to Elite squad
    await page.goto("/squads/KE2026/players");
    await expect(page.getByRole("heading", { name: "Kickstart Elite" })).toBeVisible();

    // Add player
    await page.getByRole("link", { name: "Add player" }).click();
    await expect(page.getByRole("heading", { name: /Add player/ })).toBeVisible();

    await page.getByLabel("First name").fill("Test");
    await page.getByLabel("Last name").fill("Player");
    await page.getByLabel("Date of birth").fill("2012-06-15");
    await page.getByLabel("Position").selectOption("MID");
    await page.getByLabel("Jersey number").fill("99");
    await page.getByRole("button", { name: "Add player" }).click();

    // Back on squad list — new player visible
    await page.waitForURL("/squads/KE2026/players");
    await expect(page.getByText("T. Player")).toBeVisible();

    // Navigate to player profile
    await page.getByText("T. Player").click();
    await expect(page.getByRole("heading", { name: "Test Player" })).toBeVisible();
    await expect(page.getByText("#99")).toBeVisible();

    // Edit player
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit player" })).toBeVisible();

    await page.getByLabel("Jersey number").fill("98");
    await page.getByRole("button", { name: "Save changes" }).click();

    // Back on player profile — jersey number updated
    await expect(page.getByText("#98")).toBeVisible();

    // Delete player
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete player" }).click();

    // Back on squad list — player gone
    await page.waitForURL("/squads/KE2026/players");
    await expect(page.getByText("T. Player")).not.toBeVisible();
  });
});
