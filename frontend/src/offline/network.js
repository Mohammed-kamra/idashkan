export function isOnlineNow() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function buildCacheKey(config = {}) {
  const base = config.baseURL || "";
  const url = `${base}${config.url || ""}`;
  const params = config.params ? JSON.stringify(config.params) : "";
  return `${(config.method || "get").toLowerCase()}::${url}::${params}`;
}
