/** Session keys for MainPage window scroll + tab (shared with BottomNavigation, NavigationBar). */
export const MAIN_PAGE_SCROLL_KEY = "mainPage.scrollY.v1";
export const MAIN_PAGE_SCROLL_STATE_KEY = "mainPage.scrollState.v1";

/** Scroll to top (window + documentElement/body for WebViews). */
export function scrollWindowToTop(behavior = "auto") {
  const top = 0;
  try {
    window.scrollTo({ top, left: 0, behavior });
  } catch {
    window.scrollTo(0, top);
  }
  try {
    if (document.documentElement) document.documentElement.scrollTop = top;
    if (document.body) document.body.scrollTop = top;
  } catch {
    /* ignore */
  }
}

/**
 * Clear saved scroll Y and displayedCount; keep For You / Following tab when valid.
 * Used after full reload and after nav "refresh" so remount does not restore old Y.
 */
export function resetMainPageScrollPositionInSession() {
  try {
    sessionStorage.removeItem(MAIN_PAGE_SCROLL_KEY);
    const rawState = sessionStorage.getItem(MAIN_PAGE_SCROLL_STATE_KEY);
    if (!rawState) return;
    const parsed = JSON.parse(rawState);
    const tab = Number(parsed?.tab);
    sessionStorage.setItem(
      MAIN_PAGE_SCROLL_STATE_KEY,
      JSON.stringify({
        y: 0,
        tab: Number.isFinite(tab) && tab >= 0 && tab <= 1 ? tab : 0,
        displayedCount: 0,
      }),
    );
  } catch {
    try {
      sessionStorage.removeItem(MAIN_PAGE_SCROLL_STATE_KEY);
    } catch {
      /* ignore */
    }
  }
}
