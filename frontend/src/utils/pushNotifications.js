import { registerAppServiceWorker } from "../serviceWorkerRegistration";

/**
 * Register the service worker for push notifications
 * Safe on iOS - will not throw; returns null if unsupported
 */
export const registerServiceWorker = async () => {
  return registerAppServiceWorker();
};

/**
 * Subscribe to push notifications - requires permission and vapid public key
 */
export const subscribePush = async (vapidPublicKey) => {
  if (!vapidPublicKey) throw new Error("VAPID public key required");
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Service worker timeout")), 10000),
    ),
  ]);
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  return sub.toJSON();
};

/**
 * Unsubscribe from push notifications - stops receiving in notification center
 */
export const unsubscribePush = async () => {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      return true;
    }
    return false;
  } catch (e) {
    console.warn("Unsubscribe push error:", e);
    return false;
  }
};

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const isPushSupported = () => {
  try {
    return (
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    );
  } catch (e) {
    return false;
  }
};

export const getPermissionState = () => {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    return Notification.permission;
  } catch (e) {
    return "denied";
  }
};
