/**
 * Pull-to-refresh was removed from the UI. This hook remains as a no-op so any
 * lingering references (or merged branches) do not trigger eslint no-undef.
 */
export function usePullToRefresh(_onRefresh) {
  // intentionally empty
}
