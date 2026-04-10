const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const RULES = [
  { name: "products", match: /\/products(\?|$|\/)/, ttlMs: 6 * HOUR, maxEntries: 1500 },
  { name: "stores", match: /\/stores(\?|$|\/)/, ttlMs: 12 * HOUR, maxEntries: 500 },
  { name: "banners", match: /\/ads(\?|$|\/)/, ttlMs: 3 * HOUR, maxEntries: 150 },
  { name: "categories", match: /\/categories(\?|$|\/)/, ttlMs: 3 * DAY, maxEntries: 200 },
  { name: "jobs", match: /\/jobs(\?|$|\/)/, ttlMs: 6 * HOUR, maxEntries: 800 },
  { name: "reels", match: /\/videos(\?|$|\/)/, ttlMs: 2 * HOUR, maxEntries: 600 },
  { name: "profile", match: /\/auth\/profile(\?|$|\/)/, ttlMs: 30 * 60 * 1000, maxEntries: 5 },
];

export function getCacheRule(urlOrPath) {
  const path = typeof urlOrPath === "string" ? urlOrPath : "";
  return RULES.find((r) => r.match.test(path)) || null;
}

export function getTtlForPath(urlOrPath, fallback = 2 * HOUR) {
  const rule = getCacheRule(urlOrPath);
  return rule?.ttlMs ?? fallback;
}

export function isCacheableRead(config = {}) {
  const method = (config.method || "get").toLowerCase();
  return method === "get";
}

export function isQueueableWrite(config = {}) {
  const method = (config.method || "get").toLowerCase();
  return ["post", "put", "patch", "delete"].includes(method);
}

export function shouldUseNetworkFirst(config = {}) {
  const url = config.url || "";
  return /\/auth\/profile(\?|$|\/)|\/users\//.test(url);
}

export function getAllCacheRules() {
  return RULES;
}
