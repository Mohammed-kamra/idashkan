import i18n from "./i18n";
import { translationAPI } from "./services/api";

/**
 * Merges database translation overrides into the default `translation` namespace.
 * Safe to call after login or when an admin saves strings.
 */
export async function mergeRemoteTranslations() {
  try {
    // Avoid waiting on the global axios timeout (45s) when the API is down or misconfigured.
    const res = await Promise.race([
      translationAPI.getAll(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("translations fetch timeout")), 8000),
      ),
    ]);
    const rows = res.data?.data;
    if (!Array.isArray(rows) || rows.length === 0) return;

    const en = {};
    const ar = {};
    const ku = {};
    for (const row of rows) {
      const k = row.key;
      if (!k || typeof k !== "string") continue;
      if (row.en) en[k] = row.en;
      if (row.ar) ar[k] = row.ar;
      if (row.ku) ku[k] = row.ku;
    }
    if (Object.keys(en).length > 0) {
      i18n.addResourceBundle("en", "translation", en, true, true);
    }
    if (Object.keys(ar).length > 0) {
      i18n.addResourceBundle("ar", "translation", ar, true, true);
    }
    if (Object.keys(ku).length > 0) {
      i18n.addResourceBundle("ku", "translation", ku, true, true);
    }
  } catch (e) {
    console.warn("[translations] merge failed:", e?.message || e);
  }
}
