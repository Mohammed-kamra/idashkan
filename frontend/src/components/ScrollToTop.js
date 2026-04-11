import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scroll non-home routes to top on enter.
 * Home (`/`) scroll is saved/restored by MainPage (layout unmount + sessionStorage).
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === "/") return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
