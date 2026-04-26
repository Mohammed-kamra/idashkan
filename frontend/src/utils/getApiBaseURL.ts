export function getApiBaseURL() {
  const USE_PROXY = import.meta.env.VITE_USE_PROXY === "true";
  if (USE_PROXY && typeof window !== "undefined") {
    return `${window.location.origin}/api`.replace(/\/$/, "");
  }
  return (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api")
    .trim()
    .replace(/\/$/, "");
}

