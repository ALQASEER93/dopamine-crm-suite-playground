import { expect, test } from "@playwright/test";

test("manifest, icons, active service worker, cache, and offline shell are operational", async ({ page, context, request }) => {
  await page.goto("/login");
  const manifest = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest");
    return { status: response.status, body: await response.json() };
  });
  expect(manifest.status).toBe(200);
  expect(manifest.body.name).toBeTruthy();
  expect(manifest.body.start_url).toBeTruthy();
  expect(manifest.body.display).toMatch(/standalone|fullscreen|minimal-ui/);
  expect(manifest.body.icons.length).toBeGreaterThanOrEqual(2);
  for (const icon of manifest.body.icons) {
    const response = await request.get(new URL(icon.src, page.url()).toString());
    expect(response.ok()).toBe(true);
  }

  const serviceWorker = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const active = registration.active;
    const cacheNames = await caches.keys();
    return {
      supported: "serviceWorker" in navigator,
      state: active?.state || null,
      script: active ? new URL(active.scriptURL).pathname : null,
      cacheNames,
    };
  });
  expect(serviceWorker.supported).toBe(true);
  expect(serviceWorker.state).toBe("activated");
  expect(serviceWorker.script).toBe("/sw.js");
  expect(serviceWorker.cacheNames.length).toBeGreaterThan(0);

  await page.reload({ waitUntil: "networkidle" });
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("login-page")).toBeVisible();
  const evidenceDir = process.env.E2E_EVIDENCE_DIR;
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/pwa_offline_shell.png`, fullPage: true });
  }
  await context.setOffline(false);
});
