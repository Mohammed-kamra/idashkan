import {
  storeAPI,
  categoryAPI,
  fetchAllProducts,
  adAPI,
  storeTypeAPI,
  brandAPI,
  companyAPI,
  giftAPI,
  jobAPI,
} from "../services/api";
import {
  buildMainPagePayload,
  writeMainPageCache,
} from "../utils/mainPageCache";

/** Primary homepage bundle: stores, taxonomy, products, hero ads, store types. */
export async function fetchMainPagePrimary() {
  const [
    storesResponse,
    categoriesResponse,
    productsResponse,
    adsResponse,
    storeTypesResponse,
  ] = await Promise.all([
    storeAPI.getAll(),
    categoryAPI.getAll(),
    fetchAllProducts(),
    adAPI.getAll({ page: "home" }),
    storeTypeAPI.getAll(),
  ]);

  return {
    storesData: storesResponse.data,
    categoriesData: categoriesResponse.data,
    productsData: productsResponse,
    adsData: adsResponse.data || [],
    storeTypesData: storeTypesResponse?.data || [],
  };
}

/** Secondary bundle: below-the-fold / showcase-heavy lists (smaller JSON). */
export async function fetchMainPageSecondary() {
  const [brandsResponse, companiesResponse, giftsResponse, jobsResponse] =
    await Promise.all([
      brandAPI.getAll(),
      companyAPI.getAll().catch(() => ({ data: [] })),
      giftAPI.getAll().catch(() => ({ data: { data: [] } })),
      jobAPI.getAll().catch(() => ({ data: [] })),
    ]);

  const giftsData = Array.isArray(giftsResponse.data?.data)
    ? giftsResponse.data.data
    : Array.isArray(giftsResponse.data)
      ? giftsResponse.data
      : [];
  const jobsData = Array.isArray(jobsResponse.data) ? jobsResponse.data : [];

  return {
    brandsData: brandsResponse.data || [],
    companiesData: companiesResponse.data || [],
    giftsData,
    jobsData,
  };
}

export const mainPageQueryKeys = {
  primary: (refreshKey) => ["mainPage", "primary", refreshKey],
  secondary: (refreshKey) => ["mainPage", "secondary", refreshKey],
  /** Full built payload (stores order, products map, banner ads, etc.) */
  hydrated: (refreshKey) => ["mainPage", "hydrated", refreshKey],
};

const emptySecondary = {
  brandsData: [],
  companiesData: [],
  giftsData: [],
  jobsData: [],
};

/**
 * Staged network fetch + single built payload. Callers apply to React state.
 * Optionally primes TanStack Query + session-style disk cache.
 */
export async function fetchMainPageFullBundle({
  refreshKey,
  queryClient,
  onPhase1Payload,
} = {}) {
  const primary = await fetchMainPagePrimary();
  if (queryClient) {
    queryClient.setQueryData(mainPageQueryKeys.primary(refreshKey), primary);
  }

  const payloadPartial = buildMainPagePayload({
    storesData: primary.storesData,
    categoriesData: primary.categoriesData,
    productsData: primary.productsData,
    adsData: primary.adsData,
    storeTypesData: primary.storeTypesData,
    ...emptySecondary,
  });
  if (typeof onPhase1Payload === "function") {
    onPhase1Payload(payloadPartial);
  }

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  let secondary = emptySecondary;
  try {
    secondary = await fetchMainPageSecondary();
    if (queryClient) {
      queryClient.setQueryData(
        mainPageQueryKeys.secondary(refreshKey),
        secondary,
      );
    }
  } catch (e2) {
    console.warn("MainPage secondary bundle failed:", e2);
  }

  const fullPayload = buildMainPagePayload({
    storesData: primary.storesData,
    categoriesData: primary.categoriesData,
    productsData: primary.productsData,
    adsData: primary.adsData,
    storeTypesData: primary.storeTypesData,
    brandsData: secondary.brandsData,
    companiesData: secondary.companiesData,
    giftsData: secondary.giftsData,
    jobsData: secondary.jobsData,
  });

  writeMainPageCache(refreshKey, fullPayload);
  if (queryClient) {
    queryClient.setQueryData(
      mainPageQueryKeys.hydrated(refreshKey),
      fullPayload,
    );
  }
  return fullPayload;
}
