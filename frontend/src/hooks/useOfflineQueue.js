import { useEffect, useState } from "react";
import { getOfflineQueueEventName, getQueueStats } from "../offline/offlineQueue";

export default function useOfflineQueue() {
  const [stats, setStats] = useState({ total: 0, pending: 0, failed: 0 });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const next = await getQueueStats();
      if (mounted) setStats(next);
    };
    load().catch(() => {});

    const eventName = getOfflineQueueEventName();
    const onQueueUpdate = () => load().catch(() => {});
    window.addEventListener(eventName, onQueueUpdate);
    return () => {
      mounted = false;
      window.removeEventListener(eventName, onQueueUpdate);
    };
  }, []);

  return stats;
}
