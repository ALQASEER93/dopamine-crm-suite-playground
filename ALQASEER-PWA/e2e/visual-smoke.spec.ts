import fs from "fs";
import path from "path";
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 720 } });

const credentials = {
  email: process.env.PWA_E2E_EMAIL || "rep1@example.com",
  password: process.env.PWA_E2E_PASSWORD || "Rep12345!",
};

function getAssetRoot() {
  const runId = process.env.VERIFY_PACK_TS || new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve(process.cwd(), "..", "docs", "_runs", "assets", runId, "pwa");
}

async function loginAsRep(page: any) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.locator("input#email").fill(credentials.email);
  await page.locator("input#password").fill(credentials.password);
  await page.locator("button[type=\"submit\"]").click();
  await expect(page).toHaveURL(/\/today$/);
}

test("Visual smoke: key PWA routes", async ({ page }) => {
  const assetRoot = getAssetRoot();
  fs.mkdirSync(assetRoot, { recursive: true });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });

  await page.route(/\/api\/v1\/routes\/today/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "route-1",
          customerId: "cust-1",
          customerName: "صيدلية الشفاء",
          customerType: "pharmacy",
          address: "شارع الملكة رانيا",
          status: "planned",
          scheduledFor: "09:00",
          location: { lat: 30.0444, lng: 31.2357 },
        },
      ]),
    });
  });

  await page.route(/\/api\/v1\/pwa\/visits/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "visit-1",
          customerId: "cust-1",
          customerName: "صيدلية الشفاء",
          customerType: "pharmacy",
          visitType: "follow-up",
          status: "SCHEDULED",
          notes: "تأكيد المخزون",
          visitedAt: "2026-01-14T09:00:00Z",
        },
      ]),
    });
  });

  await page.route(/\/api\/v1\/pwa\/customers/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "cust-1",
          name: "صيدلية الشفاء",
          type: "pharmacy",
          area: "الدوار الثالث",
          address: "شارع الملكة رانيا",
          location: { lat: 30.0444, lng: 31.2357 },
        },
      ]),
    });
  });

  await loginAsRep(page);

  const targets = [
    { path: "/today", title: "اليوم", name: "today" },
    { path: "/visits", title: "الزيارات", name: "visits" },
    { path: "/map", title: "الخريطة", name: "map" },
    { path: "/account", title: "الملف الشخصي", name: "account" },
    { path: "/settings", title: "الإعدادات", name: "settings" },
  ];

  for (const target of targets) {
    await page.goto(target.path, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(new RegExp(`${target.path}$`));
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(assetRoot, `${target.name}.png`), fullPage: true });
  }
});
