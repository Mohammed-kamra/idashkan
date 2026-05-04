import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { probeInternetConnectivity } from "../utils/networkProbe";

export const NetworkStatusContext = createContext(null);

/**
 * Single shared connectivity probe for the whole app (banner, MainPage retry, etc.).
 */
export function NetworkStatusProvider({ children }) {
  const [isInternetReachable, setIsInternetReachable] = useState(null);
  const probingRef = useRef(false);

  const recheck = useCallback(async () => {
    if (probingRef.current) return null;
    probingRef.current = true;
    try {
      const ok = await probeInternetConnectivity();
      setIsInternetReachable(ok);
      return ok;
    } finally {
      probingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const ok = await probeInternetConnectivity();
      if (!cancelled) setIsInternetReachable(ok);
    };

    void run();

    const onOnline = () => {
      void run();
    };
    const onOffline = () => {
      setIsInternetReachable(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (isInternetReachable !== false) return undefined;
    const POLL_MS = 8000;
    const id = window.setInterval(() => {
      void recheck();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [isInternetReachable, recheck]);

  const value = useMemo(
    () => ({ isInternetReachable, recheck }),
    [isInternetReachable, recheck],
  );

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
}
