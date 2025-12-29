import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4174";

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
});
