import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const LOCAL_API_DEFAULT = "http://127.0.0.1:8000/api/v1";
const SAME_ORIGIN_API_BASE = "/api/v1";
const packageVersion = process.env.npm_package_version || "0.2.0";
const buildMarker = process.env.VITE_BUILD_MARKER || `dpm-pwa-${packageVersion}-phase-a`;

function isLocalApiUrl(value: string) {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local")
    );
  } catch (_error) {
    if (normalized.startsWith("/")) return false;
    return (
      lower.includes("localhost") ||
      lower.includes("127.0.0.1") ||
      lower.includes("0.0.0.0") ||
      lower.includes("::1")
    );
  }
}

function isDirectVercelApiUrl(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().endsWith(".vercel.app");
  } catch (_error) {
    return value.toLowerCase().includes(".vercel.app");
  }
}

function resolveApiBase(command: "serve" | "build") {
  const configured = process.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured;
  return command === "serve" ? LOCAL_API_DEFAULT : SAME_ORIGIN_API_BASE;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default defineConfig(({ command }) => {
  const apiBase = resolveApiBase(command);
  const normalizedApiBase = apiBase.replace(/\/$/, "");

  if (command === "build" && (isLocalApiUrl(normalizedApiBase) || isDirectVercelApiUrl(normalizedApiBase))) {
    throw new Error(
      [
        "Production PWA build blocked: invalid browser API base URL.",
        "Use same-origin /api/v1 or an approved HTTPS API host that is not localhost or direct Vercel.",
        `Current value: "${normalizedApiBase}"`,
      ].join(" "),
    );
  }

  const apiPrefix = normalizedApiBase.startsWith("http")
    ? (() => {
        const apiUrl = new URL(normalizedApiBase);
        return `${apiUrl.origin}${apiUrl.pathname.replace(/\/$/, "")}`;
      })()
    : normalizedApiBase;

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src/pwa"),
      },
    },
    define: {
      __DPM_APP_VERSION__: JSON.stringify(packageVersion),
      __DPM_BUILD_MARKER__: JSON.stringify(buildMarker),
      __DPM_API_BASE__: JSON.stringify(normalizedApiBase),
      __DPM_CACHE_NAMES__: JSON.stringify({
        apiData: `dpm-api-data-${buildMarker}`,
        staticShell: `dpm-static-${buildMarker}`,
      }),
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon-192.png", "icon-512.png"],
        manifest: {
          name: "تطبيق مندوبي دوبامين فارما",
          short_name: "DPM Reps",
          start_url: "/",
          display: "standalone",
          background_color: "#0b1220",
          theme_color: "#0b1220",
          lang: "ar",
          dir: "rtl",
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
        },
        workbox: {
          cacheId: buildMarker,
          cleanupOutdatedCaches: true,
          navigateFallback: "/index.html",
          runtimeCaching: [
            {
              urlPattern: new RegExp(`${escapeRegExp(apiPrefix)}/(routes/today|customers|visits)`),
              handler: "NetworkFirst",
              options: {
                cacheName: `dpm-api-data-${buildMarker}`,
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 12 },
                networkTimeoutSeconds: 6,
              },
            },
            {
              urlPattern: ({ url }) => url.origin === self.location.origin,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: `dpm-static-${buildMarker}`,
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
          ],
        },
      }),
    ],
  };
});
