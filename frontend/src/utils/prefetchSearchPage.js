let inflight = null;

/** Warm the SearchPage lazy chunk (same module as App.js route). Safe to call repeatedly. */
export function prefetchSearchPageChunk() {
  if (typeof window === "undefined") return;
  if (inflight) return inflight;
  inflight = import("../pages/SearchPage")
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function schedulePrefetchSearchPageWhenIdle() {
  if (typeof window === "undefined") return;
  const run = () => prefetchSearchPageChunk();
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    window.setTimeout(run, 2500);
  }
}
