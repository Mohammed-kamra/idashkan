/**
 * Open WhatsApp without leaving the WebView stuck on api.whatsapp.com.
 * Many in-app WebViews load https://api.whatsapp.com in the same document; when the user
 * returns from the WhatsApp app the WebView still shows that page. Mitigation:
 * - Prefer whatsapp:// via anchor click + hidden iframe (keeps the SPA URL in the main frame).
 * - In embedded WebViews, never use window.location.assign() to https://api.whatsapp.com — if
 *   window.open fails, fall back to clipboard + optional callback, or phone-only deep link.
 * - If the native shell still blocks whatsapp://, the host app must handle these schemes /
 *   intent:// (Android) or allow querying WhatsApp (iOS LSApplicationQueriesSchemes).
 */

import { isEmbeddedWebView } from "./isEmbeddedWebView";

/** Avoid huge cart bodies breaking URL size limits or WebView handlers. */
const MAX_WHATSAPP_HREF_CHARS = 1900;

const TRUNC_SUFFIX =
  "\n\n… (message shortened for link — full text was copied to clipboard when possible.)";

/**
 * @param {string} url
 * @returns {string}
 */
export function normalizeWhatsAppUrl(url) {
  const s = String(url || "").trim();
  if (!s) return s;
  try {
    const base =
      typeof window !== "undefined" ? window.location.href : "https://localhost/";
    const u = new URL(s, base);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "wa.me") {
      const phone = u.pathname.replace(/^\//, "").replace(/\D/g, "");
      if (phone.length >= 8) {
        const text = u.searchParams.get("text");
        let out = `https://api.whatsapp.com/send?phone=${phone}`;
        if (text != null && text !== "") {
          out += `&text=${encodeURIComponent(text)}`;
        }
        return out;
      }
    }
  } catch {
    return s;
  }
  return s;
}

/**
 * @param {string} url - normalized https://api.whatsapp.com/send?...
 * @returns {{ phone: string, text: string } | null}
 */
function parseApiWhatsAppSend(url) {
  try {
    const u = new URL(
      url,
      typeof window !== "undefined" ? window.location.origin : "https://localhost",
    );
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "api.whatsapp.com") return null;
    const path = u.pathname.replace(/\/$/, "");
    if (!path.endsWith("/send")) return null;
    const phone = (u.searchParams.get("phone") || "").replace(/\D/g, "");
    if (phone.length < 8) return null;
    const text = u.searchParams.get("text") || "";
    return { phone, text };
  } catch {
    return null;
  }
}

/** Fallback when `new URL()` fails on unusual strings — uses URLSearchParams on the query only */
function parseApiWhatsAppSendLoose(url) {
  try {
    const s = String(url || "");
    const q = s.indexOf("?");
    if (q < 0) return null;
    const sp = new URLSearchParams(s.slice(q + 1));
    const phone = (sp.get("phone") || "").replace(/\D/g, "");
    if (phone.length < 8) return null;
    const text = sp.get("text") || "";
    return { phone, text };
  } catch {
    return null;
  }
}

function buildHttpsSendUrl(phone, text) {
  const base = `https://api.whatsapp.com/send?phone=${phone}`;
  if (text == null || text === "") return base;
  return `${base}&text=${encodeURIComponent(text)}`;
}

/**
 * Shorten message so total HTTPS URL length stays under max (long cart orders).
 * @returns {{ httpsUrl: string, appText: string, truncated: boolean, originalText: string }}
 */
function shortenWhatsAppPayload(phone, originalText) {
  const original = originalText == null ? "" : String(originalText);
  let candidate = original;
  let low = 0;
  let high = original.length;
  let best = "";
  let first = buildHttpsSendUrl(phone, original);
  if (first.length <= MAX_WHATSAPP_HREF_CHARS) {
    return {
      httpsUrl: first,
      appText: original,
      truncated: false,
      originalText: original,
    };
  }
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const slice = original.slice(0, mid) + TRUNC_SUFFIX;
    const u = buildHttpsSendUrl(phone, slice);
    if (u.length <= MAX_WHATSAPP_HREF_CHARS) {
      best = slice;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (!best) {
    const u = buildHttpsSendUrl(phone, TRUNC_SUFFIX.trim());
    return {
      httpsUrl: u,
      appText: TRUNC_SUFFIX.trim(),
      truncated: true,
      originalText: original,
    };
  }
  return {
    httpsUrl: buildHttpsSendUrl(phone, best),
    appText: best,
    truncated: true,
    originalText: original,
  };
}

function tryOpenInNewWindow(url) {
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (w && !w.closed) return true;
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    return false;
  }
}

