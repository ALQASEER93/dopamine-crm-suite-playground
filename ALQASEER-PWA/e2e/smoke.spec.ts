import { expect, test } from "@playwright/test";

test("smoke: home route loads", async ({ page }) => {
  const baseURL = test.info().project.use.baseURL || "";
  const isProduction = baseURL.includes("dopamine-crm-suite-playground.vercel.app");
  const allowProd = process.env.E2E_ALLOW_PROD === "true";
  if (isProduction && !allowProd) {
    test.skip(true, "Production e2e disabled without E2E_ALLOW_PROD=true.");
  }

  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response, "Expected navigation to / to return a response").toBeTruthy();
  expect(response?.status(), "Expected / to not be a 404").not.toBe(404);

  await expect(page.locator("body")).toBeVisible();
});

test("smoke: /login deep-link loads (no 404)", async ({ page }) => {
  const baseURL = test.info().project.use.baseURL || "";
  const isProduction = baseURL.includes("dopamine-crm-suite-playground.vercel.app");
  const allowProd = process.env.E2E_ALLOW_PROD === "true";
  if (isProduction && !allowProd) {
    test.skip(true, "Production e2e disabled without E2E_ALLOW_PROD=true.");
  }

  const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
  expect(response, "Expected navigation to /login to return a response").toBeTruthy();
  expect(response?.status(), "Expected /login to not be a 404").not.toBe(404);

  // App contract: login page exposes an accessibility label.
  await expect(page.getByLabel("login-page")).toBeVisible();
});

