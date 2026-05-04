/**
 * Dev / QA instrumentation for WebView debugging (enable VITE_DEBUG_NETWORK=true in production builds when diagnosing users).
 */
export function emitNetworkDebug(detail) {
  if (typeof window === "undefined") return;
  const enabled =
    import.meta.env.DEV || import.meta.env.VITE_DEBUG_NETWORK === "true";
  if (!enabled) return;
  try {
    window.dispatchEvent(new CustomEvent("app:network-debug", { detail }));
  } catch {
    /* ignore */
  }
  // eslint-disable-next-line no-console
  console.warn("[network]", detail);
}
