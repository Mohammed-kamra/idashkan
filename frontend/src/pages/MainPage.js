import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  CardMedia,
  Typography,
  Button,
  Box,
  Chip,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Tabs,
  Tab,
  Skeleton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Link, useNavigate } from "react-router-dom";
import {
  storeAPI,
  productAPI,
  categoryAPI,
  adAPI,
  storeTypeAPI,
  brandAPI,
  companyAPI,
  giftAPI,
  jobAPI,
} from "../services/api";
import StorefrontIcon from "@mui/icons-material/Storefront";
import BusinessIcon from "@mui/icons-material/Business";
import CategoryIcon from "@mui/icons-material/Category";
import SearchIcon from "@mui/icons-material/Search";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import VisibilityIcon from "@mui/icons-material/Visibility";
import StarIcon from "@mui/icons-material/Star";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PersonAddDisabledIcon from "@mui/icons-material/PersonAddDisabled";
import Loader from "../components/Loader";
import BrandShowcase from "../components/BrandShowcase";
import CompanyShowcase from "../components/CompanyShowcase";
import StoreShowcase from "../components/StoreShowcase";
import GiftShowcase from "../components/GiftShowcase";
import FindJobShowcase from "../components/FindJobShowcase";
import FullScreenImageModal from "../components/FullScreenImageModal";
import BannerCarousel from "../components/BannerCarousel";
import FilterChips from "../components/FilterChips";
import StoreGroupSection from "../components/StoreGroupSection";
import FlashDealsSection from "../components/FlashDealsSection";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import { useUserTracking } from "../hooks/useUserTracking";
import { useCityFilter } from "../context/CityFilterContext";
import useIsMobileLayout from "../hooks/useIsMobileLayout";
import { resolveMediaUrl } from "../utils/mediaUrl";
import {
  isExpiryStillValid,
  getExpiryRemainingInfo,
  formatExpiryChipLabel,
  expiryChipBg,
  formatExpiryDateDdMmYyyy,
} from "../utils/expiryDate";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { useContentRefresh } from "../context/ContentRefreshContext";
import {
  readMainPageCache,
  writeMainPageCache,
  buildMainPagePayload,
} from "../utils/mainPageCache";
import { useCachedDatasets } from "../hooks/useCachedData";
import useOnlineStatus from "../hooks/useOnlineStatus";
import OfflineCacheChip from "../components/OfflineCacheChip";

const MAIN_PAGE_SCROLL_KEY = "mainPage.scrollY.v1";
const MAIN_PAGE_SCROLL_STATE_KEY = "mainPage.scrollState.v1";

/** Restore For You / Following tab from session before first paint (must not run in scroll restore effect — that aborted async scroll). */
function getInitialMainPageTabFromSession() {
  try {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      const rawState = sessionStorage.getItem(MAIN_PAGE_SCROLL_STATE_KEY);
      if (rawState) {
        const tab = Number(JSON.parse(rawState).tab);
        if (Number.isFinite(tab) && tab >= 0 && tab <= 1) return tab;
      }
    }
  } catch {
    /* ignore */
  }
  return 0;
}

/** Stable ref — one IndexedDB read for all main-page offline datasets (not 8× full cache scans). */
const MAIN_PAGE_OFFLINE_DATASETS = [
  "stores",
  "products",
  "categories",
  "ads",
  "store-types",
  "brands",
  "companies",
  "gifts",
  "jobs",
];

const EMPTY_OFFLINE_LIST = [];

/** Apply scroll position (some WebViews need documentElement/body as well as window). */
function applyWindowScrollY(y) {
  const top = Math.max(0, Number(y) || 0);
  try {
    window.scrollTo({ top, left: 0, behavior: "auto" });
  } catch {
    window.scrollTo(0, top);
  }
  try {
    if (document.documentElement) document.documentElement.scrollTop = top;
    if (document.body) document.body.scrollTop = top;
  } catch {
    // ignore
  }
}

