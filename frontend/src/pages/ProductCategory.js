import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  LinearProgress,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Avatar,
  IconButton,
  Skeleton,
  Stack,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { productAPI, categoryAPI, storeTypeAPI } from "../services/api";
import CategoryIcon from "@mui/icons-material/Category";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BusinessIcon from "@mui/icons-material/Business";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import { useUserTracking } from "../hooks/useUserTracking";
import ProductViewTracker from "../components/ProductViewTracker";
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
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import ProductDetailDialog from "../components/ProductDetailDialog";
import { productStoreMatchesCity } from "../utils/cityMatch";
import { formatPriceDigits } from "../utils/formatPriceNumber";
const storeTypeIdFromValue = (storeTypeId) => {
  if (storeTypeId == null || storeTypeId === "") return null;
  if (typeof storeTypeId === "object" && storeTypeId._id != null) {
    return String(storeTypeId._id);
  }
  return String(storeTypeId);
};

const ProductCategory = () => {
  const theme = useTheme();
  const isMobile = useIsMobileLayout();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { dataLanguage, locName, locDescription } = useLocalizedContent();
  const { toggleLike, isProductLiked, recordView } = useUserTracking();
  const { selectedCity } = useCityFilter();
  const isRtl = i18n.language === "ar" || i18n.language === "ku";
  const [categories, setCategories] = useState([]);
  const [categoryTypes, setCategoryTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCategoryType, setSelectedCategoryType] = useState(null);
  const [, setPage] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);
  /** null | "network" | "generic" */
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mobile layout states
  const [storeTypes, setStoreTypes] = useState([]);
  const [selectedStoreTypeId, setSelectedStoreTypeId] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 900 ? null : "all",
  );

  // Mobile view mode: 'categories' → list categories, 'products' → show products of selected category
  const [mobileViewMode, setMobileViewMode] = useState("categories");

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
    store: "",
    barcode: "",
    discount: false,
  });

  // Pagination states

  // Track if we've applied nav state (category/categoryType from MainPage or ProductDetail link)
  const stateAppliedRef = useRef(false);
  const productViewRecordedRef = useRef(new Set());
  /** categoryId -> { types, products } — avoids refetch / full reload when switching category */
  const categoryDataCacheRef = useRef(new Map());

  const putCategoryCache = useCallback((categoryId, types, products) => {
    if (categoryId == null) return;
    categoryDataCacheRef.current.set(String(categoryId), {
      types: Array.isArray(types) ? types : [],
      products: Array.isArray(products) ? products : [],
    });
  }, []);

  useEffect(() => {
    productViewRecordedRef.current = new Set();
  }, [selectedCategory?._id]);

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

  // Store types for filtering
  useEffect(() => {
    (async () => {
      try {
        const res = await storeTypeAPI.getAll();
        const types = res.data || [];
        setStoreTypes(types);
        if (typeof window !== "undefined" && window.innerWidth < 900) {
          const pending = location.state?.category;
          const hasCategoryNav =
            pending &&
            (typeof pending === "string"
              ? pending.trim() && pending !== "All Categories"
              : Boolean(pending._id || pending.name));
          if (!hasCategoryNav) {
            setSelectedStoreTypeId(types[0]?._id || "all");
          }
        }
      } catch (e) {
        setStoreTypes([]);
        setSelectedStoreTypeId((prev) => (prev == null ? "all" : prev));
      }
    })();
    // Intentionally omit location from deps: only read initial navigation state on first load
    // so clearing state later does not reset the rail to the first store type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [selectedStoreTypeId, storeTypes]);

  // Keep filtered list in sync when inputs change
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, selectedCategoryType, filters, selectedCity, dataLanguage]);

  // Prefetch types + products for all categories in the current list (background; switching stays instant when cached)
  useEffect(() => {
    if (loading || !categories.length) return;
    let cancelled = false;

    const prefetchOne = async (category) => {
      const id = String(category._id);
      if (categoryDataCacheRef.current.has(id)) return;
      try {
        const [typesRes, prodRes] = await Promise.all([
          categoryAPI.getTypes(category._id),
          productAPI.getByCategory(category._id),
        ]);
        if (cancelled) return;
        const types = typesRes.data || [];
        const products = prodRes.data || [];
        categoryDataCacheRef.current.set(id, { types, products });
      } catch {
        /* non-fatal */
      }
    };

    const run = async () => {
      const pending = categories.filter(
        (c) => !categoryDataCacheRef.current.has(String(c._id)),
      );
      const batchSize = 3;
      for (let i = 0; i < pending.length && !cancelled; i += batchSize) {
        const batch = pending.slice(i, i + batchSize);
        await Promise.all(batch.map((c) => prefetchOne(c)));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [categories, loading]);
  const fetchCategories = async () => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 900;
    const pending = location.state?.category;
    const hasCategoryNav =
      pending &&
      (typeof pending === "string"
        ? pending.trim() && pending !== "All Categories"
        : Boolean(pending._id || pending.name));

    if (
      isMobile &&
      storeTypes.length === 0 &&
      !hasCategoryNav &&
      selectedStoreTypeId == null
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      let response;
      if (selectedStoreTypeId === "all") {
        response = await categoryAPI.getAll();
      } else if (selectedStoreTypeId == null) {
        response = await categoryAPI.getAll();
      } else {
        const st = storeTypes.find((s) => s._id === selectedStoreTypeId);
        response = st
          ? await categoryAPI.getByStoreType(st.name)
          : await categoryAPI.getAll();
      }
      setCategories(response.data);
      const state = location.state;
      const fromNavState = state?.category && !stateAppliedRef.current;

      if (response.data.length > 0) {
        if (fromNavState) {
          const categoryName =
            typeof state.category === "string"
              ? state.category
              : state.category?.name;
          const stateCatId = state.category?._id;
          let matchedCategory = response.data.find(
            (c) =>
              (stateCatId && String(c._id) === String(stateCatId)) ||
              c.name === categoryName ||
              c.name?.toLowerCase() === categoryName?.toLowerCase(),
          );
          if (!matchedCategory && selectedStoreTypeId !== "all") {
            const allRes = await categoryAPI.getAll();
            const allCats = allRes.data || [];
            matchedCategory = allCats.find(
              (c) =>
                (stateCatId && String(c._id) === String(stateCatId)) ||
                c.name === categoryName ||
                c.name?.toLowerCase() === categoryName?.toLowerCase(),
            );
            if (matchedCategory) {
              setCategories(allCats);
            }
          }
          if (matchedCategory) {
            stateAppliedRef.current = true;
            const stId = storeTypeIdFromValue(matchedCategory.storeTypeId);
            if (stId) {
              setSelectedStoreTypeId(stId);
            }
            setSelectedCategory(matchedCategory);
            const types = await fetchCategoryTypes(matchedCategory._id);
            const prods = await fetchProductsByCategory(matchedCategory._id);
            putCategoryCache(matchedCategory._id, types, prods);
            if (state.categoryType && types?.length > 0) {
              const typeName =
                typeof state.categoryType === "string"
                  ? state.categoryType
                  : state.categoryType?.name;
              const stateTypeId = state.categoryType?._id;
              const matchedType = types.find(
                (t) =>
                  (stateTypeId && String(t._id) === String(stateTypeId)) ||
                  t.name === typeName ||
                  t.name?.toLowerCase() === typeName?.toLowerCase(),
              );
              if (matchedType) {
                setSelectedCategoryType(matchedType);
              }
            }
            if (window.innerWidth < 900) {
              setMobileViewMode("products");
            }
            navigate(location.pathname, { replace: true, state: {} });
          } else {
            if (window.innerWidth >= 900) {
              const first = response.data[0];
              setSelectedCategory(first);
              const types0 = await fetchCategoryTypes(first._id);
              const prods0 = await fetchProductsByCategory(first._id);
              putCategoryCache(first._id, types0, prods0);
            } else {
              setSelectedCategory(null);
              setCategoryTypes([]);
              setProducts([]);
              setFilteredProducts([]);
              setMobileViewMode("categories");
            }
          }
        } else if (!stateAppliedRef.current) {
          if (window.innerWidth >= 900) {
            const first = response.data[0];
            setSelectedCategory(first);
            const types0 = await fetchCategoryTypes(first._id);
            const prods0 = await fetchProductsByCategory(first._id);
            putCategoryCache(first._id, types0, prods0);
          } else {
            setSelectedCategory(null);
            setCategoryTypes([]);
            setProducts([]);
            setFilteredProducts([]);
            setMobileViewMode("categories");
          }
        }
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      const isNetwork =
        !err?.response &&
        (err?.message === "Network Error" ||
          err?.code === "ERR_NETWORK" ||
          err?.code === "ECONNABORTED");
      setError(isNetwork ? "network" : "generic");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryTypes = async (categoryId) => {
    try {
      const response = await categoryAPI.getTypes(categoryId);
      const types = response.data || [];
      setCategoryTypes(types);
      return types;
    } catch (err) {
      console.error("Error fetching category types:", err);
      setCategoryTypes([]);
      return [];
    }
  };

  const fetchProductsByCategory = async (categoryId) => {
    try {
      const response = await productAPI.getByCategory(categoryId);
      const data = response.data || [];
      setProducts(data);
      setFilteredProducts(data);
      return data;
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
      setFilteredProducts([]);
      return [];
    }
  };

  const handleCategoryChange = async (category) => {
    setSelectedCategory(category);
    setSelectedCategoryType(null);
    if (window.innerWidth < 900) {
      setMobileViewMode("products");
    }
    const cid = String(category._id);
    const cached = categoryDataCacheRef.current.get(cid);
    if (cached) {
      setCategoryTypes(cached.types);
      setProducts(cached.products);
      setFilteredProducts(cached.products);
      return;
    }
    setCategoryProductsLoading(true);
    try {
      const types = await fetchCategoryTypes(category._id);
      const prods = await fetchProductsByCategory(category._id);
      putCategoryCache(category._id, types, prods);
    } finally {
      setCategoryProductsLoading(false);
    }
  };
  const handleStoreTypeChange = (storeTypeId) => {
    stateAppliedRef.current = false;
    categoryDataCacheRef.current.clear();
    setSelectedStoreTypeId(storeTypeId);
    setSelectedCategory(null);
    setSelectedCategoryType(null);
    setCategoryTypes([]);
    setProducts([]);
    setFilteredProducts([]);
    if (isMobile) {
      setMobileViewMode("categories");
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleLikeClick = async (productId, e) => {
    e.stopPropagation();
    // Like works for both logged-in and guest/device users

    const prevLikeState = likeStates[productId];
    const prevLikeCount = likeCounts[productId] || 0;

    try {
      setLikeLoading((prev) => ({ ...prev, [productId]: true }));
      const result = await toggleLike(productId);

      if (!result.success) {
        setLikeStates((prev) => ({ ...prev, [productId]: prevLikeState }));
        setLikeCounts((prev) => ({ ...prev, [productId]: prevLikeCount }));
        alert(result.message || "Failed to toggle like");
        return;
      }

      setLikeStates((prev) => ({
        ...prev,
        [productId]: !prevLikeState,
      }));
      setLikeCounts((prev) => ({
        ...prev,
        [productId]: prevLikeCount + (prevLikeState ? -1 : 1),
      }));
    } catch (err) {
      console.error("Error toggling like:", err);
      setLikeStates((prev) => ({ ...prev, [productId]: prevLikeState }));
      setLikeCounts((prev) => ({ ...prev, [productId]: prevLikeCount }));
      alert("Failed to toggle like");
    } finally {
      setLikeLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const isDiscountValid = (product) => {
    const hasPriceDrop =
      product.previousPrice &&
      product.newPrice &&
      parseFloat(product.previousPrice) > parseFloat(product.newPrice);
    return Boolean(product.isDiscount) || Boolean(hasPriceDrop);
  };

  const applyFilters = () => {
    let filtered = [...products];

    if (filters.name) {
      filtered = filtered.filter((product) =>
        locName(product).toLowerCase().includes(filters.name.toLowerCase()),
      );
    }

    if (filters.brand) {
      filtered = filtered.filter(
        (product) =>
          locName(product.companyId || product.brandId) === filters.brand,
      );
    }

    if (filters.store) {
      filtered = filtered.filter(
        (product) => locName(product.storeId) === filters.store,
      );
    }

    if (filters.barcode) {
      filtered = filtered.filter((product) =>
        product.barcode?.includes(filters.barcode),
      );
    }

    filtered = filtered.filter((product) => {
      if (!product.expireDate) return true;
      return isExpiryStillValid(product.expireDate);
    });

    if (filters.discount) {
      filtered = filtered.filter((product) => isDiscountValid(product));
    }

    if (selectedCategoryType) {
      filtered = filtered.filter(
        (product) => product.categoryTypeId === selectedCategoryType._id,
      );
    }

    filtered = filtered.filter((product) =>
      productStoreMatchesCity(product, selectedCity, (p) =>
        String(p.storeId?.storecity || p.storeId?.city || "").trim(),
      ),
    );

    setFilteredProducts(filtered);
    setPage(0);
  };
  const formatPrice = (price) => {
    if (typeof price !== "number") return `${t("ID")} 0`;
    return ` ${formatPriceDigits(price)} ${t("ID")}`;
  };

  const calculateDiscount = (previousPrice, newPrice) => {
    if (
      previousPrice === undefined ||
      previousPrice === null ||
      newPrice === undefined ||
      newPrice === null
    ) {
      return null;
    }
    const prev = Number(previousPrice);
    const next = Number(newPrice);
    if (
      !Number.isFinite(prev) ||
      !Number.isFinite(next) ||
      prev <= 0 ||
      prev <= next
    ) {
      return null;
    }
    const discount = ((prev - next) / prev) * 100;
    return Math.round(discount);
  };
  const renderMobileLayout = () => {
    const isDark = theme.palette.mode === "dark";
    const railBg = isDark ? "rgba(18,24,38,0.98)" : "rgba(248,249,252,0.98)";
    const railBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
    const accentColor = "var(--color-primary, #1E6FD9)";
    const cardBg = isDark ? "rgba(30,36,52,1)" : "#ffffff";
    const surfaceBg = isDark ? "rgba(22,28,44,1)" : "rgba(248,249,252,1)";

    return (
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        {/* --- Left vertical rail: Store types --- */}
        <Box
          sx={{
            position: "fixed",
            top: 56,
            left: 0,
            width: 80,
            bottom: 0,
            borderRight: `1px solid ${railBorder}`,
            backgroundColor: railBg,
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            overflowY: "auto",
            overflowX: "hidden",
            py: 1.5,
            gap: 0.5,
            zIndex: 10,
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
          }}
        >
          {storeTypes.map((type) => {
            const isActive = selectedStoreTypeId === type._id;
            return (
              <Box
                key={type._id}
                onClick={() => handleStoreTypeChange(type._id)}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  mx: 0.75,
                  py: 1,
                  px: 0.5,
                  borderRadius: 2.5,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: isActive
                    ? "linear-gradient(135deg, var(--color-primary,#1E6FD9) 0%, var(--color-secondary,#0d47a1) 100%)"
                    : "transparent",
                  boxShadow: isActive
                    ? "0 4px 12px rgba(30,111,217,0.35)"
                    : "none",
                  "&:active": { transform: "scale(0.95)" },
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 0.5,
                    background: isActive
                      ? "rgba(255,255,255,0.22)"
                      : isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(30,111,217,0.08)",
                    transition: "background 0.2s",
                    fontSize: "1.35rem",
                    lineHeight: 1,
                  }}
                >
                  {type.image ? (
                    <Avatar
                      src={resolveMediaUrl(type.image)}
                      sx={{ width: 32, height: 32, bgcolor: "transparent" }}
                    />
                  ) : (
                    <Typography
                      component="span"
                      role="img"
                      sx={{ fontSize: "1.35rem", lineHeight: 1 }}
                    >
                      {type.icon || "🏪"}
                    </Typography>
                  )}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    textAlign: "center",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "0.65rem",
                    color: isActive
                      ? "#fff"
                      : isDark
                        ? "rgba(255,255,255,0.65)"
                        : "rgba(0,0,0,0.6)",
                    lineHeight: 1.2,
                    wordBreak: "break-word",
                    width: "100%",
                  }}
                >
                  {locName(type) || t(type.name)}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* --- Right content area --- */}
        <Box
          sx={{
            pl: "84px",
            pt: "64px",
            pb: "80px",
            pr: 1,
            minHeight: "100dvh",
            backgroundColor: surfaceBg,
          }}
        >
          {/* ── CATEGORIES VIEW ── */}
          {mobileViewMode === "categories" && (
            <>
              <Box
                sx={{
                  px: 1,
                  pt: 1.5,
                  pb: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <CategoryIcon sx={{ fontSize: "1.1rem", color: accentColor }} />
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: isDark
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(0,0,0,0.85)",
                  }}
                >
                  {t("Categories")}
                </Typography>
              </Box>

              {loading ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 1,
                    px: 1,
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton
                      key={i}
                      variant="rounded"
                      height={110}
                      sx={{ borderRadius: 3 }}
                    />
                  ))}
                </Box>
              ) : categories.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    pt: 8,
                    color: "text.secondary",
                  }}
                >
                  <CategoryIcon sx={{ fontSize: 56, opacity: 0.3, mb: 1 }} />
                  <Typography variant="body2">
                    {t("No categories found")}
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 1,
                    px: 1,
                  }}
                >
                  {categories.map((category) => (
                    <Box
                      key={category._id}
                      onClick={() => handleCategoryChange(category)}
                      sx={{
                        borderRadius: 3,
                        overflow: "hidden",
                        backgroundColor: cardBg,
                        boxShadow: isDark
                          ? "0 2px 8px rgba(0,0,0,0.35)"
                          : "0 2px 8px rgba(0,0,0,0.07)",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        p: 1.5,
                        gap: 0.75,
                        transition: "all 0.18s ease",
                        "&:active": { transform: "scale(0.97)", opacity: 0.85 },
                      }}
                    >
                      <Avatar
                        src={
                          category.image
                            ? resolveMediaUrl(category.image)
                            : undefined
                        }
                        sx={{
                          width: 58,
                          height: 58,
                          background:
                            "linear-gradient(135deg, var(--color-primary,#1E6FD9) 0%, var(--brand-accent-orange,#ff8c00) 100%)",
                          color: "white",
                          fontSize: "1.6rem",
                          boxShadow: "0 3px 10px rgba(30,111,217,0.25)",
                        }}
                      >
                        {!category.image &&
                          (category.icon ||
                            (locName(category) || "").charAt(0))}
                      </Avatar>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          textAlign: "center",
                          color: isDark
                            ? "rgba(255,255,255,0.88)"
                            : "rgba(0,0,0,0.8)",
                          lineHeight: 1.3,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {locName(category)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </>
          )}

          {/* ── PRODUCTS VIEW ── */}
          {mobileViewMode === "products" && selectedCategory && (
            <>
              {/* Header row */}
              <Box
                sx={{
                  px: 1,
                  pt: 1,
                  pb: 0.75,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => setMobileViewMode("categories")}
                  sx={{
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.06)",
                    borderRadius: 2,
                    "&:hover": {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.14)"
                        : "rgba(0,0,0,0.1)",
                    },
                  }}
                >
                  {isRtl ? (
                    <ArrowForwardIcon
                      sx={{
                        fontSize: "1.1rem",
                        color: isDark
                          ? "rgba(255,255,255,0.85)"
                          : "rgba(0,0,0,0.7)",
                      }}
                    />
                  ) : (
                    <ArrowBackIcon
                      sx={{
                        fontSize: "1.1rem",
                        color: isDark
                          ? "rgba(255,255,255,0.85)"
                          : "rgba(0,0,0,0.7)",
                      }}
                    />
                  )}
                </IconButton>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: isDark
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(0,0,0,0.85)",
                    flex: 1,
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {locName(selectedCategory)}
                </Typography>
                {filteredProducts.length > 0 && (
                  <Chip
                    label={filteredProducts.length}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(30,111,217,0.1)",
                      color: accentColor,
                    }}
                  />
                )}
              </Box>

              {/* Category type chips */}
              {categoryTypes.length > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.75,
                    overflowX: "auto",
                    px: 1,
                    pb: 1,
                    "&::-webkit-scrollbar": { display: "none" },
                    scrollbarWidth: "none",
                  }}
                >
                  {[null, ...categoryTypes].map((type) => {
                    const isActive =
                      type === null
                        ? selectedCategoryType === null
                        : selectedCategoryType?._id === type._id;
                    return (
                      <Chip
                        key={type?._id ?? "all"}
                        label={type === null ? t("All Types") : locName(type)}
                        onClick={() => setSelectedCategoryType(type)}
                        size="small"
                        sx={{
                          flexShrink: 0,
                          borderRadius: 99,
                          fontWeight: isActive ? 700 : 500,
                          fontSize: "0.72rem",
                          height: 28,
                          background: isActive
                            ? "linear-gradient(135deg, var(--color-primary,#1E6FD9) 0%, var(--color-secondary,#0d47a1) 100%)"
                            : isDark
                              ? "rgba(255,255,255,0.07)"
                              : "rgba(0,0,0,0.05)",
                          color: isActive
                            ? "#fff"
                            : isDark
                              ? "rgba(255,255,255,0.75)"
                              : "rgba(0,0,0,0.65)",
                          border: "none",
                          boxShadow: isActive
                            ? "0 2px 8px rgba(30,111,217,0.3)"
                            : "none",
                          transition: "all 0.18s ease",
                        }}
                      />
                    );
                  })}
                </Box>
              )}

              {/* Products */}
              {categoryProductsLoading ? (
                <Box sx={{ px: 1 }}>
                  <LinearProgress
                    sx={{ height: 3, borderRadius: 1, mb: 2, opacity: 0.95 }}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: 200,
                    }}
                  >
                    <CircularProgress size={36} />
                  </Box>
                </Box>
              ) : filteredProducts.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    pt: 8,
                    color: "text.secondary",
                  }}
                >
                  <ShoppingCartIcon
                    sx={{ fontSize: 56, opacity: 0.3, mb: 1 }}
                  />
                  <Typography variant="body2">
                    {t("No products found")}
                  </Typography>
                </Box>
              ) : (
                <Fade in timeout={240} key={String(selectedCategory?._id)}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 1,
                      px: 1,
                    }}
                  >
                    {filteredProducts.map((product) => {
                      const discountPct = calculateDiscount(
                        product.previousPrice,
                        product.newPrice,
                      );
                      const hasDiscount = isDiscountValid(product);
                      const discountLabel =
                        discountPct !== null
                          ? `-${discountPct}%`
                          : t("Discount");

                      return (
                        <ProductViewTracker
                          key={product._id}
                          productId={product._id}
                          onVisible={handleProductBecameVisible}
                          recordedIdsRef={productViewRecordedRef}
                        >
                          <Card
                            onClick={() => handleProductClick(product)}
                            sx={{
                              cursor: "pointer",
                              borderRadius: 3,
                              overflow: "hidden",
                              backgroundColor: cardBg,
                              boxShadow: isDark
                                ? "0 2px 8px rgba(0,0,0,0.4)"
                                : "0 2px 8px rgba(0,0,0,0.07)",
                              border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}`,
                              display: "flex",
                              flexDirection: "column",
                              transition: "transform 0.15s ease",
                              "&:active": { transform: "scale(0.97)" },
                            }}
                          >
                            {/* Image area */}
                            <Box sx={{ position: "relative", flexShrink: 0 }}>
                              {product.image ? (
                                <CardMedia
                                  component="img"
                                  image={resolveMediaUrl(product.image)}
                                  alt={locName(product) || "Product"}
                                  sx={{
                                    height: 130,
                                    objectFit: "contain",
                                    backgroundColor: isDark
                                      ? "rgba(255,255,255,0.04)"
                                      : "rgba(0,0,0,0.03)",
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    height: 130,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: isDark
                                      ? "rgba(255,255,255,0.04)"
                                      : "rgba(0,0,0,0.03)",
                                  }}
                                >
                                  <ShoppingCartIcon
                                    sx={{ fontSize: 36, opacity: 0.25 }}
                                  />
                                </Box>
                              )}

                              {/* Discount badge */}
                              {hasDiscount && (
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: 6,
                                    left: 6,
                                    background:
                                      "linear-gradient(135deg,#e53e3e,#c53030)",
                                    color: "#fff",
                                    fontSize: "0.62rem",
                                    fontWeight: 800,
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: 1,
                                    pointerEvents: "none",
                                    zIndex: 2,
                                    boxShadow: "0 2px 6px rgba(229,62,62,0.45)",
                                  }}
                                >
                                  {discountLabel}
                                </Box>
                              )}

                              {/* View count */}
                              {product.viewCount > 0 && (
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: 6,
                                    right: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.25,
                                    backgroundColor: "rgba(0,0,0,0.6)",
                                    backdropFilter: "blur(4px)",
                                    color: "#fff",
                                    px: 0.6,
                                    py: 0.2,
                                    borderRadius: 1,
                                    fontSize: "0.6rem",
                                    fontWeight: 600,
                                    pointerEvents: "none",
                                    zIndex: 2,
                                  }}
                                >
                                  <VisibilityIcon
                                    sx={{ fontSize: "0.65rem" }}
                                  />
                                  {product.viewCount}
                                </Box>
                              )}
                            </Box>

                            {/* Content */}
                            <CardContent
                              sx={{
                                p: 1,
                                pt: 0.75,
                                flexGrow: 1,
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.35,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.78rem",
                                  lineHeight: 1.3,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  color: isDark
                                    ? "rgba(255,255,255,0.9)"
                                    : "rgba(0,0,0,0.85)",
                                }}
                              >
                                {locName(product) || "\u00A0"}
                              </Typography>

                              {product.storeId && locName(product.storeId) && (
                                <Typography
                                  sx={{
                                    fontSize: "0.66rem",
                                    color: accentColor,
                                    fontWeight: 600,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                  }}
                                >
                                  {locName(product.storeId)}
                                </Typography>
                              )}

                              <Box sx={{ mt: "auto", pt: 0.5 }}>
                                {isDiscountValid(product) &&
                                  product.previousPrice &&
                                  Number(product.previousPrice) >
                                    Number(product.newPrice) && (
                                    <Typography
                                      sx={{
                                        fontSize: "0.65rem",
                                        textDecoration: "line-through",
                                        color: isDark
                                          ? "rgba(255,100,100,0.7)"
                                          : "rgba(200,0,0,0.55)",
                                        fontWeight: 500,
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      {formatPrice(product.previousPrice)}
                                    </Typography>
                                  )}
                                {product.newPrice && (
                                  <Typography
                                    sx={{
                                      fontSize: "0.88rem",
                                      fontWeight: 800,
                                      color: "var(--color-secondary, #0d47a1)",
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {formatPrice(product.newPrice)}
                                  </Typography>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        </ProductViewTracker>
                      );
                    })}
                  </Box>
                </Fade>
              )}
            </>
          )}
        </Box>
      </Box>
    );
  };

  const renderDesktopLayout = () => (
    <Box sx={{ display: { xs: "none", md: "block" } }}>
      {/* Desktop layout - keeping existing design */}
      <Box sx={{ py: 8, px: 3 }}>
        {/* Store Type Filter */}
        <Box sx={{ mb: 3 }}>
          {/* <Typography variant="h6" sx={{ mb: 2 }}>
            Filter by Store Type
          </Typography> */}
          <Box sx={{ display: "flex", gap: 2 }}>
            {[{ _id: "all", name: t("All"), icon: "🏪" }, ...storeTypes].map(
              (type) => (
                <Button
                  key={type._id}
                  variant={
                    selectedStoreTypeId === type._id ? "contained" : "outlined"
                  }
                  onClick={() => handleStoreTypeChange(type._id)}
                  sx={{
                    backgroundColor:
                      selectedStoreTypeId === type._id
                        ? theme.palette.mode === "dark"
                          ? "#4A90E2"
                          : "#1E6FD9"
                        : "transparent",
                    color:
                      selectedStoreTypeId === type._id
                        ? "white"
                        : theme.palette.mode === "dark"
                          ? "#4A90E2"
                          : "#1E6FD9",
                    borderColor:
                      theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
                    "&:hover": {
                      backgroundColor:
                        selectedStoreTypeId === type._id
                          ? theme.palette.mode === "dark"
                            ? "#4A90E2"
                            : "#1E6FD9"
                          : "rgba(30, 111, 217, 0.1)",
                    },
                  }}
                >
                  {type.icon || "🏪"} {locName(type) || t(type.name)}
                </Button>
              ),
            )}
          </Box>
        </Box>

        {/* Main Category Tabs */}
        {categories.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              borderRadius: 3,
              background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
              border: "1px solid #e9ecef",
            }}
          >
            <Box sx={{ p: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  mb: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  color: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
                }}
              >
                <CategoryIcon
                  sx={{
                    color:
                      theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
                  }}
                />
                {t("Categories")}
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {categories.map((category) => (
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
                          ? theme.palette.mode === "dark"
                            ? "#4A90E2"
                            : "#1E6FD9"
                          : "transparent",
                      color:
                        selectedCategory?._id === category._id
                          ? "white"
                          : theme.palette.mode === "dark"
                            ? "#4A90E2"
                            : "#1E6FD9",
                      borderColor:
                        theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
                      "&:hover": {
                        backgroundColor:
                          selectedCategory?._id === category._id
                            ? theme.palette.mode === "dark"
                              ? "#4A90E2"
                              : "#1E6FD9"
                            : "rgba(30, 111, 217, 0.1)",
                      },
                    }}
                  >
                    <Avatar
                      src={
                        category.image
                          ? resolveMediaUrl(category.image)
                          : undefined
                      }
                      sx={{
                        width: 24,
                        height: 24,
                        bgcolor:
                          selectedCategory?._id === category._id
                            ? "white"
                            : theme.palette.mode === "dark"
                              ? "#4A90E2"
                              : "#1E6FD9",
                        color:
                          selectedCategory?._id === category._id
                            ? theme.palette.mode === "dark"
                              ? "#4A90E2"
                              : "#1E6FD9"
                            : "white",
                        fontSize: "0.75rem",
                        mr: 1,
                      }}
                    >
                      {category.icon || (locName(category) || "").charAt(0)}
                    </Avatar>
                    {locName(category)}
                  </Button>
                ))}
              </Box>
            </Box>
          </Paper>
        )}

        {/* Category Types Tabs */}
        {selectedCategory && categoryTypes.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              borderRadius: 3,
              background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
              border: "1px solid #e9ecef",
            }}
          >
            <Box sx={{ p: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  mb: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  color: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
                }}
              >
                <ExpandMoreIcon
                  sx={{
                    color:
                      theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
                  }}
                />
                {t("Types")} - {locName(selectedCategory)}
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Button
                  variant={
                    selectedCategoryType === null ? "contained" : "outlined"
                  }
                  onClick={() => setSelectedCategoryType(null)}
                  sx={{
                    backgroundColor:
                      selectedCategoryType === null
                        ? theme.palette.mode === "dark"
                          ? "#4A90E2"
                          : "#1E6FD9"
                        : "transparent",
                    color:
                      selectedCategoryType === null
                        ? "white"
                        : theme.palette.mode === "dark"
                          ? "#4A90E2"
                          : "#1E6FD9",
                    borderColor:
                      theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
                    "&:hover": {
                      backgroundColor:
                        selectedCategoryType === null
                          ? "#4A90E2"
                          : "rgba(30, 111, 217, 0.1)",
                    },
                  }}
                >
                  All Types
                </Button>
                {categoryTypes.map((type) => (
                  <Button
                    key={type._id}
                    variant={
                      selectedCategoryType?._id === type._id
                        ? "contained"
                        : "outlined"
                    }
                    onClick={() => setSelectedCategoryType(type)}
                    sx={{
                      backgroundColor:
                        selectedCategoryType?._id === type._id
                          ? theme.palette.mode === "dark"
                            ? "#4A90E2"
                            : "#1E6FD9"
                          : "transparent",
                      color:
                        selectedCategoryType?._id === type._id
                          ? "white"
                          : theme.palette.mode === "dark"
                            ? "#4A90E2"
                            : "#1E6FD9",
                      borderColor:
                        theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
                      "&:hover": {
                        backgroundColor:
                          selectedCategoryType?._id === type._id
                            ? theme.palette.mode === "dark"
                              ? "#4A90E2"
                              : "#1E6FD9"
                            : "rgba(30, 111, 217, 0.1)",
                      },
                    }}
                  >
                    {locName(type)}
                  </Button>
                ))}
              </Box>
            </Box>
          </Paper>
        )}

        {selectedCategory && (
          <>
            {categoryProductsLoading ? (
              <Box sx={{ width: "100%" }}>
                <LinearProgress
                  sx={{
                    height: 3,
                    borderRadius: 1,
                    mb: 2,
                    opacity: 0.95,
                  }}
                />
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  minHeight={280}
                >
                  <CircularProgress
                    sx={{
                      color:
                        theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
                    }}
                  />
                </Box>
              </Box>
            ) : filteredProducts.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight={320}
                sx={{ color: "text.secondary" }}
              >
                <ShoppingCartIcon sx={{ fontSize: 80, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6">{t("No products found")}</Typography>
              </Box>
            ) : (
              <Fade in timeout={240} key={String(selectedCategory?._id)}>
                {/* Products Grid - enforce 2 columns via CSS grid */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 2,
                  }}
                >
                  {filteredProducts.map((product) => (
                    <ProductViewTracker
                      key={product._id}
                      productId={product._id}
                      onVisible={handleProductBecameVisible}
                      recordedIdsRef={productViewRecordedRef}
                    >
                      <Box sx={{ display: "flex" }}>
                        <Card
                          onClick={() => handleProductClick(product)}
                          sx={{
                            cursor: "pointer",
                            transition: "transform 0.2s",
                            "&:hover": { transform: "scale(1.01)" },
                            display: "flex",
                            flexDirection: "column",
                            width: "100%",
                            height: "100%",
                          }}
                        >
                          <Box
                            sx={{
                              position: "relative",
                              flexShrink: 0,
                            }}
                          >
                            {product.image ? (
                              <CardMedia
                                component="img"
                                image={resolveMediaUrl(product.image)}
                                alt={locName(product) || "Product image"}
                                sx={{
                                  height: 180,
                                  objectFit: "contain",
                                  backgroundColor: theme.palette.grey[100],
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  height: 180,
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  backgroundColor: theme.palette.grey[100],
                                }}
                              >
                                <ShoppingCartIcon
                                  sx={{
                                    fontSize: 56,
                                    color: theme.palette.grey[400],
                                  }}
                                />
                              </Box>
                            )}
                            {product.viewCount > 0 && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.25,
                                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                                  color: "white",
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  pointerEvents: "none",
                                  zIndex: 1,
                                }}
                              >
                                <VisibilityIcon sx={{ fontSize: "0.8rem" }} />
                                {product.viewCount}
                              </Box>
                            )}
                          </Box>
                          <CardContent
                            sx={{
                              p: 2,
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                              flexGrow: 1,
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 600,
                                textAlign: "center",
                                minHeight: "2.6em",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                color:
                                  theme.palette.mode === "dark"
                                    ? "white"
                                    : "black",
                              }}
                            >
                              {locName(product) || "\u00A0"}
                            </Typography>

                            {/* {product.categoryTypeId && (
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                          <Chip
                            label={getCategoryTypeName(
                              product.categoryTypeId,
                              product.categoryId
                            )}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: "0.75rem",
                              color: "#2d6a4f",
                              backgroundColor: "rgba(82,183,136,0.12)",
                            }}
                          />
                        </Box>
                      )} */}

                            {product.storeId && locName(product.storeId) && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", textAlign: "center" }}
                              >
                                {locName(product.storeId)}
                              </Typography>
                            )}

                            <Box sx={{ mt: "auto" }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 1,
                                }}
                              >
                                {/* {isDiscountValid(product) &&
                                product.previousPrice &&
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
                                )} */}
                                {product.newPrice && (
                                  <Typography
                                    variant="h6"
                                    sx={{
                                      color: "var(--color-secondary)",
                                      fontWeight: 700,
                                      fontSize: { xs: "1.1rem", sm: "1.3rem" },
                                    }}
                                  >
                                    {formatPrice(product.newPrice)}
                                  </Typography>
                                )}
                                {/* {isDiscountValid(product) && (
                                <Chip
                                  label={(() => {
                                    const off = calculateDiscount(
                                      product.previousPrice,
                                      product.newPrice,
                                    );
                                    return off === null
                                      ? t("Discount")
                                      : `${off}%`;
                                  })()}
                                  size="small"
                                  sx={{
                                    backgroundColor: "#e53e3e",
                                    color: "white",
                                    height: 20,
                                    fontSize: "0.7rem",
                                  }}
                                />
                              )} */}
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    </ProductViewTracker>
                  ))}
                </Box>
              </Fade>
            )}
          </>
        )}
      </Box>
    </Box>
  );

  if (loading) {
    if (isMobile) {
      const isDark = theme.palette.mode === "dark";
      return (
        <Box sx={{ display: { xs: "block", md: "none" } }}>
          {/* Left rail skeleton */}
          <Box
            sx={{
              position: "fixed",
              top: 56,
              left: 0,
              width: 80,
              bottom: 0,
              borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
              backgroundColor: isDark
                ? "rgba(18,24,38,0.98)"
                : "rgba(248,249,252,0.98)",
              py: 2,
              px: 0.75,
              zIndex: 10,
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <Box
                key={i}
                sx={{
                  mb: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Skeleton
                  variant="circular"
                  width={44}
                  height={44}
                  sx={{ mb: 0.5 }}
                />
                <Skeleton variant="text" width={48} height={12} />
              </Box>
            ))}
          </Box>

          {/* Right content skeleton */}
          <Box sx={{ pl: "84px", pt: "72px", pr: 1, pb: "80px" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1,
                mb: 1.5,
              }}
            >
              <Skeleton variant="circular" width={20} height={20} />
              <Skeleton variant="text" width={100} height={22} />
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 1,
                px: 1,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={110}
                  sx={{ borderRadius: 3 }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      );
    }

    return (
      <Box sx={{ py: { xs: 5, md: 8 }, px: { xs: 1, sm: 2, md: 3 } }}>
        {/* Filters / categories row */}
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" width={100} height={36} />
          ))}
        </Box>

        {/* Category cards preview */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={6} sm={3} key={`cat-${i}`}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent sx={{ textAlign: "center", p: 1.2 }}>
                  <Skeleton
                    variant="circular"
                    width={48}
                    height={48}
                    sx={{ mx: "auto", mb: 1 }}
                  />
                  <Skeleton variant="text" width="80%" sx={{ mx: "auto" }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Product cards preview */}
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Grid item xs={6} sm={4} md={3} key={i}>
              <Card sx={{ borderRadius: 2 }}>
                <Skeleton
                  variant="rectangular"
                  sx={{ height: { xs: 130, sm: 160 } }}
                />
                <CardContent sx={{ p: 1.2 }}>
                  <Skeleton variant="text" width="90%" height={22} />
                  <Skeleton variant="text" width="70%" height={20} />
                  <Skeleton variant="rounded" width="60%" height={26} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    const isNetwork = error === "network";
    return (
      <Box
        sx={{
          minHeight: { xs: "60vh", sm: "50vh" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          py: 4,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 440,
            width: "100%",
            p: { xs: 3, sm: 4 },
            textAlign: "center",
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.04)"
                : "grey.50",
          }}
        >
          {isNetwork ? (
            <WifiOffRoundedIcon
              sx={{
                fontSize: 56,
                color: "warning.main",
                mb: 2,
                opacity: 0.95,
              }}
            />
          ) : (
            <ErrorOutlineRoundedIcon
              color="error"
              sx={{ fontSize: 56, mb: 2, opacity: 0.9 }}
            />
          )}
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            {isNetwork ? t("No connection") : t("Could not load categories")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, lineHeight: 1.65 }}
          >
            {isNetwork
              ? t(
                  "You are offline or the network is unavailable. Connect to the internet and try again.",
                )
              : t(
                  "Something went wrong while loading categories. Please try again in a moment.",
                )}
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="center"
            alignItems="stretch"
          >
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => {
                setError(null);
                fetchCategories();
              }}
              sx={{ borderRadius: 2, py: 1.25, fontWeight: 700 }}
            >
              {t("Try again")}
            </Button>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => navigate("/")}
              sx={{ borderRadius: 2, py: 1.25 }}
            >
              {t("Back to home")}
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <>
      {renderMobileLayout()}
      {renderDesktopLayout()}

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        candidateProducts={products}
        onProductChange={setSelectedProduct}
      />

      {/* Login Notification Dialog */}
      <Dialog
        open={loginNotificationOpen}
        onClose={() => setLoginNotificationOpen(false)}
      >
        <DialogTitle>Login Required</DialogTitle>
        <DialogContent>
          <Typography>Please log in to like products.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginNotificationOpen(false)}>Close</Button>
          <Button onClick={() => navigate("/login")} variant="contained">
            Login
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProductCategory;
