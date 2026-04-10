import { syncOfflineActions } from "./syncManager";

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

export function listenForConnectionRestore() {
  navigator.serviceWorker?.addEventListener?.("message", (event) => {
    if (event?.data?.type === "SYNC_OFFLINE_ACTIONS") {
      syncOfflineActions().catch(() => {});
    }
  });

  window.addEventListener("online", () => {
    syncOfflineActions().catch(() => {});
    // Request one-shot background sync if available.
    navigator.serviceWorker.ready
      .then((reg) => reg.sync?.register("sync-offline-actions"))
      .catch(() => {});
  });
}
