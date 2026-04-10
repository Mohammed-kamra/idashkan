import { STORES, idbGet, idbGetAll, idbSet } from "../offline/indexedDb";
import { getCacheRule, getTtlForPath } from "../offline/cachePolicy";
import { buildCacheKey } from "../offline/network";

export async function saveApiCache(config, payload) {
  const key = buildCacheKey(config);
  const now = Date.now();
  await idbSet(STORES.apiCache, {
    key,
    data: payload,
    updatedAt: now,
    url: config.url || "",
  });
}

export async function getApiCache(config) {
  const key = buildCacheKey(config);
  const item = await idbGet(STORES.apiCache, key);
  if (!item) return null;
  const ttlMs = getTtlForPath(config.url, 2 * 60 * 60 * 1000);
  const age = Date.now() - (item.updatedAt || 0);
  const stale = age > ttlMs;
  return { ...item, stale };
}

export async function pruneApiCache() {
  const all = await idbGetAll(STORES.apiCache);
  const grouped = new Map();
  for (const entry of all) {
    const rule = getCacheRule(entry.url || "");
    const groupName = rule?.name || "default";
    if (!grouped.has(groupName)) grouped.set(groupName, []);
    grouped.get(groupName).push({ entry, rule });
  }

  // Keep latest N entries per dataset to control mobile storage pressure.
  await Promise.all(
    Array.from(grouped.values()).map(async (items) => {
      const maxEntries = items[0]?.rule?.maxEntries || 200;
      items.sort((a, b) => (b.entry.updatedAt || 0) - (a.entry.updatedAt || 0));
      const toRemove = items.slice(maxEntries);
      for (const item of toRemove) {
        await indexedDBDelete(item.entry.key);
      }
    })
  );
}

async function indexedDBDelete(key) {
  const { idbDelete } = await import("../offline/indexedDb");
  await idbDelete(STORES.apiCache, key);
}
