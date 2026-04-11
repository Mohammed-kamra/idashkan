/** In-memory snapshot so MainPage can restore instantly when navigating back (no full reload). */

let snapshot = null;

/**
 * Fisher–Yates shuffle only once per full browser reload (`navigation.type === 'reload'`).
 * `performance` keeps that type for the whole tab session, so we consume after the first
 * shuffled build; later fetches (silent refresh, city change) use stable order.
 */
let reloadShuffleConsumed = false;

function defaultShuffleNonVipForThisBuild() {
  if (typeof performance === "undefined") return false;
  const nav = performance.getEntriesByType?.("navigation")?.[0];
  if (!nav || nav.type !== "reload") return false;
  if (reloadShuffleConsumed) return false;
  reloadShuffleConsumed = true;
  return true;
}

/**
 * @param {number} refreshKey - from ContentRefreshContext; bump invalidates cache
 */
export function readMainPageCache(refreshKey) {
  if (snapshot == null || snapshot.refreshKey !== refreshKey) return null;
  return snapshot.payload;
}

export function writeMainPageCache(refreshKey, payload) {
  snapshot = { refreshKey, payload };
}

/**
 * @param {object} data - API / cache blobs
 * @param {{ shuffleNonVip?: boolean }} [options] - pass `shuffleNonVip: false` for deterministic order; omit to use reload-only default
 */
export function buildMainPagePayload(
  {
    storesData,
    categoriesData,
    productsData,
    adsData,
    storeTypesData,
    brandsData,
    companiesData,
    giftsData,
    jobsData,
  },
  options = {},
) {
  const vipStores = storesData
    .filter((store) => store.isVip)
    .sort((a, b) => a.name.localeCompare(b.name));
  const nonVipStores = storesData.filter((store) => !store.isVip);

  const shuffleNonVip =
    options.shuffleNonVip !== undefined
      ? options.shuffleNonVip
      : defaultShuffleNonVipForThisBuild();

  if (shuffleNonVip) {
    for (let i = nonVipStores.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonVipStores[i], nonVipStores[j]] = [nonVipStores[j], nonVipStores[i]];
    }
  } else {
    nonVipStores.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      }),
    );
  }

  const shuffledStores = [...vipStores, ...nonVipStores];

  const productsMap = {};
  const initialLikeCounts = {};
  const initialLikeStates = {};
  productsData.forEach((product) => {
    if (!productsMap[product.storeId]) {
      productsMap[product.storeId] = [];
    }
    productsMap[product.storeId].push(product);
    initialLikeCounts[product._id] = product.likeCount || 0;
    initialLikeStates[product._id] = false;
  });

  return {
    stores: shuffledStores,
    allCategories: categoriesData,
    allProducts: productsData,
    storeTypes: storeTypesData || [],
    brands: brandsData || [],
    companies: companiesData || [],
    gifts: giftsData || [],
    jobs: jobsData || [],
    productsByStore: productsMap,
    likeCounts: initialLikeCounts,
    likeStates: initialLikeStates,
    bannerAds: adsData || [],
  };
}
