/**
 * Profile page horizontal shortcuts — admin picks subset in Customization.
 * IDs must stay in sync with server `themeController` ALLOWED_PROFILE_SHORTCUT_IDS.
 */
export const PROFILE_SHORTCUT_CATALOG = [
  { id: "home", path: "/", labelKey: "Home" },
  { id: "search", path: "/search", labelKey: "Search" },
  { id: "categories", path: "/categories", labelKey: "Categories" },
  { id: "reels", path: "/reels", labelKey: "Reels" },
  { id: "favourites", path: "/favourites", labelKey: "Favourites" },
  { id: "stores", path: "/stores", labelKey: "Stores" },
  { id: "gifts", path: "/gifts", labelKey: "Gifts" },
  { id: "shopping", path: "/shopping", labelKey: "Shopping" },
  { id: "brands", path: "/brands", labelKey: "Brands" },
  { id: "companies", path: "/companies", labelKey: "Companies" },
  { id: "findjob", path: "/findjob", labelKey: "Find Job" },
];

export const DEFAULT_PROFILE_SHORTCUT_IDS = [
  "brands",
  "companies",
  "findjob",
  "categories",
  "stores",
  "gifts",
  "search",
  "reels",
];

const ALLOWED_IDS = new Set(PROFILE_SHORTCUT_CATALOG.map((x) => x.id));

/** Client-side normalize (matches server order filter + dedupe). */
export function normalizeProfileShortcutIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [...DEFAULT_PROFILE_SHORTCUT_IDS];
  }
  const seen = new Set();
  const out = [];
  for (const raw of ids) {
    const id = String(raw || "").trim();
    if (!ALLOWED_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 12) break;
  }
  return out.length === 0 ? [...DEFAULT_PROFILE_SHORTCUT_IDS] : out;
}
