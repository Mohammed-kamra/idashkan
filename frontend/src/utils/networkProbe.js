import { getApiBaseURL } from "./getApiBaseURL";

/**
 * Health endpoint lives on the API origin (see server.js: GET /health), not under /api.
 */
export function getBackendHealthUrl() {
  const base = getApiBaseURL();
  if (
    base.startsWith("https://") ||
    base.startsWith("http://")
  ) {
    const origin = base.replace(/\/api\/?$/i, "").replace(/\/$/, "");
    return `${origin}/health`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/health`.replace(/\/$/, "");
  }
  return "/health";
}

/**
 * True reachability probe for generic HTTPS (not your API). Uses no-cors as requested for WebView compatibility.
 * Falls back to a second host when the first is unreachable (some regions block specific hosts).
 */
export async function probeInternetConnectivity(timeoutMs = 8000) {
  const run = async (url) => {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), timeoutMs);
    try {
      await fetch(url, {
        mode: "no-cors",
        cache: "no-store",
        signal: ac.signal,
      });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(tid);
    }
  };

  if (await run("https://www.google.com")) return true;
  return run("https://www.cloudflare.com/favicon.ico");
}

/**
 * Whether the configured backend responds at /health (opaque ok when cross-origin no-cors).
 */
export async function probeBackendReachable(timeoutMs = 6000) {
  const url = getBackendHealthUrl();
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), timeoutMs);
  try {
    await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: ac.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(tid);
  }
}
