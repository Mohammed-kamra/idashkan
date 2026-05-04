import { useContext } from "react";
import { NetworkStatusContext } from "../context/NetworkStatusContext";

/**
 * Reliable-ish connectivity for WebView: shared state via NetworkStatusProvider.
 * - `isInternetReachable`: null = not checked yet, false = probe failed, true = ok
 */
export function useNetworkStatus() {
  const ctx = useContext(NetworkStatusContext);
  if (ctx == null) {
    throw new Error(
      "useNetworkStatus must be used within NetworkStatusProvider (see App.js).",
    );
  }
  return ctx;
}

export default useNetworkStatus;
