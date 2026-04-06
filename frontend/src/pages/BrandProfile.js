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
  Container,
  Paper,
  Divider,
  IconButton,
  Fade,
  Skeleton,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tooltip,
  Rating,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack,
  Phone,
  LocationOn,
  Business,
  Store,
  Search,
  FilterList,
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
import StarIcon from "@mui/icons-material/Star";
import {
  brandAPI,
  productAPI,
  giftAPI,
  videoAPI,
  jobAPI,
} from "../services/api";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import StorefrontIcon from "@mui/icons-material/Storefront";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import { useTranslation } from "react-i18next";
import Loader from "../components/Loader";
import { useUserTracking } from "../hooks/useUserTracking";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useAuth } from "../context/AuthContext";
import JobCardRow from "../components/JobCardRow";
import ProductViewTracker from "../components/ProductViewTracker";
import { resolveMediaUrl } from "../utils/mediaUrl";
import {
  normalizeWhatsAppUrl,
  openWhatsAppLink,
} from "../utils/openWhatsAppLink";
import {
  isExpiryStillValid,
  getExpiryRemainingInfo,
  formatExpiryExpiresPrefixedLabel,
  expiryGiftCardBg,
} from "../utils/expiryDate";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
/** test */
/** When scrolled near this row, load the next chunk for that product-type section (same idea as MainPage store sentinel). */
const ProductTypeLoadSentinel = ({ typeKey, hasMore, onLoadMore }) => {
  const ref = useRef(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore) return undefined;
    const el = ref.current;
    if (!el) return undefined;

    let ticking = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (!hit || ticking) return;
        ticking = true;
        onLoadMoreRef.current();
        window.setTimeout(() => {
          ticking = false;
        }, 400);
      },
      { root: null, rootMargin: "320px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, typeKey]);

  if (!hasMore) return null;
  return (
    <Box ref={ref} sx={{ width: "100%", height: 12, mt: 1 }} aria-hidden />
  );
};

const BrandProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const { t } = useTranslation();
  const { locName, locDescription, locTitle, locAddress } =
    useLocalizedContent();
  const { isAuthenticated } = useAuth();
  const { toggleLike, isProductLiked, recordView } = useUserTracking();

  const [dialogOpen, setDialogOpen] = useState(false);

  // Notification dialog state
  const [loginNotificationOpen, setLoginNotificationOpen] = useState(false);

  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [reels, setReels] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTabKey, setActiveTabKey] = useState(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "all") return "all";
    if (tabParam === "discounts") return "discounts";
    if (tabParam === "gifts") return "gifts";
    if (tabParam === "reels") return "reels";
    if (tabParam === "jobs") return "jobs";
    // default
    return "all";
  });
  const [selectedGift, setSelectedGift] = useState(null);
  const [displayCounts, setDisplayCounts] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Like functionality states
  const [likeCounts, setLikeCounts] = useState({});
  const [likeStates, setLikeStates] = useState({});
  const [likeLoading, setLikeLoading] = useState({});

  // Filter states
  const [filters, setFilters] = useState({
    name: "",
    store: "",
    barcode: "",
    type: "",
  });

  const productViewRecordedRef = useRef(new Set());

  useEffect(() => {
    setDisplayCounts({});
  }, [
    id,
    activeTabKey,
    filters.name,
    filters.store,
    filters.barcode,
    filters.type,
  ]);

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
      fetchBrandData();
    }
  }, [id]);

  usePullToRefresh(fetchBrandData);

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

  async function fetchBrandData() {
    try {
      setLoading(true);

      // Fetch brand details
      const brandResponse = await brandAPI.getById(id);
      setBrand(brandResponse.data);

      // Fetch products for this brand
      const productsResponse = await productAPI.getByBrand(id);
      setProducts(productsResponse.data);

      // Fetch gifts for this brand
      const giftsResponse = await giftAPI.getByBrand(id);
      setGifts(
        (giftsResponse.data.data || []).filter((g) => {
          if (!g?.expireDate) return true;
          return isExpiryStillValid(g.expireDate);
        }),
      );

      // Fetch reels for this brand (exclude expired)
      try {
        const videosRes = await videoAPI.getAll();
        const list = Array.isArray(videosRes?.data) ? videosRes.data : [];
        const filtered = list.filter((v) => {
          const brandId = v?.brandId?._id || v?.brandId || "";
          if (String(brandId) !== String(id)) return false;
          if (!v?.expireDate) return true;
          return isExpiryStillValid(v.expireDate);
        });
        setReels(filtered);
      } catch {
        setReels([]);
      }

      // Fetch jobs for this brand (exclude expired)
      try {
        const jobsRes = await jobAPI.getAll();
        const list = Array.isArray(jobsRes?.data) ? jobsRes.data : [];
        const filtered = list.filter((j) => {
          const brandId = j?.brandId?._id || j?.brandId || "";
          if (String(brandId) !== String(id)) return false;
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
      console.error("Error fetching brand data:", err);
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
      const matchesName = locName(product)
        .toLowerCase()
        .includes(filters.name.toLowerCase());
      const matchesStore =
        !filters.store ||
        (product.storeId &&
          locName(product.storeId) &&
          locName(product.storeId)
            .toLowerCase()
            .includes(filters.store.toLowerCase()));
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

      return matchesName && matchesStore && matchesBarcode && matchesType;
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

  // Get unique product category types for filter dropdown
  const getProductTypes = () => {
    const types = [
      ...new Set(
        products.map((product) => getProductCategoryTypeName(product)),
      ),
    ];
    return types.filter(Boolean).sort();
  };

  // Get unique stores for filter dropdown
  const getStores = () => {
    const stores = products
      .map((product) => product.storeId)
      .filter((store) => store && locName(store))
      .map((store) => locName(store));
    return [...new Set(stores)].sort();
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Toggle filters visibility
  const toggleFilters = () => {
    setFiltersOpen(!filtersOpen);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    const next = visibleTabs[newValue]?.key || "";
    setActiveTabKey(next);
  };

  // Load more products for a specific type (scroll sentinel)
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
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #4A90E2 0%, #1E6FD9 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
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
            alt={locDescription(gift)}
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
            {locDescription(gift)}
          </Typography>

          {/* Store Info */}
          <Box sx={{ mb: 2, flexShrink: 0 }}>
            {gift.storeId && gift.storeId.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                  <Store
                    sx={{
                      fontSize: { xs: 12, sm: 16, md: 16 },
                      mr: 1,
                      color:
                        theme.palette.mode === "dark" ? "#FFA94D" : "#1E6FD9",
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: { xs: "0.5rem", sm: "0.75rem", md: "0.75rem" },
                      color: theme.palette.text.secondary,
                      fontFamily: "NRT reg, Arial, sans-serif",
                      fontWeight: 500,
                    }}
                  >
                    {t("Stores")}:
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {gift.storeId.map((store, index) => (
                    <Typography
                      key={store._id}
                      variant="body2"
                      onClick={() => {
                        navigate(`/stores/${store._id}?tab=gifts`);
                      }}
                      sx={{
                        fontSize: {
                          xs: "0.5rem",
                          sm: "0.75rem",
                          md: "0.75rem",
                        },
                        color: theme.palette.text.secondary,
                        fontFamily: "NRT reg, Arial, sans-serif",
                        cursor: "pointer",
                        userSelect: "none",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        border: `1px solid ${
                          theme.palette.mode === "dark"
                            ? "rgba(255, 122, 26, 0.2)"
                            : "rgba(255, 122, 26, 0.1)"
                        }`,
                        "&:hover": {
                          textDecoration: "underline",
                          color: "var(--brand-light-orange)",
                        },
                      }}
                    >
                      {locName(store)}
                    </Typography>
                  ))}
                </Box>
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
            component={Link}
            to={`/products/${product._id}`}
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
            {/* Product Image */}
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
                height: { xs: "140px", sm: "200px", md: "200px" },
                flexShrink: 0,
                backgroundColor: "#f8f9fa",
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

              {/* View Count Badge - Top Right */}
              {product.viewCount > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: "0.7rem",
                  }}
                >
                  <VisibilityIcon sx={{ fontSize: "0.8rem" }} />
                  {product.viewCount}
                </Box>
              )}
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
                  minHeight: "2em",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {locName(product)}
              </Typography>

              {/* Store name if available */}
              {product.storeId && locName(product.storeId) && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "#666",
                    fontSize: "0.8rem",
                    mb: 1,
                    noWrap: true,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontStyle: "italic",
                    textAlign: "center",
                  }}
                >
                  {locName(product.storeId)}
                </Typography>
              )}

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
                  {/* {product.previousPrice &&
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

                {/* Like Button and Count - Bottom Right */}
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
                    {likeStates[product._id] || isProductLiked(product._id) ? (
                      <FavoriteIcon sx={{ fontSize: "1.2rem" }} />
                    ) : (
                      <FavoriteBorderIcon sx={{ fontSize: "1.2rem" }} />
                    )}
                  </IconButton>
                </Box>
              </Box>

              {/* Expiry Date - Bottom */}
              {product.expireDate && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "red",
                    fontSize: { xs: "0.7rem", sm: "0.8rem" },
                    textAlign: "center",
                    mt: 1,
                    fontWeight: 500,
                  }}
                >
                  {t("Expire Date")}:{" "}
                  {new Date(product.expireDate).toLocaleDateString("ar-SY", {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric",
                  })}
                </Typography>
              )}
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
      const currentDisplayCount = displayCounts[type] || 10;
      const displayProducts = typeProducts.slice(0, currentDisplayCount);
      const hasMore = typeProducts.length > currentDisplayCount;

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

          <ProductTypeLoadSentinel
            typeKey={type}
            hasMore={hasMore}
            onLoadMore={() => loadMoreProducts(type)}
          />
        </Box>
      );
    });
  };

  // Render filter section
  const renderFilters = () => (
    <Paper
      elevation={0}
      sx={{
        p: 1,
        mb: 1,
        borderRadius: 3,
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #1E6FD9 0%, #4A90E2 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
        border: `1px solid ${
          theme.palette.mode === "dark" ? "#1E6FD9" : "#e9ecef"
        }`,
      }}
    >
      {/* Mobile Filter Toggle */}
      <Box
        onClick={toggleFilters}
        sx={{
          display: { xs: "flex", md: "none" },
          mb: 2,
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: theme.palette.text.primary,
          }}
        >
          <FilterList sx={{ color: "var(--brand-accent-orange)" }} />
          {t("Filters")}
        </Typography>
      </Box>

      {/* Desktop Filter Header */}
      <Typography
        variant="h6"
        sx={{
          mb: 3,
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          gap: 1,
          color: theme.palette.text.primary,
        }}
      >
        <FilterList sx={{ color: "var(--brand-accent-orange)" }} />
        {t("Filters")}
      </Typography>

      <Box
        sx={{ display: { xs: filtersOpen ? "block" : "none", md: "block" } }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label={t("Search by Name")}
              value={filters.name}
              onChange={(e) => handleFilterChange("name", e.target.value)}
              onClick={(e) => e.stopPropagation()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          {/* <Grid item xs={12} sm={6} md={3}>
            <FormControl sx={{ width: "200px" }} fullWidth>
              <InputLabel>{t("Store")}</InputLabel>
              <Select
                value={filters.store}
                onChange={(e) => handleFilterChange("store", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                label={t("Store")}
              >
                <MenuItem value="">{t("All Stores")}</MenuItem>
                {getStores().map((store) => (
                  <MenuItem key={store} value={store}>
                    {store}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid> */}
          {/* <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label={t("Search by Barcode")}
              value={filters.barcode}
              onChange={(e) => handleFilterChange("barcode", e.target.value)}
              onClick={(e) => e.stopPropagation()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid> */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl sx={{ width: "200px" }} fullWidth>
              <InputLabel>{t("Product Type")}</InputLabel>
              <Select
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                label={t("Product Type")}
              >
                <MenuItem value="">{t("All Types")}</MenuItem>
                {getProductTypes().map((type) => (
                  <MenuItem key={type} value={type}>
                    {t(type)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );

  const discountedProducts = getDiscountedProducts();
  const nonDiscountedProducts = getNonDiscountedProducts();
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
  const activeTabIndex = Math.max(
    0,
    visibleTabs.findIndex((d) => d.key === activeTabKey),
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

  if (loading) {
    return (
      <Box sx={{ py: 4, px: { xs: 1.5, sm: 2 } }}>
        <Skeleton variant="text" sx={{ width: 220, mb: 2 }} />
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
  if (!brand) return <Alert severity="error">Brand not found</Alert>;

  const brandContactInfo = brand.contactInfo || {};
  const brandLocationInfo = brand.locationInfo || {};
  const displayPhone = brandContactInfo.phone || brand.phone || null;
  const socialLinks = [
    { key: "whatsapp", value: brandContactInfo.whatsapp, icon: <WhatsApp /> },
    { key: "facebook", value: brandContactInfo.facebook, icon: <Facebook /> },
    {
      key: "instagram",
      value: brandContactInfo.instagram,
      icon: <Instagram />,
    },
    { key: "tiktok", value: brandContactInfo.tiktok, icon: <MusicNote /> },
    { key: "snapchat", value: brandContactInfo.snapchat, icon: <CameraAlt /> },
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
      value: brandLocationInfo.googleMaps,
    },
    {
      key: "appleMaps",
      label: "Apple Maps",
      value: brandLocationInfo.appleMaps,
    },
    { key: "waze", label: "Waze", value: brandLocationInfo.waze },
  ].filter((item) => Boolean(item.value));

  const renderLocationRow = () => (
    <>
      {locationLinks.length > 0
        ? locationLinks.map((item) => (
            <>
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
                <LocationOn
                  sx={{ fontSize: { xs: 18, md: 24 }, opacity: 0.9 }}
                />
              </Box>
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
            </>
          ))
        : null}
    </>
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
          mr: 0.5,
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
      {/* Enhanced Back Button */}
      <Button
        variant="outlined"
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{
          borderRadius: 2,
          position: "relative",
          borderColor:
            theme.palette.mode === "dark"
              ? theme.palette.secondary.main
              : theme.palette.primary.main,
          color:
            theme.palette.mode === "dark"
              ? theme.palette.secondary.main
              : theme.palette.primary.main,
          "&:hover": {
            borderColor:
              theme.palette.mode === "dark"
                ? theme.palette.secondary.main
                : theme.palette.primary.main,
            backgroundColor:
              theme.palette.mode === "dark"
                ? theme.palette.secondary.main
                : theme.palette.primary.main,
          },
        }}
      >
        {t("Back")}
      </Button>

      {/* Enhanced Brand Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          mt: 3,
          borderRadius: 4,
          overflow: "hidden",
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, theme.palette.primary.main 0%, theme.palette.secondary.main 100%)"
              : theme.palette.primary.main,
          border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.secondary.main : theme.palette.primary.main}`,
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
                ? "linear-gradient(135deg, theme.palette.primary.main 0%, theme.palette.secondary.main 100%)"
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
          {/* Mobile Layout - Logo and Name on same row */}
          <Box
            alignItems="center"
            sx={{
              display: { xs: "flex", md: "none" },
              gap: 2,
              mb: 2,
            }}
          >
            {brand.logo ? (
              <Avatar
                src={resolveMediaUrl(brand.logo)}
                alt={locName(brand)}
                sx={{
                  width: 60,
                  height: 60,
                  border: "3px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
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
                }}
              >
                <Business sx={{ fontSize: 30 }} />
              </Avatar>
            )}
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                fontSize: "1.2rem",
                textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                color: "white",
                position: "relative",
              }}
            >
              {locName(brand)}
              {/* {brand.isVip && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 5,
                    left: -4,
                    zIndex: 2,
                    backgroundColor: "white",
                    borderRadius: "50%",
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    "&::before": {
                      content: '"👑"',
                      fontSize: "12px",
                    },
                  }}
                />
              )} */}
            </Typography>
          </Box>

          {/* Mobile Layout - Address, Phone, Description, Chips */}
          <Box sx={{ display: { xs: "block", md: "none" } }}>
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
                {locAddress(brand) || t("address not provided")}
              </Typography>
            </Box>

            {renderLocationRow()}

            <Box sx={{ mb: 1 }}>{renderContactRow()}</Box>

            {locDescription(brand) && (
              <Typography
                variant="body2"
                sx={{
                  fontSize: "0.875rem",
                  opacity: 0.9,
                  lineHeight: 1.4,
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  mb: 2,
                  color: "white",
                }}
              >
                {locDescription(brand)}
              </Typography>
            )}

            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Chip
                icon={<Store />}
                label={`${products.length} ${t("Products")}`}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.3)",
                  fontSize: "0.75rem",
                  "& .MuiChip-icon": {
                    color: "white",
                    fontSize: "1rem",
                  },
                }}
              />
              <Chip
                icon={<LocalOfferIcon />}
                label={`${discountedProducts.length} ${t("Discounted")}`}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.3)",
                  fontSize: "0.75rem",
                  "& .MuiChip-icon": {
                    color: "white",
                    fontSize: "1rem",
                  },
                }}
              />
              {brand.isVip && (
                <Chip
                  label={t("VIP Brand")}
                  sx={{
                    backgroundColor: "orange",
                    color: "white",
                    fontWeight: 500,
                    fontSize: "0.75rem",
                    px: 1,
                    backdropFilter: "blur(10px)",
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Desktop Layout */}
          <Box
            position="relative"
            zIndex={1}
            sx={{ display: { xs: "none", md: "block" } }}
          >
            <Grid
              container
              spacing={{ xs: 2, sm: 3, md: 4 }}
              alignItems="center"
            >
              <Grid size={{ xs: 12, md: 3 }}>
                {brand.logo ? (
                  <Avatar
                    src={resolveMediaUrl(brand.logo)}
                    alt={locName(brand)}
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
                    fontSize: { xs: "1.5rem", sm: "2rem", md: "3rem" },
                    textShadow: "0 4px 8px rgba(0,0,0,0.3)",
                    textAlign: { xs: "center", md: "left" },
                    mb: 2,
                    color: "white",
                    position: "relative",
                  }}
                >
                  {locName(brand)}
                  {/* {brand.isVip && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: -8,
                        left: -8,
                        zIndex: 2,
                        backgroundColor: "white",
                        borderRadius: "50%",
                        width: { xs: 32, sm: 40 },
                        height: { xs: 32, sm: 40 },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                        "&::before": {
                          content: '"👑"',
                          fontSize: { xs: "16px", sm: "20px" },
                        },
                      }}
                    />
                  )} */}
                </Typography>

                {/* <Box sx={{ mb: 3 }}>
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
                      {locAddress(brand) || t("address not provided")}
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
                </Box> */}

                {locDescription(brand) && (
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
                    {locDescription(brand)}
                  </Typography>
                )}

                <Box
                  sx={{
                    mt: 3,
                    display: "flex",
                    gap: 2,
                    justifyContent: { xs: "center", md: "flex-start" },
                  }}
                >
                  <Chip
                    icon={<Store />}
                    label={`${products.length} ${t("Products")}`}
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.2)",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "1rem",
                      px: 1,
                      backdropFilter: "blur(10px)",
                    }}
                  />
                  <Chip
                    icon={brand.isVip ? undefined : <ShoppingCartIcon />}
                    label={brand.isVip ? t("VIP Brand") : t("Premium Brand")}
                    sx={{
                      backgroundColor: brand.isVip
                        ? "red"
                        : "rgba(255,255,255,0.2)",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "1rem",
                      px: 1,
                      backdropFilter: "blur(10px)",
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>

      {/* Enhanced Products Section with Tabs */}
      <Box sx={{ mb: 4 }}>
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
                  : "rgba(30, 111, 217, 0.05)",
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
                  color: theme.palette.primary.main,
                  width: { xs: "125px", sm: "100px", md: "100%" },
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  "&.Mui-selected": {
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? theme.palette.secondary.main
                        : theme.palette.primary.main,
                    color: "white",
                    boxShadow: "0 4px 12px rgba(1, 1, 1, 0.3)",
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
                          {locTitle(reel) || t("Reel")}
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
                      {new Date(selectedGift.expireDate).toLocaleDateString()}
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
    </Box>
  );
};

export default BrandProfile;