function tryAnchorDeepLink(appUrl) {
  try {
    const a = document.createElement("a");
    a.href = appUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    return false;
  }
}

function tryIframeDeepLink(appUrl) {
  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "WhatsApp");
    iframe.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
    iframe.src = appUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch (_) {}
    }, 2500);
    return true;
  } catch {
    return false;
  }
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  return false;
}

/**
 * @param {string} url - https wa.me or api.whatsapp.com
 * @param {{ onClipboardFallback?: (hint: string) => void }} [options]
 */
export function openWhatsAppLink(url, options = {}) {
  const { onClipboardFallback } = options;
  const target = normalizeWhatsAppUrl(url);
  if (!target) return;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const inWebView = isEmbeddedWebView();
  let params = parseApiWhatsAppSend(target) || parseApiWhatsAppSendLoose(target);

  /** Non-parseable: open in new tab or assign only when safe */
  if (!params) {
    if (!tryOpenInNewWindow(target)) {
      if (!inWebView) window.location.assign(target);
      else
        onClipboardFallback?.(
          "Could not open WhatsApp from this app browser. Copy the link from the store contact instead.",
        );
    }
    return;
  }

  const { httpsUrl, appText, truncated, originalText } = shortenWhatsAppPayload(
    params.phone,
    params.text,
  );
  const appUrl = `whatsapp://send?phone=${params.phone}&text=${encodeURIComponent(appText)}`;

  const runClipboardIfTruncated = async () => {
    if (!truncated || !originalText) return;
    const ok = await copyTextToClipboard(originalText);
    if (ok)
      onClipboardFallback?.(
        "Full message copied. Open WhatsApp and paste if the chat opens empty.",
      );
    else
      onClipboardFallback?.(
        "Message was shortened for the link (too long for this device).",
      );
  };

  /** Deep link attempts (same user-gesture tick as button onClick). */
  const kickDeepLinks = () => {
    tryAnchorDeepLink(appUrl);
    tryIframeDeepLink(appUrl);
  };

  if (isMobile) {
    void runClipboardIfTruncated();
    kickDeepLinks();

    let cancelled = false;
    const fallback = setTimeout(() => {
      if (cancelled) return;
      if (tryOpenInNewWindow(httpsUrl)) return;

      if (inWebView) {
        const phoneOnlyApp = `whatsapp://send?phone=${params.phone}`;
        tryAnchorDeepLink(phoneOnlyApp);
        tryIframeDeepLink(phoneOnlyApp);
        void (async () => {
          const ok = await copyTextToClipboard(originalText || params.text || "");
          if (ok) {
            onClipboardFallback?.(
              "Order text copied. Open WhatsApp from your device, then paste the message.",
            );
          } else {
            onClipboardFallback?.(
              "Cannot open WhatsApp inside this viewer. Install WhatsApp or open this site in Chrome/Safari.",
            );
          }
        })();
        return;
      }

      window.location.assign(httpsUrl);
    }, 900);

    const onBlur = () => {
      cancelled = true;
      clearTimeout(fallback);
      window.removeEventListener("blur", onBlur);
    };
    window.addEventListener("blur", onBlur);
    setTimeout(() => {
      window.removeEventListener("blur", onBlur);
    }, 1300);
    return;
  }

  /* Desktop / non-mobile UA */
  if (!tryOpenInNewWindow(httpsUrl)) {
    if (!inWebView) window.location.assign(httpsUrl);
    else {
      void runClipboardIfTruncated();
      void (async () => {
        const ok = await copyTextToClipboard(originalText || params.text || "");
        if (ok)
          onClipboardFallback?.(
            "Message copied. Paste it into WhatsApp desktop or open this page in a normal browser.",
          );
        else onClipboardFallback?.("Could not open WhatsApp from this embedded browser.");
      })();
    }
  }
}
