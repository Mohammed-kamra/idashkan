import { useEffect, useState } from "react";
import { STORES, idbGetAll } from "../offline/indexedDb";

function matcherForDataset(dataset) {
  const escaped = dataset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`/${escaped}(\\?|$|/)`);
}

/** Process one API cache store snapshot for a single dataset (URL segment after /). */
export function extractDatasetItems(allEntries, dataset) {
  const matcher = matcherForDataset(dataset);
  const filtered = allEntries
    .filter((entry) => matcher.test(entry.url || ""))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .map((entry) => {
      const payload = entry.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (payload && typeof payload === "object") return [payload];
      return [];
    })
    .flat();
  return Array.from(
    new Map(
      filtered.map((item, idx) => [String(item?._id || `idx-${idx}`), item]),
    ).values(),
  );
}

/**
 * Read several offline datasets with a single IndexedDB read (avoids N× full cache scans).
 * Pass a stable array reference (e.g. module-level constant) when possible.
 */
export function useCachedDatasets(datasetKeys) {
  const keysSig = JSON.stringify([...(datasetKeys || [])].sort());
  const [itemsByDataset, setItemsByDataset] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const keys = keysSig ? JSON.parse(keysSig) : [];
    if (keys.length === 0) {
      setItemsByDataset({});
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const load = async () => {
      setLoading(true);
      try {
        const all = await idbGetAll(STORES.apiCache);
        const next = {};
        for (const k of keys) {
          next[k] = extractDatasetItems(all, k);
        }
        if (mounted) {
          setItemsByDataset(next);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [keysSig]);

  return { itemsByDataset, loading };
}

export default function useCachedData(dataset) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const all = await idbGetAll(STORES.apiCache);
        const deduped = extractDatasetItems(all, dataset);
        if (mounted) {
          setItems(deduped);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [dataset]);

  return { items, loading };
}
