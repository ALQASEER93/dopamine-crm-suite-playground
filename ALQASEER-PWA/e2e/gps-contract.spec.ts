import { expect, test } from "@playwright/test";

const credentials = {
  email: process.env.PWA_E2E_EMAIL || "rep1@example.com",
  password: process.env.PWA_E2E_PASSWORD || "Rep12345!",
};

async function loginAsRep(page: any) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.locator("input#email").fill(credentials.email);
  await page.locator("input#password").fill(credentials.password);
  await page.locator("button[type=\"submit\"]").click();
  await expect(page).toHaveURL(/\/today$/);
}

async function createVisitAndOpenStart(page: any) {
  await page.goto("/visits", { waitUntil: "networkidle" });
  const customerSelect = page.locator("select#customer");
  await expect(customerSelect).toBeVisible();
  const options = await customerSelect.locator("option").all();
  if (options.length <= 1) {
    throw new Error("No seeded customers available for visit creation.");
  }
  await customerSelect.selectOption({ index: 1 });
  await page.locator("textarea").fill("زيارة تجريبية عبر اختبار GPS");
  await page.getByRole("button", { name: "حفظ الزيارة" }).click();
  const startButton = page.getByRole("button", { name: "بدء" }).first();
  await expect(startButton).toBeVisible();
  await startButton.click();
  await expect(page).toHaveURL(/\/visits\/.*\/start$/);
}

function assertGpsPayload(payload: any, mode: "start" | "end") {
  expect(payload).toBeTruthy();
  expect(typeof payload.lat).toBe("number");
  expect(typeof payload.lng).toBe("number");
  expect(typeof payload.accuracy).toBe("number");
  expect(typeof payload.device_info).toBe("string");
  if (mode === "start") {
    expect(payload.started_at).toBeTruthy();
  } else {
    expect(payload.ended_at).toBeTruthy();
  }
}

test("GPS contract: start/end send geo + device fields", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 30.0444, longitude: 31.2357, accuracy: 12 });

  await loginAsRep(page);
  await createVisitAndOpenStart(page);

  await page.getByRole("button", { name: "طلب الموقع" }).click();
  await expect(page.getByRole("button", { name: "تأكيد بدء الزيارة" })).toBeEnabled();

  let startPayload: any;
  let startedVisitId = "";
  await page.route(/\/visits\/[^/]+\/start$/, async (route) => {
    startPayload = route.request().postDataJSON();
    const visitId = route.request().url().split("/").slice(-2)[0];
    startedVisitId = visitId;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: visitId, status: "IN_PROGRESS" }),
    });
  });

  await page.getByRole("button", { name: "تأكيد بدء الزيارة" }).click();
  await expect(page).toHaveURL(/\/visits$/);
  assertGpsPayload(startPayload, "start");

  await page.goto(`/visits/${startedVisitId}/end`, { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/visits\/.*\/end$/);

  await page.getByRole("button", { name: "طلب الموقع" }).click();
  await expect(page.getByRole("button", { name: "تأكيد إنهاء الزيارة" })).toBeEnabled();

  let endPayload: any;
  await page.route(/\/visits\/[^/]+\/end$/, async (route) => {
    endPayload = route.request().postDataJSON();
    const visitId = route.request().url().split("/").slice(-2)[0];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: visitId, status: "COMPLETED" }),
    });
  });

  await page.getByRole("button", { name: "تأكيد إنهاء الزيارة" }).click();
  await expect(page).toHaveURL(/\/visits$/);
  assertGpsPayload(endPayload, "end");
});

test("GPS contract: permission denied blocks start", async ({ page, context }) => {
  await context.clearPermissions();
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (_success: any, error: any) => error({ code: 1, message: "Permission denied" }),
      },
      configurable: true,
    });
  });

  await loginAsRep(page);
  await createVisitAndOpenStart(page);

  await page.getByRole("button", { name: "طلب الموقع" }).click();
  await expect(page.getByText(/تم رفض صلاحية الموقع/)).toBeVisible();
  await expect(page.getByRole("button", { name: "تأكيد بدء الزيارة" })).toBeDisabled();
});

test("GPS contract: offline queue then replay", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 30.0444, longitude: 31.2357, accuracy: 12 });

  await loginAsRep(page);
  await createVisitAndOpenStart(page);

  await page.getByRole("button", { name: "طلب الموقع" }).click();
  await expect(page.getByRole("button", { name: "تأكيد بدء الزيارة" })).toBeEnabled();

  await context.setOffline(true);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true }),
  );
  await page.getByRole("button", { name: "تأكيد بدء الزيارة" }).click();
  await expect(page).toHaveURL(/\/sync$/);
  await expect(page.getByRole("heading", { name: "المزامنة" })).toBeVisible();

  let replayPayload: any;
  await page.route(/\/visits\/[^/]+\/start$/, async (route) => {
    replayPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
  });

  await context.setOffline(false);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true }),
  );

  await page.getByRole("button", { name: "إعادة المحاولة" }).click();
  await expect(page.getByText("لا توجد معاملات معلّقة")).toBeVisible();
  assertGpsPayload(replayPayload, "start");
});
