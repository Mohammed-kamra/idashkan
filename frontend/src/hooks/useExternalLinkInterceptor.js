import { useEffect } from "react";
import { isExternalUrl, openExternal } from "../utils/externalLink";

/**
 * Captures clicks on `<a href>` so external targets leave the WebView instead of replacing the SPA.
 * Uses capture phase so it runs before React Router / default navigation.
 */
export function useExternalLinkInterceptor(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return undefined;

    const onClickCapture = (event) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;

      const target = event.target;
      if (!target || typeof target.closest !== "function") return;

      const a = target.closest("a[href]");
      if (!a) return;

      if (a.hasAttribute("download")) return;

      const hrefAttr = a.getAttribute("href");
      if (
        !hrefAttr ||
        hrefAttr.trim() === "" ||
        hrefAttr.startsWith("#") ||
        hrefAttr.toLowerCase().startsWith("javascript:")
      ) {
        return;
      }

      let resolvedUrl = "";
      try {
        resolvedUrl = a.href;
      } catch {
        return;
      }

      if (!isExternalUrl(resolvedUrl)) return;

      event.preventDefault();
      event.stopPropagation();
      openExternal(resolvedUrl);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [enabled]);
}

export default useExternalLinkInterceptor;
