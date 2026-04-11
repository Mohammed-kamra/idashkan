/**
 * Registers the app service worker (push notifications, lifecycle).
 * No offline queue or IndexedDB sync — API calls require network.
 */
export async function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "") || "";
    const swPath = base ? `${base}/sw.js` : "/sw.js";
    const reg = await navigator.serviceWorker.register(swPath, { scope: "/" });
    return reg;
  } catch (error) {
    console.warn("App service worker registration failed:", error);
    return null;
  }
}
