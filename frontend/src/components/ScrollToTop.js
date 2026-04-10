import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const MAIN_PAGE_SCROLL_KEY = "mainPage.scrollY.v1";
const MAIN_PAGE_SCROLL_STATE_KEY = "mainPage.scrollState.v1";

function persistMainPageScrollState(y) {
  try {
    const rawState = sessionStorage.getItem(MAIN_PAGE_SCROLL_STATE_KEY);
    const parsed = rawState ? JSON.parse(rawState) : {};
    sessionStorage.setItem(MAIN_PAGE_SCROLL_KEY, String(y));
    sessionStorage.setItem(
      MAIN_PAGE_SCROLL_STATE_KEY,
      JSON.stringify({
        y,
        tab: Number.isFinite(Number(parsed?.tab)) ? Number(parsed.tab) : 0,
        displayedCount: Number.isFinite(Number(parsed?.displayedCount))
          ? Number(parsed.displayedCount)
          : 0,
      }),
    );
  } catch {
    // ignore
  }
}

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;

    // Save the current home scroll before leaving `/`.
    if (previousPathname === "/" && pathname !== "/") {
      persistMainPageScrollState(window.scrollY || window.pageYOffset || 0);
    }

    // MainPage manages its own scroll restoration when entering `/`.
    if (pathname === "/") {
      previousPathnameRef.current = pathname;
      return;
    }

    window.scrollTo(0, 0);

    previousPathnameRef.current = pathname;
  }, [pathname]);

  return null;
};

export default ScrollToTop;
