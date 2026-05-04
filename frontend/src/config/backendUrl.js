/**
 * Single source of truth for backend URLs (iDashkan production on Railway).
 * Override with VITE_API_BASE_URL / VITE_BACKEND_URL in .env / hosting dashboard.
 */
export const PRODUCTION_BACKEND_ORIGIN =
  "https://idashkan-production.up.railway.app";

function isLocalHost() {
  if (typeof window === "undefined") return false;
  const host = String(window.location.hostname || "").toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost")
  );
}

/**
 * Origin for static files and uploads (no /api suffix).
 * Priority: VITE_BACKEND_URL → local dev → Railway production.
 */
export function getResolvedBackendOrigin() {
  const env = (import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/$/, "");
  if (env) return env;
  if (import.meta.env.DEV && isLocalHost()) return "http://localhost:5000";
  return PRODUCTION_BACKEND_ORIGIN;
}

/**
 * Axios / API base (includes /api path).
 * Priority: VITE_API_BASE_URL → VITE_USE_PROXY same-origin /api → local dev → Railway /api.
 */
export function getResolvedApiBaseUrl() {
  const envApi = (import.meta.env.VITE_API_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (envApi) return envApi;

  if (import.meta.env.VITE_USE_PROXY === "true" && typeof window !== "undefined") {
    return `${window.location.origin}/api`.replace(/\/$/, "");
  }

  if (import.meta.env.DEV && isLocalHost()) {
    return "http://localhost:5000/api";
  }

  return `${PRODUCTION_BACKEND_ORIGIN}/api`;
}

let loggedDevBase = false;

/** Call once after axios is configured (dev-only one-line log). */
export function logResolvedApiBaseDev(apiBaseUrl) {
  if (!import.meta.env.DEV || loggedDevBase) return;
  loggedDevBase = true;
  // eslint-disable-next-line no-console
  console.info("[api] baseURL:", apiBaseUrl);
}
