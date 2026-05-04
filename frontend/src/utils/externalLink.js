/**
 * WebView-safe external navigation: avoid trapping Facebook, Maps, WhatsApp, etc. inside the shell.
 * Prefer programmatic use via openExternal(); global capture listener installed by useExternalLinkInterceptor.
 */

/** Backend hostname allowed as “internal” if linked directly (rare). */
const DEFAULT_INTERNAL_EXTRA_HOSTS = ["idashkan-production.up.railway.app"];

/** Domains where assigning location is preferred over window.open (deep links & maps). */
const FORCE_LOCATION_SUBSTRINGS = [
  "wa.me/",
  "whatsapp.com",
  "api.whatsapp.com",
  "maps.google.",
  "google.com/maps",
  "maps.app.goo.gl",
  "goo.gl/maps",
  "facebook.com",
  "fb.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "linkedin.com",
  "youtube.com",
  "youtu.be",
  "snapchat.com",
  "pinterest.com",
  "reddit.com",
  "threads.net",
  "t.me/",
  "telegram.me",
];

function normalizeHost(hostname) {
  return String(hostname || "")
    .toLowerCase()
    .replace(/^www\./, "");
}

function parseExtraHostsFromEnv() {
  const raw = (import.meta.env.VITE_INTERNAL_LINK_HOSTS || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => normalizeHost(s.trim()))
    .filter(Boolean);
}

/**
 * Hostnames considered same-site for SPA navigation (no external handoff).
 */
export function getInternalHostnameSet() {
  const set = new Set();
  if (typeof window !== "undefined" && window.location?.hostname) {
    set.add(normalizeHost(window.location.hostname));
  }
  for (const h of DEFAULT_INTERNAL_EXTRA_HOSTS) {
    set.add(normalizeHost(h));
  }
  for (const h of parseExtraHostsFromEnv()) {
    set.add(h);
  }
  set.add("localhost");
  set.add("127.0.0.1");
  set.add("::1");
  return set;
}

function hostnameIsAllowedInternal(hostname) {
  const h = normalizeHost(hostname);
  if (!h) return false;
  const allowed = getInternalHostnameSet();
  if (allowed.has(h)) return true;
  return false;
}

/**
 * True when the URL should leave the WebView / open with system handlers.
 */
export function isExternalUrl(rawUrl) {
  if (typeof rawUrl !== "string") return false;
  const t = rawUrl.trim();
  if (!t) return false;
  if (t.startsWith("#")) return false;
  const lower = t.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return false;

  if (
    lower.startsWith("tel:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("whatsapp:") ||
    lower.startsWith("sms:") ||
    lower.startsWith("geo:") ||
    lower.startsWith("maps:") ||
    lower.startsWith("viber:") ||
    lower.startsWith("tg:")
  ) {
    return true;
  }

  if (typeof window === "undefined") return false;

  let resolved;
  try {
    resolved = new URL(t, window.location.href);
  } catch {
    return false;
  }

  if (resolved.protocol === "file:") return false;

  const host = resolved.hostname;
  if (!host) return false;

  if (hostnameIsAllowedInternal(host)) return false;

  const origin = window.location.origin;
  try {
    if (resolved.origin === origin) return false;
  } catch {
    /* ignore */
  }

  return true;
}

function shouldUseLocationNavigation(url) {
  const lower = String(url).toLowerCase();
  if (
    /^tel:|^mailto:|^whatsapp:|^sms:|^geo:|^maps:|^viber:|^tg:/.test(lower)
  ) {
    return true;
  }
  for (const sub of FORCE_LOCATION_SUBSTRINGS) {
    if (lower.includes(sub)) return true;
  }
  return false;
}

/**
 * Opens an external URL: tries a new browsing context first when appropriate, then falls back safely.
 * @param {string} url
 */
export function openExternal(url) {
  const u = String(url || "").trim();
  if (!u || u.toLowerCase().startsWith("javascript:")) return;

  if (shouldUseLocationNavigation(u)) {
    try {
      window.location.href = u;
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    const w = window.open(u, "_blank", "noopener,noreferrer");
    if (w == null || typeof w.closed === "undefined" || w.closed) {
      window.location.href = u;
    }
  } catch {
    try {
      window.location.href = u;
    } catch {
      /* ignore */
    }
  }
}
