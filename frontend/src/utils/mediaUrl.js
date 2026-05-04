import { getResolvedBackendOrigin } from "../config/backendUrl";

/**
 * Resolves product/brand/store/ad image URLs for display.
 * Supports full R2/CDN URLs (https://...) and relative API paths (/uploads/...).
 */
export function resolveMediaUrl(url) {
  if (url == null || url === "") return "";
  const s = String(url).trim();
  if (/^https?:\/\//i.test(s)) {
    if (
      import.meta.env.PROD &&
      /^http:\/\//i.test(s) &&
      typeof window !== "undefined" &&
      window.location?.protocol === "https:"
    ) {
      // eslint-disable-next-line no-console
      console.warn("[mediaUrl] Insecure image URL on HTTPS page:", s);
    }
    return s;
  }
  if (s.startsWith("//")) return `https:${s}`;
  const base = getResolvedBackendOrigin().replace(/\/$/, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return base ? `${base}${path}` : path;
}

/** Same as resolveMediaUrl — alias for job/card image fields */
export const normalizeImage = resolveMediaUrl;
