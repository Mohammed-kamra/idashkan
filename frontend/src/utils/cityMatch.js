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
