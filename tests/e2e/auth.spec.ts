import { test, expect } from "@playwright/test";

test.describe("Auth", () => {
  test("anonymous GET / redirects to /sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/sign-in");
  });

  test("GET /public/standings returns 200 without auth", async ({ request }) => {
    const response = await request.get("/public/standings");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("Standings");
  });

  test("submitting an unauthorised email shows generic message", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill("notallowed@example.com");
    await page.getByRole("button", { name: "Send magic link" }).click();
    await expect(
      page.getByText("If your email is allow-listed, a sign-in link has been sent."),
    ).toBeVisible();
  });
});
