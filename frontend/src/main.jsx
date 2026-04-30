import "./i18n";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Root from "./App";
import reportWebVitals from "./reportWebVitals";
import { mergeRemoteTranslations } from "./mergeRemoteTranslations";
import { registerAppServiceWorker } from "./serviceWorkerRegistration";
import { hydrateDeviceId } from "./utils/deviceId";

const VITE_PRELOAD_RELOAD_KEY = "__vite_preload_reloaded_once__";

if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    // Prevent hard-crash on stale lazy chunks right after deployment (common in webviews).
    event?.preventDefault?.();
    try {
      const alreadyReloaded =
        sessionStorage.getItem(VITE_PRELOAD_RELOAD_KEY) === "1";
      if (alreadyReloaded) return;
      sessionStorage.setItem(VITE_PRELOAD_RELOAD_KEY, "1");
    } catch {
      // If sessionStorage is blocked, still try once.
    }
    window.location.reload();
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));

hydrateDeviceId()
  .catch(() => {})
  .finally(() => {
    const host =
      typeof window !== "undefined"
        ? String(window.location.hostname || "").toLowerCase()
        : "";
    const isLocalHost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".localhost");

    root.render(
      <React.StrictMode>
        <Root />
      </React.StrictMode>,
    );
    mergeRemoteTranslations().catch(() => {});
    if (import.meta.env.PROD && !isLocalHost) {
      registerAppServiceWorker().catch(() => {});
    }
  });

reportWebVitals();
