import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const MAIN_PAGE_SCROLL_KEY = "mainPage.scrollY.v1";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;

    // Save the current home scroll before leaving `/`.
    if (previousPathname === "/" && pathname !== "/") {
      try {
        sessionStorage.setItem(
          MAIN_PAGE_SCROLL_KEY,
          String(window.scrollY || window.pageYOffset || 0),
        );
      } catch {
        // ignore
      }
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
