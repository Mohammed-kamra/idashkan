/**
 * Same-origin API base as `frontend/src/services/api.js` (for full-page redirects).
 */
export function getApiBaseURL() {
  const USE_PROXY = import.meta.env.VITE_USE_PROXY === "true";
  if (USE_PROXY && typeof window !== "undefined") {
    return `${window.location.origin}/api`.replace(/\/$/, "");
  }
  const envBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (envBase) return envBase.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const host = String(window.location.hostname || "").toLowerCase();
    const isLocalHost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".localhost");
    if (!isLocalHost) {
      return `${window.location.origin}/api`.replace(/\/$/, "");
    }
  }
  return "http://localhost:5000/api";
}
