/**
 * Default lazy loading for <img> in the SPA. Skips images that opt out via
 * loading="eager" or fetchPriority="high" (e.g. splash logo).
 */
export function installGlobalImageLazyLoading() {
  if (typeof document === "undefined") return () => {};

  const skip = (img) => {
    if (img.getAttribute("loading") === "eager") return true;
    const fp = String(
      img.getAttribute("fetchPriority") || img.getAttribute("fetchpriority") || "",
    ).toLowerCase();
    return fp === "high";
  };

  const apply = (img) => {
    if (!img || img.nodeName !== "IMG") return;
    if (skip(img)) return;
    if (!img.hasAttribute("loading")) {
      img.loading = "lazy";
    }
    if (!img.hasAttribute("decoding")) {
      img.decoding = "async";
    }
  };

  const scan = (root) => {
    if (!root || root.nodeType !== 1) return;
    if (root.nodeName === "IMG") apply(root);
    root.querySelectorAll?.("img").forEach(apply);
  };

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes || []) {
        if (n.nodeType === 1) scan(n);
      }
    }
  });

  scan(document.body);
  obs.observe(document.body, { childList: true, subtree: true });
  return () => obs.disconnect();
}
