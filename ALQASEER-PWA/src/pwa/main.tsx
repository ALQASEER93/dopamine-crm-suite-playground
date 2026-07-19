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

document.documentElement.setAttribute("dir", "rtl");
document.documentElement.setAttribute("data-theme", "dark");
document.body.setAttribute("dir", "rtl");
document.body.setAttribute("data-theme", "dark");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
