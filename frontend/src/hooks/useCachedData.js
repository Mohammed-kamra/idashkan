import { useEffect, useMemo, useState } from "react";
import { STORES, idbGetAll } from "../offline/indexedDb";

export default function useCachedData(dataset) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const matcher = useMemo(() => new RegExp(`/${dataset}(\\?|$|/)`), [dataset]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const all = await idbGetAll(STORES.apiCache);
      const filtered = all
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
      const deduped = Array.from(
        new Map(
          filtered.map((item, idx) => [String(item?._id || `idx-${idx}`), item])
        ).values()
      );
      if (mounted) {
        setItems(deduped);
        setLoading(false);
      }
    };
    load().catch(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [matcher]);

  return { items, loading };
}
