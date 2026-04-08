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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Divider,
  Avatar,
  Badge,
  IconButton,
  Rating,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { productAPI, categoryAPI, storeTypeAPI } from "../services/api";
import CategoryIcon from "@mui/icons-material/Category";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BusinessIcon from "@mui/icons-material/Business";
import StorefrontIcon from "@mui/icons-material/Storefront";
import FilterListIcon from "@mui/icons-material/FilterList";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import StarIcon from "@mui/icons-material/Star";
import MenuIcon from "@mui/icons-material/Menu";
import StoreIcon from "@mui/icons-material/Store";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
import FullScreenImageModal from "../components/FullScreenImageModal";

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
  const { t } = useTranslation();
  const { dataLanguage, locName, locDescription } = useLocalizedContent();
  const { toggleLike, isProductLiked, recordView } = useUserTracking();
  const { selectedCity } = useCityFilter();

  const [categories, setCategories] = useState([]);
  const [categoryTypes, setCategoryTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCategoryType, setSelectedCategoryType] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productImageFullscreen, setProductImageFullscreen] = useState(null);

  // Mobile layout states
  const [storeTypes, setStoreTypes] = useState([]);
  const [selectedStoreTypeId, setSelectedStoreTypeId] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 900 ? "first" : "all",
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Mobile view mode: 'categories' → list categories, 'products' → show products of selected category
  const [mobileViewMode, setMobileViewMode] = useState("categories");

  // Notification dialog state
  const [loginNotificationOpen, setLoginNotificationOpen] = useState(false);

  // Like functionality states
  const [likeCounts, setLikeCounts] = useState({});
  const [likeStates, setLikeStates] = useState({});
  const [likeLoading, setLikeLoading] = useState({});

  // Filter states
  const [filters, setFilters] = useState({
    name: "",
    brand: "",
    store: "",
    barcode: "",
    discount: false,
  });

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Track if we've applied nav state (category/categoryType from MainPage or ProductDetail link)
  const stateAppliedRef = useRef(false);
  const productViewRecordedRef = useRef(new Set());

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
      }
    })();
    // Intentionally omit location from deps: only read initial navigation state on first load
    // so clearing state later does not reset the rail to the first store type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [selectedStoreTypeId, storeTypes]);

  // On first mount on mobile, lock the store type to the first option
  useEffect(() => {
    // mobile default handled after store types load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep filtered list in sync when inputs change
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, selectedCategoryType, filters, selectedCity, dataLanguage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      let response;
      if (selectedStoreTypeId === "all") {
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
            await fetchProductsByCategory(matchedCategory._id);
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
              setSelectedCategory(response.data[0]);
              await fetchCategoryTypes(response.data[0]._id);
              await fetchProductsByCategory(response.data[0]._id);
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
            setSelectedCategory(response.data[0]);
            await fetchCategoryTypes(response.data[0]._id);
            await fetchProductsByCategory(response.data[0]._id);
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
      setError("Failed to fetch categories");
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
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
      setFilteredProducts([]);
    }
  };

  const handleCategoryChange = async (category) => {
    setSelectedCategory(category);
    setSelectedCategoryType(null);
    setCategoryProductsLoading(true);
    if (window.innerWidth < 900) {
      setMobileViewMode("products");
    }
    try {
      await fetchCategoryTypes(category._id);
      await fetchProductsByCategory(category._id);
    } finally {
      setCategoryProductsLoading(false);
    }
  };

  const handleCategoryTypeChange = (categoryType) => {
    setSelectedCategoryType(categoryType);
  };

  const handleStoreTypeChange = (storeTypeId) => {
    stateAppliedRef.current = false;
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

    // Filter by city
    filtered = filtered.filter(
      (product) => product.storeId?.storecity === selectedCity,
    );

    setFilteredProducts(filtered);
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const toggleFilters = () => {
    setFiltersOpen(!filtersOpen);
  };

  const getBrands = () => {
    const brands = products
      .map((product) => locName(product.companyId || product.brandId))
      .filter(Boolean);
    return [...new Set(brands)];
  };

  const getStores = () => {
    const stores = products
      .map((product) => locName(product.storeId))
      .filter(Boolean);
    return [...new Set(stores)];
  };

  const formatPrice = (price) => {
    if (typeof price !== "number") return `${t("ID")} 0`;
    return ` ${price.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ${t("ID")}`;
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

  const getCategoryTypeName = (categoryTypeId, categoryId) => {
    if (!categoryTypeId || !categoryId) return "";
    const category = categories.find((cat) => cat._id === categoryId);
    if (!category) return "";
    const categoryType = category.types.find(
      (type) => type._id === categoryTypeId,
    );
    return categoryType ? locName(categoryType) : "";
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
                    <Typography component="span" role="img" sx={{ fontSize: "1.35rem", lineHeight: 1 }}>
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
              <Box sx={{ px: 1, pt: 1.5, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <CategoryIcon sx={{ fontSize: "1.1rem", color: accentColor }} />
                <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)" }}>
                  {t("Categories")}
                </Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, px: 1 }}>
                  {[1,2,3,4,5,6].map(i => (
                    <Skeleton key={i} variant="rounded" height={110} sx={{ borderRadius: 3 }} />
                  ))}
                </Box>
              ) : categories.length === 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 8, color: "text.secondary" }}>
                  <CategoryIcon sx={{ fontSize: 56, opacity: 0.3, mb: 1 }} />
                  <Typography variant="body2">{t("No categories found")}</Typography>
                </Box>
              ) : (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, px: 1 }}>
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
                        src={category.image ? resolveMediaUrl(category.image) : undefined}
                        sx={{
                          width: 58,
                          height: 58,
                          background: "linear-gradient(135deg, var(--color-primary,#1E6FD9) 0%, var(--brand-accent-orange,#ff8c00) 100%)",
                          color: "white",
                          fontSize: "1.6rem",
                          boxShadow: "0 3px 10px rgba(30,111,217,0.25)",
                        }}
                      >
                        {!(category.image) && (category.icon || (locName(category) || "").charAt(0))}
                      </Avatar>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          textAlign: "center",
                          color: isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.8)",
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
              <Box sx={{ px: 1, pt: 1, pb: 0.75, display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => setMobileViewMode("categories")}
                  sx={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                    borderRadius: 2,
                    "&:hover": { backgroundColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)" },
                  }}
                >
                  <ArrowBackIcon sx={{ fontSize: "1.1rem", color: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.7)" }} />
                </IconButton>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)",
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
                      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(30,111,217,0.1)",
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
                    const isActive = type === null
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
                          color: isActive ? "#fff" : isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)",
                          border: "none",
                          boxShadow: isActive ? "0 2px 8px rgba(30,111,217,0.3)" : "none",
                          transition: "all 0.18s ease",
                        }}
                      />
                    );
                  })}
                </Box>
              )}

              {/* Products */}
              {categoryProductsLoading ? (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, px: 1 }}>
                  {[1,2,3,4,5,6].map(i => (
                    <Card key={i} sx={{ borderRadius: 3, overflow: "hidden", backgroundColor: cardBg }}>
                      <Skeleton variant="rectangular" height={130} />
                      <CardContent sx={{ p: 1 }}>
                        <Skeleton variant="text" width="85%" height={16} />
                        <Skeleton variant="text" width="55%" height={14} sx={{ mt: 0.5 }} />
                        <Skeleton variant="text" width="65%" height={20} sx={{ mt: 0.5 }} />
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : filteredProducts.length === 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 8, color: "text.secondary" }}>
                  <ShoppingCartIcon sx={{ fontSize: 56, opacity: 0.3, mb: 1 }} />
                  <Typography variant="body2">{t("No products found")}</Typography>
                </Box>
              ) : (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, px: 1 }}>
                  {filteredProducts.map((product) => {
                    const discountPct = calculateDiscount(product.previousPrice, product.newPrice);
                    const hasDiscount = isDiscountValid(product);
                    const discountLabel = discountPct !== null ? `-${discountPct}%` : t("Discount");
                    const isLiked = likeStates[product._id] ?? isProductLiked(product._id);

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
                                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  height: 130,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                                }}
                              >
                                <ShoppingCartIcon sx={{ fontSize: 36, opacity: 0.25 }} />
                              </Box>
                            )}

                            {/* Discount badge */}
                            {hasDiscount && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: 6,
                                  left: 6,
                                  background: "linear-gradient(135deg,#e53e3e,#c53030)",
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
                                <VisibilityIcon sx={{ fontSize: "0.65rem" }} />
                                {product.viewCount}
                              </Box>
                            )}
                          </Box>

                          {/* Content */}
                          <CardContent sx={{ p: 1, pt: 0.75, flexGrow: 1, display: "flex", flexDirection: "column", gap: 0.35 }}>
                            <Typography
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.78rem",
                                lineHeight: 1.3,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)",
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
                              {isDiscountValid(product) && product.previousPrice && Number(product.previousPrice) > Number(product.newPrice) && (
                                <Typography
                                  sx={{
                                    fontSize: "0.65rem",
                                    textDecoration: "line-through",
                                    color: isDark ? "rgba(255,100,100,0.7)" : "rgba(200,0,0,0.55)",
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
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight={320}
              >
                <CircularProgress
                  sx={{
                    color:
                      theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
                  }}
                />
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
              <>
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
              </>
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
              backgroundColor: isDark ? "rgba(18,24,38,0.98)" : "rgba(248,249,252,0.98)",
              py: 2,
              px: 0.75,
              zIndex: 10,
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ mb: 1.5, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Skeleton variant="circular" width={44} height={44} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width={48} height={12} />
              </Box>
            ))}
          </Box>

          {/* Right content skeleton */}
          <Box sx={{ pl: "84px", pt: "72px", pr: 1, pb: "80px" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, mb: 1.5 }}>
              <Skeleton variant="circular" width={20} height={20} />
              <Skeleton variant="text" width={100} height={22} />
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, px: 1 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} variant="rounded" height={110} sx={{ borderRadius: 3 }} />
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
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <>
      {renderMobileLayout()}
      {renderDesktopLayout()}

      {/* Product Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 4,
            overflow: "hidden",
            backgroundColor: theme.palette.mode === "dark" ? "rgba(22,28,44,1)" : "#fff",
            backgroundImage: "none",
          },
        }}
      >
        {/* Dialog header */}
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
            onClick={() => setDialogOpen(false)}
            sx={{
              mr: 1.5,
              backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
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
          {selectedProduct && (
            <Box>
              {/* Image */}
              {selectedProduct.image ? (
                <Box
                  sx={{
                    backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
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
                    sx={{ maxHeight: 260, objectFit: "contain", width: "100%" }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    height: 180,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  }}
                >
                  <ShoppingCartIcon sx={{ fontSize: 64, opacity: 0.2 }} />
                </Box>
              )}

              {/* Details */}
              <Box sx={{ px: 2.5, py: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
                <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.35 }}>
                  {locName(selectedProduct)}
                </Typography>

                {locDescription(selectedProduct) && (
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                    {locDescription(selectedProduct)}
                  </Typography>
                )}

                {/* Brand / Store chips */}
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  {(selectedProduct.companyId || selectedProduct.brandId) &&
                    locName(selectedProduct.companyId || selectedProduct.brandId) && (
                    <Chip
                      icon={<BusinessIcon sx={{ fontSize: "0.9rem !important" }} />}
                      label={locName(selectedProduct.companyId || selectedProduct.brandId)}
                      size="small"
                      onClick={() => {
                        const owner =
                          selectedProduct.companyId || selectedProduct.brandId;
                        setDialogOpen(false);
                        navigate(
                          selectedProduct.companyId
                            ? `/companies/${owner._id}`
                            : `/brands/${owner._id}`,
                        );
                      }}
                      sx={{
                        borderRadius: 99,
                        fontWeight: 600,
                        fontSize: "0.72rem",
                        cursor: "pointer",
                        backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(30,111,217,0.08)",
                        color: "var(--color-primary,#1E6FD9)",
                      }}
                    />
                  )}
                  {selectedProduct.storeId && locName(selectedProduct.storeId) && (
                    <Chip
                      icon={<StorefrontIcon sx={{ fontSize: "0.9rem !important" }} />}
                      label={locName(selectedProduct.storeId)}
                      size="small"
                      onClick={() => { setDialogOpen(false); navigate(`/stores/${selectedProduct.storeId._id}`); }}
                      sx={{
                        borderRadius: 99,
                        fontWeight: 600,
                        fontSize: "0.72rem",
                        cursor: "pointer",
                        backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(30,111,217,0.08)",
                        color: "var(--color-primary,#1E6FD9)",
                      }}
                    />
                  )}
                </Box>

                {/* Expiry date + remaining days */}
                {selectedProduct.expireDate && (() => {
                  const info = getExpiryRemainingInfo(selectedProduct.expireDate);
                  const label = formatExpiryChipLabel(info, t);
                  const chipColor = expiryChipBg(info);
                  const dateStr = formatExpiryDateDdMmYyyy(selectedProduct.expireDate);
                  const isDark = theme.palette.mode === "dark";
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
                        mt: 0.25,
                      }}
                    >
                      <AccessTimeIcon
                        sx={{ fontSize: "1rem", color: chipColor, flexShrink: 0 }}
                      />
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
                            : label
                              ? label
                              : t("Expires")}
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
                    backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.025)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.25,
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {t("Price")}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    {isDiscountValid(selectedProduct) && selectedProduct.previousPrice && Number(selectedProduct.previousPrice) > Number(selectedProduct.newPrice) && (
                      <Typography sx={{ textDecoration: "line-through", color: "text.disabled", fontSize: "0.9rem" }}>
                        {formatPrice(selectedProduct.previousPrice)}
                      </Typography>
                    )}
                    <Typography sx={{ fontWeight: 900, fontSize: "1.65rem", color: "var(--color-secondary,#0d47a1)", lineHeight: 1 }}>
                      {formatPrice(selectedProduct.newPrice)}
                    </Typography>
                    {isDiscountValid(selectedProduct) && (
                      <Chip
                        label={(() => { const p = calculateDiscount(selectedProduct.previousPrice, selectedProduct.newPrice); return p !== null ? `-${p}%` : t("Discount"); })()}
                        size="small"
                        sx={{ height: 22, fontSize: "0.72rem", fontWeight: 800, backgroundColor: "#e53e3e", color: "#fff", borderRadius: 99 }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Like / view / like-count stats bar */}
                {(() => {
                  const pid = selectedProduct._id;
                  const isDark = theme.palette.mode === "dark";
                  const liked = likeStates[pid] ?? isProductLiked(pid);
                  const likeCount =
                    likeCounts[pid] ??
                    selectedProduct.likeCount ??
                    0;
                  const viewCount = selectedProduct.viewCount ?? 0;
                  const isLoading = likeLoading[pid];
                  return (
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
                          cursor: isLoading ? "default" : "pointer",
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
                        onClick={(e) => !isLoading && handleLikeClick(pid, e)}
                      >
                        {liked ? (
                          <FavoriteIcon
                            sx={{
                              fontSize: "1.2rem",
                              color: "#e53e3e",
                              transition: "transform 0.15s",
                              transform: liked ? "scale(1.15)" : "scale(1)",
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

                      {/* Divider */}
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
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
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

                      {/* Divider */}
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

                      {/* Like count label */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
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
                    </Box>
                  );
                })()}

                {/* Related products */}
                {(() => {
                  const related = products.filter(
                    (p) =>
                      p._id !== selectedProduct._id &&
                      isExpiryStillValid(p.expireDate || null) !== false &&
                      isDiscountValid(p),
                  );
                  if (related.length === 0) return null;
                  const isDark = theme.palette.mode === "dark";
                  return (
                    <Box sx={{ mt: 0.5 }}>
                      <Box
                        sx={{
                          px: 0,
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
                                transition: "transform 0.15s ease",
                                "&:active": { transform: "scale(0.95)" },
                              }}
                            >
                              {/* Image */}
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

                              {/* Info */}
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
                                      color:
                                        "var(--color-secondary,#0d47a1)",
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
                  );
                })()}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <FullScreenImageModal
        open={Boolean(productImageFullscreen)}
        onClose={() => setProductImageFullscreen(null)}
        imageUrl={productImageFullscreen?.url}
        alt={productImageFullscreen?.alt || ""}
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
