import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const runDir = path.resolve(repoRoot, process.argv[2] || "");
const pwaDir = path.join(repoRoot, "ALQASEER-PWA");
const screenshotDir = path.join(runDir, "artifacts", "screenshots");
const jsonDir = path.join(runDir, "json");
const logDir = path.join(runDir, "logs");
const port = Number(process.env.DPM_PWA_SCREENSHOT_PORT || 4187);
const baseUrl = `http://127.0.0.1:${port}`;

if (!runDir || !runDir.startsWith(path.join(repoRoot, "docs", "_runs"))) {
  throw new Error("Run directory must be under docs/_runs.");
}

const customers = [
  {
    id: "doctor-demo-1",
    name: "DPM DEMO HCP - SAFE QA",
    type: "doctor",
    area: "عمّان الغربية",
    territory: "قطاع الرابية",
    specialty: "طب باطني",
    priority: "A",
    monthlyFrequencyTarget: 3,
    visitsThisMonth: 1,
    assignedRepEmail: "field.rep@example.test",
    productFocus: "موضوع نقاش علمي",
    notes: "DEMO QA customer only.",
    phone: "غير مستخدم",
    address: "عمّان - الرابية - DEMO",
    lastVisit: "2026-06-01T08:30:00.000Z",
    location: { lat: 31.963158, lng: 35.930359 },
  },
  {
    id: "pharmacy-demo-1",
    name: "DPM DEMO PHARMACY - SAFE QA",
    type: "pharmacy",
    area: "عمّان الغربية",
    territory: "قطاع الصويفية",
    category: "صيدلية مجتمع",
    priority: "B",
    monthlyFrequencyTarget: 2,
    visitsThisMonth: 0,
    assignedRepEmail: "field.rep@example.test",
    productFocus: "توفر مواد تعليمية",
    notes: "DEMO QA customer only.",
    address: "عمّان - الصويفية - DEMO",
    location: { lat: 31.958922, lng: 35.869876 },
  },
];

const activeVisitStartedAt = new Date(Date.now() - 285000).toISOString();

const visits = [
  {
    id: "visit-demo-1",
    customerId: "doctor-demo-1",
    customerName: "DPM DEMO HCP - SAFE QA",
    customerType: "doctor",
    visitType: "follow-up",
    status: "success",
    serverStatus: "completed",
    notes: "QA structured visit note - DEMO.",
    visitedAt: "2026-06-01T08:30:00.000Z",
    startedAt: "2026-06-01T08:30:00.000Z",
    endedAt: "2026-06-01T08:48:00.000Z",
    durationSeconds: 1080,
    callDurationSeconds: 420,
    coordinates: { lat: 31.963158, lng: 35.930359 },
    endCoordinates: { lat: 31.96321, lng: 35.9304 },
    startAccuracy: 18,
    endAccuracy: 20,
  },
  {
    id: "visit-demo-active",
    customerId: "pharmacy-demo-1",
    customerName: "DPM DEMO PHARMACY - SAFE QA",
    customerType: "pharmacy",
    visitType: "follow-up",
    status: "in_progress",
    serverStatus: "in_progress",
    notes: "",
    visitedAt: activeVisitStartedAt,
    startedAt: activeVisitStartedAt,
    durationSeconds: 0,
    callDurationSeconds: 0,
    coordinates: { lat: 31.958922, lng: 35.869876 },
    startAccuracy: 22,
  },
];

const routeStops = [
  {
    id: "route-demo-1",
    customerId: "doctor-demo-1",
    customerName: "DPM DEMO HCP - SAFE QA",
    customerType: "doctor",
    address: "عمّان - الرابية - DEMO",
    status: "planned",
    scheduledFor: "2026-06-01T10:00:00.000Z",
    location: { lat: 31.963158, lng: 35.930359 },
  },
  {
    id: "route-demo-2",
    customerId: "pharmacy-demo-1",
    customerName: "DPM DEMO PHARMACY - SAFE QA",
    customerType: "pharmacy",
    address: "عمّان - الصويفية - DEMO",
    status: "planned",
    scheduledFor: "2026-06-01T11:30:00.000Z",
    location: { lat: 31.958922, lng: 35.869876 },
  },
];

const forbiddenPattern = /\b(invoice|invoices|order|orders|billing|payment|payments|collection|accounting|inventory selling|sales order)\b/gi;
const mojibakePattern = /[ØÙÃÂ]|\\u[0-9a-fA-F]{4}/g;

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      env: { ...process.env, ...options.env },
      shell: process.platform === "win32",
      windowsHide: true,
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", (error) => resolve({ exitCode: 127, output: `${output}\n${error.message}` }));
    child.on("close", (exitCode) => resolve({ exitCode, output }));
  });
}

async function stopServer(server) {
  if (!server.pid) return;
  server.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, process.platform === "win32" ? 750 : 250));
}

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`PWA preview did not start at ${baseUrl}`);
}

async function loadPlaywright() {
  const require = createRequire(path.join(pwaDir, "package.json"));
  try {
    return require("playwright");
  } catch {
    return require("@playwright/test");
  }
}

async function ensureChromium(playwright) {
  try {
    const browser = await playwright.chromium.launch({ headless: true });
    await browser.close();
    return { installed: true, installAttempted: false };
  } catch (firstError) {
    const installArgs = process.platform === "linux" ? ["playwright", "install", "chromium", "--with-deps"] : ["playwright", "install", "chromium"];
    const install = await run("npx", installArgs, { cwd: pwaDir });
    await fs.writeFile(path.join(logDir, "pwa-playwright-install.log"), install.output);
    if (install.exitCode !== 0) throw firstError;
    const browser = await playwright.chromium.launch({ headless: true });
    await browser.close();
    return { installed: true, installAttempted: true };
  }
}

