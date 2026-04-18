/**
 * Same-origin API base as `frontend/src/services/api.js` (for full-page redirects).
 */
export function getApiBaseURL() {
  const USE_PROXY = process.env.REACT_APP_USE_PROXY === "true";
  if (USE_PROXY && typeof window !== "undefined") {
    return `${window.location.origin}/api`.replace(/\/$/, "");
  }
  return (process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api")
    .trim()
    .replace(/\/$/, "");
}
