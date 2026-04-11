import "./i18n";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Root from "./App";
import reportWebVitals from "./reportWebVitals";
import { mergeRemoteTranslations } from "./mergeRemoteTranslations";
import {
  listenForConnectionRestore,
  registerAppServiceWorker,
} from "./offline/serviceWorkerRegistration";

// Let MainPage/sessionStorage control scroll on back/forward and client nav; avoids the
// browser fighting React after route changes (often read scrollY as 0 when leaving home).
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

const root = ReactDOM.createRoot(document.getElementById("root"));

// Never block first paint on remote translations (slow/_unreachable API caused long white screens in production).
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
mergeRemoteTranslations().catch(() => {});
registerAppServiceWorker().catch(() => {});
listenForConnectionRestore();

// If you want to start measuring web vitals in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics measurement endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
