import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/global.css";
import { AuthProvider } from "./state/auth";

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Root element #root not found");
}

const resetClientStorage = async () => {
  const url = new URL(window.location.href);
  if (url.searchParams.get("reset") !== "1") {
    return;
  }

  url.searchParams.delete("reset");

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  localStorage.clear();
  sessionStorage.clear();

  if ("indexedDB" in window && "databases" in indexedDB) {
    const dbs = await indexedDB.databases();
    await Promise.all(
      dbs
        .map((db) => db.name)
        .filter((name): name is string => Boolean(name))
        .map((name) => indexedDB.deleteDatabase(name)),
    );
  }

  window.location.replace(url.toString());
};

void resetClientStorage();

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
