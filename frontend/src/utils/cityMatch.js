/** Align with MainPage / reels city filtering (aliases + case-insensitive). */

const cityCanonicalMap = {
  erbil: "erbil",
  hawler: "erbil",
  hewler: "erbil",
  sulaimani: "sulaimani",
  sulaymaniyah: "sulaimani",
  sulaimany: "sulaimani",
  duhok: "duhok",
  dahuk: "duhok",
  kerkuk: "kerkuk",
  kirkuk: "kerkuk",
  halabja: "halabja",
  helebce: "halabja",
};

export function toCanonicalCity(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return cityCanonicalMap[normalized] || normalized;
}

export function cityStringsMatch(a, b) {
  return toCanonicalCity(a) === toCanonicalCity(b);
}

/**
 * Whether an entity with `storecity` / `city` and optional delivery fields should appear
 * in the given city context (stores, brands, companies).
 */
export function storeMatchesSelectedCity(store, selectedCity) {
  const sel = toCanonicalCity(selectedCity);
  if (!sel) return true;
  const physical = toCanonicalCity(store?.storecity || store?.city || "");
  if (physical === sel) return true;
  if (!store?.isHasDelivery) return false;
  if (store.deliveryAllCities === true) return true;
  const dc = store?.deliveryCities;
  if (Array.isArray(dc) && dc.length > 0) {
    return dc.some((c) => toCanonicalCity(c) === sel);
  }
  return false;
}

/**
 * City filter for a product when `storeId` may be a populated store (delivery-aware)
 * or only an id (use fallback city string).
 */
export function productStoreMatchesCity(product, selectedCity, getFallbackCityString) {
  const st = product?.storeId;
  if (st && typeof st === "object" && st !== null) {
    const hasPhysical = String(st.storecity || st.city || "").trim() !== "";
    const hasDeliveryConfig =
      st.isHasDelivery === true ||
      st.deliveryAllCities === true ||
      (Array.isArray(st.deliveryCities) && st.deliveryCities.length > 0);
    if (hasPhysical || hasDeliveryConfig) {
      return storeMatchesSelectedCity(st, selectedCity);
    }
  }
  const fb = getFallbackCityString ? getFallbackCityString(product) : "";
  return cityStringsMatch(selectedCity, fb || "");
}
