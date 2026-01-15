import { expect, test } from "@playwright/test";

test("Rep day flow: My Day, Map, Visits start/end", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 30.0444, longitude: 31.2357 });

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("login-page").waitFor({ state: "visible" });

  await page.locator("input#email").fill("rep1@example.com");
  await page.locator("input#password").fill("Rep12345!");
  await page.locator("button[type=\"submit\"]").click();

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByLabel("today-route-page")).toBeVisible();

  await page.goto("/map", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/map$/);

  await page.goto("/visits", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/visits$/);

  const customerSelect = page.locator("select#customer");
  await expect(customerSelect).toBeVisible();
  const options = await customerSelect.locator("option").all();
  if (options.length > 1) {
    await customerSelect.selectOption({ index: 1 });
  }
  await page.locator("textarea").fill("زيارة تجريبية عبر الاختبار الآلي");
  await page.getByRole("button", { name: "حفظ الزيارة" }).click();

  const startButton = page.getByRole("button", { name: "بدء" }).first();
  await expect(startButton).toBeVisible();
  await startButton.click();

  await page.getByRole("button", { name: "طلب الموقع" }).click();
  await expect(page.getByRole("button", { name: "تأكيد بدء الزيارة" })).toBeEnabled();
  await page.route(/\/visits\/[^/]+\/start$/, async (route) => {
    const visitId = route.request().url().split("/").slice(-2)[0];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: visitId, status: "IN_PROGRESS" }),
    });
  });
  await page.route(/\/visits\/[^/]+\/end$/, async (route) => {
    const visitId = route.request().url().split("/").slice(-2)[0];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: visitId, status: "COMPLETED" }),
    });
  });
  await page.getByRole("button", { name: "تأكيد بدء الزيارة" }).click();

  await expect(page).toHaveURL(/\/visits$/);
  const endButton = page.getByRole("button", { name: "إنهاء" }).first();
  await expect(endButton).toBeVisible();
  await endButton.click();

  await page.getByRole("button", { name: "طلب الموقع" }).click();
  await expect(page.getByRole("button", { name: "تأكيد إنهاء الزيارة" })).toBeEnabled();
  await page.getByRole("button", { name: "تأكيد إنهاء الزيارة" }).click();

  await expect(page).toHaveURL(/\/visits$/);
});
