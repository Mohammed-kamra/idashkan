/**
 * Western (English) digit grouping for product prices everywhere in the app.
 * Using a fixed locale avoids Arabic-Indic or other numeral systems from the UI locale.
 */
const PRICE_LOCALE = "en-US";

const PRICE_OPTIONS = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
};

export function formatPriceDigits(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(PRICE_LOCALE, PRICE_OPTIONS);
}
