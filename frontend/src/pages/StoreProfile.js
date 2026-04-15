import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Avatar,
  Chip,
  Alert,
  useTheme,
  useMediaQuery,
  Paper,
  Divider,
  IconButton,
  Fade,
  Snackbar,
  Skeleton,
} from "@mui/material";
import {
  LocationOn,
  Business,
  WhatsApp,
  Facebook,
  Instagram,
  MusicNote,
  CameraAlt,
  VideoLibrary,
  WorkOutline,
  ArrowForward,
  ArrowBack,
} from "@mui/icons-material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Phone from "@mui/icons-material/Phone";  
import PersonAddDisabledIcon from "@mui/icons-material/PersonAddDisabled";
import CloseIcon from "@mui/icons-material/Close";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CategoryIcon from "@mui/icons-material/Category";
import BusinessIcon from "@mui/icons-material/Business";
import StarIcon from "@mui/icons-material/Star";
import {
  storeAPI,
  productAPI,
  giftAPI,
  videoAPI,
  jobAPI,
} from "../services/api";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import { useTranslation } from "react-i18next";
import Loader from "../components/Loader";
import { useUserTracking } from "../hooks/useUserTracking";
import JobCardRow from "../components/JobCardRow";
import ProductViewTracker from "../components/ProductViewTracker";
import { motion } from "framer-motion";
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
import ProductDetailDialog from "../components/ProductDetailDialog";
import StoreBranchesShowcase from "../components/StoreBranches_Showcase";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { formatPriceDigits } from "../utils/formatPriceNumber";
import {
  trackOwnerProfileView,
  trackOwnerContactClick,
} from "../utils/ownerAnalyticsTrack";

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
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [reels, setReels] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTabKey, setActiveTabKey] = useState(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "discounts") return "discounts";
    if (tabParam === "all") return "all";
    if (tabParam === "gifts") return "gifts";
    if (tabParam === "reels") return "reels";
    if (tabParam === "jobs") return "jobs";
    return "all";
  });
  const [expandedTypes, setExpandedTypes] = useState({});
  const [displayCounts, setDisplayCounts] = useState({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState({});
  const [cartToast, setCartToast] = useState({ open: false, text: "" });
  /** Incremented on each add-to-cart to replay floating cart button animation */
  const [cartPulseKey, setCartPulseKey] = useState(0);
  const cartButtonRef = useRef(null);
  const cartCloseButtonRef = useRef(null);
  const [cartSyncing, setCartSyncing] = useState(false);
  const [cartHydrated, setCartHydrated] = useState(false);

  // Notification dialog state
  const [loginNotificationOpen, setLoginNotificationOpen] = useState(false);

  // Product detail dialog state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

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
    if (id) {
      fetchStoreData();
    }
  }, [id]);

  useEffect(() => {
    if (store?._id && id) {
      trackOwnerProfileView("store", id);
    }
  }, [store?._id, id]);

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

  async function fetchStoreData() {
    try {
      setLoading(true);

      // Fetch store details
      const storeResponse = await storeAPI.getById(id);
      const storeData = storeResponse.data;
      setStore(storeData);
      setFollowerCount(storeData?.followerCount ?? 0);

      // Fetch products for this store
      const productsResponse = await productAPI.getByStore(id);
      setProducts(productsResponse.data);

      // Fetch gifts for this store
      const giftsResponse = await giftAPI.getByStore(id);
      setGifts(giftsResponse.data.data || []);

      // Fetch reels for this store (exclude expired)
      try {
        const videosRes = await videoAPI.getAll();
        const list = Array.isArray(videosRes?.data) ? videosRes.data : [];
        const filtered = list.filter((v) => {
          const storeId = v?.storeId?._id || v?.storeId || "";
          if (String(storeId) !== String(id)) return false;
          if (!v?.expireDate) return true;
          return isExpiryStillValid(v.expireDate);
        });
        setReels(filtered);
      } catch {
        setReels([]);
      }

      // Fetch jobs for this store (exclude expired)
      try {
        const jobsRes = await jobAPI.getAll();
        const list = Array.isArray(jobsRes?.data) ? jobsRes.data : [];
        const filtered = list.filter((j) => {
          const storeId = j?.storeId?._id || j?.storeId || "";
          if (String(storeId) !== String(id)) return false;
          if (j?.active === false) return false;
          if (!j?.expireDate) return true;
          return isExpiryStillValid(j.expireDate);
        });
        setJobs(filtered);
      } catch {
        setJobs([]);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.msg ||
          err.message ||
          "Network error. Please check your connection.",
      );
      console.error("Error fetching store data:", err);
    } finally {
      setLoading(false);
    }
  }

  const calculateDiscount = (previousPrice, newPrice) => {
    if (!previousPrice || !newPrice || previousPrice <= newPrice) return 0;
    return Math.round(((previousPrice - newPrice) / previousPrice) * 100);
  };

  const formatPrice = (price) => {
    if (typeof price !== "number") return `${t("ID")} 0`;
    return ` ${formatPriceDigits(price)} ${t("ID")}`;
  };

  const cartCount = Object.values(cartItems || {}).reduce(
    (sum, item) => sum + (Number(item?.qty) || 0),
    0,
  );

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

  const buildWhatsAppOrderText = () => {
    const orderId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const lines = [];
    lines.push(`Order To: ${locName(store) || ""}`.trim());
    lines.push("");
    const items = Object.values(cartItems || {})
      .filter((i) => (Number(i?.qty) || 0) > 0 && i?.product?._id)
      .sort((a, b) =>
        String(locName(a.product) || "").localeCompare(
          String(locName(b.product) || ""),
        ),
      );
    items.forEach((item, idx) => {
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
    return lines.join("\n");
  };

  const handleOrderWhatsApp = () => {
    const wa = getStoreWhatsAppUrl();
    if (!wa) {
      setCartToast({ open: true, text: t("WhatsApp number not found") });
      return;
    }
    const text = encodeURIComponent(buildWhatsAppOrderText());
    const url = wa.includes("?") ? `${wa}&text=${text}` : `${wa}?text=${text}`;
    trackOwnerContactClick("store", id, "whatsapp");
    openWhatsAppLink(url);
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

  // Filter products based on current filters
  const getFilteredProducts = () => {
    return products.filter((product) => {
      const matchesName = product.name
        .toLowerCase()
        .includes(filters.name.toLowerCase());
      const matchesBrand =
        !filters.brand ||
        (product.brandId &&
          product.brandId.name &&
          product.brandId.name
            .toLowerCase()
            .includes(filters.brand.toLowerCase()));
      const matchesBarcode =
        !filters.barcode ||
        (product.barcode &&
          product.barcode
            .toLowerCase()
            .includes(filters.barcode.toLowerCase()));
      const typeName = getProductCategoryTypeName(product);
      const matchesType =
        !filters.type ||
        typeName.toLowerCase().includes(filters.type.toLowerCase());

      return matchesName && matchesBrand && matchesBarcode && matchesType;
    });
  };

  // Separate products into discounted and non-discounted
  const getDiscountedProducts = () => {
    return getFilteredProducts().filter((product) => isDiscountValid(product));
  };

  const getNonDiscountedProducts = () => {
    return getFilteredProducts().filter((product) => !product.isDiscount);
  };

  // Group products by category type name
  const groupProductsByType = (productList) => {
    const grouped = {};
    productList.forEach((product) => {
      const typeName = getProductCategoryTypeName(product);
      if (!grouped[typeName]) {
        grouped[typeName] = [];
      }
      grouped[typeName].push(product);
    });
    return grouped;
  };

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
  const renderGiftCard = (gift) => {
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
  };

  // Render product card — modern premium card
  const renderProductCard = (product, index, showPrice = true) => {
    const discount = calculateDiscount(product.previousPrice, product.newPrice);
    const hasPreviousPrice =
      product.previousPrice &&
      product.newPrice &&
      product.previousPrice > product.newPrice;
    const isDark = theme.palette.mode === "dark";
    const expInfo = getExpiryRemainingInfo(product.expireDate);

    return (
      <ProductViewTracker
        key={product._id}
        productId={product._id}
        onVisible={handleProductBecameVisible}
        recordedIdsRef={productViewRecordedRef}
      >
        <Fade in={true} timeout={300 + index * 50}>
          <Card
            onClick={() => {
              setSelectedProduct(product);
              setProductDialogOpen(true);
            }}
            sx={{
              width: { xs: 155, sm: 190, md: 230 },
              minWidth: { xs: 155, sm: 190, md: 230 },
              maxWidth: { xs: 155, sm: 190, md: 230 },
              borderRadius: "16px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              cursor: "pointer",
              background: isDark
                ? "linear-gradient(145deg, #1e2a3a, #243040)"
                : "#ffffff",
              border: isDark
                ? "1px solid rgba(255,255,255,0.07)"
                : "1px solid #f0f2f5",
              boxShadow: isDark
                ? "0 4px 16px rgba(0,0,0,0.3)"
                : "0 2px 12px rgba(0,0,0,0.06)",
              transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
              "&:hover": {
                transform: "translateY(-3px)",
                boxShadow: isDark
                  ? "0 8px 28px rgba(0,0,0,0.45)"
                  : "0 8px 28px rgba(30,111,217,0.12)",
                borderColor: isDark ? "rgba(255,255,255,0.14)" : "#dce8ff",
              },
              "&:active": { transform: "translateY(0)" },
            }}
          >
            {/* Product Image */}
            <Box
              onClick={() => {
                setSelectedProduct(product);
                setProductDialogOpen(true);
              }}
              sx={{
                position: "relative",
                overflow: "hidden",
                height: { xs: 140, sm: 160 },
                flexShrink: 0,
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8f9fb",
                cursor: "pointer",
              }}
            >
              {product.image ? (
                <CardMedia
                  component="img"
                  image={resolveMediaUrl(product.image)}
                  alt={locName(product)}
                  sx={{
                    objectFit: "contain",
                    width: "100%",
                    height: "100%",
                    transition: "transform 0.35s ease",
                    ".MuiCard-root:hover &": { transform: "scale(1.04)" },
                  }}
                />
              ) : (
                <Box
                  sx={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StorefrontIcon
                    sx={{
                      fontSize: 44,
                      color: isDark ? "rgba(255,255,255,0.2)" : "#d1d5db",
                    }}
                  />
                </Box>
              )}

              {/* Top-left: discount badge; top-right: like */}
              <Box
                sx={{
                  position: "absolute",
                  top: 7,
                  left: 7,
                  right: 7,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  zIndex: 2,
                }}
              >
                {hasPreviousPrice ? (
                  <Chip
                    icon={
                      <LocalOfferIcon sx={{ fontSize: "11px !important" }} />
                    }
                    label={`-${discount}%`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      background: "linear-gradient(135deg,#ef4444,#dc2626)",
                      color: "white",
                      border: "none",
                      boxShadow: "0 2px 6px rgba(239,68,68,0.4)",
                      "& .MuiChip-label": { px: 0.6 },
                      "& .MuiChip-icon": {
                        color: "white !important",
                        ml: "4px !important",
                      },
                    }}
                  />
                ) : (
                  <Box />
                )}
                <IconButton
                  size="small"
                  onClick={(e) => handleLikeClick(product._id, e)}
                  disabled={likeLoading[product._id]}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: "rgba(255,255,255,0.92)",
                    backdropFilter: "blur(8px)",
                    color:
                      likeStates[product._id] || isProductLiked(product._id)
                        ? "#ef4444"
                        : "#9ca3af",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    transition: "all 0.2s ease",
                    p: 0,
                    "&:hover": {
                      bgcolor: "white",
                      color: "#ef4444",
                      transform: "scale(1.15)",
                    },
                  }}
                >
                  {likeStates[product._id] || isProductLiked(product._id) ? (
                    <FavoriteIcon sx={{ fontSize: "0.95rem" }} />
                  ) : (
                    <FavoriteBorderIcon sx={{ fontSize: "0.95rem" }} />
                  )}
                </IconButton>
              </Box>
              {/* View count badge */}
              {product.viewCount > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 7,
                    right: 7,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.4,
                    bgcolor: "rgba(0,0,0,0.6)",
                    color: "white",
                    px: 0.8,
                    py: 0.3,
                    borderRadius: 1,
                    fontSize: "0.65rem",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {product.viewCount}
                </Box>
              )}
              {/* Expiry chip */}
              {shouldShowExpiryChip(expInfo) && (
                <Chip
                  label={formatExpiryChipLabel(expInfo, t)}
                  size="small"
                  sx={{
                    position: "absolute",
                    bottom: 7,
                    left: 7,
                    zIndex: 2,
                    pointerEvents: "none",
                    bgcolor: expiryChipBg(expInfo),
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.62rem",
                    height: 20,
                    "& .MuiChip-label": { px: 0.6 },
                  }}
                />
              )}
            </Box>

            {/* Product Content */}
            <CardContent
              sx={{
                p: "10px 10px 10px !important",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 0.4,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "0.8rem", sm: "0.85rem" },
                  lineHeight: 1.35,
                  color: isDark ? "rgba(255,255,255,0.92)" : "#111827",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  minHeight: "2.7em",
                }}
              >
                {locName(product)}
              </Typography>

              {showPrice && (
                <Box sx={{ mt: "auto", pt: 0.5 }}>
                  {hasPreviousPrice && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        textDecoration: "line-through",
                        color: isDark ? "rgba(255,255,255,0.35)" : "#9ca3af",
                        fontSize: "0.7rem",
                        lineHeight: 1,
                      }}
                    >
                      {formatPrice(product.previousPrice)}
                    </Typography>
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: "0.9rem", sm: "0.95rem" },
                      color: "var(--color-secondary, #1E6FD9)",
                      lineHeight: 1.2,
                    }}
                  >
                    {formatPrice(product.newPrice)}
                  </Typography>
                </Box>
              )}

              {store?.isHasDelivery && (
                <Box sx={{ mt: 0.5 }}>
                  <IconButton
                    onClick={(e) => addToCart(product, e)}
                    size="small"
                    sx={{
                      width: 32,
                      height: 32,
                      p: 0,
                      bgcolor: "linear-gradient(135deg, #f59e0b, #d97706)",
                      background:
                        "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      color: "white",
                      borderRadius: "10px",
                      boxShadow: "0 2px 8px rgba(245,158,11,0.4)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        transform: "scale(1.1)",
                        boxShadow: "0 4px 12px rgba(245,158,11,0.5)",
                      },
                    }}
                    aria-label="Add to cart"
                  >
                    <AddShoppingCartIcon sx={{ fontSize: "1.1rem" }} />
                  </IconButton>
                </Box>
              )}
            </CardContent>
          </Card>
        </Fade>
      </ProductViewTracker>
    );
  };

  // Render products grouped by type — horizontal scroll per category
  const renderProductsByType = (productList, showPrice = true) => {
    const groupedProducts = groupProductsByType(productList);
    const isDark = theme.palette.mode === "dark";

    return Object.entries(groupedProducts).map(([type, typeProducts]) => {
      const isExpanded = expandedTypes[type];
      const currentDisplayCount = displayCounts[type] || 20;
      const displayProducts = isExpanded
        ? typeProducts.slice(0, currentDisplayCount)
        : typeProducts.slice(0, 20);
      const hasMore =
        typeProducts.length > (isExpanded ? currentDisplayCount : 20);

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

          {/* Products horizontal scroll */}
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
              renderProductCard(product, index, showPrice),
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
        </Box>
      );
    });
  };

  const discountedProducts = getDiscountedProducts();
  const nonDiscountedProducts = getNonDiscountedProducts();

  // Tabs (hide empty tabs)
  const tabDefs = [
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
      label: `${t("Gifts")} (${gifts.length})`,
      icon: <CardGiftcardIcon />,
    },
    {
      key: "reels",
      count: reels.length,
      label: `${t("Reels")} (${reels.length})`,
      icon: <VideoLibrary />,
    },
    {
      key: "jobs",
      count: jobs.length,
      label: `${t("Jobs")} (${jobs.length})`,
      icon: <WorkOutline />,
    },
  ];
  const visibleTabs = tabDefs.filter((d) => Number(d.count) > 0);

  useEffect(() => {
    if (visibleTabs.length === 0) {
      setActiveTabKey("");
      return;
    }
    if (!visibleTabs.some((d) => d.key === activeTabKey)) {
      setActiveTabKey(visibleTabs[0].key);
    }
  }, [activeTabKey, visibleTabs]);

  const activeTabIndex = Math.max(
    0,
    visibleTabs.findIndex((d) => d.key === activeTabKey),
  );

  const handleTabChange = (event, newValue) => {
    const next = visibleTabs[newValue]?.key || "";
    setActiveTabKey(next);
  };

  if (loading) {
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
          width={80}
          height={36}
          sx={{ mb: 2, borderRadius: "999px" }}
        />
        {/* Hero header skeleton */}
        <Skeleton
          variant="rounded"
          sx={{
            width: "100%",
            height: { xs: 200, sm: 240 },
            borderRadius: "20px",
            mb: 3,
          }}
        />
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
          {[100, 120, 90, 80].map((w, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={w}
              height={38}
              sx={{ borderRadius: "999px", flexShrink: 0 }}
            />
          ))}
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
            <Box sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 1.2, sm: 1.4 } }}>
              <Skeleton
                variant="text"
                width="55%"
                height={28}
                sx={{ mb: 0.5 }}
              />
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
  }
  if (error) return <Loader message={error} />;
  if (!store) return <Alert severity="error">Store not found</Alert>;
  const storeContactInfo = store.contactInfo || {};
  const storeLocationInfo = store.locationInfo || {};
  const displayPhone = storeContactInfo.phone || store.phone || null;
  const socialLinks = [
    { key: "whatsapp", value: storeContactInfo.whatsapp, icon: <WhatsApp /> },
    { key: "facebook", value: storeContactInfo.facebook, icon: <Facebook /> },
    {
      key: "instagram",
      value: storeContactInfo.instagram,
      icon: <Instagram />,
    },
    { key: "tiktok", value: storeContactInfo.tiktok, icon: <MusicNote /> },
    { key: "snapchat", value: storeContactInfo.snapchat, icon: <CameraAlt /> },
  ];

  const normalizeUrl = (url, type) => {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();
    if (type === "whatsapp") {
      if (/^(https?:\/\/)?(wa\.me|api\.whatsapp\.com)\//i.test(trimmed)) {
        const withProto = /^https?:\/\//i.test(trimmed)
          ? trimmed
          : `https://${trimmed}`;
        return normalizeWhatsAppUrl(withProto);
      }
      const digits = trimmed.replace(/[^\d]/g, "");
      return digits ? `https://api.whatsapp.com/send?phone=${digits}` : null;
    }
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const locationLinks = [
    {
      key: "googleMaps",
      label: "Google Maps",
      value: storeLocationInfo.googleMaps,
    },
    {
      key: "appleMaps",
      label: "Apple Maps",
      value: storeLocationInfo.appleMaps,
    },
    { key: "waze", label: "Waze", value: storeLocationInfo.waze },
  ].filter((item) => Boolean(item.value));

  const renderLocationRow = () => {
    if (locationLinks.length === 0) return null;
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "nowrap",
          overflowX: "auto",
          mb: 1,
        }}
      >
        <LocationOn sx={{ fontSize: { xs: 18, md: 24 }, opacity: 0.9 }} />
        {locationLinks.map((item) => (
          <Button
            key={item.key}
            component="a"
            href={normalizeUrl(item.value)}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            variant="outlined"
            sx={{
              color: "white",
              borderColor: "rgba(255,255,255,0.45)",
              textTransform: "none",
              whiteSpace: "nowrap",
              "&:hover": {
                borderColor: "white",
                backgroundColor: "rgba(255,255,255,0.15)",
              },
            }}
          >
            {item.label}
          </Button>
        ))}
      </Box>
    );
  };

  const renderContactRow = () => {
    const socialItems = socialLinks.filter((item) => Boolean(item.value));
    if (socialItems.length === 0) return null;
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          flexWrap: "nowrap",
          overflowX: "auto",
        }}
      >
        {socialItems.map((item) => {
          const href = normalizeUrl(item.value, item.key);
          if (item.key === "whatsapp" && href) {
            return (
              <IconButton
                key={item.key}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  trackOwnerContactClick("store", id, "whatsapp");
                  openWhatsAppLink(href);
                }}
                size="small"
                sx={{
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.15)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </IconButton>
            );
          }
          return (
            <IconButton
              key={item.key}
              component="a"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              onClick={() =>
                trackOwnerContactClick("store", id, item.key)
              }
              sx={{
                color: "white",
                bgcolor: "rgba(255,255,255,0.15)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                flexShrink: 0,
              }}
            >
              {item.icon}
            </IconButton>
          );
        })}
      </Box>
    );
  };

  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        py: { xs: 8, sm: 4 },
        px: { xs: 1, sm: 1.5, md: 3 },
        pb: { xs: 10, sm: 4 },
      }}
    >
      {store?.isHasDelivery && (
        <Box
          sx={{
            position: "fixed",
            bottom: { xs: 76, md: 24 },
            left: 12,
            right: 12,
            zIndex: 1200,
            pointerEvents: "none",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <motion.div
              key={cartPulseKey}
              initial={{ scale: 1 }}
              animate={
                cartPulseKey > 0
                  ? { scale: [1, 1.14, 0.97, 1.06, 1] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.55, ease: [0.34, 1.3, 0.64, 1] }}
              style={{
                display: "inline-block",
                pointerEvents: "auto",
                borderRadius: 9999,
                overflow: "visible",
              }}
            >
              <Button
                variant="contained"
                startIcon={<ShoppingCartIcon />}
                disabled={cartCount <= 0}
                ref={cartButtonRef}
                onClick={async (e) => {
                  // Prevent focus from staying on a now aria-hidden background element.
                  e?.currentTarget?.blur?.();
                  await syncCartWithLatestProducts();
                  setCartOpen(true);
                }}
                sx={{
                  pointerEvents: "auto",
                  borderRadius: 999,
                  px: 2.25,
                  py: 1,
                  fontWeight: 900,
                }}
              >
                {t("Cart")} ({cartCount})
              </Button>
            </motion.div>
          </Box>
        </Box>
      )}

      {/* Back Button */}
      <Button
        startIcon={
          isRtl ? (
            <ArrowForward sx={{ fontSize: "1rem !important" }} />
          ) : (
            <ArrowBack sx={{ fontSize: "1rem !important" }} />
          )
        }
        onClick={() => navigate(-1)}
        size="small"
        sx={{
          mb: 2,
          borderRadius: "999px",
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.85rem",
          color: isDark ? "rgba(255,255,255,0.7)" : "#374151",
          bgcolor: isDark ? "rgba(255,255,255,0.07)" : "#f3f4f6",
          border: isDark
            ? "1px solid rgba(255,255,255,0.1)"
            : "1px solid #e5e7eb",
          px: 2,
          py: 0.6,
          "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.12)" : "#e9ecf0" },
        }}
      >
        {t("Back")}
      </Button>
      {/* Store Hero Header */}
      <Box
        sx={{
          mb: 3,
          borderRadius: "20px",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #1E6FD9 0%, #4A90E2 60%, #5ba4f5 100%)",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.45)"
            : "0 8px 32px rgba(30,111,217,0.28)",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-40%",
            right: "-10%",
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          },
        }}
      >
        <Box
          sx={{
            p: { xs: "18px 16px", sm: "24px 28px", md: "28px 36px" },
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Logo + Name + Follow row */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: { xs: 1.5, sm: 2.5 },
              mb: 1.5,
            }}
          >
            <Avatar
              src={store.logo ? resolveMediaUrl(store.logo) : undefined}
              alt={locName(store)}
              sx={{
                width: { xs: 64, sm: 88, md: 110 },
                height: { xs: 64, sm: 88, md: 110 },
                border: "3px solid rgba(255,255,255,0.3)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                bgcolor: "rgba(255,255,255,0.15)",
                borderRadius: "18px",
                flexShrink: 0,
              }}
            >
              {!store.logo && (
                <Business
                  sx={{
                    fontSize: { xs: 32, sm: 44 },
                    color: "rgba(255,255,255,0.85)",
                  }}
                />
              )}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                  mb: 0.8,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1.15rem", sm: "1.5rem", md: "1.8rem" },
                    color: "white",
                    textShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    lineHeight: 1.2,
                  }}
                >
                  {locName(store)}
                </Typography>
                {store.isVip && (
                  <Chip
                    label={t("VIP")}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      bgcolor: "#f59e0b",
                      color: "white",
                      border: "none",
                      boxShadow: "0 2px 6px rgba(245,158,11,0.5)",
                      "& .MuiChip-label": { px: 0.8 },
                    }}
                  />
                )}
                {store.isHasDelivery && (
                  <Chip
                    label={t("Delivery")}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      bgcolor: "rgba(239,68,68,0.75)",
                      color: "white",
                      border: "none",
                      "& .MuiChip-label": { px: 0.8 },
                    }}
                  />
                )}
              </Box>

              {/* Followers + Follow button */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(255,255,255,0.85)",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                  }}
                >
                  {followerCount} {t("Followers")}
                </Typography>
                <Button
                  size="small"
                  disabled={followLoading}
                  onClick={async () => {
                    setFollowLoading(true);
                    try {
                      const result = await toggleFollowStore(store._id);
                      if (result?.success && result?.data != null) {
                        setFollowerCount(
                          Math.max(
                            0,
                            result.data.followerCount ?? followerCount,
                          ),
                        );
                      }
                    } finally {
                      setFollowLoading(false);
                    }
                  }}
                  startIcon={
                    isStoreFollowed(store._id) ? (
                      <PersonAddDisabledIcon
                        sx={{ fontSize: "0.9rem !important" }}
                      />
                    ) : (
                      <PersonAddIcon sx={{ fontSize: "0.9rem !important" }} />
                    )
                  }
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: "999px",
                    px: 1.5,
                    py: 0.4,
                    fontSize: "0.8rem",
                    lineHeight: 1.5,
                    ...(isStoreFollowed(store._id)
                      ? {
                          bgcolor: "rgba(239,68,68,0.8)",
                          color: "white",
                          "&:hover": { bgcolor: "rgba(239,68,68,1)" },
                        }
                      : {
                          bgcolor: "rgba(34,197,94,0.85)",
                          color: "white",
                          "&:hover": { bgcolor: "rgba(34,197,94,1)" },
                        }),
                  }}
                >
                  {isStoreFollowed(store._id) ? t("Unfollow") : t("Follow")}
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Info row: address, maps, phone, socials */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
            {locAddress(store) && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <LocationOn
                  sx={{
                    fontSize: { xs: 16, md: 18 },
                    color: "rgba(255,255,255,0.8)",
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(255,255,255,0.85)",
                    fontSize: { xs: "0.78rem", sm: "0.875rem" },
                    textOverflow: "ellipsis",
                    maxWidth: { xs: 280, sm: 450 },
                  }}
                >
                  {locAddress(store)}
                </Typography>
              </Box>
            )}
            {(locationLinks.length > 0 || displayPhone) && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                {displayPhone && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Phone
                      sx={{ fontSize: 15, color: "rgba(255,255,255,0.7)" }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(255,255,255,0.85)",
                        fontFamily: "monospace",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                      }}
                    >
                      {displayPhone}
                    </Typography>
                  </Box>
                )}
                {renderLocationRow()}
              </Box>
            )}
            {renderContactRow()}
            {store.description && (
              <Typography
                variant="body2"
                sx={{
                  textAlign: "center",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: "0.8rem",
                  lineHeight: 1.5,
                  mt: 0.5,
                }}
              >
                {store.description}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

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

        {/* Tabs — pill style */}
        {visibleTabs.length > 0 && (
          <Box
            sx={{
              mb: 2.5,
              display: "flex",
              gap: 0.8,
              overflowX: "auto",
              overflowY: "hidden",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              pb: 0.5,
            }}
          >
            {visibleTabs.map((tab, idx) => {
              const isActive = idx === activeTabIndex;
              return (
                <Chip
                  key={tab.key}
                  icon={React.cloneElement(tab.icon, {
                    sx: { fontSize: "0.9rem !important" },
                  })}
                  label={tab.label}
                  onClick={() => handleTabChange(null, idx)}
                  sx={{
                    height: 36,
                    fontSize: "0.78rem",
                    fontWeight: isActive ? 700 : 500,
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                    ...(isActive
                      ? {
                          background:
                            "linear-gradient(135deg, #1E6FD9 0%, #4A90E2 100%)",
                          color: "white",
                          border: "none",
                          boxShadow: "0 3px 10px rgba(30,111,217,0.4)",
                          "& .MuiChip-icon": {
                            color: "rgba(255,255,255,0.9) !important",
                          },
                        }
                      : {
                          background: isDark
                            ? "rgba(255,255,255,0.07)"
                            : "#f3f4f6",
                          color: isDark ? "rgba(255,255,255,0.7)" : "#374151",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid #e5e7eb",
                          "&:hover": {
                            background: isDark
                              ? "rgba(255,255,255,0.12)"
                              : "#e9ecf0",
                          },
                        }),
                  }}
                />
              );
            })}
          </Box>
        )}

        {/* Tab Content */}

        {activeTabKey === "discounts" && (
          <Box>{renderProductsByType(discountedProducts)}</Box>
        )}
        {activeTabKey === "all" && (
          <Box>{renderProductsByType(nonDiscountedProducts, false)}</Box>
        )}
        {activeTabKey === "gifts" && (
          <Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr" },
                gap: 3,
                width: "100%",
              }}
            >
              {gifts.map((gift) => (
                <Box key={gift._id} sx={{ display: "flex" }}>
                  {renderGiftCard(gift)}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {activeTabKey === "reels" && (
          <Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
                width: "100%",
              }}
            >
              {reels.map((reel) => {
                const src = resolveMediaUrl(reel?.videoUrl || "");

                return (
                  <Card
                    key={reel._id}
                    sx={{
                      borderRadius: 3,
                      overflow: "hidden",
                      cursor: "pointer",
                      border: `1px solid ${theme.palette.divider}`,
                      "&:hover": { boxShadow: 6 },
                    }}
                    onClick={() => navigate(`/reels/${reel._id}`)}
                  >
                    <Box
                      sx={{ position: "relative", backgroundColor: "black" }}
                    >
                      <video
                        src={src}
                        muted
                        playsInline
                        preload="metadata"
                        style={{
                          width: "100%",
                          height: 220,
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      {reel?.title ? (
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            p: 1,
                            background:
                              "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))",
                          }}
                        >
                          <Typography
                            sx={{ color: "white", fontWeight: 700 }}
                            noWrap
                          >
                            {reel.title}
                          </Typography>
                        </Box>
                      ) : null}
                    </Box>
                  </Card>
                );
              })}
            </Box>
          </Box>
        )}

        {activeTabKey === "jobs" && (
          <Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 1.5 }}>
              {jobs.map((job) => (
                <JobCardRow
                  key={job._id}
                  job={job}
                  onClick={() => setSelectedJob(job)}
                />
              ))}
            </Box>
          </Box>
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

      {/* Login Notification Dialog */}
      <Dialog
        open={loginNotificationOpen}
        onClose={() => setLoginNotificationOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" component="span">
            {t("Login Required")}
          </Typography>
        </Box>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {t("You must login to like products. Do you want to login?")}
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
              navigate("/login");
            }}
            variant="contained"
            color="primary"
          >
            {t("Yes")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cart Dialog (delivery stores only) */}
      <Dialog
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        fullWidth
        maxWidth="sm"
        TransitionProps={{
          onEntered: () => {
            cartCloseButtonRef.current?.focus?.();
          },
          onExited: () => {
            cartButtonRef.current?.focus?.();
          },
        }}
      >
        {t("Cart")} ({cartCount})
        <DialogContent sx={{ overflowX: "hidden" }}>
          {cartSyncing ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              {t("Loading...")}
            </Typography>
          ) : cartCount <= 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              {t("Cart is empty")}
            </Typography>
          ) : (
            <Box sx={{ display: "grid", gap: 1.25, py: 1 }}>
              {Object.values(cartItems || {})
                .filter((i) => (Number(i?.qty) || 0) > 0 && i?.product?._id)
                .map((item) => (
                  <Paper
                    key={item.product._id}
                    variant="outlined"
                    sx={{ p: 1.25, borderRadius: 2 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 1,
                        overflow: "hidden",
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                          }}
                        >
                          {locName(item.product)}
                        </Typography>
                        {typeof item.product.newPrice === "number" && (
                          <Typography variant="caption" color="text.secondary">
                            {formatPrice(item.product.newPrice)}
                          </Typography>
                        )}
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexShrink: 0,
                        }}
                      >
                        <IconButton
                          onClick={() =>
                            updateCartQty(
                              item.product._id,
                              (Number(item.qty) || 0) - 1,
                            )
                          }
                          size="small"
                        >
                          <RemoveIcon />
                        </IconButton>
                        <Typography
                          sx={{
                            fontWeight: 900,
                            minWidth: 22,
                            textAlign: "center",
                          }}
                        >
                          {Number(item.qty) || 0}
                        </Typography>
                        <IconButton
                          onClick={() =>
                            updateCartQty(
                              item.product._id,
                              (Number(item.qty) || 0) + 1,
                            )
                          }
                          size="small"
                        >
                          <AddIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </Paper>
                ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={clearCart} disabled={cartCount <= 0}>
            {t("Clear")}
          </Button>
          <Button
            onClick={() => setCartOpen(false)}
            variant="outlined"
            autoFocus
            ref={cartCloseButtonRef}
          >
            {t("Close")}
          </Button>
          <Button
            onClick={handleOrderWhatsApp}
            variant="contained"
            startIcon={<WhatsApp />}
            disabled={cartCount <= 0}
          >
            {t("Order")}
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
