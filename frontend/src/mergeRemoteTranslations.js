import i18n from "./i18n";
import { translationAPI } from "./services/api";

/**
 * Merges database translation overrides into the default `translation` namespace.
 * Bundled strings in `i18nResources` are always the baseline; DB rows are layered on top.
 * If the DB is empty or unreachable, the app still uses bundled strings.
 */
async function fetchTranslationRowsOnce() {
  const res = await Promise.race([
    translationAPI.getAll(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("translations fetch timeout")), 8000),
    ),
  ]);
  return res.data?.data;
}

export async function mergeRemoteTranslations() {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
      const rows = await fetchTranslationRowsOnce();
      if (!Array.isArray(rows) || rows.length === 0) {
        console.warn(
          "[translations] no rows from API; using bundled i18nResources only. To repopulate DB: node scripts/seed-i18n-to-mongo.js",
        );
        return;
      }

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
      return;
    } catch (e) {
      lastErr = e;
      console.warn(
        `[translations] merge attempt ${attempt + 1} failed:`,
        e?.message || e,
      );
    }
  }
  console.warn(
    "[translations] using bundled i18nResources only after failed merge:",
    lastErr?.message || lastErr,
  );
}
