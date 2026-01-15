import { expect, test } from "@playwright/test";

test("PWA login persists after refresh", async ({ page }) => {
  const baseURL = test.info().project.use.baseURL || "";
  const isProduction = baseURL.includes("dopamine-crm-suite-playground.vercel.app");
  const allowProd = process.env.E2E_ALLOW_PROD === "true";
  if (isProduction && !allowProd) {
    test.skip(true, "Production e2e disabled without E2E_ALLOW_PROD=true.");
  }

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

  const bootstrapCode = process.env.E2E_BOOTSTRAP_CODE;
  const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || "Admin12345!";
  const adminName = process.env.E2E_ADMIN_NAME || "Admin User";

  if (bootstrapCode) {
    await page.evaluate(
      async ({ code, email, password, name }) => {
        await fetch("/api/v1/auth/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, email, password, name }),
        });
      },
      {
        code: bootstrapCode,
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      },
    );
  }

  await page.locator("input#email").fill(adminEmail);
  await page.locator("input#password").fill(adminPassword);
  await page.locator("button[type=\"submit\"]").click();

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByLabel("today-route-page")).toBeVisible();

  await page.goto("/visits", { waitUntil: "networkidle" });
  await page.locator("form").waitFor({ state: "visible" });
  const customerOptions = page.locator("#customer option");
  const optionCount = await customerOptions.count();
  expect(optionCount).toBeGreaterThan(1);
  const customerValue = await customerOptions.nth(1).getAttribute("value");
  expect(customerValue).toBeTruthy();
  await page.locator("#customer").selectOption(customerValue || "");
  await page.locator("textarea").fill("E2E visit");
  await page.locator("form button[type=\"submit\"]").click();
  await expect(page.locator(".list .list-item").first()).toBeVisible();

  await page.locator(".list .list-item").first().locator("button").first().click();
  await expect(page).toHaveURL(/\/visits\/.+\/start/);
  await page.getByRole("button", { name: "طلب الموقع" }).click();
  await expect(page.getByText("بيانات الالتقاط")).toBeVisible();
  await page.context().setOffline(true);
  const confirmButton = page.getByRole("button", { name: "تأكيد بدء الزيارة" });
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
  await expect(page).toHaveURL(/\/sync/);
  const queuedCount = await page.evaluate(() => {
    const raw = localStorage.getItem("dpm-offline-queue");
    return raw ? JSON.parse(raw).length : 0;
  });
  expect(queuedCount).toBeGreaterThan(0);
  await page.context().setOffline(false);
  await page.goto("/today-route", { waitUntil: "networkidle" });
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
  await expect(page).toHaveURL(/\/today$/);
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
