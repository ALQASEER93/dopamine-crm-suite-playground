import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const apiBase = process.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
const apiUrl = new URL(apiBase);
const apiPrefix = `${apiUrl.origin}${apiUrl.pathname.replace(/\/$/, "")}`;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/pwa"),
    },
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
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: new RegExp(`${apiPrefix}/(routes/today|customers|visits)`),
            handler: "NetworkFirst",
            options: {
              cacheName: "dpm-api-data",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 12 },
              networkTimeoutSeconds: 6,
            },
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "dpm-static",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
});
