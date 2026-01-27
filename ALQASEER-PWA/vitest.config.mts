import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/pwa"),
      "virtual:pwa-register": path.resolve(__dirname, "tests/mocks/virtual-pwa-register.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/pwa/**/*.{test,spec}.{ts,tsx}"],
  },
});