async function main() {
  await fs.mkdir(screenshotDir, { recursive: true });
  await fs.mkdir(jsonDir, { recursive: true });
  await fs.mkdir(logDir, { recursive: true });

  const viteBin = path.join(pwaDir, "node_modules", "vite", "bin", "vite.js");
  const server = spawn(process.execPath, [viteBin, "preview", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: pwaDir,
    shell: false,
    windowsHide: true,
    env: { ...process.env, VITE_API_BASE_URL: "/api/v1" },
  });
  let serverOutput = "";
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  try {
    await waitForServer();
    const playwright = await loadPlaywright();
    const browserStatus = await ensureChromium(playwright);
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "ar-JO",
      timezoneId: "Asia/Amman",
      geolocation: { latitude: 31.9539, longitude: 35.9106 },
      permissions: ["geolocation"],
      serviceWorkers: "block",
    });

    await context.addInitScript((demoData) => {
      localStorage.setItem(
        "dpm-auth",
        JSON.stringify({
          state: {
            token: "qa-local-token",
            user: {
              id: "qa-rep",
              name: "DPM DEMO Rep",
              email: "field.rep@example.test",
              role: "medical_rep",
            },
          },
          version: 0,
        }),
      );
      localStorage.setItem("customers", JSON.stringify(demoData.customers));
      localStorage.setItem("visits", JSON.stringify(demoData.visits));
      localStorage.setItem("today-route", JSON.stringify(demoData.routeStops));
    }, { customers, visits, routeStops });

    const page = await context.newPage();
    const consoleMessages = [];
    const networkCalls = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        consoleMessages.push({ type: message.type(), text: message.text().slice(0, 300) });
      }
    });
    page.on("request", (request) => networkCalls.push(request.url()));

    await page.route("**/api/v1/**", async (route) => {
      const url = new URL(route.request().url());
      const pathname = url.pathname;
      const method = route.request().method();
      if (pathname.endsWith("/pwa/customers")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(customers) });
      }
      if (pathname.endsWith("/pwa/visits") && method === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(visits) });
      }
      if (pathname.endsWith("/routes/today")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(routeStops) });
      }
      if (pathname.endsWith("/pwa/tracking/pings")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
      }
      if (pathname.endsWith("/pwa/visits") && method === "POST") {
        const payload = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "visit-demo-new", ...payload, status: "scheduled", serverStatus: "scheduled" }),
        });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    const routes = [
      { key: "account-mobile", path: "/account", viewport: { width: 390, height: 844 } },
      { key: "customers-mobile", path: "/customers", viewport: { width: 390, height: 844 } },
      { key: "customer-profile-mobile", path: "/customers/doctor/doctor-demo-1", viewport: { width: 390, height: 844 } },
      { key: "visits-mobile", path: "/visits", viewport: { width: 390, height: 844 } },
      { key: "visit-flow-focused-mobile", path: "/visit-session/visit-demo-active", viewport: { width: 390, height: 844 } },
      { key: "today-route-mobile", path: "/today-route", viewport: { width: 390, height: 844 } },
      { key: "reports-mobile", path: "/reports", viewport: { width: 390, height: 844 } },
      { key: "live-map-mobile", path: "/live-map", viewport: { width: 390, height: 844 } },
      { key: "customers-desktop", path: "/customers", viewport: { width: 1280, height: 900 } },
      { key: "reports-desktop", path: "/reports", viewport: { width: 1280, height: 900 } },
    ];

    const results = [];
    for (const item of routes) {
      await page.setViewportSize(item.viewport);
      const response = await page.goto(`${baseUrl}${item.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(350);
      const screenshotPath = path.join(screenshotDir, `${item.key}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      const text = await page.locator("body").innerText();
      results.push({
        route: item.path,
        viewport: item.viewport,
        finalUrl: page.url(),
        status: response?.status() ?? null,
        screenshot: path.relative(runDir, screenshotPath).replaceAll(path.sep, "/"),
        notBlank: text.trim().length > 100,
        redirectedToLogin: page.url().includes("/login"),
        arabicReadable: /[ء-ي]/.test(text),
        unicodeEscapeCount: (text.match(/\\u[0-9a-fA-F]{4}/g) || []).length,
        mojibakeSuspicion: mojibakePattern.test(text),
        forbiddenUiTermsCount: (text.match(forbiddenPattern) || []).length,
        primaryCtaVisible: /بدء زيارة|ملف العميل|الخريطة|مزامنة الآن|تحديث الحالة|فتح في/.test(text),
        textSample: text.slice(0, 500),
      });
    }

    await browser.close();

    const summary = {
      baseUrl,
      generatedAt: new Date().toISOString(),
      browserStatus,
      dataMode: "DEMO_QA_SCREENSHOT_DATA_ONLY",
      routes: results,
      screenshots: results.map((item) => item.screenshot),
      consoleMessages,
      sameOriginApiCalls: networkCalls.filter((url) => url.startsWith(`${baseUrl}/api/v1`)).length,
      directVercelCalls: networkCalls.filter((url) => url.includes("vercel.app")).length,
      localhostBackendCalls: networkCalls.filter((url) => url.includes("localhost:8000") || url.includes("127.0.0.1:8000")).length,
    };
    await fs.writeFile(path.join(jsonDir, "pwa_screenshot_routes.json"), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify({ screenshots: summary.screenshots, routes: summary.routes.length }, null, 2));
  } finally {
    await stopServer(server);
    await fs.writeFile(path.join(logDir, "pwa-preview-server.log"), serverOutput);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
