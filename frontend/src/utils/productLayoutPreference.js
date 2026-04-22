const STORAGE_KEY = "app.productLayout.v1";

/** @returns {"row"|"grid2"} */
export function getSavedProductLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "grid2" ? "grid2" : "row";
  } catch {
    return "row";
  }
}

/** @param {"row"|"grid2"} layout */
export function saveProductLayout(layout) {
  try {
    localStorage.setItem(STORAGE_KEY, layout === "grid2" ? "grid2" : "row");
  } catch {
    /* ignore quota / private mode */
  }
}
