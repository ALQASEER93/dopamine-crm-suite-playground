import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4174";
const backendStatusUrl = process.env.E2E_BACKEND_STATUS_URL || "http://127.0.0.1:8000/status";
const backendCommand =
  process.platform === "win32"
    ? "cmd /c \"cd ..\\\\CRM\\\\backend && .\\\\.venv\\\\Scripts\\\\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000\""
    : "bash -lc \"cd ../CRM/backend && ./.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000\"";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    headless: true,
    screenshot: "on",
    video: "on",
    trace: "on",
    geolocation: { latitude: 30.0444, longitude: 31.2357 },
    permissions: ["geolocation"],
  },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: [
    {
      command: "npm run preview -- --host 127.0.0.1 --port 4174",
      url: baseURL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: backendCommand,
      url: backendStatusUrl,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
