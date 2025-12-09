import { registerSW } from "virtual:pwa-register";

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info("PWA ready for offline use");
    },
    onNeedRefresh() {
      console.info("New content available; will update in background");
    },
  });
}
