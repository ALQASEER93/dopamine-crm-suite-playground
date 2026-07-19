import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

const visit = {
  id: "qa-visit-1",
  customerId: "qa-hcp-1",
  customerName: "QA HCP",
  customerType: "doctor",
  status: "scheduled",
  serverStatus: "scheduled",
  notes: "",
};

async function installIsolatedQaState(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "dpm-auth",
      JSON.stringify({
        state: {
          token: "isolated-test-token",
          user: { id: "qa-rep-1", name: "QA Medical Representative", role: "medical_rep" },
        },
        version: 0,
      }),
    );
  });

  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    if (route.request().method() === "GET" && url.includes("/pwa/visits")) {
      await route.fulfill({ json: [visit] });
      return;
    }
    if (route.request().method() === "GET" && url.includes("/pwa/customers")) {
      await route.fulfill({
        json: [{ id: "qa-hcp-1", name: "QA HCP", type: "doctor", territory: "QA Territory" }],
      });
      return;
    }
    await route.fulfill({ json: { ...visit } });
  });
}

test("simulated test GPS proves mobile Start and End payloads", async ({ page }) => {
  await installIsolatedQaState(page);
  const payloads: Array<{ path: string; body: Record<string, unknown> }> = [];
  await page.unroute("**/api/v1/**");
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = request.url();
    if (request.method() === "GET" && url.includes("/pwa/visits")) return route.fulfill({ json: [visit] });
    if (request.method() === "GET" && url.includes("/pwa/customers")) {
      return route.fulfill({ json: [{ id: "qa-hcp-1", name: "QA HCP", type: "doctor" }] });
    }
    payloads.push({ path: new URL(url).pathname, body: request.postDataJSON() });
    return route.fulfill({ json: { ...visit } });
  });

  await page.goto("/visit-session/qa-visit-1");
  await expect(page.getByTestId("gps-test-context-marker")).toBeVisible();
  await page.getByRole("button", { name: "بدء الزيارة" }).click();
  await expect(page.getByText("تم بدء الزيارة وتسجيل GPS.")).toBeVisible();
  await page.getByRole("button", { name: "إنهاء الزيارة" }).click();
  await expect(page.getByText("تم إنهاء الزيارة وتسجيل GPS النهائي.")).toBeVisible();

  expect(payloads.map((item) => item.path)).toEqual([
    "/api/v1/visits/qa-visit-1/start",
    "/api/v1/visits/qa-visit-1/end",
  ]);
  const start = payloads[0].body;
  const end = payloads[1].body;
  expect(start.lat).toEqual(expect.any(Number));
  expect(start.lng).toEqual(expect.any(Number));
  expect(start.accuracy).toEqual(expect.any(Number));
  expect(Date.parse(String(start.started_at))).not.toBeNaN();
  expect(Date.parse(String(end.ended_at))).toBeGreaterThanOrEqual(Date.parse(String(start.started_at)));

  const evidenceDir = process.env.E2E_EVIDENCE_DIR;
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/gps_simulated_mobile_flow.png`, fullPage: true });
  }
});

test("permission denied is explicit and sends no Start request", async ({ page, context }) => {
  await context.clearPermissions();
  await installIsolatedQaState(page);
  const startRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/visits/qa-visit-1/start")) startRequests.push(request.url());
  });

  await page.goto("/visit-session/qa-visit-1");
  await page.getByRole("button", { name: "بدء الزيارة" }).click();
  await expect(page.getByText(/تم رفض إذن الموقع/)).toBeVisible();
  expect(startRequests).toHaveLength(0);
});

test("offline Start and End replay once and visibly return the queue to zero", async ({ page, context }) => {
  await installIsolatedQaState(page);
  const lifecycleRequests: string[] = [];
  await page.unroute("**/api/v1/**");
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = request.url();
    if (request.method() === "GET" && url.includes("/pwa/visits")) return route.fulfill({ json: [visit] });
    if (request.method() === "GET" && url.includes("/pwa/customers")) {
      return route.fulfill({ json: [{ id: "qa-hcp-1", name: "QA HCP", type: "doctor" }] });
    }
    lifecycleRequests.push(new URL(url).pathname);
    return route.fulfill({ json: { ...visit } });
  });

  await page.goto("/visit-session/qa-visit-1");
  await context.setOffline(true);
  await page.getByRole("button", { name: "بدء الزيارة" }).click();
  await expect(page.getByText("تم حفظ بدء الزيارة في طابور عدم الاتصال.")).toBeVisible();
  await expect(page.getByText("عمليات الطابور الحالية: 1")).toBeVisible();
  await page.getByRole("button", { name: "إنهاء الزيارة" }).click();
  await expect(page.getByText("تم حفظ إنهاء الزيارة في طابور عدم الاتصال.")).toBeVisible();
  await expect(page.getByText("عمليات الطابور الحالية: 2")).toBeVisible();
  const evidenceDir = process.env.E2E_EVIDENCE_DIR;
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/offline_queue_pending_mobile.png`, fullPage: true });
  }

  await context.setOffline(false);
  await expect(page.getByText("عمليات الطابور الحالية: 0")).toBeVisible({ timeout: 15_000 });
  expect(lifecycleRequests).toEqual([
    "/api/v1/visits/qa-visit-1/start",
    "/api/v1/visits/qa-visit-1/end",
  ]);
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/offline_queue_synced_mobile.png`, fullPage: true });
  }
});
