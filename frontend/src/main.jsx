import "./i18n";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Root from "./App";
import reportWebVitals from "./reportWebVitals";
import { mergeRemoteTranslations } from "./mergeRemoteTranslations";
import { registerAppServiceWorker } from "./serviceWorkerRegistration";
import { hydrateDeviceId } from "./utils/deviceId";

if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
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
