import { expect, test } from "@playwright/test";

test("PWA login persists after refresh", async ({ page }) => {
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("requestfailed", (req) => {
    requestFailures.push(`${req.method()} ${req.url()} -> ${req.failure()?.errorText}`);
  });

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("login-page").waitFor({ state: "visible" });

  await page.locator("input#email").fill("admin@example.com");
  await page.locator("input#password").fill("Admin12345!");
  await page.locator("button[type=\"submit\"]").click();

  await expect(page).toHaveURL(/\/today-route$/);
  await expect(page.getByLabel("today-route-page")).toBeVisible();

  const token = await page.evaluate(() => {
    const raw = localStorage.getItem("dpm-auth");
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed?.state?.token ?? null;
    } catch {
      return null;
    }
  });
  expect(token).toBeTruthy();

  const meResponse = await page.evaluate(async (authToken) => {
    const res = await fetch("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return { status: res.status, body: await res.text() };
  }, token);
  expect(meResponse.status).toBe(200);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/today-route$/);
  await expect(page.getByLabel("today-route-page")).toBeVisible();

  if (consoleMessages.length > 0) {
    console.log("Console warnings/errors:", consoleMessages);
  }
  if (pageErrors.length > 0) {
    console.log("Page errors:", pageErrors);
  }
  if (requestFailures.length > 0) {
    console.log("Request failures:", requestFailures);
  }
});
