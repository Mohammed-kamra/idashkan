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
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import { useUserTracking } from "../hooks/useUserTracking";
import ProductViewTracker from "../components/ProductViewTracker";
import { useCityFilter } from "../context/CityFilterContext";
import useIsMobileLayout from "../hooks/useIsMobileLayout";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { isExpiryStillValid } from "../utils/expiryDate";
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
        (product) => locName(product.brandId) === filters.brand,
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
      .map((product) => locName(product.brandId))
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

  const renderMobileLayout = () => (
    <Box sx={{ display: { xs: "block", md: "none" } }}>
      {/* Left vertical rail: Store types (top bar stays global like other pages) */}
      <Box
        sx={{
          position: "fixed",
          top: 64,
          left: 0,
          width: 88,
          bottom: 0,
          borderRight: "1px solid #eee",
          backgroundColor: "#fafafa",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          py: 2,
          gap: 1.5,
        }}
      >
        {[...storeTypes].map((type) => (
          <Button
            key={type._id}
            onClick={() => handleStoreTypeChange(type._id)}
            variant={selectedStoreTypeId === type._id ? "contained" : "text"}
            sx={{
              mx: 1,
              justifyContent: "flex-start",
              minWidth: 0,
              borderRadius: 2,
              textTransform: "none",

              backgroundColor:
                selectedStoreTypeId === type._id
                  ? theme.palette.mode === "dark"
                    ? "#1E6FD9"
                    : "var(--brand-primary-blue)"
                  : "theme.palette.text.secondary",
              color: selectedStoreTypeId === type._id ? "white" : "inherit",
              "&:hover": {
                backgroundColor:
                  selectedStoreTypeId === type._id
                    ? theme.palette.mode === "dark"
                      ? "#4A90E2"
                      : "var(--brand-primary-blue)"
                    : "var(--brand-primary-blue)",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
              }}
            >
              <Avatar
                sx={{
                  bgcolor:
                    selectedStoreTypeId === type._id ? "white" : "#EAF2FF",
                  color: "var(--brand-primary-blue)",
                  width: 40,
                  height: 40,
                  mb: 0.5,
                }}
              >
                <Typography
                  component="span"
                  role="img"
                  aria-label={locName(type) || t(type.name)}
                >
                  {type.icon || "🏪"}
                </Typography>
              </Avatar>
              <Typography
                variant="caption"
                sx={{
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                }}
              >
                {locName(type) || t(type.name)}
              </Typography>
            </Box>
          </Button>
        ))}
      </Box>

      {/* Right content area */}
      <Box
        sx={{
          pl: "96px",
          pt: 8,
          pr: 2,
          color: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
        }}
      >
        {mobileViewMode === "categories" && (
          <>
            <Typography
              sx={{
                my: 2,
                fontWeight: 600,
                color: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
              }}
            >
              {t("Categories")}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 1.5,
              }}
            >
              {categories.map((category) => (
                <Box key={category._id} sx={{ display: "flex" }}>
                  <Card
                    onClick={() => handleCategoryChange(category)}
                    sx={{
                      cursor: "pointer",
                      textAlign: "center",
                      p: 1.5,
                      width: "100%",
                    }}
                  >
                    <Avatar
                      src={
                        category.image
                          ? resolveMediaUrl(category.image)
                          : undefined
                      }
                      sx={{
                        width: 64,
                        height: 64,
                        bgcolor: "var(--brand-accent-orange)",
                        color: "white",
                        mx: "auto",
                        mb: 1,
                      }}
                    >
                      {category.icon || (locName(category) || "").charAt(0)}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {locName(category)}
                    </Typography>
                  </Card>
                </Box>
              ))}
            </Box>
          </>
        )}

        {mobileViewMode === "products" && selectedCategory && (
          <>
            {/* Simple header with back to categories to mimic other pages' top bar */}
            {categoryProductsLoading ? (
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
            ) : (
              <>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color:
                        theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
                    }}
                  >
                    {locName(selectedCategory)}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setMobileViewMode("categories")}
                    sx={{
                      color:
                        theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
                    }}
                  >
                    {t("Back")}
                  </Button>
                </Box>
                {/* Category Types Filter */}
                {categoryTypes.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    {/* <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Filter by Category Type
                </Typography> */}
                    <Box
                      sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 1 }}
                    >
                      <Chip
                        label={t("All Types")}
                        onClick={() => setSelectedCategoryType(null)}
                        variant={
                          selectedCategoryType === null ? "filled" : "outlined"
                        }
                        color="primary"
                        sx={{
                          backgroundColor:
                            selectedCategoryType === null
                              ? theme.palette.mode === "dark"
                                ? "#4A90E2"
                                : "#1E6FD9"
                              : "transparent",
                          color:
                            selectedCategoryType === null ? "white" : "inherit",
                        }}
                      />
                      {categoryTypes.map((type) => (
                        <Chip
                          key={type._id}
                          label={locName(type)}
                          onClick={() => setSelectedCategoryType(type)}
                          variant={
                            selectedCategoryType?._id === type._id
                              ? "filled"
                              : "outlined"
                          }
                          color="primary"
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
                                : "inherit",
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Products Grid - enforce 2 columns via CSS grid */}
                {filteredProducts.length === 0 ? (
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    minHeight={200}
                    sx={{ color: "text.secondary" }}
                  >
                    <ShoppingCartIcon
                      sx={{ fontSize: 64, mb: 2, opacity: 0.5 }}
                    />
                    <Typography variant="h6">
                      {t("No products found")}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 1,
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
                            {/* Image */}
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
                                    height: 130,
                                    objectFit: "contain",
                                    backgroundColor: theme.palette.grey[200],
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    height: 130,
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    backgroundColor: theme.palette.grey[200],
                                  }}
                                >
                                  <ShoppingCartIcon
                                    sx={{
                                      fontSize: 36,
                                      color:
                                        theme.palette.mode === "dark"
                                          ? "#4A90E2"
                                          : "#1E6FD9",
                                    }}
                                  />
                                </Box>
                              )}
                              {product.viewCount > 0 && (
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: 6,
                                    right: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.25,
                                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                                    color: "white",
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: 1,
                                    fontSize: "0.65rem",
                                    fontWeight: 600,
                                    pointerEvents: "none",
                                    zIndex: 1,
                                  }}
                                >
                                  <VisibilityIcon
                                    sx={{ fontSize: "0.75rem" }}
                                  />
                                  {product.viewCount}
                                </Box>
                              )}
                            </Box>

                            {/* Content */}
                            <CardContent
                              sx={{
                                p: 1.5,
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.5,
                                flexGrow: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  textAlign: "center",
                                  minHeight: "2.4em",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {locName(product) || "\u00A0"}
                              </Typography>

                              {/* Category type chip or N/A */}
                              {/* <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <Chip
                          label={
                            product.categoryTypeId
                              ? getCategoryTypeName(
                                  product.categoryTypeId,
                                  product.categoryId
                                )
                              : "N/A"
                          }
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "0.7rem",
                            color: "#2d6a4f",
                            backgroundColor: "rgba(82,183,136,0.12)",
                          }}
                        />
                      </Box> */}

                              {/* Optional meta */}
                              {product.storeId && locName(product.storeId) && (
                                <Typography
                                  variant="caption"
                                  color="var(--color-primary)"
                                  sx={{ display: "block", textAlign: "center" }}
                                >
                                  {locName(product.storeId)}
                                </Typography>
                              )}

                              <Box sx={{ mt: "auto" }}>
                                {/* Price + discount */}
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
                                        fontSize: {
                                          xs: "0.8rem",
                                          sm: "0.9rem",
                                        },
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
                                        fontSize: {
                                          xs: "1.1rem",
                                          sm: "1.3rem",
                                        },
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
                                      height: 18,
                                      fontSize: "0.65rem",
                                    }}
                                  />
                                )} */}
                                </Box>

                                {/* View details button
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          sx={{
                            mt: 1,
                            textTransform: "none",
                            borderColor: "var(--brand-accent-orange)",
                            color: "#2d6a4f",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProductClick(product);
                          }}
                        >
                          View details
                        </Button> */}
                              </Box>
                            </CardContent>
                          </Card>
                        </Box>
                      </ProductViewTracker>
                    ))}
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );

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
      return (
        <Box sx={{ display: { xs: "block", md: "none" } }}>
          {/* Mobile-like left store-type rail skeleton */}
          <Box
            sx={{
              position: "fixed",
              top: 64,
              left: 0,
              width: 88,
              bottom: 0,
              borderRight: "1px solid #eee",
              backgroundColor: "#fafafa",
              py: 2,
              px: 1,
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ mb: 1.5, textAlign: "center" }}>
                <Skeleton
                  variant="circular"
                  width={40}
                  height={40}
                  sx={{ mx: "auto", mb: 0.5 }}
                />
                <Skeleton variant="text" width={56} sx={{ mx: "auto" }} />
              </Box>
            ))}
          </Box>

          {/* Mobile right content skeleton */}
          <Box sx={{ pl: "96px", pt: 8, pr: 2 }}>
            <Skeleton variant="text" width={120} height={34} sx={{ my: 2 }} />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 1.5,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ textAlign: "center", p: 1.5 }}>
                    <Skeleton
                      variant="circular"
                      width={64}
                      height={64}
                      sx={{ mx: "auto", mb: 1 }}
                    />
                    <Skeleton variant="text" width="80%" sx={{ mx: "auto" }} />
                  </CardContent>
                </Card>
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t("Product Details")}
          <IconButton
            onClick={() => setDialogOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                {selectedProduct.image ? (
                  <CardMedia
                    component="img"
                    height="200"
                    image={resolveMediaUrl(selectedProduct.image)}
                    alt={locName(selectedProduct)}
                    onClick={() =>
                      setProductImageFullscreen({
                        url: resolveMediaUrl(selectedProduct.image),
                        alt: locName(selectedProduct),
                      })
                    }
                    role="presentation"
                    sx={{
                      objectFit: "contain",
                      borderRadius: 1,
                      cursor: "pointer",
                      "&:focus-visible": {
                        outline: "2px solid",
                        outlineOffset: 4,
                      },
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 150,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: theme.palette.grey[200],
                      borderRadius: 1,
                    }}
                  >
                    <ShoppingCartIcon
                      sx={{ fontSize: 80, color: theme.palette.grey[400] }}
                    />
                  </Box>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h5" gutterBottom>
                  {locName(selectedProduct)}
                </Typography>

                {locDescription(selectedProduct) && (
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {locDescription(selectedProduct)}
                  </Typography>
                )}

                {selectedProduct.brandId &&
                  locName(selectedProduct.brandId) && (
                    <Typography
                      variant="body1"
                      gutterBottom
                      sx={{ cursor: "pointer" }}
                      onClick={() => {
                        setDialogOpen(false);
                        navigate(`/brands/${selectedProduct.brandId._id}`);
                      }}
                    >
                      <strong>Brand:</strong> {locName(selectedProduct.brandId)}
                    </Typography>
                  )}

                {selectedProduct.storeId &&
                  locName(selectedProduct.storeId) && (
                    <Typography
                      variant="body1"
                      gutterBottom
                      sx={{ cursor: "pointer" }}
                      onClick={() => {
                        setDialogOpen(false);
                        navigate(`/stores/${selectedProduct.storeId._id}`);
                      }}
                    >
                      <strong>{t("Store")}:</strong>{" "}
                      {locName(selectedProduct.storeId)}
                    </Typography>
                  )}

                {isDiscountValid(selectedProduct) && (
                  <Box sx={{ mt: 2 }}>
                    {/* {selectedProduct.previousPrice &&
                    selectedProduct.previousPrice > selectedProduct.newPrice ? (
                      <Typography
                        variant="body1"
                        sx={{
                          textDecoration: "line-through",
                          color: "red",
                          fontSize: { xs: "0.8rem", sm: "0.9rem" },
                          fontWeight: 500,
                        }}
                      >
                        {formatPrice(selectedProduct.previousPrice)}
                      </Typography>
                    ) : null} */}
                    <Typography
                      variant="h6"
                      sx={{
                        color: "black",
                        fontWeight: 700,
                        fontSize: { xs: "1.1rem", sm: "1.3rem" },
                      }}
                    >
                      {t("Price")} :
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        color: "var(--color-secondary)",
                        textAlign: "center",
                        fontWeight: 900,
                        fontSize: { xs: "1.75rem", sm: "1.75rem" },
                      }}
                    >
                      {formatPrice(selectedProduct.newPrice)}
                    </Typography>
                  </Box>
                )}

                {!isDiscountValid(selectedProduct) &&
                  selectedProduct.newPrice && (
                    <Typography
                      variant="h6"
                      sx={{
                        color: "var(--brand-light-orange)",
                        fontWeight: 700,
                        fontSize: { xs: "1.1rem", sm: "1.3rem" },
                        mt: 2,
                      }}
                    >
                      {t("Price")}: {formatPrice(selectedProduct.newPrice)}
                    </Typography>
                  )}

                {/* <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
                  <IconButton
                    onClick={(e) => handleLikeClick(selectedProduct._id, e)}
                    disabled={likeLoading[selectedProduct._id]}
                    sx={{
                      border: "2px solid red",
                      color: likeStates[selectedProduct._id]
                        ? "red"
                        : "inherit",
                    }}
                  >
                    {likeStates[selectedProduct._id] ? (
                      <FavoriteIcon />
                    ) : (
                      <FavoriteBorderIcon />
                    )}
                  </IconButton>
                </Box> */}
              </Grid>
            </Grid>
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