const MainPage = () => {
  const theme = useTheme();
  const isMobile = useIsMobileLayout();
  const navigate = useNavigate();
  const { locName, locDescription } = useLocalizedContent();
  const [stores, setStores] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [, setProductsByStore] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCategoryType, setSelectedCategoryType] = useState(null);
  const [storeTypes, setStoreTypes] = useState([]);
  const [selectedStoreTypeId, setSelectedStoreTypeId] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [showOnlyDiscount, setShowOnlyDiscount] = useState(true); // Default to showing only discounted products
  const [allCategories, setAllCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [jobs, setJobs] = useState([]);

  // Notification dialog state
  const [loginNotificationOpen, setLoginNotificationOpen] = useState(false);
  const [loginNotificationReason] = useState("like");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productImageFullscreen, setProductImageFullscreen] = useState(null);

  // Filter toggle state for mobile
  const [filtersOpen] = useState(false);

  // Scroll to top state
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showMainTabs, setShowMainTabs] = useState(true);
  const lastMainScrollYRef = useRef(0);

  // Stores pagination state
  const [displayedStores, setDisplayedStores] = useState([]);
  const [, setStoresPage] = useState(1);
  const [storesPerPage] = useState(8);
  const [hasMoreStores, setHasMoreStores] = useState(true);
  const [sortByNewestDiscount, setSortByNewestDiscount] = useState(false);
  const [sortByNearMe, setSortByNearMe] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [productLayout, setProductLayout] = useState("row");

  // Cache random store selections for rotating showcases (stable during renders).
  const randomShowcaseStoresRef = useRef({});
  const loadMoreSentinelRef = useRef(null);
  const loadMoreStoresRef = useRef(() => {});

  // User tracking hook (user = device user for guests)
  const {
    toggleLike,
    toggleFollowStore,
    isProductLiked,
    isStoreFollowed,
    getFollowedStores,
    isAuthenticated,
    user,
    recordView,
  } = useUserTracking();

  // City filter hook
  const { selectedCity } = useCityFilter();
  const { refreshKey } = useContentRefresh();

  // State for tracking like counts locally
  const [likeCounts, setLikeCounts] = useState({});
  const [likeStates, setLikeStates] = useState({}); // Track like state per product
  const [likeLoading, setLikeLoading] = useState({}); // Track loading state per product
  const [followLoading, setFollowLoading] = useState({}); // Track follow state per store
  const [mainPageTab, setMainPageTab] = useState(
    getInitialMainPageTabFromSession,
  ); // 0 = For You, 1 = Following
  const [followedStores, setFollowedStores] = useState([]);
  const [productsByFollowedStore, setProductsByFollowedStore] = useState({});
  const [followLoadingTab, setFollowLoadingTab] = useState(false);
  const mainPageScrollRestoredRef = useRef(false);
  const mainPageTabRef = useRef(0);
  const displayedStoresCountRef = useRef(0);
  const skipInitialSilentRefreshRef = useRef(false);
  const lastScrollPersistRef = useRef({ y: 0, at: 0 });
  /** Last window scrollY (always updated) so unmount save is correct when layout collapses before useEffect. */
  const lastKnownScrollYRef = useRef(0);

  useLayoutEffect(() => {
    return () => {
      try {
        const winY = Math.max(
          lastKnownScrollYRef.current || 0,
          window.scrollY || 0,
          window.pageYOffset || 0,
        );
        let y = winY;
        // After route change the window can read 0 before paint; keep the last deep scroll.
        try {
          const raw = sessionStorage.getItem(MAIN_PAGE_SCROLL_STATE_KEY);
          if (raw) {
            const prevY = Number(JSON.parse(raw).y);
            if (Number.isFinite(prevY) && prevY > 24 && y < 16) y = prevY;
          }
          if (y < 16) {
            const plain = sessionStorage.getItem(MAIN_PAGE_SCROLL_KEY);
            const py = plain != null ? Number(plain) : NaN;
            if (Number.isFinite(py) && py > 24) y = Math.max(y, py);
          }
        } catch {
          /* ignore */
        }
        sessionStorage.setItem(MAIN_PAGE_SCROLL_KEY, String(y));
        sessionStorage.setItem(
          MAIN_PAGE_SCROLL_STATE_KEY,
          JSON.stringify({
            y,
            tab: mainPageTabRef.current,
            displayedCount: displayedStoresCountRef.current,
          }),
        );
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    mainPageTabRef.current = mainPageTab;
  }, [mainPageTab]);

  useEffect(() => {
    displayedStoresCountRef.current = displayedStores.length;
  }, [displayedStores.length]);

  // Handle like button click (works for both logged-in and guest/device users)
  const handleLikeClick = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (likeLoading[productId]) {
      return;
    }

    const currentLikeCount = likeCounts[productId] || 0;
    const isCurrentlyLiked = likeStates[productId] || isProductLiked(productId);

    setLikeLoading((prev) => ({ ...prev, [productId]: true }));

    try {
      if (isCurrentlyLiked) {
        setLikeCounts((prev) => ({
          ...prev,
          [productId]: Math.max(0, currentLikeCount - 1),
        }));
        setLikeStates((prev) => ({
          ...prev,
          [productId]: false,
        }));
      } else {
        setLikeCounts((prev) => ({
          ...prev,
          [productId]: currentLikeCount + 1,
        }));
        setLikeStates((prev) => ({
          ...prev,
          [productId]: true,
        }));
      }

      const result = await toggleLike(productId);

      if (!result.success) {
        setLikeCounts((prev) => ({
          ...prev,
          [productId]: currentLikeCount,
        }));
        setLikeStates((prev) => ({
          ...prev,
          [productId]: isCurrentlyLiked,
        }));
        alert(result.message || "Failed to update like");
      }
    } catch (error) {
      setLikeCounts((prev) => ({
        ...prev,
        [productId]: currentLikeCount,
      }));
      setLikeStates((prev) => ({
        ...prev,
        [productId]: isCurrentlyLiked,
      }));
      alert("Failed to update like");
    } finally {
      setLikeLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleFollowClick = async (storeId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (followLoading[storeId]) return;
    setFollowLoading((prev) => ({ ...prev, [storeId]: true }));
    try {
      const result = await toggleFollowStore(storeId);
      if (!result.success) {
        alert(result.message || "Failed to update follow");
      } else if (mainPageTab === 1 && result.data && !result.data.isFollowed) {
        setFollowedStores((prev) => prev.filter((s) => s._id !== storeId));
        setProductsByFollowedStore((prev) => {
          const next = { ...prev };
          delete next[storeId];
          return next;
        });
      }
    } finally {
      setFollowLoading((prev) => ({ ...prev, [storeId]: false }));
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setProductDialogOpen(true);
    if (isAuthenticated) {
      recordView(product._id);
    }
  };

  const [bannerAds, setBannerAds] = useState([]);
  const isOnline = useOnlineStatus();
  const { itemsByDataset: offlineCache } = useCachedDatasets(
    MAIN_PAGE_OFFLINE_DATASETS,
  );
  const cachedStores = offlineCache.stores ?? EMPTY_OFFLINE_LIST;
  const cachedProducts = offlineCache.products ?? EMPTY_OFFLINE_LIST;
  const cachedCategories = offlineCache.categories ?? EMPTY_OFFLINE_LIST;
  const cachedAds = offlineCache.ads ?? EMPTY_OFFLINE_LIST;
  const cachedStoreTypes = offlineCache["store-types"] ?? EMPTY_OFFLINE_LIST;
  const cachedBrands = offlineCache.brands ?? EMPTY_OFFLINE_LIST;
  const cachedCompanies = offlineCache.companies ?? EMPTY_OFFLINE_LIST;
  const cachedGifts = offlineCache.gifts ?? EMPTY_OFFLINE_LIST;
  const cachedJobs = offlineCache.jobs ?? EMPTY_OFFLINE_LIST;

  const bannerAdsWithImages = useMemo(
    () =>
      (bannerAds || [])
        .filter((a) => !!a.image)
        .map((a) => ({
          _id: a._id,
          src: resolveMediaUrl(a.image),
          brandId: a.brandId,
          storeId: a.storeId,
          giftId: a.giftId,
        })),
    [bannerAds],
  );
  const showCacheChip =
    !isOnline && (allProducts.length > 0 || stores.length > 0);

  const applyMainPagePayload = useCallback((payload) => {
    setStores(payload.stores);
    setAllCategories(payload.allCategories);
    setAllProducts(payload.allProducts);
    setStoreTypes(payload.storeTypes);
    setBrands(payload.brands);
    setCompanies(payload.companies || []);
    setGifts(payload.gifts);
    setJobs(payload.jobs);
    setProductsByStore(payload.productsByStore);
    setLikeCounts(payload.likeCounts);
    setLikeStates(payload.likeStates);
    setBannerAds(payload.bannerAds);
  }, []);

  const fetchData = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        setError("");
        const [
          storesResponse,
          categoriesResponse,
          productsResponse,
          adsResponse,
          storeTypesResponse,
          brandsResponse,
          companiesResponse,
          giftsResponse,
          jobsResponse,
        ] = await Promise.all([
          storeAPI.getAll(),
          categoryAPI.getAll(),
          productAPI.getAll(),
          adAPI.getAll({ page: "home" }),
          storeTypeAPI.getAll(),
          brandAPI.getAll(),
          companyAPI.getAll().catch(() => ({ data: [] })),
          giftAPI.getAll().catch(() => ({ data: { data: [] } })),
          jobAPI.getAll().catch(() => ({ data: [] })),
        ]);

        const storesData = storesResponse.data;
        const categoriesData = categoriesResponse.data;
        const productsData = productsResponse.data;
        const adsData = adsResponse.data || [];
        const brandsData = brandsResponse.data || [];
        const companiesData = companiesResponse.data || [];
        const giftsData = Array.isArray(giftsResponse.data?.data)
          ? giftsResponse.data.data
          : Array.isArray(giftsResponse.data)
            ? giftsResponse.data
            : [];
        const jobsData = Array.isArray(jobsResponse.data)
          ? jobsResponse.data
          : [];

        const payload = buildMainPagePayload({
          storesData,
          categoriesData,
          productsData,
          adsData,
          storeTypesData: storeTypesResponse?.data || [],
          brandsData,
          companiesData,
          giftsData,
          jobsData,
        });
        applyMainPagePayload(payload);
        writeMainPageCache(refreshKey, payload);
      } catch (err) {
        setError(
          err.response
            ? "Server error. Please try again later."
            : "Network error. Please check your connection.",
        );
        console.error("Error fetching data:", err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [refreshKey, applyMainPagePayload],
  );

  useLayoutEffect(() => {
    const cached = readMainPageCache(refreshKey);
    if (cached) {
      applyMainPagePayload(cached);
      setLoading(false);
      setError("");
      // Skip the follow-up silent refetch whenever we hydrate from memory: refetch rebuilds
      // the payload and would change non‑VIP order (shuffle is reload-only) or fight scroll restore.
      skipInitialSilentRefreshRef.current = true;
    }
  }, [refreshKey, applyMainPagePayload]);

  useEffect(() => {
    const cached = readMainPageCache(refreshKey);
    if (cached) {
      if (skipInitialSilentRefreshRef.current) {
        skipInitialSilentRefreshRef.current = false;
      } else {
        fetchData({ silent: true });
      }
    } else {
      fetchData();
    }
  }, [refreshKey, fetchData]);

  useEffect(() => {
    if (isOnline) return;
    const hasOfflineContent =
      cachedStores.length ||
      cachedProducts.length ||
      cachedCategories.length ||
      cachedAds.length;
    if (!hasOfflineContent) return;

    applyMainPagePayload(
      buildMainPagePayload(
        {
          storesData: cachedStores,
          categoriesData: cachedCategories,
          productsData: cachedProducts,
          adsData: cachedAds.filter((ad) => ad?.page === "home"),
          storeTypesData: cachedStoreTypes,
          brandsData: cachedBrands,
          companiesData: cachedCompanies,
          giftsData: cachedGifts,
          jobsData: cachedJobs,
        },
        { shuffleNonVip: false },
      ),
    );
    setLoading(false);
    setError("");
  }, [
    isOnline,
    cachedStores,
    cachedProducts,
    cachedCategories,
    cachedAds,
    cachedStoreTypes,
    cachedBrands,
    cachedCompanies,
    cachedGifts,
    cachedJobs,
    applyMainPagePayload,
  ]);

  const prevSelectedCityRef = useRef(null);
  useEffect(() => {
    if (prevSelectedCityRef.current === null) {
      prevSelectedCityRef.current = selectedCity;
      return;
    }
    if (prevSelectedCityRef.current !== selectedCity) {
      prevSelectedCityRef.current = selectedCity;
      fetchData({ silent: true });
    }
  }, [selectedCity, fetchData]);

  useEffect(() => {
    const saveScrollPosition = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      lastKnownScrollYRef.current = y;
      if (!isOnline) return;
      const now = Date.now();
      const last = lastScrollPersistRef.current;
      const yDelta = Math.abs(y - last.y);
      // Throttle sessionStorage writes; frequent writes can cause scroll jank on mobile.
      if (now - last.at < 250 && yDelta < 12) return;
      lastScrollPersistRef.current = { y, at: now };
      try {
        sessionStorage.setItem(MAIN_PAGE_SCROLL_KEY, String(y));
        sessionStorage.setItem(
          MAIN_PAGE_SCROLL_STATE_KEY,
          JSON.stringify({
            y,
            tab: mainPageTabRef.current,
            displayedCount: displayedStoresCountRef.current,
          }),
        );
      } catch {
        // ignore
      }
    };

    window.addEventListener("scroll", saveScrollPosition, { passive: true });
    return () => {
      window.removeEventListener("scroll", saveScrollPosition);
    };
  }, [isOnline]);

  // Handle scroll to show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const nextVisible = scrollTop > 600;
      setShowScrollTop((prev) => (prev === nextVisible ? prev : nextVisible));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mobile behavior for For You / Following tabs:
  // hide on scroll down, show on scroll up.
  useEffect(() => {
    if (!isMobile) {
      setShowMainTabs(true);
      return undefined;
    }

    lastMainScrollYRef.current = window.scrollY || 0;
    let rafId = 0;

    const handleMainTabsScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        const currentY = window.scrollY || 0;
        const previousY = lastMainScrollYRef.current;

        if (currentY <= 0) {
          setShowMainTabs((prev) => (prev ? prev : true));
          lastMainScrollYRef.current = 0;
          return;
        }

        if (Math.abs(currentY - previousY) < 4) return;

        if (currentY > previousY) {
          setShowMainTabs((prev) => (prev ? false : prev));
        } else {
          setShowMainTabs((prev) => (prev ? prev : true));
        }

        lastMainScrollYRef.current = currentY;
      });
    };

    window.addEventListener("scroll", handleMainTabsScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleMainTabsScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [isMobile]);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Update like states when user data changes (works for both logged-in and guest users)
  useEffect(() => {
    if ((isAuthenticated || user) && allProducts.length > 0) {
      const updatedLikeStates = {};
      allProducts.forEach((product) => {
        updatedLikeStates[product._id] = isProductLiked(product._id);
      });
      setLikeStates(updatedLikeStates);
    }
  }, [isAuthenticated, user, allProducts, isProductLiked]);

  // Fetch followed stores when user switches to Following tab
  useEffect(() => {
    if (mainPageTab !== 1) return;
    const fetchFollowed = async () => {
      try {
        setFollowLoadingTab(true);
        const result = await getFollowedStores();
        if (result.success && result.data && Array.isArray(result.data)) {
          const sorted = [...result.data].sort((a, b) => {
            if (a.isVip && !b.isVip) return -1;
            if (!a.isVip && b.isVip) return 1;
            return 0;
          });
          setFollowedStores(sorted);
          const byStore = {};
          await Promise.all(
            result.data.map(async (s) => {
              try {
                const res = await productAPI.getByStore(s._id);
                const prods = res.data?.data ?? res.data ?? [];
                byStore[s._id] = Array.isArray(prods) ? prods : [];
              } catch {
                byStore[s._id] = [];
              }
            }),
          );
          setProductsByFollowedStore(byStore);
        } else {
          setFollowedStores([]);
          setProductsByFollowedStore({});
        }
      } catch (err) {
        console.error("Error fetching followed stores:", err);
        setFollowedStores([]);
        setProductsByFollowedStore({});
      } finally {
        setFollowLoadingTab(false);
      }
    };
    fetchFollowed();
  }, [mainPageTab, getFollowedStores, user]);

  // Memoized list of categories based on the selected store type
  const filteredCategories = useMemo(() => {
    if (selectedStoreTypeId === "all") {
      return allCategories;
    }
    return allCategories.filter(
      (category) =>
        String(getID(category.storeTypeId)) === String(selectedStoreTypeId),
    );
  }, [allCategories, selectedStoreTypeId]);

  // Memoized list of category types based on the selected category
  // const categoryTypes = useMemo(() => {
  //   if (!selectedCategory) {
  //     return [];
  //   }
  //   return selectedCategory.types || [];
  // }, [selectedCategory]);

  const handleStoreTypeChange = (storeTypeId) => {
    setSelectedStoreTypeId(storeTypeId === "all" ? "all" : String(storeTypeId));
    setSelectedCategory(null);
    setSelectedCategoryType(null);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedCategoryType(null);
  };

  // const handleCategoryTypeChange = (categoryType) => {
  //   setSelectedCategoryType(categoryType);
  // };

  const clearAllFilters = () => {
    setSearch("");
    setSelectedCategory(null);
    setSelectedCategoryType(null);
    setSelectedStoreTypeId("all");
    setPriceRange([0, 1000000]);
    setShowOnlyDiscount(true);
    setStoresPage(1);
  };

  // Helper to safely get ID from string or object (use function declaration so it's hoisted)
  function getID(id) {
    if (typeof id === "string") return id;
    if (id && typeof id === "object") {
      return id.$oid || String(id._id) || String(id);
    }
    return id;
  }

  const normalizeCity = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
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
  const toCanonicalCity = (value) => {
    const normalized = normalizeCity(value);
    return cityCanonicalMap[normalized] || normalized;
  };
  const selectedCityCanonical = toCanonicalCity(selectedCity);
  const doesCityMatch = (candidateCity) =>
    toCanonicalCity(candidateCity) === selectedCityCanonical;

  const extractLatLngFromText = (text) => {
    if (!text || typeof text !== "string") return null;
    const cleaned = text.trim();
    const patterns = [
      /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /[?&](?:q|ll|query|daddr|saddr)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    ];
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const lat = Number(match[1]);
        const lng = Number(match[2]);
        if (
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        ) {
          return { lat, lng };
        }
      }
    }
    return null;
  };

  const getStoreCoordinates = (store) => {
    if (!store) return null;
    const locationInfo = store.locationInfo || {};
    return (
      extractLatLngFromText(locationInfo.googleMaps) ||
      extractLatLngFromText(locationInfo.appleMaps) ||
      extractLatLngFromText(locationInfo.waze)
    );
  };

  const toRad = (deg) => (deg * Math.PI) / 180;
  const getDistanceKm = (from, to) => {
    if (!from || !to) return Number.POSITIVE_INFINITY;
    const earthRadiusKm = 6371;
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(from.lat)) *
        Math.cos(toRad(to.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  // Helper function to check if a discounted product has expired
  const isDiscountValid = (product) => {
    if (!product.isDiscount) return false;

    // If no expiry date, discount is always valid
    if (!product.expireDate) return true;

    return isExpiryStillValid(product.expireDate);
  };

  const getCategoryTypeName = (categoryTypeId, categoryId) => {
    if (!categoryTypeId || !categoryId) return "N/A";
    const catId =
      typeof categoryId === "object"
        ? categoryId?._id || categoryId
        : categoryId;
    const category = allCategories.find(
      (c) => c._id === catId || c._id?.toString() === String(catId),
    );
    if (!category?.types) return "N/A";
    const type = category.types.find(
      (t) =>
        t._id?.toString() === String(categoryTypeId) ||
        t.name === categoryTypeId,
    );
    return type ? locName(type) || "N/A" : "N/A";
  };

  const storeIdsInCity = useMemo(
    () =>
      new Set(
        stores
          .filter((s) => doesCityMatch(s.storecity || s.city))
          .map((s) => getID(s._id)),
      ),
    [stores, selectedCityCanonical],
  );

  const storeById = useMemo(() => {
    const m = {};
    stores.forEach((s) => {
      m[String(getID(s._id))] = s;
    });
    return m;
  }, [stores]);

  /**
   * Use parent store's store type first so it matches store-type chips (built from stores)
   * and the store list filter. Product.storeTypeId can be stale vs store.storeTypeId.
   */
  const effectiveProductStoreTypeId = (product) => {
    const store = storeById[String(getID(product?.storeId))];
    return getID(store?.storeTypeId ?? product?.storeTypeId);
  };

  /** categoryId or populated category reference */
  const effectiveProductCategoryId = (product) =>
    getID(product?.categoryId ?? product?.category);

  /**
   * Products used only to decide which store-type chips to show.
   * Ignores store type, category, and category-type so the full store-type row stays
   * visible after the user picks a category (changing category must not hide other types).
   */
  const filteredProductsForStoreTypeChips = useMemo(() => {
    return allProducts.filter((product) => {
      if (!storeIdsInCity.has(getID(product.storeId))) return false;

      if (
        product.newPrice < priceRange[0] ||
        product.newPrice > priceRange[1]
      ) {
        return false;
      }

      const hasPriceDiscount =
        product.previousPrice &&
        product.newPrice &&
        product.previousPrice > product.newPrice;

      if (showOnlyDiscount) {
        const isDiscounted = product.isDiscount || hasPriceDiscount;
        if (!isDiscounted || !isDiscountValid(product)) {
          return false;
        }
      }

      if (product.expireDate && !isExpiryStillValid(product.expireDate)) {
        return false;
      }

      if (
        search &&
        !product.name?.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [allProducts, storeIdsInCity, search, priceRange, showOnlyDiscount]);

  const finalFilteredStoresForStoreTypeChips = useMemo(() => {
    const storeIdsWithProducts = [
      ...new Set(
        filteredProductsForStoreTypeChips.map((p) => getID(p.storeId)),
      ),
    ];
    return stores.filter((store) => {
      const storeID = getID(store._id);
      const hasMatchingProducts = storeIdsWithProducts.includes(storeID);
      const storeNameMatch =
        search && store.name?.toLowerCase().includes(search.toLowerCase());
      const cityMatch = doesCityMatch(store.storecity || store.city);
      return (hasMatchingProducts || storeNameMatch) && cityMatch;
    });
  }, [
    filteredProductsForStoreTypeChips,
    stores,
    search,
    selectedCityCanonical,
  ]);

  const visibleStoreTypes = useMemo(() => {
    const ids = new Set(
      finalFilteredStoresForStoreTypeChips
        .map((s) => getID(s.storeTypeId))
        .filter(Boolean)
        .map((id) => String(id)),
    );
    return storeTypes.filter((st) => ids.has(String(getID(st._id))));
  }, [storeTypes, finalFilteredStoresForStoreTypeChips]);

  /** Products for category chips when a store type is selected (ignore category; respect city + store type). */
  const filteredProductsForCategoryChips = useMemo(() => {
    if (selectedStoreTypeId === "all") return [];
    return allProducts.filter((product) => {
      if (!storeIdsInCity.has(getID(product.storeId))) return false;

      if (
        String(effectiveProductStoreTypeId(product)) !==
        String(selectedStoreTypeId)
      ) {
        return false;
      }

      if (
        selectedCategoryType &&
        getID(product.categoryTypeId) !== getID(selectedCategoryType._id)
      ) {
        return false;
      }

      if (
        product.newPrice < priceRange[0] ||
        product.newPrice > priceRange[1]
      ) {
        return false;
      }

      const hasPriceDiscount =
        product.previousPrice &&
        product.newPrice &&
        product.previousPrice > product.newPrice;

      if (showOnlyDiscount) {
        const isDiscounted = product.isDiscount || hasPriceDiscount;
        if (!isDiscounted || !isDiscountValid(product)) {
          return false;
        }
      }

      if (product.expireDate && !isExpiryStillValid(product.expireDate)) {
        return false;
      }

      if (
        search &&
        !product.name?.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [
    allProducts,
    storeIdsInCity,
    storeById,
    selectedStoreTypeId,
    selectedCategoryType,
    search,
    priceRange,
    showOnlyDiscount,
  ]);

  const visibleCategories = useMemo(() => {
    if (selectedStoreTypeId === "all") return filteredCategories;
    const ids = new Set(
      filteredProductsForCategoryChips
        .map((p) => effectiveProductCategoryId(p))
        .filter(Boolean)
        .map((id) => String(id)),
    );
    return filteredCategories.filter((c) => ids.has(String(getID(c._id))));
  }, [
    filteredCategories,
    filteredProductsForCategoryChips,
    selectedStoreTypeId,
  ]);

  useEffect(() => {
    if (!selectedCategory) return;
    const sel = String(getID(selectedCategory._id));
    const ok = visibleCategories.some((c) => String(getID(c._id)) === sel);
    if (!ok) {
      setSelectedCategory(null);
      setSelectedCategoryType(null);
    }
  }, [visibleCategories, selectedCategory]);

  useEffect(() => {
    if (selectedStoreTypeId === "all") return;
    const ok = visibleStoreTypes.some(
      (st) => String(getID(st._id)) === String(selectedStoreTypeId),
    );
    if (!ok) {
      setSelectedStoreTypeId("all");
      setSelectedCategory(null);
      setSelectedCategoryType(null);
    }
  }, [visibleStoreTypes, selectedStoreTypeId]);

  // 1. Memoize the filtered products list
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // Filter by Store Type (product or parent store)
      if (
        selectedStoreTypeId !== "all" &&
        String(effectiveProductStoreTypeId(product)) !==
          String(selectedStoreTypeId)
      ) {
        return false;
      }

      // Filter by Category
      if (
        selectedCategory &&
        String(effectiveProductCategoryId(product)) !==
          String(getID(selectedCategory._id))
      ) {
        return false;
      }

      // Filter by Category Type
      if (
        selectedCategoryType &&
        getID(product.categoryTypeId) !== getID(selectedCategoryType._id)
      ) {
        return false;
      }

      // Filter by Price
      if (
        product.newPrice < priceRange[0] ||
        product.newPrice > priceRange[1]
      ) {
        return false;
      }

      // Filter by Discount
      const hasPriceDiscount =
        product.previousPrice &&
        product.newPrice &&
        product.previousPrice > product.newPrice;

      // For discount filter, only show products that are discounted AND not expired
      if (showOnlyDiscount) {
        const isDiscounted = product.isDiscount || hasPriceDiscount;
        if (!isDiscounted || !isDiscountValid(product)) {
          return false;
        }
      }

      if (product.expireDate && !isExpiryStillValid(product.expireDate)) {
        return false;
      }

      // Filter by Search:
      // - direct product-name match, OR
      // - parent store-name match (so searching a store still shows its products)
      if (search) {
        const searchQuery = search.trim().toLowerCase();
        const parentStore =
          storeById[String(getID(product.storeId))] || product.storeId;
        const productNameMatch = String(locName(product) || product.name || "")
          .toLowerCase()
          .includes(searchQuery);
        const storeNameMatch = String(
          locName(parentStore) || parentStore?.name || "",
        )
          .toLowerCase()
          .includes(searchQuery);

        if (!productNameMatch && !storeNameMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    allProducts,
    storeById,
    selectedStoreTypeId,
    selectedCategory,
    selectedCategoryType,
    search,
    priceRange,
    showOnlyDiscount,
    locName,
  ]);

  // 2. Memoize the final list of stores to display
  const finalFilteredStores = useMemo(() => {
    // Get unique store IDs from the already filtered products
    const storeIdsWithFilteredProducts = [
      ...new Set(filteredProducts.map((p) => getID(p.storeId))),
    ];

    // Filter the stores themselves
    return stores.filter((store) => {
      const storeID = getID(store._id);

      // Store must have products that passed the filters
      const hasMatchingProducts =
        storeIdsWithFilteredProducts.includes(storeID);

      // Or the store name itself matches the search
      const storeNameMatch =
        search && store.name?.toLowerCase().includes(search.toLowerCase());

      // And the store must match the type filter
      const storeTypeMatch =
        selectedStoreTypeId === "all" ||
        String(getID(store.storeTypeId)) === String(selectedStoreTypeId);

      // And the store must match the city filter
      const cityMatch = doesCityMatch(store.storecity || store.city);

      return (
        (hasMatchingProducts || storeNameMatch) && storeTypeMatch && cityMatch
      );
    });
  }, [
    filteredProducts,
    stores,
    search,
    selectedStoreTypeId,
    selectedCityCanonical,
  ]);

  const sortedFilteredStores = useMemo(() => {
    const baseStores = [...finalFilteredStores];
    if (!sortByNewestDiscount && !sortByNearMe) {
      return baseStores;
    }

    return baseStores.sort((a, b) => {
      let byDistance = 0;
      if (sortByNearMe && userCoords) {
        const distanceA = getDistanceKm(userCoords, getStoreCoordinates(a));
        const distanceB = getDistanceKm(userCoords, getStoreCoordinates(b));
        byDistance = distanceA - distanceB;
      }

      let byNewest = 0;
      if (sortByNewestDiscount) {
        const timeA = a?.lastReleaseDiscountDate
          ? new Date(a.lastReleaseDiscountDate).getTime()
          : 0;
        const timeB = b?.lastReleaseDiscountDate
          ? new Date(b.lastReleaseDiscountDate).getTime()
          : 0;
        byNewest = timeB - timeA;
      }

      // Mutually exclusive toggles, but keep stable ordering if data missing.
      if (sortByNearMe) return byDistance;
      return byNewest;
    });
  }, [finalFilteredStores, sortByNewestDiscount, sortByNearMe, userCoords]);

  const showcaseEligibleGifts = useMemo(() => {
    return (gifts || []).filter((g) => {
      if (!g?.expireDate) return true;
      return isExpiryStillValid(g.expireDate);
    });
  }, [gifts]);

  const showcaseEligibleJobs = useMemo(() => {
    return (jobs || []).filter((j) => {
      if (j?.active === false) return false;
      if (j?.expireDate && !isExpiryStillValid(j.expireDate)) return false;
      const jobCity = String(j?.city || "").trim();
      if (!jobCity) return true;
      return toCanonicalCity(jobCity) === selectedCityCanonical;
    });
  }, [jobs, selectedCityCanonical]);

  const storeCityById = useMemo(() => {
    const map = {};
    stores.forEach((store) => {
      map[String(getID(store?._id))] = store?.storecity || "";
    });
    return map;
  }, [stores]);

  const topViewedProducts = useMemo(() => {
    const getViews = (product) => {
      const raw = product?.viewCount ?? product?.views ?? product?.view ?? 0;
      const count = Number(raw);
      return Number.isFinite(count) ? count : 0;
    };

    return [...filteredProducts]
      .filter((product) => {
        const productStoreId = String(getID(product?.storeId));
        const productStoreCity =
          product?.storeId?.storecity || storeCityById[productStoreId];
        return !selectedCityCanonical || doesCityMatch(productStoreCity);
      })
      .sort((a, b) => getViews(b) - getViews(a))
      .slice(0, 15);
  }, [filteredProducts, selectedCityCanonical, storeCityById]);

  // Filtered followed stores and their products for Following tab
  const filteredFollowedStoresWithProducts = useMemo(() => {
    return followedStores
      .filter((store) => {
        // Store type filter
        if (
          selectedStoreTypeId !== "all" &&
          String(getID(store.storeTypeId)) !== String(selectedStoreTypeId)
        ) {
          return false;
        }
        // City filter
        if (!doesCityMatch(store.storecity || store.city)) {
          return false;
        }
        // Store name search match (if search, store can show if name matches)
        const storeNameMatch =
          search && store.name?.toLowerCase().includes(search.toLowerCase());

        // Get products for this store
        const rawProducts = productsByFollowedStore[store._id] || [];
        const filteredProds = rawProducts.filter((product) => {
          if (
            selectedStoreTypeId !== "all" &&
            String(getID(store.storeTypeId ?? product.storeTypeId)) !==
              String(selectedStoreTypeId)
          ) {
            return false;
          }
          if (
            selectedCategory &&
            getID(product.categoryId) !== getID(selectedCategory._id)
          ) {
            return false;
          }
          if (
            selectedCategoryType &&
            getID(product.categoryTypeId) !== getID(selectedCategoryType._id)
          ) {
            return false;
          }
          const price = product.newPrice ?? product.price ?? 0;
          if (price < priceRange[0] || price > priceRange[1]) {
            return false;
          }
          const hasPriceDiscount =
            product.previousPrice &&
            product.newPrice &&
            product.previousPrice > product.newPrice;
          if (showOnlyDiscount) {
            const isDiscounted = product.isDiscount || hasPriceDiscount;
            if (!isDiscounted || !isDiscountValid(product)) {
              return false;
            }
          }
          if (
            search &&
            !product.name?.toLowerCase().includes(search.toLowerCase()) &&
            !storeNameMatch
          ) {
            return false;
          }
          if (product.expireDate && !isExpiryStillValid(product.expireDate)) {
            return false;
          }
          return true;
        });

        return storeNameMatch || filteredProds.length > 0;
      })
      .map((store) => {
        const rawProducts = productsByFollowedStore[store._id] || [];
        const filteredProds = rawProducts.filter((product) => {
          if (
            selectedStoreTypeId !== "all" &&
            String(getID(store.storeTypeId ?? product.storeTypeId)) !==
              String(selectedStoreTypeId)
          ) {
            return false;
          }
          if (
            selectedCategory &&
            getID(product.categoryId) !== getID(selectedCategory._id)
          ) {
            return false;
          }
          if (
            selectedCategoryType &&
            getID(product.categoryTypeId) !== getID(selectedCategoryType._id)
          ) {
            return false;
          }
          const price = product.newPrice ?? product.price ?? 0;
          if (price < priceRange[0] || price > priceRange[1]) {
            return false;
          }
          const hasPriceDiscount =
            product.previousPrice &&
            product.newPrice &&
            product.previousPrice > product.newPrice;
          if (showOnlyDiscount) {
            const isDiscounted = product.isDiscount || hasPriceDiscount;
            if (!isDiscounted || !isDiscountValid(product)) {
              return false;
            }
          }
          const storeNameMatch =
            search && store.name?.toLowerCase().includes(search.toLowerCase());
          if (
            search &&
            !product.name?.toLowerCase().includes(search.toLowerCase()) &&
            !storeNameMatch
          ) {
            return false;
          }
          if (product.expireDate && !isExpiryStillValid(product.expireDate)) {
            return false;
          }
          return true;
        });
        return { store, products: filteredProds };
      });
  }, [
    followedStores,
    productsByFollowedStore,
    selectedStoreTypeId,
    selectedCategory,
    selectedCategoryType,
    search,
    priceRange,
    showOnlyDiscount,
    selectedCityCanonical,
  ]);

  useEffect(() => {
    if (mainPageTab !== 1 || followLoadingTab) return undefined;
    if (filteredFollowedStoresWithProducts.length > 0) return undefined;

    const id = window.setTimeout(() => {
      setMainPageTab(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 3000);

    return () => window.clearTimeout(id);
  }, [
    mainPageTab,
    followLoadingTab,
    filteredFollowedStoresWithProducts.length,
  ]);

  // Effect for pagination ? on mobile, preload two chunks (16 stores) so rows after the
  // first BrandShowcase block exist without depending on the infinite-scroll sentinel
  // (it often misses after route return / overlay / browser chrome). Reset rotating
  // showcase picks whenever the store list identity changes.
  useLayoutEffect(() => {
    randomShowcaseStoresRef.current = {};
    const chunk = storesPerPage;
    const initialMax = isMobile ? chunk * 2 : chunk;
    let initialCount = Math.min(sortedFilteredStores.length, initialMax);

    // When returning online, pre-expand the first slice to match saved scroll depth so
    // restoration does not race this effect resetting to 8–16 rows (fixes scroll restore).
    if (isOnline) {
      try {
        const rawState = sessionStorage.getItem(MAIN_PAGE_SCROLL_STATE_KEY);
        if (rawState) {
          const parsed = JSON.parse(rawState);
          const need = Number(parsed?.displayedCount);
          const savedY = Number(parsed?.y);
          if (
            Number.isFinite(need) &&
            need > 0 &&
            Number.isFinite(savedY) &&
            savedY > 0
          ) {
            initialCount = Math.min(
              sortedFilteredStores.length,
              Math.max(initialCount, need),
            );
          }
        }
      } catch {
        /* ignore */
      }
    }

    setDisplayedStores(sortedFilteredStores.slice(0, initialCount));
    setStoresPage(Math.max(1, Math.ceil(initialCount / chunk)));
    setHasMoreStores(initialCount < sortedFilteredStores.length);
  }, [sortedFilteredStores, storesPerPage, isMobile, isOnline]);

  const loadMoreStores = useCallback(() => {
    setStoresPage((prevPage) => {
      const nextPage = prevPage + 1;
      const newStores = sortedFilteredStores.slice(0, nextPage * storesPerPage);
      setDisplayedStores(newStores);
      setHasMoreStores(newStores.length < sortedFilteredStores.length);
      return nextPage;
    });
  }, [sortedFilteredStores, storesPerPage]);

  loadMoreStoresRef.current = loadMoreStores;

  // Infinite scroll: load next store chunk when sentinel nears the viewport (all breakpoints).
  useEffect(() => {
    if (mainPageTab !== 0 || !hasMoreStores) return undefined;
    const el = loadMoreSentinelRef.current;
    if (!el) return undefined;

    let ticking = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (!hit || ticking) return;
        ticking = true;
        loadMoreStoresRef.current();
        window.setTimeout(() => {
          ticking = false;
        }, 400);
      },
      { root: null, rootMargin: "400px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mainPageTab, hasMoreStores]);

  // Runs after store pagination has applied (above) so displayedStores/hasMoreStores match list depth.
  useLayoutEffect(() => {
    if (loading || mainPageScrollRestoredRef.current) return;

    // Use navigator.onLine so a brief useOnline flicker doesn't skip restore or cancel timers.
    const onlineNow =
      typeof navigator === "undefined" ? true : navigator.onLine;

    // Offline: never restore a previous scroll offset — always start at the top.
    if (!onlineNow) {
      applyWindowScrollY(0);
      mainPageScrollRestoredRef.current = true;
      return;
    }

    let attempts = 0;
    let cancelled = false;

    const restoreScroll = () => {
      if (cancelled) return;

      let targetY = 0;
      let targetDisplayedCount = 0;
      try {
        const rawState = sessionStorage.getItem(MAIN_PAGE_SCROLL_STATE_KEY);
        if (rawState) {
          const parsedState = JSON.parse(rawState);
          const parsedY = Number(parsedState?.y);
          const parsedDisplayedCount = Number(parsedState?.displayedCount);
          if (Number.isFinite(parsedY) && parsedY > 0) {
            targetY = parsedY;
          }
          if (
            Number.isFinite(parsedDisplayedCount) &&
            parsedDisplayedCount > 0
          ) {
            targetDisplayedCount = parsedDisplayedCount;
          }
        }

        // Backward compatibility with old key (plain number).
        if (targetY <= 0) {
          const raw = sessionStorage.getItem(MAIN_PAGE_SCROLL_KEY);
          const parsed = Number(raw);
          if (Number.isFinite(parsed) && parsed > 0) {
            targetY = parsed;
          }
        }
      } catch {
        targetY = 0;
        targetDisplayedCount = 0;
      }

      // Tab is applied via getInitialMainPageTabFromSession on mount — do not setMainPageTab
      // here (it was in the effect deps and cancelled pending restoreScroll timeouts).

      const countReady =
        targetDisplayedCount <= 0 ||
        displayedStores.length >= targetDisplayedCount;
      if (!countReady && hasMoreStores) {
        loadMoreStoresRef.current?.();
        attempts += 1;
        if (attempts >= 40) {
          mainPageScrollRestoredRef.current = true;
          return;
        }
        window.setTimeout(restoreScroll, 120);
        return;
      }

      if (targetY <= 0) {
        mainPageScrollRestoredRef.current = true;
        return;
      }

      const scrollHeight =
        document.documentElement?.scrollHeight ||
        document.body?.scrollHeight ||
        0;
      const viewportHeight = window.innerHeight || 0;
      const maxReachableY = Math.max(0, scrollHeight - viewportHeight);
      const pageTallEnough = maxReachableY >= targetY - 8;

      // If the page is still too short to reach the old position, keep loading
      // more store blocks before attempting the final restoration.
      if (!pageTallEnough && hasMoreStores) {
        loadMoreStoresRef.current?.();
        attempts += 1;
        if (attempts >= 40) {
          mainPageScrollRestoredRef.current = true;
          return;
        }
        window.setTimeout(restoreScroll, 120);
        return;
      }

      applyWindowScrollY(targetY);
      requestAnimationFrame(() => applyWindowScrollY(targetY));
      requestAnimationFrame(() =>
        requestAnimationFrame(() => applyWindowScrollY(targetY)),
      );
      window.setTimeout(() => applyWindowScrollY(targetY), 0);
      window.setTimeout(() => applyWindowScrollY(targetY), 80);
      window.setTimeout(() => applyWindowScrollY(targetY), 250);

      const currentY = window.scrollY || window.pageYOffset || 0;
      const reached = Math.abs(currentY - targetY) <= 2;
      attempts += 1;

      if (reached || attempts >= 40 || (!hasMoreStores && !pageTallEnough)) {
        mainPageScrollRestoredRef.current = true;
        return;
      }

      window.setTimeout(restoreScroll, 120);
    };

    try {
      restoreScroll();
    } catch {
      mainPageScrollRestoredRef.current = true;
    }

    return () => {
      cancelled = true;
    };
  }, [loading, hasMoreStores, displayedStores.length, stores.length]);

  const requestUserLocation = () => {
    if (!navigator?.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const formatPrice = (price) => {
    if (typeof price !== "number") return `${t("ID")} 0`;
    return ` ${price.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ${t("ID")}`;
  };

  const calculateDiscount = (previousPrice, newPrice) => {
    if (!previousPrice || !newPrice) return 0;
    return Math.round(((previousPrice - newPrice) / previousPrice) * 100);
  };

  if (loading)
    return (
      <Box
        sx={{
          px: { xs: 1, sm: 1.5, md: 3 },
          pt: { xs: "100px", sm: "113px", md: "113px" },
          pb: { xs: 10, sm: 4 },
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Banner skeleton */}
        <Skeleton
          variant="rounded"
          width="100%"
          height={160}
          sx={{ mb: 2, borderRadius: "16px" }}
        />
        {/* Filter chips skeleton ? scroll row, fixed chip widths (matches FilterChips) */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 2,
            overflowX: "auto",
            overflowY: "hidden",
            width: "100%",
            pb: 0.5,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {[80, 100, 90, 110, 80].map((w, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={w}
              height={34}
              sx={{ borderRadius: "999px", flexShrink: 0 }}
            />
          ))}
        </Box>
        {/* Store group skeletons */}
        {[1, 2, 3].map((idx) => (
          <Box
            key={idx}
            sx={{
              mb: 2,
              borderRadius: "20px",
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              width: "100%",
            }}
          >
            {/* Store header */}
            <Box
              sx={{
                p: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                background:
                  theme.palette.mode === "dark"
                    ? "rgba(30,111,217,0.1)"
                    : "rgba(30,111,217,0.06)",
              }}
            >
              <Skeleton
                variant="rounded"
                width={52}
                height={52}
                sx={{ borderRadius: "14px", flexShrink: 0 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton variant="text" width="45%" height={24} />
                <Skeleton variant="text" width="70%" height={18} />
                <Box
                  sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}
                >
                  <Skeleton
                    variant="rounded"
                    width={100}
                    height={22}
                    sx={{ borderRadius: "999px", flexShrink: 0 }}
                  />
                  <Skeleton
                    variant="rounded"
                    width={80}
                    height={22}
                    sx={{ borderRadius: "999px", flexShrink: 0 }}
                  />
                </Box>
              </Box>
            </Box>
            {/* Products row ? horizontal scroll + non-shrinking cards (matches StoreGroupSection / ProductCard) */}
            <Box
              sx={{
                p: "12px 14px",
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                gap: { xs: 1, sm: 1.2 },
                overflowX: "auto",
                overflowY: "hidden",
                width: "100%",
                boxSizing: "border-box",
                scrollbarWidth: "thin",
              }}
            >
              {[1, 2, 3, 4, 5].map((c) => (
                <Box
                  key={c}
                  sx={{
                    flexShrink: 0,
                    width: 148,
                    minWidth: 148,
                  }}
                >
                  <Skeleton
                    variant="rounded"
                    width={148}
                    height={150}
                    sx={{ borderRadius: "12px 12px 0 0" }}
                  />
                  <Skeleton
                    variant="rounded"
                    width={148}
                    height={68}
                    sx={{ borderRadius: "0 0 12px 12px", mt: "1px" }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    );
  if (error) return <Loader message={error} />;

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 1.5, md: 3 },
        pt: { xs: "100px", sm: "113px", md: "113px" },
        pb: { xs: 10, sm: 4 },
      }}
    >
      {/* --- */}
      <Box
        sx={{
          position: "fixed",
          top: 65,
          left: 0,
          right: 0,
          zIndex: 1090,
          width: "fit-content",
          borderRadius: "14px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          margin: "0 auto",
          backdropFilter: "blur(12px)",
          background:
            theme.palette.mode === "dark"
              ? "rgba(15,23,42,0.85)"
              : "rgba(255,255,255,0.9)",
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.07)"
              : "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
          transform: !isMobile
            ? "translateY(0)"
            : showMainTabs
              ? "translateY(0)"
              : "translateY(-160%)",
          transition: "transform 280ms cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform",
        }}
      >
        <Tabs
          value={mainPageTab}
          TabIndicatorProps={{
            children: <span className="MuiTabs-indicatorSpan" />,
          }}
          onChange={(_, v) => {
            setMainPageTab(v);
            if (v === 1) setFollowLoadingTab(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          sx={{
            minHeight: 44,
            px: 0.5,
            "& .MuiTabs-indicator": {
              display: "flex",
              justifyContent: "center",
              backgroundColor: "transparent",
            },
            "& .MuiTabs-indicatorSpan": {
              width: "60%",
              backgroundColor: "var(--brand-accent-orange, #ff8c00)",
              borderRadius: "999px",
              height: "3px",
            },
            "& .MuiTab-root": {
              fontWeight: 700,
              textTransform: "none",
              color:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.55)"
                  : "rgba(0,0,0,0.45)",
              minHeight: 44,
              minWidth: "auto",
              px: 2,
              fontSize: "0.9rem",
              transition: "color 0.2s",
              "&.Mui-selected": {
                color: theme.palette.mode === "dark" ? "white" : "#111827",
                fontWeight: 800,
              },
            },
          }}
        >
          <Tab label={t("For You")} />
          <Tab label={t("Following")} />
        </Tabs>
      </Box>
      {/* --- */}
      {showCacheChip && (
        <Box sx={{ mb: 1.25, mt: 0.25 }}>
          <OfflineCacheChip />
        </Box>
      )}
      {/* --- */}
      <BannerCarousel
        banners={bannerAdsWithImages}
        onBannerClick={(ad) => {
          if (ad.brandId) navigate(`/brands/${ad.brandId}`);
          else if (ad.storeId) navigate(`/stores/${ad.storeId}`);
          else if (ad.giftId) navigate(`/gifts/${ad.giftId}`);
        }}
      />
      {/* --- */}
      <Box sx={{ mb: 0 }}>
        <FilterChips
          search={search}
          onSearchChange={setSearch}
          storeTypes={visibleStoreTypes}
          selectedStoreTypeId={selectedStoreTypeId}
          onStoreTypeSelect={handleStoreTypeChange}
          visibleCategories={visibleCategories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategoryChange}
          sortByNewest={sortByNewestDiscount}
          sortByNearMe={sortByNearMe}
          onToggleNewest={() => {
            setSortByNewestDiscount((prev) => {
              const next = !prev;
              if (next) setSortByNearMe(false);
              return next;
            });
          }}
          onToggleNearMe={() => {
            setSortByNearMe((prev) => {
              const next = !prev;
              if (next) {
                setSortByNewestDiscount(false);
                requestUserLocation();
              }
              return next;
            });
          }}
          geoLoading={geoLoading}
          onClearAll={clearAllFilters}
          productLayout={productLayout}
          onLayoutChange={setProductLayout}
        />
        {/* legacy filter content ? hidden, kept for price-range state wiring */}
        <Box sx={{ display: "none" }}>
          {/* Search and Basic Filters */}
          <Box
            sx={{
              mt: 3,
              display: { xs: filtersOpen ? "block" : "none", md: "block" },
            }}
          >
            <Box
              sx={{
                mb: 1,
                display: "flex",
                gap: { xs: 1, md: 2 },
                alignItems: "center",
                flexDirection: { xs: "column", sm: "row" },
              }}
            >
              <TextField
                variant="outlined"
                placeholder={t("Search for products or stores...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                  flex: 1,
                  width: { xs: "100%", sm: "auto" },
                  maxWidth: { xs: "100%", sm: 400 },
                  backgroundColor: "white",
                  borderRadius: 1,
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "transparent",
                    },
                    "&:hover fieldset": {
                      borderColor: "transparent",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
                size="small"
                InputProps={{
                  inputProps: {
                    style: {
                      color:
                        theme.palette.mode === "dark" ? "black" : "grey.500",
                    },
                  },
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        sx={{
                          color:
                            theme.palette.mode === "dark"
                              ? "#1E6FD9"
                              : "grey.500",
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Price Range Filters */}
              <Box
                sx={{
                  display: "flex",

                  gap: { xs: 0.5, sm: 1 },
                  alignItems: "center",
                  flexWrap: { xs: "wrap", sm: "nowrap" },
                }}
              >
                <TextField
                  type="number"
                  placeholder={t("Min Price")}
                  value={priceRange[0] || ""}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setPriceRange([val, priceRange[1]]);
                  }}
                  sx={{
                    width: { xs: "45%", sm: 80, md: 120 },
                    height: { xs: "35px", sm: "50px", md: "50px" },
                    backgroundColor: "white",
                    borderRadius: 1,
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "transparent" },
                      "&:hover fieldset": { borderColor: "transparent" },
                      "&.Mui-focused fieldset": {
                        borderColor: theme.palette.primary.main,
                      },
                    },
                  }}
                  size="small"
                  InputProps={{
                    inputProps: {
                      style: {
                        color:
                          theme.palette.mode === "dark" ? "black" : "grey.500",
                      },
                    },
                  }}
                />

                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    color: "white",
                  }}
                >
                  -
                </Typography>

                <TextField
                  type="number"
                  placeholder={t("Max Price")}
                  value={priceRange[1] === 1000000 ? "" : priceRange[1]}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 1000000;
                    setPriceRange([priceRange[0], val]);
                  }}
                  sx={{
                    width: { xs: "45%", sm: 80, md: 120 },
                    height: { xs: "35px", sm: "50px", md: "50px" },
                    backgroundColor: "white",
                    borderRadius: 1,
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "transparent" },
                      "&:hover fieldset": { borderColor: "transparent" },
                      "&.Mui-focused fieldset": {
                        borderColor: theme.palette.primary.main,
                      },
                    },
                  }}
                  size="small"
                  InputProps={{
                    inputProps: {
                      style: {
                        color:
                          theme.palette.mode === "dark" ? "black" : "grey.500",
                      },
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
          {/* Store Type Filter */}
          <Box sx={{ mb: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                color: "black",
                mb: 0.5,
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              {t("Store Type")}
            </Typography>
            <Box
              sx={{
                flexWrap: "wrap",
                display: "flex",
                gap: { xs: 0.5, sm: 1 },
                alignItems: "center",
                pb: 0,
                minHeight: "20px",
                width: "100%",
                overflow: "hidden",
              }}
            >
              {[{ _id: "all", name: t("All") }, ...visibleStoreTypes].map(
                (type) => (
                  <Button
                    key={type._id}
                    variant={
                      String(selectedStoreTypeId) === String(type._id)
                        ? "contained"
                        : "outlined"
                    }
                    onClick={() => handleStoreTypeChange(type._id)}
                    sx={{
                      backgroundColor:
                        String(selectedStoreTypeId) === String(type._id)
                          ? "var(--brand-primary-blue)"
                          : "transparent",
                      color:
                        String(selectedStoreTypeId) === String(type._id)
                          ? "white"
                          : "black",
                      // borderBottom: "1px solid var(--brand-accent-orange)",
                      borderRadius: "8px",
                      px: { xs: 1.5, md: 2 },
                      py: 0.5,
                      fontSize: { xs: "0.75rem", md: "0.875rem" },
                      textTransform: "none",
                      minHeight: "32px",
                      maxWidth: "100%",
                      whiteSpace: "normal",
                      textAlign: "center",
                      lineHeight: 1.4,
                      // display: "inline-flex",
                      // flexWrap: "wrap",
                      justifyContent: "center",
                      alignItems: "center",
                      "&:hover": {
                        backgroundColor:
                          String(selectedStoreTypeId) === String(type._id)
                            ? theme.palette.mode === "dark"
                              ? "#1E6FD9"
                              : "#4A90E2"
                            : "rgba(255,255,255,0.1)",
                        borderColor: "rgba(255,255,255,0.5)",
                      },
                    }}
                  >
                    <span style={{ marginRight: "4px", flexShrink: 0 }}>
                      {type.icon || "??"}
                    </span>
                    <span
                      style={{
                        flex: "1 1 0",
                        minWidth: 0,
                        // overflowWrap: "break-word",
                        // wordBreak: "break-word",
                      }}
                    >
                      {locName(type) || t(type.name)}
                    </span>
                  </Button>
                ),
              )}
            </Box>
          </Box>

          {/* Categories Filter */}
          {selectedStoreTypeId !== "all" && (
            <Box sx={{ mt: 2, mb: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: "black",
                  mb: 0.5,
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                {t("Categories")}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: { xs: 0.5, sm: 1 },
                  alignItems: "center",
                  justifyContent: { xs: "flex-start", md: "flex-start" },
                  overflowX: "auto",
                  overflowY: "hidden",
                  scrollbarWidth: "none",
                  "&::-webkit-scrollbar": {
                    display: "none",
                  },
                  pb: 1,
                  minHeight: "50px",
                }}
              >
                {/* Browse All Categories */}
                <Button
                  variant={selectedCategory === null ? "contained" : "outlined"}
                  onClick={() => handleCategoryChange(null)}
                  sx={{
                    backgroundColor:
                      selectedCategory === null
                        ? theme.palette.primary.main
                        : "transparent",
                    color: selectedCategory === null ? "white" : "black",
                    borderBottom: "1px solid var(--brand-accent-orange)",
                    borderRadius: "8px",
                    px: { xs: 1.5, md: 2 },
                    py: 0.5,
                    fontSize: { xs: "0.75rem", md: "0.875rem" },
                    textTransform: "none",
                    minHeight: "32px",
                    flexShrink: 0,
                    "&:hover": {
                      backgroundColor:
                        selectedCategory === null
                          ? theme.palette.mode === "dark"
                            ? theme.palette.primary.main
                            : "#4A90E2"
                          : "rgba(255,255,255,0.1)",
                      borderColor: "rgba(255,255,255,0.5)",
                    },
                  }}
                  startIcon={<CategoryIcon sx={{ fontSize: "16px" }} />}
                >
                  {t("all")}
                </Button>

                {/* Category Filter Buttons */}
                {visibleCategories.map((category) => (
                  <Button
                    key={category._id}
                    variant={
                      selectedCategory?._id === category._id
                        ? "contained"
                        : "outlined"
                    }
                    onClick={() => handleCategoryChange(category)}
                    sx={{
                      backgroundColor:
                        selectedCategory?._id === category._id
                          ? theme.palette.primary.main
                          : "transparent",
                      color:
                        selectedCategory?._id === category._id
                          ? "white"
                          : "black",
                      borderBottom: "1px solid var(--brand-accent-orange)",
                      borderRadius: "8px",
                      px: { xs: 1.5, md: 2 },
                      py: 0.5,
                      fontSize: { xs: "0.75rem", md: "0.875rem" },
                      textTransform: "none",
                      minHeight: "32px",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      "&:hover": {
                        backgroundColor:
                          selectedCategory?._id === category._id
                            ? theme.palette.mode === "dark"
                              ? theme.palette.primary.main
                              : "#4A90E2"
                            : "rgba(255,255,255,0.1)",
                        borderColor: "rgba(255,255,255,0.5)",
                      },
                    }}
                  >
                    {locName(category) || t(category.name)}
                  </Button>
                ))}
              </Box>
            </Box>
          )}

          {/* CCCategory Types Filter
          {selectedCategory && (
            <Box sx={{ mb: 0 }}>
             
              <Box
                sx={{
                  display: "flex",
                  gap: { xs: 0.5, sm: 1 },
                  alignItems: "center",
                  justifyContent: { xs: "flex-start", md: "flex-start" },
                  overflowX: "auto",
                  overflowY: "hidden",
                  scrollbarWidth: "none",
                  "&::-webkit-scrollbar": {
                    display: "none",
                  },
                  pb: 0,
                  minHeight: "20px",
                }}
              >
                CCAll Category Types
                <Button
                  variant={
                    selectedCategoryType === null ? "contained" : "outlined"
                  }
                  onClick={() => handleCategoryTypeChange(null)}
                  sx={{
                    backgroundColor:
                      selectedCategoryType === null
                        ? theme.palette.mode === "dark"
                          ? "#1E6FD9"
                          : "#4A90E2"
                        : "transparent",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 2,
                    px: { xs: 1.5, md: 2 },
                    py: 0.5,
                    fontSize: { xs: "0.75rem", md: "0.875rem" },
                    textTransform: "none",
                    minHeight: "32px",
                    flexShrink: 0,
                    "&:hover": {
                      backgroundColor:
                        selectedCategoryType === null
                          ? theme.palette.mode === "dark"
                            ? "#1E6FD9"
                            : "#4A90E2"
                          : "rgba(255,255,255,0.1)",
                      borderColor: "rgba(255,255,255,0.5)",
                    },
                  }}
                  startIcon={<CategoryIcon sx={{ fontSize: "16px" }} />}
                >
                  {t("All Category Types")}
                </Button>

                CCCategory Type Filter Buttons
                {categoryTypes.map((categoryType, index) => (
                  <Button
                    key={index}
                    variant={
                      selectedCategoryType?.name === categoryType.name
                        ? "contained"
                        : "outlined"
                    }
                    onClick={() => handleCategoryTypeChange(categoryType)}
                    sx={{
                      backgroundColor:
                        selectedCategoryType?.name === categoryType.name
                          ? theme.palette.mode === "dark"
                            ? "#1E6FD9"
                            : "#4A90E2"
                          : "transparent",
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.3)",
                      borderRadius: 2,
                      px: { xs: 1.5, md: 2 },
                      py: 0.5,
                      fontSize: { xs: "0.75rem", md: "0.875rem" },
                      textTransform: "none",
                      minHeight: "32px",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      "&:hover": {
                        backgroundColor:
                          selectedCategoryType?.name === categoryType.name
                            ? theme.palette.mode === "dark"
                              ? "#1E6FD9"
                              : "#4A90E2"
                            : "rgba(255,255,255,0.1)",
                        borderColor: "rgba(255,255,255,0.5)",
                      },
                    }}
                  >
                    {t(categoryType.name)}
                  </Button>
                ))}
              </Box>
            </Box>
          )} */}

          {/* Clear Filters Button - Desktop Only */}
          <Box
            sx={{
              mt: 2,
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
            }}
          >
            <Button
              variant="outlined"
              onClick={clearAllFilters}
              sx={{
                color: "white",
                borderColor: "rgba(255,255,255,0.5)",
                borderRadius: 2,
                px: 3,
                py: 0.5,
                fontSize: "0.875rem",
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderColor: "white",
                },
              }}
            >
              {t("Clear All Filters")}
            </Button>
          </Box>
        </Box>
        {/* end legacy hidden */}
      </Box>

      {/* --- */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {mainPageTab === 0 ? (
          <>
            {/* Flash Deals / Most Viewed */}
            <FlashDealsSection
              products={topViewedProducts}
              onProductOpen={handleProductClick}
              likeStates={likeStates}
              isProductLiked={isProductLiked}
              onLikeClick={handleLikeClick}
              likeLoading={likeLoading}
              formatPrice={formatPrice}
              storeById={storeById}
              getID={getID}
            />

            {/* Find Job */}
            <FindJobShowcase jobs={showcaseEligibleJobs} />

            {displayedStores.map((store, index) => {
              const productsForCard = filteredProducts.filter(
                (p) => getID(p.storeId) === getID(store._id),
              );

              // Every 8 store cards: Brand (8) ? Company (8) ? Store (random 20) ? Gift (last 5) (repeat).
              const rotatingShowcase =
                (index + 1) % 8 === 0
                  ? (() => {
                      const blockIndex = (index + 1) / 8 - 1;
                      const variant = blockIndex % 4;

                      if (variant === 0) {
                        const offset = blockIndex * 8;
                        return (
                          <BrandShowcase
                            brands={brands.slice(offset, offset + 8)}
                          />
                        );
                      }

                      if (variant === 1) {
                        const offset = blockIndex * 8;
                        return (
                          <CompanyShowcase
                            companies={companies.slice(offset, offset + 8)}
                          />
                        );
                      }

                      if (variant === 2) {
                        const prevList =
                          randomShowcaseStoresRef.current[blockIndex];
                        const needFill =
                          sortedFilteredStores.length > 0 &&
                          (!Array.isArray(prevList) || prevList.length === 0);
                        if (needFill) {
                          const shuffled = [...sortedFilteredStores].sort(
                            () => Math.random() - 0.5,
                          );
                          randomShowcaseStoresRef.current[blockIndex] =
                            shuffled.slice(0, 20);
                        }
                        return (
                          <StoreShowcase
                            stores={
                              randomShowcaseStoresRef.current[blockIndex] ?? []
                            }
                          />
                        );
                      }

                      return <GiftShowcase gifts={showcaseEligibleGifts} />;
                    })()
                  : null;

              return (
                <React.Fragment key={store._id}>
                  <StoreGroupSection
                    store={store}
                    products={productsForCard}
                    onProductOpen={handleProductClick}
                    isStoreFollowed={isStoreFollowed}
                    onFollowClick={handleFollowClick}
                    followLoading={followLoading[store._id]}
                    likeStates={likeStates}
                    isProductLiked={isProductLiked}
                    onLikeClick={handleLikeClick}
                    likeLoading={likeLoading}
                    formatPrice={formatPrice}
                    productLayout={productLayout}
                  />
                  {rotatingShowcase}
                </React.Fragment>
              );
            })}
          </>
        ) : followLoadingTab ? (
          <Box display="flex" justifyContent="center" py={8}>
            <Loader />
          </Box>
        ) : followedStores.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8, px: 2 }}>
            <PersonAddDisabledIcon
              sx={{ fontSize: 80, color: "grey.400", mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t("No followed stores yet")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("Follow stores from the main page to see them here")}
            </Typography>
          </Box>
        ) : filteredFollowedStoresWithProducts.length === 0 ? (
          <>
            <br />
            <Alert
              severity="info"
              sx={{
                borderRadius: 2,
                backgroundColor:
                  theme.palette.mode === "dark" ? "#FFA94D" : "#e3f2fd",
                border: `1px solid ${theme.palette.mode === "dark" ? "#FF7A1A" : "#bbdefb"}`,
              }}
            >
              {t("No stores match the current filters.")}
            </Alert>
          </>
        ) : (
          filteredFollowedStoresWithProducts.map(
            ({ store, products: storeProducts }) => (
              <StoreGroupSection
                key={store._id}
                store={store}
                products={storeProducts}
                onProductOpen={handleProductClick}
                isStoreFollowed={isStoreFollowed}
                onFollowClick={handleFollowClick}
                followLoading={followLoading[store._id]}
                likeStates={likeStates}
                isProductLiked={isProductLiked}
                onLikeClick={handleLikeClick}
                likeLoading={likeLoading}
                formatPrice={formatPrice}
                productLayout={productLayout}
              />
            ),
          )
        )}
      </Box>

      {/* --- */}
      {mainPageTab === 0 && hasMoreStores && (
        <Box
          ref={loadMoreSentinelRef}
          sx={{
            width: "100%",
            minHeight: 24,
            mt: 3,
            mb: 2,
            flexShrink: 0,
          }}
          aria-hidden
        />
      )}

      {mainPageTab === 0 && finalFilteredStores.length === 0 && !loading && (
        <Alert
          severity="info"
          sx={{
            borderRadius: "14px",
            mt: 2,
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(255,169,77,0.15)"
                : "#e3f2fd",
            border: `1px solid ${theme.palette.mode === "dark" ? "#FF7A1A" : "#bbdefb"}`,
          }}
        >
          {t("No stores match the current filters.")}
        </Alert>
      )}

      {/* Product Detail Dialog */}
      <Dialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 4,
            overflow: "hidden",
            backgroundColor:
              theme.palette.mode === "dark" ? "rgba(22,28,44,1)" : "#fff",
            backgroundImage: "none",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2,
            py: 1.5,
            borderBottom: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          }}
        >
          <IconButton
            size="small"
            onClick={() => setProductDialogOpen(false)}
            sx={{
              mr: 1.5,
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(0,0,0,0.05)",
              borderRadius: 2,
            }}
          >
            <CloseIcon sx={{ fontSize: "1.1rem" }} />
          </IconButton>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem", flex: 1 }}>
            {t("Product Details")}
          </Typography>
        </Box>

        <DialogContent sx={{ p: 0, overflowX: "hidden" }}>
          {selectedProduct &&
            (() => {
              const isDark = theme.palette.mode === "dark";
              const pid = selectedProduct._id;
              const liked = likeStates[pid] ?? isProductLiked(pid);
              const likeCount =
                likeCounts[pid] ?? selectedProduct.likeCount ?? 0;
              const viewCount = selectedProduct.viewCount ?? 0;
              const isLikeLoading = likeLoading[pid];
              const discountPct = calculateDiscount(
                selectedProduct.previousPrice,
                selectedProduct.newPrice,
              );
              const hasDiscount = isDiscountValid(selectedProduct);
              const discountLabel =
                discountPct !== null ? `-${discountPct}%` : t("Discount");
              const ownerBrandOrCompany =
                selectedProduct.companyId || selectedProduct.brandId;

              // related discounted products from same category
              const categoryId =
                selectedProduct.categoryId?._id || selectedProduct.categoryId;
              const related = allProducts.filter(
                (p) =>
                  p._id !== pid &&
                  (p.categoryId?._id || p.categoryId) === categoryId &&
                  storeIdsInCity.has(getID(p.storeId)) &&
                  isExpiryStillValid(p.expireDate || null) !== false &&
                  isDiscountValid(p),
              );

              return (
                <Box>
                  {/* Image */}
                  {selectedProduct.image ? (
                    <Box
                      sx={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.03)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 220,
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setProductImageFullscreen({
                          url: resolveMediaUrl(selectedProduct.image),
                          alt: locName(selectedProduct),
                        })
                      }
                    >
                      <CardMedia
                        component="img"
                        image={resolveMediaUrl(selectedProduct.image)}
                        alt={locName(selectedProduct)}
                        sx={{
                          maxHeight: 260,
                          objectFit: "contain",
                          width: "100%",
                        }}
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        height: 180,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.03)",
                      }}
                    >
                      <ShoppingCartIcon sx={{ fontSize: 64, opacity: 0.2 }} />
                    </Box>
                  )}

                  {/* Details */}
                  <Box
                    sx={{
                      px: 2.5,
                      py: 2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.25,
                    }}
                  >
                    {/* Title */}
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: "1.15rem",
                        lineHeight: 1.35,
                      }}
                    >
                      {locName(selectedProduct)}
                    </Typography>

                    {/* Description */}
                    {locDescription(selectedProduct) && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ lineHeight: 1.55 }}
                      >
                        {locDescription(selectedProduct)}
                      </Typography>
                    )}

                    {/* Brand / Store / Category chips */}
                    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                      {ownerBrandOrCompany && locName(ownerBrandOrCompany) && (
                        <Chip
                          icon={
                            <BusinessIcon
                              sx={{ fontSize: "0.9rem !important" }}
                            />
                          }
                          label={locName(ownerBrandOrCompany)}
                          size="small"
                          onClick={() => {
                            setProductDialogOpen(false);
                            navigate(
                              selectedProduct.companyId
                                ? `/companies/${ownerBrandOrCompany._id}`
                                : `/brands/${ownerBrandOrCompany._id}`,
                            );
                          }}
                          sx={{
                            borderRadius: 99,
                            fontWeight: 600,
                            fontSize: "0.72rem",
                            cursor: "pointer",
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(30,111,217,0.08)",
                            color: "var(--color-primary,#1E6FD9)",
                          }}
                        />
                      )}
                      {selectedProduct.storeId &&
                        locName(selectedProduct.storeId) && (
                          <Chip
                            icon={
                              <StorefrontIcon
                                sx={{ fontSize: "0.9rem !important" }}
                              />
                            }
                            label={locName(selectedProduct.storeId)}
                            size="small"
                            onClick={() => {
                              setProductDialogOpen(false);
                              navigate(
                                `/stores/${selectedProduct.storeId._id}`,
                              );
                            }}
                            sx={{
                              borderRadius: 99,
                              fontWeight: 600,
                              fontSize: "0.72rem",
                              cursor: "pointer",
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(30,111,217,0.08)",
                              color: "var(--color-primary,#1E6FD9)",
                            }}
                          />
                        )}
                      {selectedProduct.categoryId && (
                        <Chip
                          icon={
                            <CategoryIcon
                              sx={{ fontSize: "0.9rem !important" }}
                            />
                          }
                          label={
                            locName(selectedProduct.categoryId) || t("Category")
                          }
                          size="small"
                          component={Link}
                          to="/categories"
                          state={{
                            category:
                              selectedProduct.categoryId?.name ||
                              "All Categories",
                            categoryType: getCategoryTypeName(
                              selectedProduct.categoryTypeId,
                              selectedProduct.categoryId?._id ||
                                selectedProduct.categoryId,
                            ),
                          }}
                          onClick={() => setProductDialogOpen(false)}
                          sx={{
                            borderRadius: 99,
                            fontWeight: 600,
                            fontSize: "0.72rem",
                            cursor: "pointer",
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(30,111,217,0.08)",
                            color: "var(--color-primary,#1E6FD9)",
                            textDecoration: "none",
                          }}
                        />
                      )}
                    </Box>

                    {/* Expiry */}
                    {selectedProduct.expireDate &&
                      (() => {
                        const info = getExpiryRemainingInfo(
                          selectedProduct.expireDate,
                        );
                        const label = formatExpiryChipLabel(info, t);
                        const chipColor = expiryChipBg(info);
                        const dateStr = formatExpiryDateDdMmYyyy(
                          selectedProduct.expireDate,
                        );
                        return (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              px: 1.25,
                              py: 0.9,
                              borderRadius: 2.5,
                              backgroundColor: isDark
                                ? `${chipColor}22`
                                : `${chipColor}18`,
                              border: `1px solid ${chipColor}55`,
                            }}
                          >
                            <AccessTimeIcon
                              sx={{
                                fontSize: "1rem",
                                color: chipColor,
                                flexShrink: 0,
                              }}
                            />
                            <Box
                              sx={{ display: "flex", flexDirection: "column" }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color: chipColor,
                                  lineHeight: 1.3,
                                }}
                              >
                                {info.kind === "expired"
                                  ? t("Expired")
                                  : label || t("Expires")}
                              </Typography>
                              {dateStr && (
                                <Typography
                                  sx={{
                                    fontSize: "0.66rem",
                                    fontWeight: 500,
                                    color: isDark
                                      ? "rgba(255,255,255,0.5)"
                                      : "rgba(0,0,0,0.45)",
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {dateStr}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })()}

                    {/* Price block */}
                    <Box
                      sx={{
                        mt: 0.5,
                        p: 1.75,
                        borderRadius: 3,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.025)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.25,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {t("Price")}
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        {hasDiscount &&
                          selectedProduct.previousPrice &&
                          Number(selectedProduct.previousPrice) >
                            Number(selectedProduct.newPrice) && (
                            <Typography
                              sx={{
                                textDecoration: "line-through",
                                color: "text.disabled",
                                fontSize: "0.9rem",
                              }}
                            >
                              {formatPrice(selectedProduct.previousPrice)}
                            </Typography>
                          )}
                        <Typography
                          sx={{
                            fontWeight: 900,
                            fontSize: "1.65rem",
                            color: "var(--color-secondary,#0d47a1)",
                            lineHeight: 1,
                          }}
                        >
                          {formatPrice(selectedProduct.newPrice)}
                        </Typography>
                        {hasDiscount && (
                          <Chip
                            label={discountLabel}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              backgroundColor: "#e53e3e",
                              color: "#fff",
                              borderRadius: 99,
                            }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Like / view / like-count stats bar */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mt: 0.25,
                        px: 1.5,
                        py: 1,
                        borderRadius: 3,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.025)",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"}`,
                      }}
                    >
                      {/* Like button */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          cursor: isLikeLoading ? "default" : "pointer",
                          userSelect: "none",
                          px: 1.25,
                          py: 0.6,
                          borderRadius: 99,
                          transition: "background 0.15s",
                          backgroundColor: liked
                            ? "rgba(229,62,62,0.12)"
                            : "transparent",
                          "&:active": { transform: "scale(0.93)" },
                        }}
                        onClick={(e) =>
                          !isLikeLoading && handleLikeClick(pid, e)
                        }
                      >
                        {liked ? (
                          <FavoriteIcon
                            sx={{
                              fontSize: "1.2rem",
                              color: "#e53e3e",
                              transform: "scale(1.15)",
                              transition: "transform 0.15s",
                            }}
                          />
                        ) : (
                          <FavoriteBorderIcon
                            sx={{
                              fontSize: "1.2rem",
                              color: isDark
                                ? "rgba(255,255,255,0.5)"
                                : "rgba(0,0,0,0.4)",
                            }}
                          />
                        )}
                        <Typography
                          sx={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: liked
                              ? "#e53e3e"
                              : isDark
                                ? "rgba(255,255,255,0.55)"
                                : "rgba(0,0,0,0.5)",
                            minWidth: 14,
                          }}
                        >
                          {likeCount > 0 ? likeCount : ""}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          width: "1px",
                          height: 20,
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.08)",
                          flexShrink: 0,
                        }}
                      />

                      {/* View count */}
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <VisibilityIcon
                          sx={{
                            fontSize: "1.1rem",
                            color: isDark
                              ? "rgba(255,255,255,0.4)"
                              : "rgba(0,0,0,0.35)",
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: isDark
                              ? "rgba(255,255,255,0.55)"
                              : "rgba(0,0,0,0.5)",
                          }}
                        >
                          {viewCount > 0 ? viewCount.toLocaleString() : "0"}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          width: "1px",
                          height: 20,
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.08)",
                          flexShrink: 0,
                        }}
                      />

                      {/* Like count */}
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <FavoriteIcon
                          sx={{
                            fontSize: "1rem",
                            color: isDark
                              ? "rgba(255,100,100,0.45)"
                              : "rgba(229,62,62,0.4)",
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: isDark
                              ? "rgba(255,255,255,0.55)"
                              : "rgba(0,0,0,0.5)",
                          }}
                        >
                          {likeCount > 0 ? likeCount.toLocaleString() : "0"}
                        </Typography>
                      </Box>

                      {selectedProduct.averageRating > 0 && (
                        <>
                          <Box
                            sx={{
                              width: "1px",
                              height: 20,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.08)",
                              flexShrink: 0,
                            }}
                          />
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <StarIcon
                              sx={{ fontSize: "1rem", color: "#ffc107" }}
                            />
                            <Typography
                              sx={{
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                color: isDark
                                  ? "rgba(255,255,255,0.55)"
                                  : "rgba(0,0,0,0.5)",
                              }}
                            >
                              {selectedProduct.averageRating.toFixed(1)}
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Box>

                    {/* Related products from same store */}
                    {related.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Box
                          sx={{
                            pb: 0.75,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.88rem",
                              color: isDark
                                ? "rgba(255,255,255,0.75)"
                                : "rgba(0,0,0,0.6)",
                            }}
                          >
                            {t("Related Products")}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "var(--color-primary,#1E6FD9)",
                              fontWeight: 600,
                            }}
                          >
                            {related.length}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            gap: 1.25,
                            overflowX: "auto",
                            pb: 1,
                            mx: -2.5,
                            px: 2.5,
                            "&::-webkit-scrollbar": { display: "none" },
                            scrollbarWidth: "none",
                          }}
                        >
                          {related.map((rel) => {
                            const relDiscount = calculateDiscount(
                              rel.previousPrice,
                              rel.newPrice,
                            );
                            const relHasDiscount = isDiscountValid(rel);
                            const relDiscountLabel =
                              relDiscount !== null
                                ? `-${relDiscount}%`
                                : t("Discount");
                            return (
                              <Box
                                key={rel._id}
                                onClick={() => setSelectedProduct(rel)}
                                sx={{
                                  flexShrink: 0,
                                  width: 120,
                                  borderRadius: 2.5,
                                  overflow: "hidden",
                                  backgroundColor: isDark
                                    ? "rgba(255,255,255,0.05)"
                                    : "rgba(0,0,0,0.03)",
                                  border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
                                  cursor: "pointer",
                                  "&:active": { transform: "scale(0.95)" },
                                }}
                              >
                                <Box sx={{ position: "relative" }}>
                                  {rel.image ? (
                                    <Box
                                      component="img"
                                      src={resolveMediaUrl(rel.image)}
                                      alt={locName(rel) || ""}
                                      sx={{
                                        width: "100%",
                                        height: 90,
                                        objectFit: "contain",
                                        backgroundColor: isDark
                                          ? "rgba(255,255,255,0.03)"
                                          : "rgba(0,0,0,0.02)",
                                        display: "block",
                                      }}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: "100%",
                                        height: 90,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: isDark
                                          ? "rgba(255,255,255,0.03)"
                                          : "rgba(0,0,0,0.02)",
                                      }}
                                    >
                                      <ShoppingCartIcon
                                        sx={{ fontSize: 28, opacity: 0.2 }}
                                      />
                                    </Box>
                                  )}
                                  {relHasDiscount && (
                                    <Box
                                      sx={{
                                        position: "absolute",
                                        top: 5,
                                        left: 5,
                                        background:
                                          "linear-gradient(135deg,#e53e3e,#c53030)",
                                        color: "#fff",
                                        fontSize: "0.58rem",
                                        fontWeight: 800,
                                        px: 0.6,
                                        py: 0.2,
                                        borderRadius: 0.75,
                                        pointerEvents: "none",
                                      }}
                                    >
                                      {relDiscountLabel}
                                    </Box>
                                  )}
                                </Box>
                                <Box sx={{ px: 0.75, py: 0.75 }}>
                                  <Typography
                                    sx={{
                                      fontSize: "0.68rem",
                                      fontWeight: 600,
                                      lineHeight: 1.3,
                                      color: isDark
                                        ? "rgba(255,255,255,0.85)"
                                        : "rgba(0,0,0,0.8)",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                      mb: 0.4,
                                    }}
                                  >
                                    {locName(rel) || "\u00A0"}
                                  </Typography>
                                  {rel.newPrice && (
                                    <Typography
                                      sx={{
                                        fontSize: "0.72rem",
                                        fontWeight: 800,
                                        color: "var(--color-secondary,#0d47a1)",
                                        lineHeight: 1,
                                      }}
                                    >
                                      {formatPrice(rel.newPrice)}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Login Notification Dialog */}
      <Dialog
        open={loginNotificationOpen}
        onClose={() => setLoginNotificationOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6" component="span">
              {t("Login Required")}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {loginNotificationReason === "review"
              ? t("You must login to leave reviews. Do you want to login?")
              : t("You must login to like products. Do you want to login?")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setLoginNotificationOpen(false)}
            variant="outlined"
            color="primary"
          >
            {t("No")}
          </Button>
          <Button
            onClick={() => {
              setLoginNotificationOpen(false);
              navigate("/login", {
                state: {
                  from: {
                    pathname: window.location.pathname,
                  },
                },
              });
            }}
            variant="contained"
            color="primary"
          >
            {t("Yes")}
          </Button>
        </DialogActions>
      </Dialog>

      <FullScreenImageModal
        open={Boolean(productImageFullscreen)}
        onClose={() => setProductImageFullscreen(null)}
        imageUrl={productImageFullscreen?.url}
        alt={productImageFullscreen?.alt || ""}
      />

      {/* Scroll to Top Button */}
      {/* {showScrollTop && (
        <Fab
          color="primary"
          aria-label="scroll to top"
          onClick={scrollToTop}
          sx={{
            position: "fixed",
            bottom: { xs: 80, sm: 16 }, // Higher on mobile to avoid bottom navigation
            right: { xs: 16, sm: 16 },
            zIndex: 1000,
            backgroundColor:
              theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
            color: "white",
            width: { xs: 48, sm: 56 }, // Slightly smaller on mobile
            height: { xs: 48, sm: 56 },
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "dark" ? "#FFA94D" : "#1E6FD9",
              transform: "translateY(-2px)",
            },
            transition: "all 0.3s ease",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <KeyboardArrowUpIcon sx={{ fontSize: { xs: "20px", sm: "24px" } }} />
        </Fab>
      )} */}
    </Box>
  );
};

export default MainPage;
