export function resolveMediaUrl(url) {
  if (url == null || url === "") return "";
  const s = String(url).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  const base = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return base ? `${base}${path}` : path;
}

export const normalizeImage = resolveMediaUrl;

