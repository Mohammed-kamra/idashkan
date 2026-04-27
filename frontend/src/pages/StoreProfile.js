import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from "react";
import {
  getSavedProductLayout,
  saveProductLayout,
} from "../utils/productLayoutPreference";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Alert,
  useTheme,
  Paper,
  Divider,
  IconButton,
  Snackbar,
  Skeleton,
} from "@mui/material";
import {
  Business,
  WhatsApp,
  VideoLibrary,
  WorkOutline,
  ArrowForward,
  ArrowBack,
} from "@mui/icons-material";
import {
  productAPI,
  cartOrderLogAPI,
} from "../services/api";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import { useTranslation } from "react-i18next";
import Loader from "../components/Loader";
import { useUserTracking } from "../hooks/useUserTracking";
import { resolveMediaUrl } from "../utils/mediaUrl";
import {
  normalizeWhatsAppUrl,
  openWhatsAppLink,
} from "../utils/openWhatsAppLink";
import {
  isExpiryStillValid,
  getExpiryRemainingInfo,
  formatExpiryChipLabel,
  formatExpiryExpiresPrefixedLabel,
  shouldShowExpiryChip,
  expiryChipBg,
  expiryGiftCardBg,
  formatExpiryDateDdMmYyyy,
} from "../utils/expiryDate";
import { useAuth } from "../context/AuthContext";
import { isAdminEmail } from "../utils/adminAccess";
import StoreBranchesShowcase from "../components/StoreBranches_Showcase";
import ProductLayoutToggle from "../components/ProductLayoutToggle";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { formatPriceDigits } from "../utils/formatPriceNumber";
import {
  trackOwnerContactClick,
  getOwnerAnalyticsSessionId,
} from "../utils/ownerAnalyticsTrack";
import StoreTabs from "../components/store/StoreTabs";
import ProductsTab from "../components/store/ProductsTab";
import StoreHeader from "../components/store/StoreHeader";
import StoreProductCard from "../components/store/ProductCard";
import FloatingCartButton from "../components/store/FloatingCartButton";
import useStoreProfile from "../hooks/useStoreProfile";
import useStoreProducts from "../hooks/useStoreProducts";
import useStoreCart from "../hooks/useStoreCart";
import useStoreFollow from "../hooks/useStoreFollow";
import useStoreAnalytics from "../hooks/useStoreAnalytics";

const GiftsTab = lazy(() => import("../components/store/GiftsTab"));
const ReelsTab = lazy(() => import("../components/store/ReelsTab"));
const JobsTab = lazy(() => import("../components/store/JobsTab"));
const CartDrawer = lazy(() => import("../components/store/CartDrawer"));
const ProductDetailDialog = lazy(() => import("../components/ProductDetailDialog"));
const AdminProductEditDialog = lazy(() =>
  import("../components/AdminProductEditDialog"),
);

const PROFILE_GRID_PAGE_SIZE = 8;

function parseProductPrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Cart/localStorage snapshot: include name* so `locName` respects data language. */
function cartProductSnapshot(p) {
  if (!p?._id) return null;
  return {
    _id: p._id,
    name: p.name,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    nameKu: p.nameKu,
    newPrice: p.newPrice,
    previousPrice: p.previousPrice,
    isDiscount: p.isDiscount,
    status: p.status,
    expireDate: p.expireDate,
  };
}

const StoreProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar" || i18n.language === "ku";
  const { locName, locDescription, locTitle, locAddress } =
    useLocalizedContent();
  const {
    toggleLike,
    toggleFollowStore,
    isProductLiked,
    isStoreFollowed,
    recordView,
  } = useUserTracking();
  const { user } = useAuth();
  const profileAdminEdit = isAdminEmail(user);
  const [followerCount, setFollowerCount] = useState(0);
  const {
    store,
    products,
    setProducts,
    gifts,
    reels,
    jobs,
    loading,
    error,
    loadInitial,
    loadGifts,
    loadReels,
    loadJobs,
    refreshAll,
    giftsLoaded,
    reelsLoaded,
    jobsLoaded,
  } = useStoreProfile(id);
  const { trackProfileView, trackOrderRequest } = useStoreAnalytics();
  const { followLoading, handleToggleFollow } = useStoreFollow({
    toggleFollowStore,
  });

  const [selectedJob, setSelectedJob] = useState(null);
  const [tabsPrechecked, setTabsPrechecked] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "discounts") return "discounts";
    if (tabParam === "all") return "all";
    if (tabParam === "gifts") return "gifts";
    if (tabParam === "reels") return "reels";
    if (tabParam === "jobs") return "jobs";
    return "discounts";
  });
  const [expandedTypes, setExpandedTypes] = useState({});
  const [displayCounts, setDisplayCounts] = useState({});
  const [productLayout, setProductLayoutState] = useState(() =>
    getSavedProductLayout(),
  );
  const setProductLayout = useCallback((layout) => {
    setProductLayoutState(layout);
    saveProductLayout(layout);
  }, []);
  const [gridCategoryVisible, setGridCategoryVisible] = useState({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState({});
  const { cartCount } = useStoreCart(cartItems);
  const [cartToast, setCartToast] = useState({ open: false, text: "" });
  const [orderWhatsAppConfirmOpen, setOrderWhatsAppConfirmOpen] =
    useState(false);
  const notifyWhatsAppFallback = useCallback((hint) => {
    setCartToast({ open: true, text: hint });
  }, []);
  /** Incremented on each add-to-cart to replay floating cart button animation */
  const [cartPulseKey, setCartPulseKey] = useState(0);
  const cartButtonRef = useRef(null);
  const cartCloseButtonRef = useRef(null);
  const [cartSyncing, setCartSyncing] = useState(false);
  const [cartHydrated, setCartHydrated] = useState(false);

  // Product detail dialog state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [adminEditProduct, setAdminEditProduct] = useState(null);

  // Like functionality states
  const [likeCounts, setLikeCounts] = useState({});
  const [likeStates, setLikeStates] = useState({});
  const [likeLoading, setLikeLoading] = useState({});

  // Filter states
  const [filters] = useState({
    name: "",
    brand: "",
    barcode: "",
    type: "",
  });

  // Branches toggle state

  const productViewRecordedRef = useRef(new Set());

  const handleProductBecameVisible = useCallback(
    async (productId) => {
      const result = await recordView(productId);
      if (result?.success && result?.data?.viewCount != null) {
        setProducts((prev) =>
          prev.map((p) =>
            String(p._id) === String(productId)
              ? { ...p, viewCount: result.data.viewCount }
              : p,
          ),
        );
      }
    },
    [recordView],
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    productViewRecordedRef.current = new Set();
  }, [id]);

  useEffect(() => {
    setGridCategoryVisible({});
  }, [id, productLayout]);

  useEffect(() => {
    if (id) {
      loadInitial();
    }
  }, [id, loadInitial]);

  useEffect(() => {
    if (store?._id && id) {
      trackProfileView(id);
    }
  }, [store?._id, id, trackProfileView]);

  useEffect(() => {
    if (!store) return;
    setFollowerCount(store?.followerCount ?? 0);
  }, [store]);

  useEffect(() => {
    if (activeTabKey === "gifts" && !giftsLoaded) {
      void loadGifts();
    } else if (activeTabKey === "reels" && !reelsLoaded) {
      void loadReels();
    } else if (activeTabKey === "jobs" && !jobsLoaded) {
      void loadJobs();
    }
  }, [
    activeTabKey,
    giftsLoaded,
    reelsLoaded,
    jobsLoaded,
    loadGifts,
    loadReels,
    loadJobs,
  ]);

  useEffect(() => {
    setTabsPrechecked(false);
  }, [id]);

  useEffect(() => {
    if (loading || !store?._id || tabsPrechecked) return;
    let cancelled = false;
    (async () => {
      await Promise.all([loadGifts(), loadReels(), loadJobs()]);
      if (!cancelled) setTabsPrechecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, store?._id, tabsPrechecked, loadGifts, loadReels, loadJobs]);

  // Load/save cart per store (only for delivery stores)
  useEffect(() => {
    const storeId = store?._id || id;
    if (!storeId || !store?.isHasDelivery) return;
    const key = `cart.store.${storeId}.v1`;
    setCartHydrated(false);
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      setCartItems(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setCartItems({});
    }
    setCartHydrated(true);
  }, [store?._id, store?.isHasDelivery, id]);

  useEffect(() => {
    const storeId = store?._id || id;
    if (!storeId || !store?.isHasDelivery || !cartHydrated) return;
    const key = `cart.store.${storeId}.v1`;
    try {
      localStorage.setItem(key, JSON.stringify(cartItems || {}));
    } catch {
      // ignore
    }
  }, [cartItems, store?._id, store?.isHasDelivery, id, cartHydrated]);

  // Initialize like states when products change
  useEffect(() => {
    const initialLikeCounts = {};
    const initialLikeStates = {};

    products.forEach((product) => {
      initialLikeCounts[product._id] = product.likeCount || 0;
      initialLikeStates[product._id] = isProductLiked(product._id);
    });

    setLikeCounts(initialLikeCounts);
    setLikeStates(initialLikeStates);
  }, [products, isProductLiked]);

  // Keep cart count correct while browsing the store:
  // if a product becomes pending/expired/deleted, remove it from cart immediately.
  // IMPORTANT: skip while `loading` — otherwise `products` is still [] and we wipe localStorage cart on refresh.
  useEffect(() => {
    if (!store?.isHasDelivery || !cartHydrated) return;
    if (loading) return;
    if (!Array.isArray(products)) return;
    pruneCartUsingProducts(products);
  }, [products, store?.isHasDelivery, cartHydrated, loading]);

  const fetchStoreData = useCallback(async () => {
    await refreshAll();
  }, [refreshAll]);

  const calculateDiscount = (previousPrice, newPrice) => {
    if (!previousPrice || !newPrice || previousPrice <= newPrice) return 0;
    return Math.round(((previousPrice - newPrice) / previousPrice) * 100);
  };

  const formatPrice = (price) => {
    if (typeof price !== "number") return `${t("ID")} 0`;
    return ` ${formatPriceDigits(price)} ${t("ID")}`;
  };

  const addToCart = (product, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!store?.isHasDelivery) return;
    if (!product?._id) return;
    setCartItems((prev) => {
      const next = { ...(prev || {}) };
      const existing = next[product._id];
      next[product._id] = {
        product: cartProductSnapshot(product),
        qty: Math.min(99, (Number(existing?.qty) || 0) + 1),
      };
      return next;
    });
    setCartPulseKey((k) => k + 1);
  };

  const updateCartQty = (productId, qty) => {
    setCartItems((prev) => {
      const next = { ...(prev || {}) };
      const q = Math.max(0, Math.min(99, Number(qty) || 0));
      if (q <= 0) {
        delete next[productId];
        return next;
      }
      next[productId] = { ...(next[productId] || {}), qty: q };
      return next;
    });
  };

  const clearCart = () => setCartItems({});

  const getStoreWhatsAppUrl = () => {
    const raw = store?.contactInfo?.whatsapp || "";
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (/^(https?:\/\/)?(wa\.me|api\.whatsapp\.com)\//i.test(trimmed)) {
      const withProto = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
      return normalizeWhatsAppUrl(withProto);
    }
    const digits = trimmed.replace(/[^\d]/g, "");
    return digits ? `https://api.whatsapp.com/send?phone=${digits}` : null;
  };

  const buildWhatsAppOrderPayload = () => {
    const orderId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const storeName = locName(store) || "";
    const lines = [];
    lines.push(`Order To: ${storeName}`.trim());
    lines.push("");
    const sortedItems = Object.values(cartItems || {})
      .filter((i) => (Number(i?.qty) || 0) > 0 && i?.product?._id)
      .sort((a, b) =>
        String(locName(a.product) || "").localeCompare(
          String(locName(b.product) || ""),
        ),
      );
    const items = sortedItems.map((item) => ({
      productId: String(item.product._id),
      qty: Number(item.qty) || 0,
      productName: locName(item.product) || "",
    }));
    sortedItems.forEach((item, idx) => {
      const name = locName(item.product) || "";
      const qty = Number(item.qty) || 0;
      lines.push(`${idx + 1}) ${name} x${qty}`);
    });
    lines.push("");
    const orderNow = new Date();
    const dd = String(orderNow.getDate()).padStart(2, "0");
    const mm = String(orderNow.getMonth() + 1).padStart(2, "0");
    const yyyy = orderNow.getFullYear();
    lines.push(
      `Order Date: ${dd}/${mm}/${yyyy} ${orderNow.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })}`.trim(),
    );
    lines.push(`Order ID: ${orderId}`.trim());
    lines.push(`Ordered Via: iDashkan App`);
    lines.push("Thank you.");
    const messageText = lines.join("\n");
    return {
      orderId,
      messageText,
      items,
      storeName,
      storeNamePrimary: store?.name || "",
      storeNameEn: store?.nameEn || "",
      storeNameAr: store?.nameAr || "",
      storeNameKu: store?.nameKu || "",
    };
  };

  const requestOrderWhatsApp = () => {
    const wa = getStoreWhatsAppUrl();
    if (!wa) {
      setCartToast({ open: true, text: t("WhatsApp number not found") });
      return;
    }
    setOrderWhatsAppConfirmOpen(true);
  };

  const confirmOrderWhatsApp = () => {
    const wa = getStoreWhatsAppUrl();
    if (!wa) {
      setOrderWhatsAppConfirmOpen(false);
      setCartToast({ open: true, text: t("WhatsApp number not found") });
      return;
    }
    const payload = buildWhatsAppOrderPayload();
    const text = encodeURIComponent(payload.messageText);
    const url = wa.includes("?") ? `${wa}&text=${text}` : `${wa}?text=${text}`;
    const storeIdForLog = store?._id || id;
    cartOrderLogAPI
      .log({
        storeId: storeIdForLog,
        storeName: payload.storeName,
        storeNamePrimary: payload.storeNamePrimary,
        storeNameEn: payload.storeNameEn,
        storeNameAr: payload.storeNameAr,
        storeNameKu: payload.storeNameKu,
        orderId: payload.orderId,
        items: payload.items,
        messageText: payload.messageText,
        sessionId: getOwnerAnalyticsSessionId(),
      })
      .catch(() => {});
    trackOrderRequest(id, "whatsapp");
    openWhatsAppLink(url, { onClipboardFallback: notifyWhatsAppFallback });
    setOrderWhatsAppConfirmOpen(false);
    setCartOpen(false);
    clearCart();
  };

  const isProductAvailableForCart = (p) => {
    if (!p?._id) return false;
    // Pending products should never be orderable (tolerate casing/legacy values)
    const statusNorm = String(p?.status || "published")
      .toLowerCase()
      .trim();
    if (statusNorm !== "published") return false;
    // Expired products should be removed
    const exp = p?.expireDate ? new Date(p.expireDate).getTime() : NaN;
    if (Number.isFinite(exp) && exp <= Date.now()) return false;
    return true;
  };

  const syncCartWithLatestProducts = async () => {
    if (!store?.isHasDelivery) return;
    try {
      setCartSyncing(true);
      // Re-fetch to ensure we don't show stale cart items.
      const productsResponse = await productAPI.getByStore(id);
      const latestProducts = Array.isArray(productsResponse?.data)
        ? productsResponse.data
        : [];
      setProducts(latestProducts);

      const availableById = new Map(
        latestProducts
          .filter(isProductAvailableForCart)
          .map((p) => [String(p._id), p]),
      );

      setCartItems((prev) => {
        const next = {};
        Object.entries(prev || {}).forEach(([pid, item]) => {
          const p = availableById.get(String(pid));
          if (!p) return;
          const qty = Math.max(0, Math.min(99, Number(item?.qty) || 0));
          if (qty <= 0) return;
          next[String(pid)] = {
            product: cartProductSnapshot(p),
            qty,
          };
        });
        return next;
      });
    } catch {
      // If refresh fails, keep current cart but still filter obvious expiries
      setCartItems((prev) => {
        const next = { ...(prev || {}) };
        Object.keys(next).forEach((pid) => {
          const ed = next[pid]?.product?.expireDate;
          if (ed && !isExpiryStillValid(ed)) delete next[pid];
          if (
            String(next[pid]?.product?.status || "published")
              .toLowerCase()
              .trim() !== "published"
          )
            delete next[pid];
        });
        return next;
      });
    } finally {
      setCartSyncing(false);
    }
  };

  const syncCartWithLatestProductsRef = useRef(syncCartWithLatestProducts);
  syncCartWithLatestProductsRef.current = syncCartWithLatestProducts;

  /** Deep link from Shopping draft cart: `/stores/:id?cart=1` opens cart dialog after hydrate + sync */
  useEffect(() => {
    const cartParam = searchParams.get("cart");
    const openCartFromUrl =
      cartParam === "1" ||
      cartParam === "true" ||
      cartParam === "open" ||
      cartParam === "yes";
    if (!openCartFromUrl) return;
    if (loading) return;
    if (!store?.isHasDelivery) {
      const next = new URLSearchParams(searchParams);
      next.delete("cart");
      setSearchParams(next, { replace: true });
      return;
    }
    if (!cartHydrated) return;

    let cancelled = false;
    (async () => {
      await syncCartWithLatestProductsRef.current();
      if (cancelled) return;
      setCartOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("cart");
      setSearchParams(next, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    cartHydrated,
    loading,
    store?.isHasDelivery,
    setSearchParams,
  ]);

  const pruneCartUsingProducts = (latestProducts = []) => {
    const availableById = new Map(
      (Array.isArray(latestProducts) ? latestProducts : [])
        .filter(isProductAvailableForCart)
        .map((p) => [String(p._id), p]),
    );

    setCartItems((prev) => {
      const prevObj = prev && typeof prev === "object" ? prev : {};
      const next = {};
      Object.entries(prevObj).forEach(([pid, item]) => {
        const p = availableById.get(String(pid));
        if (!p) return;
        const qty = Math.max(0, Math.min(99, Number(item?.qty) || 0));
        if (qty <= 0) return;
        next[String(pid)] = {
          product: cartProductSnapshot(p),
          qty,
        };
      });

      // Avoid unnecessary state updates (prevents extra renders)
      const prevKeys = Object.keys(prevObj);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) return next;
      for (const k of prevKeys) {
        const a = prevObj[k];
        const b = next[k];
        if (!b) return next;
        if (String(a?.product?._id || "") !== String(b?.product?._id || ""))
          return next;
        if ((Number(a?.qty) || 0) !== (Number(b?.qty) || 0)) return next;
      }
      return prevObj;
    });
  };

  // Helper function to check if a discounted product has expired
  const isDiscountValid = (product) => {
    if (!product.isDiscount) return false;

    if (!product.expireDate) return true;

    return isExpiryStillValid(product.expireDate);
  };

  // Get product category type name from categoryId (populated) and categoryTypeId
  const getProductCategoryTypeName = (product) => {
    if (!product.categoryId || !product.categoryTypeId) {
      return locName(product.categoryId) || "";
    }
    const category = product.categoryId;
    if (!category.types || !Array.isArray(category.types)) {
      return locName(category) || "";
    }
    const categoryType =
      category.types.find(
        (type) => type._id?.toString() === product.categoryTypeId?.toString(),
      ) || category.types.find((type) => type.name === product.categoryTypeId);
    return categoryType ? locName(categoryType) : locName(category) || "";
  };

  const { discountedProducts, nonDiscountedProducts, groupProductsByType } =
    useStoreProducts({
      products,
      filters,
      isDiscountValid,
      getProductCategoryTypeName,
    });

  // (tabs are computed later, after discountedProducts is initialized)

  // Toggle expanded state for product types
  const toggleExpanded = (type) => {
    setExpandedTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));

    // Reset display count when collapsing
    if (expandedTypes[type]) {
      setDisplayCounts((prev) => ({
        ...prev,
        [type]: 10,
      }));
    }
  };

  // Load more products for a specific type
  const loadMoreProducts = (type) => {
    setDisplayCounts((prev) => ({
      ...prev,
      [type]: (prev[type] || 10) + 20,
    }));
  };

  const loadMoreGridForType = (type) => {
    setGridCategoryVisible((prev) => ({
      ...prev,
      [type]: (prev[type] ?? PROFILE_GRID_PAGE_SIZE) + PROFILE_GRID_PAGE_SIZE,
    }));
  };

  // Handle like button click (works for both logged-in and guest/device users)
  const handleLikeClick = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent multiple rapid clicks
    if (likeLoading[productId]) return;

    // Optimistic update
    const currentLikeState = likeStates[productId];
    const currentLikeCount = likeCounts[productId];

    setLikeLoading((prev) => ({ ...prev, [productId]: true }));
    setLikeStates((prev) => ({ ...prev, [productId]: !currentLikeState }));
    setLikeCounts((prev) => ({
      ...prev,
      [productId]: currentLikeState
        ? currentLikeCount - 1
        : currentLikeCount + 1,
    }));

    try {
      const result = await toggleLike(productId);

      if (!result.success) {
        // Revert optimistic update on failure
        setLikeStates((prev) => ({ ...prev, [productId]: currentLikeState }));
        setLikeCounts((prev) => ({ ...prev, [productId]: currentLikeCount }));
      }
    } catch (error) {
      // Revert optimistic update on error
      setLikeStates((prev) => ({ ...prev, [productId]: currentLikeState }));
      setLikeCounts((prev) => ({ ...prev, [productId]: currentLikeCount }));
    } finally {
      setLikeLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  // Render gift card
  const renderGiftCard = useCallback((gift) => {
    const giftExp = getExpiryRemainingInfo(gift.expireDate);
    const isDark = theme.palette.mode === "dark";

    return (
      <Card
        key={gift._id}
        onClick={() => {
          setSelectedGift(gift);
          setDialogOpen(true);
        }}
        sx={{
          display: "flex",
          height: { xs: 140, sm: 200 },
          width: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          background: isDark
            ? "linear-gradient(145deg, #1e2a3a, #243040)"
            : "#fff",
          border: isDark
            ? "1px solid rgba(255,255,255,0.07)"
            : "1px solid #f0f2f5",
          boxShadow: isDark
            ? "0 4px 16px rgba(0,0,0,0.35)"
            : "0 2px 12px rgba(0,0,0,0.06)",
          cursor: "pointer",
          transition: "all 0.25s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: isDark
              ? "0 8px 28px rgba(0,0,0,0.5)"
              : "0 8px 24px rgba(0,0,0,0.1)",
          },
        }}
      >
        {/* Gift Image */}
        <Box
          sx={{
            width: { xs: 120, sm: 180 },
            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <CardMedia
            component="img"
            image={resolveMediaUrl(gift.image)}
            alt={gift.description}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to right, rgba(0,0,0,0) 60%, " +
                (isDark ? "rgba(30,42,58,0.8)" : "rgba(255,255,255,0.6)") +
                " 100%)",
              pointerEvents: "none",
            }}
          />
        </Box>

        {/* Gift Content */}
        <CardContent
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            p: { xs: "12px !important", sm: "16px !important" },
            minWidth: 0,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "0.82rem", sm: "0.95rem" },
              lineHeight: 1.4,
              color: isDark ? "rgba(255,255,255,0.92)" : "#111827",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              mb: 1,
            }}
          >
            {gift.description}
          </Typography>

          {gift.brandId && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                mb: 0.8,
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/brands/${gift.brandId._id}?tab=gifts`);
              }}
            >
              <Business
                sx={{
                  fontSize: 14,
                  color: "var(--brand-accent-orange, #ff8c00)",
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "var(--brand-accent-orange, #ff8c00)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {locName(gift.brandId)}
              </Typography>
            </Box>
          )}

          <Box>
            {gift.expireDate ? (
              <Chip
                label={formatExpiryExpiresPrefixedLabel(giftExp, t)}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  bgcolor: expiryGiftCardBg(giftExp),
                  color: "white",
                  "& .MuiChip-label": { px: 0.8 },
                }}
              />
            ) : (
              <Chip
                label={t("No expiry")}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.7rem",
                  bgcolor: isDark ? "rgba(255,255,255,0.15)" : "#e5e7eb",
                  color: isDark ? "white" : "#374151",
                  "& .MuiChip-label": { px: 0.8 },
                }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }, [theme.palette.mode, navigate, locName, t]);

  // Render product card — modern premium card
  /** @param {boolean|'ifPresent'} showPriceMode @param {'row'|'grid2'} layoutMode */
  const renderProductCard = useCallback(
    (product, index, showPriceMode = true, layoutMode = "row") => {
      return (
        <StoreProductCard
          key={product?._id || `${layoutMode}-${index}`}
          product={product}
          index={index}
          layoutMode={layoutMode}
          showPriceMode={showPriceMode}
          theme={theme}
          t={t}
          locName={locName}
          parseProductPrice={parseProductPrice}
          calculateDiscount={calculateDiscount}
          likeStates={likeStates}
          likeLoading={likeLoading}
          isProductLiked={isProductLiked}
          handleLikeClick={handleLikeClick}
          profileAdminEdit={profileAdminEdit}
          setAdminEditProduct={setAdminEditProduct}
          setSelectedProduct={setSelectedProduct}
          setProductDialogOpen={setProductDialogOpen}
          storeHasDelivery={store?.isHasDelivery}
          addToCart={addToCart}
          formatPrice={formatPrice}
          handleProductBecameVisible={handleProductBecameVisible}
          productViewRecordedRef={productViewRecordedRef}
        />
      );
    },
    [
      theme,
      t,
      locName,
      likeStates,
      likeLoading,
      isProductLiked,
      handleLikeClick,
      profileAdminEdit,
      store?.isHasDelivery,
      addToCart,
      formatPrice,
      handleProductBecameVisible,
    ],
  );

  // Render products grouped by type — row scroll (MainPage-style) or 2-column grid
  /** @param {boolean|'ifPresent'} showPriceMode */
  const renderProductsByType = (productList, showPriceMode = true) => {
    const groupedProducts = groupProductsByType(productList);
    const isDark = theme.palette.mode === "dark";

    return Object.entries(groupedProducts).map(([type, typeProducts]) => {
      const isExpanded = expandedTypes[type];
      const currentDisplayCount = displayCounts[type] || 20;
      const rowSliceEnd = isExpanded
        ? currentDisplayCount
        : Math.min(20, typeProducts.length);
      const rowDisplayProducts = typeProducts.slice(0, rowSliceEnd);
      const rowHasMore =
        typeProducts.length > (isExpanded ? currentDisplayCount : 20);

      const gridVisible = gridCategoryVisible[type] ?? PROFILE_GRID_PAGE_SIZE;
      const gridDisplayProducts = typeProducts.slice(0, gridVisible);
      const gridHasMore = typeProducts.length > gridVisible;

      const displayProducts =
        productLayout === "grid2" ? gridDisplayProducts : rowDisplayProducts;
      const hasMore = productLayout === "grid2" ? gridHasMore : rowHasMore;

      return (
        <Box
          key={type}
          sx={{
            mb: 2,
            borderRadius: "18px",
            overflow: "hidden",
            background: isDark
              ? "linear-gradient(145deg,#1a2236,#1e2a40)"
              : "#fff",
            border: isDark
              ? "1px solid rgba(255,255,255,0.07)"
              : "1px solid #eef0f4",
            boxShadow: isDark
              ? "0 4px 20px rgba(0,0,0,0.3)"
              : "0 2px 14px rgba(0,0,0,0.05)",
          }}
        >
          {/* Category header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: { xs: 1.5, sm: 2 },
              py: { xs: 1.2, sm: 1.4 },
              borderBottom: isDark
                ? "1px solid rgba(255,255,255,0.07)"
                : "1px solid #f3f4f6",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "9px",
                  background:
                    "linear-gradient(135deg,var(--brand-accent-orange,#ff8c00),#d97706)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(255,140,0,0.35)",
                }}
              >
                <StorefrontIcon sx={{ fontSize: 16, color: "white" }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  color: isDark ? "rgba(255,255,255,0.92)" : "#111827",
                  lineHeight: 1.2,
                }}
              >
                {t(type)}
              </Typography>
              <Chip
                label={`${typeProducts.length}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  bgcolor: isDark
                    ? "rgba(255,140,0,0.2)"
                    : "rgba(255,140,0,0.1)",
                  color: "var(--brand-accent-orange,#ff8c00)",
                  "& .MuiChip-label": { px: 0.8 },
                }}
              />
            </Box>
          </Box>

          {productLayout === "grid2" ? (
            <>
              <Box
                sx={{
                  px: { xs: 1, sm: 1.5 },
                  pt: { xs: 1.2, sm: 1.5 },
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: { xs: 1, sm: 1.2 },
                }}
              >
                {displayProducts.map((product, index) =>
                  renderProductCard(product, index, showPriceMode, "grid2"),
                )}
              </Box>
              {hasMore && (
                <Box sx={{ px: { xs: 1, sm: 1.5 }, py: 1.5 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => loadMoreGridForType(type)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: "12px",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(30,111,217,0.35)",
                      color: isDark
                        ? "rgba(255,255,255,0.85)"
                        : "var(--brand-primary-blue, #1E6FD9)",
                      "&:hover": {
                        borderColor: "var(--brand-accent-orange,#ff8c00)",
                        backgroundColor: "rgba(255,140,0,0.06)",
                      },
                    }}
                  >
                    {t("Show more")}
                  </Button>
                </Box>
              )}
            </>
          ) : (
            <Box
              sx={{
                px: { xs: 1, sm: 1.5 },
                py: { xs: 1.2, sm: 1.5 },
                display: "flex",
                gap: { xs: 1, sm: 1.2 },
                overflowX: "auto",
                overflowY: "hidden",
                scrollbarWidth: "thin",
                scrollbarColor: isDark
                  ? "#4a5568 transparent"
                  : "#d1d5db transparent",
                "&::-webkit-scrollbar": { height: 4 },
                "&::-webkit-scrollbar-track": { background: "transparent" },
                "&::-webkit-scrollbar-thumb": {
                  background: isDark ? "#4a5568" : "#d1d5db",
                  borderRadius: 4,
                },
              }}
            >
              {displayProducts.map((product, index) =>
                renderProductCard(product, index, showPriceMode, "row"),
              )}
              {hasMore && (
                <Box
                  onClick={() =>
                    isExpanded ? loadMoreProducts(type) : toggleExpanded(type)
                  }
                  sx={{
                    flexShrink: 0,
                    width: { xs: 80, sm: 100 },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    borderRadius: "16px",
                    cursor: "pointer",
                    border: isDark
                      ? "1px dashed rgba(255,255,255,0.15)"
                      : "1px dashed #d1d5db",
                    color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "var(--brand-accent-orange,#ff8c00)",
                      color: "var(--brand-accent-orange,#ff8c00)",
                      background: "rgba(255,140,0,0.05)",
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      textAlign: "center",
                      lineHeight: 1.3,
                    }}
                  >
                    +{typeProducts.length - displayProducts.length} {t("more")}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      );
    });
  };

  const tabDefs = useMemo(
    () => [
      {
        key: "discounts",
        count: discountedProducts.length,
        label: `${t("Discounts")} (${discountedProducts.length})`,
        icon: <LocalOfferIcon />,
      },
      {
        key: "all",
        count: nonDiscountedProducts.length,
        label: `${t("All Products")} (${nonDiscountedProducts.length})`,
        icon: <StorefrontIcon />,
      },
      {
        key: "gifts",
        count: gifts.length,
        label: giftsLoaded ? `${t("Gifts")} (${gifts.length})` : t("Gifts"),
        icon: <CardGiftcardIcon />,
      },
      {
        key: "reels",
        count: reels.length,
        label: reelsLoaded ? `${t("Reels")} (${reels.length})` : t("Reels"),
        icon: <VideoLibrary />,
      },
      {
        key: "jobs",
        count: jobs.length,
        label: jobsLoaded ? `${t("Jobs")} (${jobs.length})` : t("Jobs"),
        icon: <WorkOutline />,
      },
    ],
    [
      discountedProducts.length,
      nonDiscountedProducts.length,
      gifts.length,
      giftsLoaded,
      reels.length,
      reelsLoaded,
      jobs.length,
      jobsLoaded,
      t,
    ],
  );
  const visibleTabs = useMemo(
    () =>
      tabDefs.filter((d) => Number(d.count) > 0),
    [tabDefs],
  );

  useEffect(() => {
    if (visibleTabs.length === 0) {
      setActiveTabKey("");
      return;
    }
    if (!visibleTabs.some((d) => d.key === activeTabKey)) {
      setActiveTabKey(visibleTabs[0].key);
    }
  }, [activeTabKey, visibleTabs]);

  const handleTabChange = useCallback((nextTabKey) => {
    setActiveTabKey(nextTabKey || "");
  }, []);
  const handleHeaderFollowToggle = useCallback(() => {
    handleToggleFollow(store?._id, followerCount, setFollowerCount);
  }, [handleToggleFollow, store?._id, followerCount]);
  const handleHeaderLocationClick = useCallback(
    (channel) => trackOwnerContactClick("store", id, channel),
    [id],
  );
  const handleHeaderContactClick = useCallback(
    (channel) => trackOwnerContactClick("store", id, channel),
    [id],
  );
  const handleHeaderWhatsAppClick = useCallback(
    (href) => {
      trackOwnerContactClick("store", id, "whatsapp");
      openWhatsAppLink(href, {
        onClipboardFallback: notifyWhatsAppFallback,
      });
    },
    [id, notifyWhatsAppFallback],
  );
  const handleFloatingCartOpen = useCallback(
    async (e) => {
      e?.currentTarget?.blur?.();
      await syncCartWithLatestProducts();
      setCartOpen(true);
    },
    [syncCartWithLatestProducts],
  );

  const renderStoreProfileSkeleton = () => {
    const cardW = { xs: 155, sm: 190 };
    return (
      <Box
        sx={{
          py: { xs: 8, sm: 4 },
          px: { xs: 1, sm: 1.5, md: 3 },
          pb: { xs: 10, sm: 4 },
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Back button skeleton */}
        <Skeleton
          variant="rounded"
          width={88}
          height={36}
          sx={{ mb: 2, borderRadius: "999px" }}
        />
        {/* Hero header skeleton (StoreHeader layout) */}
        <Box
          sx={{
            width: "100%",
            borderRadius: "20px",
            mb: 3,
            p: { xs: 2, sm: 2.5 },
            border: (theme) =>
              theme.palette.mode === "dark"
                ? "1px solid rgba(255,255,255,0.09)"
                : "1px solid rgba(0,0,0,0.05)",
            background:
              theme.palette.mode === "dark"
                ? "linear-gradient(135deg,#1a2840 0%, #244b7f 100%)"
                : "linear-gradient(135deg,#2a72d9 0%, #4a90e2 100%)",
          }}
        >
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", mb: 1.5 }}>
            <Skeleton variant="rounded" width={74} height={74} sx={{ borderRadius: "18px", flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="52%" height={32} />
              <Box sx={{ display: "flex", gap: 1, mt: 0.5, mb: 0.5 }}>
                <Skeleton variant="rounded" width={48} height={22} sx={{ borderRadius: "999px" }} />
                <Skeleton variant="rounded" width={76} height={22} sx={{ borderRadius: "999px" }} />
              </Box>
              <Skeleton variant="text" width="34%" height={18} />
            </Box>
          </Box>
          <Skeleton variant="text" width="66%" height={18} />
          <Skeleton variant="text" width="42%" height={18} />
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="circular" width={28} height={28} />
            ))}
          </Box>
        </Box>
        {/* Tab bar skeleton — horizontal scroll */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 3,
            overflowX: "auto",
            overflowY: "hidden",
            pb: 0.5,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {[112, 124, 96, 88, 84].map((w, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={w}
              height={38}
              sx={{ borderRadius: "999px", flexShrink: 0 }}
            />
          ))}
        </Box>
        {/* Product layout toggle row skeleton */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
          <Skeleton
            variant="rounded"
            width={84}
            height={34}
            sx={{ borderRadius: "999px" }}
          />
        </Box>
        {/* Category blocks + horizontal product row (matches renderProductsByType) */}
        {[1, 2].map((g) => (
          <Box
            key={g}
            sx={{
              mb: 2,
              borderRadius: "18px",
              overflow: "hidden",
              border: (theme) =>
                theme.palette.mode === "dark"
                  ? "1px solid rgba(255,255,255,0.07)"
                  : "1px solid #eef0f4",
            }}
          >
            <Box
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1.2, sm: 1.4 },
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Skeleton variant="rounded" width={30} height={30} sx={{ borderRadius: "9px" }} />
              <Skeleton
                variant="text"
                width="45%"
                height={28}
                sx={{ mb: 0.5, flexShrink: 0 }}
              />
              <Skeleton variant="rounded" width={28} height={20} sx={{ borderRadius: "999px" }} />
            </Box>
            <Box
              sx={{
                px: { xs: 1, sm: 1.5 },
                py: { xs: 1.2, sm: 1.5 },
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
                    width: cardW,
                    minWidth: cardW,
                  }}
                >
                  <Skeleton
                    variant="rounded"
                    sx={{
                      width: cardW,
                      height: { xs: 140, sm: 160 },
                      borderRadius: "16px 16px 0 0",
                    }}
                  />
                  <Skeleton
                    variant="rounded"
                    sx={{
                      width: cardW,
                      height: 72,
                      borderRadius: "0 0 16px 16px",
                      mt: "1px",
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  if (loading) {
    return renderStoreProfileSkeleton();
  }
  if (!tabsPrechecked) {
    return renderStoreProfileSkeleton();
  }
  if (error) return <Loader message={error} />;
  if (!store) return <Alert severity="error">Store not found</Alert>;
  const storeContactInfo = store.contactInfo || {};
  const displayPhone = storeContactInfo.phone || store.phone || null;

  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        py: { xs: 8, sm: 4 },
        px: { xs: 1, sm: 1.5, md: 3 },
        pb: { xs: 10, sm: 4 },
      }}
    >
      <FloatingCartButton
        visible={Boolean(store?.isHasDelivery)}
        cartCount={cartCount}
        cartPulseKey={cartPulseKey}
        buttonRef={cartButtonRef}
        label={t("Cart")}
        onClick={handleFloatingCartOpen}
      />

      <StoreHeader
        store={store}
        isDark={isDark}
        t={t}
        locName={locName}
        locAddress={locAddress}
        followerCount={followerCount}
        isStoreFollowed={isStoreFollowed(store?._id)}
        followLoading={followLoading}
        onFollowToggle={handleHeaderFollowToggle}
        onBack={() => navigate(-1)}
        backIcon={
          isRtl ? (
            <ArrowForward sx={{ fontSize: "1rem !important" }} />
          ) : (
            <ArrowBack sx={{ fontSize: "1rem !important" }} />
          )
        }
        displayPhone={displayPhone}
        onLocationClick={handleHeaderLocationClick}
        onContactClick={handleHeaderContactClick}
        onWhatsAppClick={handleHeaderWhatsAppClick}
      />

      {/* Enhanced Products Section with Tabs */}
      <Box sx={{ mb: 4 }}>
        {store && <StoreBranchesShowcase store={store} />}

        {/* <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography
            variant="h3"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 1,
            }}
          >
            {t("Products")}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: theme.palette.text.secondary,
              mb: 3,
            }}
          >
            {t("Discover amazing products from this store")}
          </Typography>
          <Divider sx={{ maxWidth: 200, mx: "auto" }} />
        </Box> */}

        {/* Filter Section */}
        {/* {renderFilters()} */}

        <StoreTabs
          tabs={visibleTabs}
          activeTabKey={activeTabKey}
          onChange={handleTabChange}
          isDark={isDark}
        />

        {(activeTabKey === "discounts" || activeTabKey === "all") && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              mb: 1.5,
            }}
          >
            <ProductLayoutToggle
              value={productLayout}
              onChange={setProductLayout}
            />
          </Box>
        )}

        {/* Tab Content */}

        {activeTabKey === "discounts" && (
          <ProductsTab>{renderProductsByType(discountedProducts)}</ProductsTab>
        )}
        {activeTabKey === "all" && (
          <ProductsTab>
            {renderProductsByType(nonDiscountedProducts, "ifPresent")}
          </ProductsTab>
        )}
        {activeTabKey === "gifts" && (
          <Suspense fallback={<Skeleton variant="rounded" height={180} />}>
            <GiftsTab gifts={gifts} renderGiftCard={renderGiftCard} />
          </Suspense>
        )}

        {activeTabKey === "reels" && (
          <Suspense fallback={<Skeleton variant="rounded" height={220} />}>
            <ReelsTab
              reels={reels}
              theme={theme}
              onOpenReel={(reel) => navigate(`/reels/${reel._id}`)}
            />
          </Suspense>
        )}

        {activeTabKey === "jobs" && (
          <Suspense fallback={<Skeleton variant="rounded" height={120} />}>
            <JobsTab jobs={jobs} onSelectJob={setSelectedJob} />
          </Suspense>
        )}
      </Box>

      <Dialog
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        fullWidth
        maxWidth="sm"
      >
        {locTitle(selectedJob) ? (
          <DialogTitle>{locTitle(selectedJob)}</DialogTitle>
        ) : null}
        <DialogContent>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Box
              component="img"
              src={
                selectedJob?.image
                  ? resolveMediaUrl(selectedJob.image) || "/logo192.png"
                  : "/logo192.png"
              }
              alt="job"
              onError={(e) => {
                e.currentTarget.src = "/logo192.png";
              }}
              sx={{
                width: 110,
                height: 110,
                borderRadius: 2,
                objectFit: "cover",
                border: `1px solid ${theme.palette.divider}`,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                {t("Gender")}:{" "}
                {String(selectedJob?.gender || "any") === "male"
                  ? t("Male")
                  : String(selectedJob?.gender || "any") === "female"
                    ? t("Female")
                    : t("Any")}
              </Typography>
              <Typography sx={{ fontWeight: 800 }}>
                {locName(selectedJob?.storeId) ||
                  locName(selectedJob?.brandId) ||
                  ""}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Typography sx={{ fontWeight: 900, mb: 0.75 }}>
            {t("Description")}
          </Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }} color="text.secondary">
            {locDescription(selectedJob) || ""}
          </Typography>
        </DialogContent>
      </Dialog>
      <Suspense fallback={null}>
        {/* Product Detail Dialog */}
        <ProductDetailDialog
          open={productDialogOpen}
          onClose={() => {
            setProductDialogOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          candidateProducts={products}
          onProductChange={setSelectedProduct}
          storeCityById={
            store?._id
              ? {
                  [String(store._id)]: store.storecity || store.city || "",
                }
              : undefined
          }
        />
        <AdminProductEditDialog
          open={Boolean(adminEditProduct)}
          product={adminEditProduct}
          onClose={() => setAdminEditProduct(null)}
          onSaved={fetchStoreData}
        />
      </Suspense>

      {/* Gift Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box display="flex" alignItems="center" gap={1}>
          <ShoppingCartIcon color="primary" />
          <Typography variant="h6" component="span">
            {t("Gift Information")}
          </Typography>
        </Box>
        <DialogContent>
          {selectedGift && (
            <Paper
              elevation={2}
              sx={{ p: 3, borderRadius: 3, bgcolor: "background.default" }}
            >
              {selectedGift.image && (
                <Box display="flex" justifyContent="center" mb={2}>
                  <img
                    src={resolveMediaUrl(selectedGift.image)}
                    alt={locName(selectedGift) || "Gift image"}
                    style={{
                      maxWidth: 220,
                      maxHeight: 220,
                      borderRadius: 16,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      objectFit: "cover",
                    }}
                  />
                </Box>
              )}
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography
                  variant="h6"
                  color="primary"
                  align="center"
                  gutterBottom
                >
                  {locDescription(selectedGift)}
                </Typography>

                {selectedGift.brandId && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Business fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {t("Brand")}: {locName(selectedGift.brandId)}
                    </Typography>
                  </Box>
                )}

                {selectedGift.expireDate && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocalOfferIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {t("Expires")}:{" "}
                      {new Date(selectedGift.expireDate).toLocaleDateString(
                        "ar-EG",
                        {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                        },
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDialogOpen(false)}
            variant="contained"
            color="primary"
          >
            {t("Close")}
          </Button>
        </DialogActions>
      </Dialog>

      <Suspense fallback={null}>
        <CartDrawer
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          cartCount={cartCount}
          cartSyncing={cartSyncing}
          cartItems={cartItems}
          locName={locName}
          formatPrice={formatPrice}
          updateCartQty={updateCartQty}
          clearCart={clearCart}
          requestOrderWhatsApp={requestOrderWhatsApp}
          t={t}
          closeButtonRef={cartCloseButtonRef}
          buttonRefOnExit={cartButtonRef}
        />
      </Suspense>

      <Dialog
        open={orderWhatsAppConfirmOpen}
        onClose={() => setOrderWhatsAppConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("cartOrderWhatsAppWarningTitle")}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
              mb: 1.5,
            }}
          >
            <Box
              aria-hidden
              sx={{
                display: "inline-flex",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                px: 2.5,
                py: 1,
                borderRadius: 999,
                bgcolor: "action.hover",
                border: "1px solid",
                borderColor: "divider",
                "@keyframes cartOrderSwipeRight": {
                  "0%, 100%": { transform: "translateX(-8px)" },
                  "50%": { transform: "translateX(14px)" },
                },
                animation: "cartOrderSwipeRight 1.5s ease-in-out infinite",
              }}
            >
              <KeyboardDoubleArrowRightIcon
                color="primary"
                sx={{ fontSize: 36 }}
              />
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              {t("Scroll right")}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t("cartOrderWhatsAppWarningBody")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOrderWhatsAppConfirmOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={confirmOrderWhatsApp}
            variant="contained"
            color="success"
            startIcon={<WhatsApp />}
          >
            {t("Continue to WhatsApp")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={cartToast.open}
        autoHideDuration={2500}
        onClose={() => setCartToast({ open: false, text: "" })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="info"
          onClose={() => setCartToast({ open: false, text: "" })}
          sx={{ width: "100%" }}
        >
          {cartToast.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StoreProfile;
