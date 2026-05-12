import { test, expect } from "@playwright/test";

test.describe("Public site — anonymous access", () => {
  test("GET /public/fixtures returns 200 and contains 'Sat'", async ({
    request,
  }) => {
    const response = await request.get("/public/fixtures");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("Sat");
  });

  test("GET /public/results returns 200 and shows empty-state copy", async ({
    request,
  }) => {
    const response = await request.get("/public/results");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("Results will appear here as matches are played");
  });

  test("GET /public/standings returns 200 and contains Zone A and Zone B", async ({
    request,
  }) => {
    const response = await request.get("/public/standings");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("Zone A");
    expect(text).toContain("Zone B");
  });

  test("GET /public/fixtures contains Kickstart Elite or Kickstart Premier", async ({
    request,
  }) => {
    const response = await request.get("/public/fixtures");
    expect(response.status()).toBe(200);
    const text = await response.text();
    const hasKickstart =
      text.includes("Kickstart Elite") || text.includes("Kickstart Premier");
    expect(hasKickstart).toBe(true);
  });
});
