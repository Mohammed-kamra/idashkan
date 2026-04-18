/**
 * Best-effort detection of embedded in-app WebViews where Google GIS popups often break.
 */
export function isEmbeddedWebView() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";

  if (/FBAN|FBAV|Instagram|Line\//i.test(ua)) return true;
  if (/; wv\)/.test(ua)) return true;
  if (/Android.+Chrome\/[.0-9]* Mobile/.test(ua) && /Version\//.test(ua))
    return true;

  if (
    /(iPhone|iPod|iPad)/i.test(ua) &&
    /AppleWebKit/i.test(ua) &&
    !/Safari/i.test(ua) &&
    !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua)
  ) {
    return true;
  }

  return false;
}
