import { useNetworkStatus } from "./useNetworkStatus";

/**
 * Backward-compatible "online" flag: `false` only when a real connectivity probe failed.
 * Prefer `useNetworkStatus()` when you need `recheck` or tristate `null` (unknown).
 */
export default function useOnlineStatus() {
  const { isInternetReachable } = useNetworkStatus();
  if (isInternetReachable === false) return false;
  return true;
}
