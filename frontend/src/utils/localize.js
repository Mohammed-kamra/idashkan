/**
 * Content language for API fields: primary `name` / `description` / `title` plus
 * camelCase `nameEn`, `nameAr`, `nameKu` (and same for description/title).
 *
 * @param {'normal'|'en'|'ar'|'ku'} dataLang - `normal` = primary/source field only
 */

/** Ensures UI never receives a plain object as React text (avoids invariant #31). */
function coalesceLocalizedScalar(val) {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return "";
}

export function getLocalizedField(item, field, dataLang = "normal") {
  if (!item) return "";
  const primary = item[field];

  if (
    typeof primary === "object" &&
    primary !== null &&
    !Array.isArray(primary) &&
    (primary.en != null || primary.ar != null || primary.ku != null)
  ) {
    if (dataLang === "normal" || !dataLang) {
      return coalesceLocalizedScalar(
        primary.en ?? primary.ar ?? primary.ku ?? "",
      );
    }
    const key =
      dataLang === "en" ? "en" : dataLang === "ar" ? "ar" : "ku";
    return coalesceLocalizedScalar(
      primary[key] ?? primary.en ?? primary.ar ?? primary.ku ?? "",
    );
  }

  if (dataLang === "normal" || !dataLang) {
    if (typeof primary === "string") return primary;
    return primary != null ? String(primary) : "";
  }

  const suffix = dataLang === "en" ? "En" : dataLang === "ar" ? "Ar" : "Ku";
  const camelKey = `${field}${suffix}`;
  let loc = item[camelKey];
  if (loc != null && String(loc).trim() !== "") return String(loc).trim();

  const snakeKey = `${field}_${dataLang}`;
  if (item[snakeKey] != null && String(item[snakeKey]).trim() !== "") {
    return String(item[snakeKey]).trim();
  }

  if (typeof primary === "string") return primary;
  return primary != null ? String(primary) : "";
}

/**
 * Primary + en + ar + ku variants of a field, deduplicated case-insensitively.
 * Use for search so queries match regardless of UI/data language.
 */
export function getAllLocalizedFieldValues(item, field) {
  if (!item) return [];
  const langs = ["normal", "en", "ar", "ku"];
  const seen = new Set();
  const out = [];
  for (const dataLang of langs) {
    const v = getLocalizedField(
      item,
      field,
      dataLang === "normal" ? "normal" : dataLang,
    );
    const s = v != null ? String(v).trim() : "";
    if (!s) continue;
    const k = s.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  return out;
}

/**
 * Legacy: map i18n UI language code to a content variant (used where UI lang
 * used to drive content). Prefer {@link getLocalizedField} + DataLanguageContext.
 */
export const getLocalizedName = (item, field = "name", lang) => {
  const map = { en: "en", ar: "ar", ku: "ku", ckb: "ku" };
  const dataLang = map[lang] || "normal";
  return getLocalizedField(item, field, dataLang);
};
