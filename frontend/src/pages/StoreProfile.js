import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useParams,
  useNavigate,
  Link,
  useSearchParams,
} from "react-router-dom";
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
  Grid,
  Avatar,
  Chip,
  Alert,
  useTheme,
  Paper,
  Divider,
  IconButton,
  Fade,
  Tabs,
  Tab,
  Snackbar,
  Skeleton,
} from "@mui/material";
import {
  ArrowBack,
  Phone,
  LocationOn,
  Business,
  WhatsApp,
  Facebook,
  Instagram,
  MusicNote,
  CameraAlt,
  VideoLibrary,
  WorkOutline,
} from "@mui/icons-material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonAddDisabledIcon from "@mui/icons-material/PersonAddDisabled";
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
import VisibilityIcon from "@mui/icons-material/Visibility";
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
} from "../utils/expiryDate";
import { useLocalizedContent } from "../hooks/useLocalizedContent";

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
  const { t } = useTranslation();
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
  const [filtersOpen] = useState(false);
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
    return ` ${price.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ${t("ID")}`;
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
      const name = locName(item.product) || "-";
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
      return locName(product.categoryId) || t("Uncategorized");
    }
    const category = product.categoryId;
    if (!category.types || !Array.isArray(category.types)) {
      return locName(category) || t("Uncategorized");
    }
    const categoryType =
      category.types.find(
        (type) => type._id?.toString() === product.categoryTypeId?.toString(),
      ) || category.types.find((type) => type.name === product.categoryTypeId);
    return categoryType
      ? locName(categoryType)
      : locName(category) || t("Uncategorized");
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

    return (
      <Card
        key={gift._id}
        onClick={() => {
          setSelectedGift(gift);
          setDialogOpen(true);
        }}
        sx={{
          display: "flex",
          height: { xs: "150px", sm: "250px", md: "280px" },
          width: "100%",
          borderRadius: 2,
          overflow: "hidden",
          border: `1px solid ${
            theme.palette.mode === "dark" ? "#4a5568" : "#e2e8f0"
          }`,
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 4px 16px rgba(0,0,0,0.3)"
              : "0 4px 16px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 8px 24px rgba(0,0,0,0.4)"
                : "0 8px 24px rgba(0,0,0,0.15)",
          },
        }}
      >
        {/* Gift Image */}
        <Box
          sx={{
            width: { xs: "100px", sm: "150px", md: "400px" },
            height: "100%",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <CardMedia
            component="img"
            image={resolveMediaUrl(gift.image)}
            alt={gift.description}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "fill",
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
            p: { xs: 2, sm: 2.5, md: 3 },
            minHeight: 0,
          }}
        >
          {/* Main Description */}
          <Typography
            variant="body1"
            sx={{
              alignItems: "center",
              fontSize: { xs: ".75rem", sm: "0.9rem", md: "1.5rem" },
              lineHeight: 1.4,
              mb: 2,
              color: theme.palette.text.primary,
              fontFamily: "NRT reg, Arial, sans-serif",
              overflow: { xs: "none", sm: "hidden", md: "hidden" },
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {gift.description}
          </Typography>

          {/* Brand Info */}
          <Box sx={{ mb: 2, flexShrink: 0 }}>
            {gift.brandId && (
              <Box
                sx={{ display: "flex", alignItems: "center", mb: 1 }}
                onClick={() => {
                  navigate(`/brands/${gift.brandId._id}?tab=gifts`);
                }}
              >
                <Business
                  sx={{
                    fontSize: { xs: 12, sm: 16, md: 16 },
                    mr: 1,
                    color: "var(--brand-light-orange)",
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: "0.5rem", sm: "0.75rem", md: "0.75rem" },
                    color: theme.palette.text.secondary,
                    fontFamily: "NRT reg, Arial, sans-serif",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  {t("Brand")}: {locName(gift.brandId)}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Expire Date */}
          <Box sx={{ flexShrink: 0 }}>
            {gift.expireDate ? (
              <Chip
                label={formatExpiryExpiresPrefixedLabel(giftExp, t)}
                size="small"
                sx={{
                  bgcolor: expiryGiftCardBg(giftExp),
                  color: "white",
                  fontSize: { xs: "0.5rem", sm: "0.75rem", md: "0.75rem" },
                }}
              />
            ) : (
              <Chip
                label={t("No expiry")}
                size="small"
                sx={{
                  bgcolor: "#6c757d",
                  color: "white",
                  fontSize: { xs: "0.5rem", sm: "0.75rem", md: "0.75rem" },
                }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render product card
  const renderProductCard = (product, index, showPrice = true) => {
    const discount = calculateDiscount(product.previousPrice, product.newPrice);

    return (
      <ProductViewTracker
        key={product._id}
        productId={product._id}
        onVisible={handleProductBecameVisible}
        recordedIdsRef={productViewRecordedRef}
      >
        <Fade in={true} timeout={300 + index * 50}>
          <Card
            sx={{
              height: { xs: "320px", sm: "380px" },
              width: { xs: "160px", sm: "220px", md: "280px" },
              maxWidth: { xs: "160px", sm: "220px", md: "280px" },
              minWidth: { xs: "160px", sm: "220px", md: "280px" },
              textDecoration: "none",
              borderRadius: 2,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              background: "white",
              border: "1px solid #e2e8f0",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
              },
            }}
          >
            {/* Product Image — overlay must live inside this position:relative box so it stays pinned while scrolling */}
            <Box
              component={Link}
              to={`/products/${product._id}`}
              sx={{
                position: "relative",
                overflow: "hidden",
                height: { xs: "160px", sm: "100px" },
                flexShrink: 0,
                backgroundColor: "#f8f9fa",
              }}
            >
              {product.image ? (
                <CardMedia
                  component="img"
                  height="180"
                  image={resolveMediaUrl(product.image)}
                  alt={locName(product)}
                  sx={{
                    objectFit: "contain",
                    width: "100%",
                    height: "100%",
                    transition: "transform 0.3s ease",
                    "&:hover": { transform: "scale(1.05)" },
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
                    background: "#f8f9fa",
                  }}
                >
                  <StorefrontIcon
                    sx={{
                      fontSize: 60,
                      color: "#a0aec0",
                    }}
                  />
                </Box>
              )}

              {(store?.isHasDelivery || product.viewCount > 0) && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    right: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    zIndex: 2,
                    pointerEvents: "none",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.25,
                      minWidth: 0,
                    }}
                  >
                    {store?.isHasDelivery && (
                      <>
                        {/* <Typography
                          variant="caption"
                          sx={{
                            color: "white",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                            pointerEvents: "none",
                          }}
                        >
                          {likeCounts[product._id] || product.likeCount || 0}
                        </Typography> */}
                        <IconButton
                          size="small"
                          onClick={(e) => handleLikeClick(product._id, e)}
                          disabled={likeLoading[product._id]}
                          sx={{
                            p: 0.5,
                            color: "white",
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            pointerEvents: "auto",
                            "&:hover": {
                              backgroundColor: "rgba(0, 0, 0, 0.82)",
                            },
                          }}
                          aria-label={t("Like")}
                        >
                          {likeStates[product._id] ||
                          isProductLiked(product._id) ? (
                            <FavoriteIcon
                              sx={{ fontSize: "1.2rem", color: "red" }}
                            />
                          ) : (
                            <FavoriteBorderIcon sx={{ fontSize: "1.2rem" }} />
                          )}
                        </IconButton>
                      </>
                    )}
                  </Box>
                  <Box
                    sx={{ display: "flex", alignItems: "center", minWidth: 0 }}
                  >
                    {product.viewCount > 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          backgroundColor: "rgba(0, 0, 0, 0.7)",
                          color: "white",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: "0.7rem",
                          whiteSpace: "nowrap",
                          pointerEvents: "auto",
                        }}
                      >
                        <VisibilityIcon sx={{ fontSize: "0.8rem" }} />
                        {product.viewCount}
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
              {(() => {
                const expInfo = getExpiryRemainingInfo(product.expireDate);
                if (!shouldShowExpiryChip(expInfo)) return null;
                return (
                  <Chip
                    label={formatExpiryChipLabel(expInfo, t)}
                    size="small"
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      zIndex: 2,
                      pointerEvents: "none",
                      backgroundColor: expiryChipBg(expInfo),
                      color: "white",
                      fontWeight: 600,
                    }}
                  />
                );
              })()}
            </Box>

            {/* Product Content */}
            <CardContent
              sx={{
                p: { xs: 1.5, md: 2 },
                flex: 1,
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Product Name */}
              <Typography
                variant="h6"
                sx={{
                  color: "#000000",
                  fontWeight: 600,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  textAlign: "center",
                  mb: 1,
                  lineHeight: 1.3,
                  minHeight: "2.6em",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {locName(product)}
              </Typography>

              {/* Brand name if available */}
              {/* {product.brandId && product.brandId.name && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "#666",
                    fontSize: "0.8rem",
                    mb: 1,
                    fontStyle: "italic",
                    textAlign: "center",
                  }}
                >
                  {product.brandId.name}
                </Typography>
              )} */}

              {/* Pricing Section */}
              {showPrice && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  {product.previousPrice &&
                    product.previousPrice > product.newPrice && (
                      <Typography
                        variant="body2"
                        sx={{
                          textDecoration: "line-through",
                          color: "red",
                          fontSize: { xs: "0.8rem", sm: "0.9rem" },
                          fontWeight: 500,
                        }}
                      >
                        {formatPrice(product.previousPrice)}
                      </Typography>
                    )}
                  <Typography
                    variant="h6"
                    sx={{
                      color: "var(--brand-light-orange)",
                      fontWeight: 700,
                      fontSize: { xs: "1.1rem", sm: "1.3rem" },
                    }}
                  >
                    {formatPrice(product.newPrice)}
                  </Typography>
                </Box>
              )}

              {/* Bottom Section with Discount Badge and Like Button */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  mt: "auto",
                }}
              >
                {/* Discount Badge - Bottom Left */}
                {(discount > 0 || product.isDiscount) && (
                  <Chip
                    label={discount > 0 ? `-${discount}%` : t("Discount")}
                    sx={{
                      backgroundColor: "#e53e3e",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      height: "24px",
                    }}
                  />
                )}

                {/* Add to cart (delivery) or Like + count — bottom right */}
                {store?.isHasDelivery ? (
                  <IconButton
                    onClick={(e) => addToCart(product, e)}
                    size="small"
                    sx={{
                      backgroundColor: "orange",
                      "&:hover": {
                        transform: "scale(1.05)",
                      },
                    }}
                    variant="contained"
                    aria-label="Add to cart"
                    id="add-to-cart"
                  >
                    <AddShoppingCartIcon sx={{ fontSize: "2rem" }} />
                  </IconButton>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#666",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                      }}
                    >
                      {likeCounts[product._id] || product.likeCount || 0}
                    </Typography>
                    <IconButton
                      onClick={(e) => handleLikeClick(product._id, e)}
                      disabled={likeLoading[product._id]}
                      sx={{
                        color:
                          likeStates[product._id] || isProductLiked(product._id)
                            ? "#e53e3e"
                            : "#666",
                        "&:hover": {
                          color: "#e53e3e",
                          transform: "scale(1.1)",
                        },
                        transition: "all 0.2s ease",
                        p: 0.5,
                      }}
                      size="small"
                    >
                      {likeStates[product._id] ||
                      isProductLiked(product._id) ? (
                        <FavoriteIcon sx={{ fontSize: "1.2rem" }} />
                      ) : (
                        <FavoriteBorderIcon sx={{ fontSize: "1.2rem" }} />
                      )}
                    </IconButton>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Fade>
      </ProductViewTracker>
    );
  };

  // Render products grouped by type
  const renderProductsByType = (productList, showPrice = true) => {
    const groupedProducts = groupProductsByType(productList);

    return Object.entries(groupedProducts).map(([type, typeProducts]) => {
      const isExpanded = expandedTypes[type];
      const currentDisplayCount = displayCounts[type] || 10;
      const displayProducts = isExpanded
        ? typeProducts.slice(0, currentDisplayCount)
        : typeProducts.slice(0, 10);
      const hasMore =
        typeProducts.length > (isExpanded ? currentDisplayCount : 10);

      return (
        <Box key={type} sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 2,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <StorefrontIcon sx={{ color: "var(--brand-accent-orange)" }} />
            {t(type)}
            <Chip
              label={`${typeProducts.length} ${t("items")}`}
              size="small"
              sx={{
                backgroundColor: "var(--brand-accent-orange)",
                color: "white",
                fontWeight: 600,
              }}
            />
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                sm: "repeat(auto-fill, minmax(280px, 1fr))",
                md: "repeat(auto-fill, minmax(280px, 1fr))",
              },
              gap: { xs: 2, sm: 3, md: 3 },
              justifyContent: "center",
              mb: 2,
            }}
          >
            {displayProducts.map((product, index) =>
              renderProductCard(product, index, showPrice),
            )}
          </Box>

          {hasMore && (
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() =>
                  isExpanded ? loadMoreProducts(type) : toggleExpanded(type)
                }
                sx={{
                  borderColor: "var(--brand-accent-orange)",
                  color: "var(--brand-accent-orange)",
                  "&:hover": {
                    borderColor: "var(--brand-light-orange)",
                    backgroundColor: "rgba(255, 122, 26, 0.1)",
                  },
                }}
              >
                {isExpanded ? t("Show More") : t("Show More")}
              </Button>
            </Box>
          )}

          {isExpanded && displayProducts.length > 10 && (
            <Box sx={{ textAlign: "center", mt: 1 }}>
              <Button
                variant="text"
                onClick={() => toggleExpanded(type)}
                sx={{
                  color: "#666",
                  "&:hover": {
                    backgroundColor: "rgba(102, 102, 102, 0.1)",
                  },
                }}
              >
                {t("Show Less")}
              </Button>
            </Box>
          )}
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
    return (
      <Box sx={{ py: 4, px: { xs: 1.5, sm: 2 } }}>
        <Skeleton variant="text" sx={{ width: 200, mb: 2 }} />
        <Skeleton
          variant="rectangular"
          sx={{ width: "100%", height: 220, borderRadius: 3, mb: 3 }}
        />
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton
                variant="rectangular"
                sx={{ width: "100%", height: 160, borderRadius: 2, mb: 1.5 }}
              />
              <Skeleton variant="text" sx={{ width: "80%" }} />
              <Skeleton variant="text" sx={{ width: "50%" }} />
            </Grid>
          ))}
        </Grid>
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

  const renderLocationRow = () => (
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
      {locationLinks.length > 0 ? (
        locationLinks.map((item) => (
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
        ))
      ) : (
        <Typography
          variant="body2"
          sx={{ color: "white", opacity: 0.9, whiteSpace: "nowrap" }}
        >
          {t("address not provided")}
        </Typography>
      )}
    </Box>
  );

  const renderContactRow = () => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "nowrap",
        overflowX: "auto",
      }}
    >
      <Phone sx={{ fontSize: { xs: 18, md: 24 }, opacity: 0.9 }} />
      <Typography
        variant={displayPhone ? "h6" : "body2"}
        sx={{
          fontSize: { xs: "0.875rem", md: "1.125rem" },
          fontFamily: "monospace",
          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
          color: "white",
          whiteSpace: "nowrap",
        }}
      >
        {displayPhone || t("phone not provided")}
      </Typography>
      {socialLinks
        .filter((item) => Boolean(item.value))
        .map((item) => {
          const href = normalizeUrl(item.value, item.key);
          if (item.key === "whatsapp" && href) {
            return (
              <IconButton
                key={item.key}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
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

  return (
    <Box sx={{ py: 8, px: { xs: 0.5, sm: 1.5, md: 3 } }}>
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

      {/* Enhanced Back Button */}
      <Button
        variant="outlined"
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{
          mb: 3,
          borderRadius: 2,
          position: "relative",

          borderColor: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
          color: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
          "&:hover": {
            borderColor: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(255, 122, 26, 0.1)"
                : "rgba(30, 111, 217, 0.1)",
          },
        }}
      >
        {t("Back")}
      </Button>
      {/* Enhanced Store Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: 4,
          overflow: "hidden",
          background:
            theme.palette.mode === "dark"
              ? "#4A90E2"
              : theme.palette.primary.main,
          border: `1px solid ${
            theme.palette.mode === "dark"
              ? "#4A90E2"
              : theme.palette.primary.main
          }`,
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 12px 40px rgba(0,0,0,0.3)"
              : "0 12px 40px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header Background */}
        <Box
          sx={{
            background:
              theme.palette.mode === "dark"
                ? "#4A90E2"
                : theme.palette.primary.main,
            p: { xs: 2, sm: 3, md: 4 },
            color: "white",
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)",
            },
          }}
        >
          <Box position="relative" zIndex={1}>
            {/* Mobile Layout - Logo and Name on same row */}
            <Box
              sx={{
                display: { xs: "block", md: "none" },
                mb: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  mb: 1.5,
                }}
              >
                {store.logo ? (
                  <Avatar
                    src={resolveMediaUrl(store.logo)}
                    alt={locName(store)}
                    sx={{
                      width: 60,
                      height: 60,
                      border: "3px solid rgba(255,255,255,0.2)",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: 60,
                      height: 60,
                      bgcolor: "rgba(255,255,255,0.2)",
                      border: "3px solid rgba(255,255,255,0.2)",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                      flexShrink: 0,
                    }}
                  >
                    <Business sx={{ fontSize: 30 }} />
                  </Avatar>
                )}
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 700,
                    fontSize: "1.2rem",
                    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    color: "white",
                    flex: 1,
                  }}
                >
                  {locName(store)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                  justifyContent: "flex-start",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color: "rgba(255,255,255,0.95)",
                    fontWeight: 600,
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  {followerCount} {t("Followers")}
                </Typography>
                <Button
                  variant={
                    isStoreFollowed(store._id) ? "contained" : "outlined"
                  }
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
                      <PersonAddDisabledIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <PersonAddIcon sx={{ fontSize: 18 }} />
                    )
                  }
                  sx={{
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 2,
                    px: 2,
                    py: 0.75,
                    fontSize: "0.875rem",
                    ...(isStoreFollowed(store._id)
                      ? {
                          color: "white",
                          bgcolor: "rgba(248, 23, 23, 0.95)",
                          boxShadow: "0 2px 8px rgba(255, 3, 3, 0.4)",
                          "&:hover": {
                            bgcolor: "rgb(175, 76, 76)",
                            boxShadow: "0 4px 12px rgba(255, 3, 3, 0.5)",
                          },
                        }
                      : {
                          color: "white",
                          borderColor: "rgba(15, 204, 78, 0.8)",
                          borderWidth: 2,
                          backgroundColor: "rgba(15, 204, 78, 0.8)",
                          "&:hover": {
                            borderColor: "rgba(15, 204, 78, 0.97)",
                            backgroundColor: "rgba(15, 204, 78, 0.97)",
                            borderWidth: 2,
                          },
                        }),
                  }}
                >
                  {isStoreFollowed(store._id) ? t("Unfollow") : t("Follow")}
                </Button>
              </Box>
            </Box>

            {/* Desktop Layout - Original Grid */}
            <Grid
              container
              spacing={{ xs: 2, sm: 3, md: 4 }}
              alignItems="center"
              sx={{ display: { xs: "none", md: "flex" } }}
            >
              <Grid size={{ xs: 12, md: 3 }}>
                {store.logo ? (
                  <Avatar
                    src={resolveMediaUrl(store.logo)}
                    alt={locName(store)}
                    sx={{
                      width: { xs: 80, sm: 100, md: 150 },
                      height: { xs: 80, sm: 100, md: 150 },
                      border: "4px solid rgba(255,255,255,0.2)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                      mx: { xs: "auto", md: 0 },
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: { xs: 80, sm: 100, md: 150 },
                      height: { xs: 80, sm: 100, md: 150 },
                      bgcolor: "rgba(255,255,255,0.2)",
                      border: "4px solid rgba(255,255,255,0.2)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                      mx: { xs: "auto", md: 0 },
                    }}
                  >
                    <Business sx={{ fontSize: { xs: 40, sm: 50, md: 80 } }} />
                  </Avatar>
                )}
              </Grid>

              <Grid size={{ xs: 12, md: 9 }}>
                <Typography
                  variant="h2"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: "1.2rem", sm: "2rem", md: "3rem" },
                    textShadow: "0 4px 8px rgba(0,0,0,0.3)",
                    textAlign: { xs: "center", md: "left" },
                    mb: 2,
                    color: "white",
                  }}
                >
                  {locName(store)}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 2,
                    flexWrap: "wrap",
                    justifyContent: { xs: "center", md: "flex-start" },
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      color: "rgba(255,255,255,0.95)",
                      fontWeight: 600,
                      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    }}
                  >
                    {followerCount} {t("Followers")}
                  </Typography>
                  <Button
                    variant={
                      isStoreFollowed(store._id) ? "contained" : "outlined"
                    }
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
                        <PersonAddDisabledIcon sx={{ fontSize: 18 }} />
                      ) : (
                        <PersonAddIcon sx={{ fontSize: 18 }} />
                      )
                    }
                    sx={{
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: 2,
                      px: 2,
                      py: 0.75,
                      fontSize: "0.875rem",
                      ...(isStoreFollowed(store._id)
                        ? {
                            color: "white",
                            bgcolor: "rgba(76, 175, 80, 0.95)",
                            boxShadow: "0 2px 8px rgba(76, 175, 80, 0.4)",
                            "&:hover": {
                              bgcolor: "rgba(76, 175, 80, 1)",
                              boxShadow: "0 4px 12px rgba(76, 175, 80, 0.5)",
                            },
                          }
                        : {
                            color: "white",
                            borderColor: "rgba(255,255,255,0.8)",
                            borderWidth: 2,
                            "&:hover": {
                              borderColor: "white",
                              bgcolor: "rgba(255,255,255,0.15)",
                              borderWidth: 2,
                            },
                          }),
                    }}
                  >
                    {isStoreFollowed(store._id) ? t("Unfollow") : t("Follow")}
                  </Button>
                  <Chip
                    icon={store.isVip ? undefined : <ShoppingCartIcon />}
                    label={store.isVip ? t("VIP Store") : t("Premium Store")}
                    sx={{
                      backgroundColor: store.isVip
                        ? "orange"
                        : "rgba(255,255,255,0.2)",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      px: 1,
                      backdropFilter: "blur(10px)",
                    }}
                  />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    mb={1.5}
                    color="white"
                    justifyContent={{ xs: "center", md: "flex-start" }}
                  >
                    <LocationOn sx={{ mr: 1.5, fontSize: 24, opacity: 0.9 }} />
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: "1.125rem",
                        textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                      }}
                      color="white"
                    >
                      {locAddress(store) || t("address not provided")}
                    </Typography>
                  </Box>

                  {renderLocationRow()}

                  <Box
                    sx={{
                      mb: 1.5,
                      display: "flex",
                      justifyContent: { xs: "center", md: "flex-start" },
                    }}
                  >
                    {renderContactRow()}
                  </Box>
                </Box>

                {store.description && (
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: "1.125rem",
                      opacity: 0.9,
                      lineHeight: 1.6,
                      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                      textAlign: { xs: "center", md: "left" },
                      maxWidth: 600,
                      color: "white",
                    }}
                  >
                    {store.description}
                  </Typography>
                )}

                {/* Branches Section */}
                {/* {store.branches && store.branches.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: { xs: "center", md: "flex-start" },
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontSize: "1.125rem",
                          opacity: 0.9,
                          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                          color: "white",
                          fontWeight: 600,
                          mr: 2,
                        }}
                      >
                        {t("Branches")}:
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setShowBranches(!showBranches)}
                        sx={{
                          color: "white",
                          borderColor: "rgba(255,255,255,0.3)",
                          "&:hover": {
                            borderColor: "rgba(255,255,255,0.6)",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          textTransform: "none",
                          fontSize: "0.8rem",
                          px: 2,
                          py: 0.5,
                        }}
                      >
                        {showBranches ? t("Hide Branches") : t("Show Branches")}
                      </Button>
                    </Box>
                    {showBranches && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                          justifyContent: { xs: "center", md: "flex-start" },
                        }}
                      >
                        {store.branches.map((branch, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              backgroundColor: "rgba(255,255,255,0.1)",
                              borderRadius: 1,
                              p: 1.5,
                              backdropFilter: "blur(10px)",
                              border: "1px solid rgba(255,255,255,0.2)",
                            }}
                          >
                            <LocationOn
                              sx={{ mr: 1, fontSize: 20, opacity: 0.9 }}
                            />
                            <Box>
                              {branch.name && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontSize: "1rem",
                                    fontWeight: 600,
                                    color: "white",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                                  }}
                                >
                                  {branch.name}
                                </Typography>
                              )}
                              {branch.address && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontSize: "0.875rem",
                                    opacity: 0.9,
                                    color: "white",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                                  }}
                                >
                                  {branch.address}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                )} */}
              </Grid>
            </Grid>

            {/* Mobile Content - Address, Phone, Description */}
            <Box sx={{ display: { xs: "block", md: "none" } }}>
              <Box sx={{ mb: 2 }}>
                {locAddress(store) && (
                  <Box display="flex" mb={1} color="white">
                    <LocationOn sx={{ mr: 1, fontSize: 18, opacity: 0.9 }} />
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.875rem",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                      }}
                      color="white"
                    >
                      {locAddress(store)}
                    </Typography>
                  </Box>
                )}

                {renderLocationRow()}

                <Box sx={{ mb: 1 }}>{renderContactRow()}</Box>
              </Box>

              {store.description && (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "0.875rem",
                    opacity: 0.9,
                    lineHeight: 1.4,
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    textAlign: "center",
                    color: "white",
                    mb: 2,
                  }}
                >
                  {store.description}
                </Typography>
              )}

              {/* Mobile Branches Section */}
              {/* {store.branches && store.branches.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.875rem",
                        opacity: 0.9,
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        textAlign: "center",
                        color: "white",
                        fontWeight: 600,
                        mb: 1,
                      }}
                    >
                      {t("Branches")}:
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setShowBranches(!showBranches)}
                      sx={{
                        color: "white",
                        borderColor: "rgba(255,255,255,0.3)",
                        "&:hover": {
                          borderColor: "rgba(255,255,255,0.6)",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        textTransform: "none",
                        fontSize: "0.7rem",
                        px: 1.5,
                        py: 0.3,
                        minWidth: "auto",
                      }}
                    >
                      {showBranches ? t("Hide Branches") : t("Show Branches")}
                    </Button>
                  </Box>
                  {showBranches && (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      {store.branches.map((branch, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            backgroundColor: "rgba(255,255,255,0.1)",
                            borderRadius: 1,
                            p: 1,
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,0.2)",
                          }}
                        >
                          <LocationOn
                            sx={{ mr: 1, fontSize: 16, opacity: 0.9 }}
                          />
                          <Box>
                            {branch.name && (
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  color: "white",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                                }}
                              >
                                {branch.name}
                              </Typography>
                            )}
                            {branch.address && (
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: "0.75rem",
                                  opacity: 0.9,
                                  color: "white",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                                }}
                              >
                                {branch.address}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )} */}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Enhanced Products Section with Tabs */}
      <Box sx={{ mb: 4 }}>
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

        {/* Tabs (hide empty tabs) */}
        {visibleTabs.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              mb: 4,
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255, 122, 26, 0.05)",
              border: `1px solid ${
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(255, 122, 26, 0.1)"
              }`,
            }}
          >
            <Tabs
              value={activeTabIndex}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                p: 1,
                "& .MuiTab-root": {
                  borderRadius: 2,
                  mx: 0.5,
                  transition: "all 0.3s ease",
                  fontWeight: 600,
                  width: { xs: "100px", sm: "100px", md: "100%" },
                  fontSize: { xs: "0.75rem", sm: "1rem" },
                  "&.Mui-selected": {
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "#4A90E2"
                        : "var(--brand-secondary-blue)",
                    color: "white",
                    boxShadow: "0 4px 12px rgba(255, 122, 26, 0.3)",
                  },
                },
                "& .MuiTabs-indicator": {
                  display: "none",
                },
              }}
            >
              {visibleTabs.map((tab) => (
                <Tab
                  key={tab.key}
                  label={tab.label}
                  icon={tab.icon}
                  iconPosition="start"
                  sx={{
                    textTransform: "none",
                    width: { xs: "100px", sm: "100px", md: "100%" },
                  }}
                />
              ))}
            </Tabs>
          </Paper>
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
                          {reel?.title || t("Reel")}
                        </Typography>
                      </Box>
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
        <DialogTitle sx={{ fontWeight: 900 }}>
          {locTitle(selectedJob) || t("Job")}
        </DialogTitle>
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
                  "-"}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Typography sx={{ fontWeight: 900, mb: 0.75 }}>
            {t("Description")}
          </Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }} color="text.secondary">
            {locDescription(selectedJob) || "-"}
          </Typography>
        </DialogContent>
      </Dialog>
      {/* Gift Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <ShoppingCartIcon color="primary" />
            <Typography variant="h6" component="span">
              {t("Gift Information")}
            </Typography>
          </Box>
        </DialogTitle>
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
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6" component="span">
              {t("Login Required")}
            </Typography>
          </Box>
        </DialogTitle>
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
        <DialogTitle sx={{ fontWeight: 900 }}>
          {t("Cart")} ({cartCount})
        </DialogTitle>
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
