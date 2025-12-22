import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "https://dopamine-crm-suite-playground.vercel.app",
    headless: true,
    screenshot: "on",
    video: "on",
    trace: "on",
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
