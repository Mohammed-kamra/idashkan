/** In-memory snapshot so MainPage can restore instantly when navigating back (no full reload). */

let snapshot = null;

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

export function buildMainPagePayload({
  storesData,
  categoriesData,
  productsData,
  adsData,
  storeTypesData,
  brandsData,
  giftsData,
  jobsData,
}) {
  const vipStores = storesData
    .filter((store) => store.isVip)
    .sort((a, b) => a.name.localeCompare(b.name));
  const nonVipStores = storesData.filter((store) => !store.isVip);

  for (let i = nonVipStores.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nonVipStores[i], nonVipStores[j]] = [nonVipStores[j], nonVipStores[i]];
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
    gifts: giftsData || [],
    jobs: jobsData || [],
    productsByStore: productsMap,
    likeCounts: initialLikeCounts,
    likeStates: initialLikeStates,
    bannerAds: adsData || [],
  };
}
