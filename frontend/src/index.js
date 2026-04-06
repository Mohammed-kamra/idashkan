import "./i18n";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Root from "./App";
import reportWebVitals from "./reportWebVitals";
import { mergeRemoteTranslations } from "./mergeRemoteTranslations";

const root = ReactDOM.createRoot(document.getElementById("root"));

// Never block first paint on remote translations (slow/_unreachable API caused long white screens in production).
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
mergeRemoteTranslations().catch(() => {});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
