/**
 * Open WhatsApp without leaving the WebView stuck on api.whatsapp.com.
 * Many in-app WebViews load https://api.whatsapp.com in the same document; when the user
 * returns from the WhatsApp app the WebView still shows that page. Mitigation:
 * - On mobile, prefer whatsapp:// via a hidden iframe (hands off to the native app without
 *   replacing the SPA URL in the main frame).
 * - Use window.open for https fallback; avoid same-window assign unless necessary.
 */

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

/**
 * @param {string} url - https wa.me or api.whatsapp.com
 */
export function openWhatsAppLink(url) {
  const target = normalizeWhatsAppUrl(url);
  if (!target) return;

  const params = parseApiWhatsAppSend(target);
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

  if (params && isMobile) {
    const appUrl = `whatsapp://send?phone=${params.phone}&text=${encodeURIComponent(params.text)}`;
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
    } catch (_) {}

    let cancelled = false;
    const fallback = setTimeout(() => {
      if (!cancelled) tryOpenInNewWindow(target);
    }, 850);
    const onBlur = () => {
      cancelled = true;
      clearTimeout(fallback);
      window.removeEventListener("blur", onBlur);
    };
    window.addEventListener("blur", onBlur);
    setTimeout(() => {
      window.removeEventListener("blur", onBlur);
    }, 1200);
    return;
  }

  if (!tryOpenInNewWindow(target)) {
    window.location.assign(target);
  }
}
