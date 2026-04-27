function getUserAgent() {
  if (typeof navigator === "undefined") return "";
  return String(navigator.userAgent || navigator.vendor || "");
}

export function isAndroidDevice() {
  return /Android/i.test(getUserAgent());
}

export function isAndroidWebView() {
  const ua = getUserAgent();
  if (!ua) return false;
  if (!/Android/i.test(ua)) return false;
  // Common WebView markers on Android.
  return /; wv\)|\bVersion\/\d+\.\d+\b/i.test(ua);
}

export function isAndroidPerformanceMode() {
  // Apply reduced visual effects for Android browsers (Chrome + WebView).
  return isAndroidDevice();
}

