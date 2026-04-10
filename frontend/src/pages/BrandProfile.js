import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
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
  Avatar,
  Chip,
  Alert,
  useTheme,
  useMediaQuery,
  Paper,
  Divider,
  IconButton,
  Fade,
  Skeleton,
} from "@mui/material";
import {
  ArrowBack,
  Phone,
  LocationOn,
  Business,
  Store,
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
import CloseIcon from "@mui/icons-material/Close";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CategoryIcon from "@mui/icons-material/Category";
import BusinessIcon from "@mui/icons-material/Business";
import StarIcon from "@mui/icons-material/Star";
import {
  brandAPI,
  companyAPI,
  productAPI,
  giftAPI,
  videoAPI,
  jobAPI,
} from "../services/api";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import StorefrontIcon from "@mui/icons-material/Storefront";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FullScreenImageModal from "../components/FullScreenImageModal";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import { useTranslation } from "react-i18next";
import Loader from "../components/Loader";
import { useUserTracking } from "../hooks/useUserTracking";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useCityFilter } from "../context/CityFilterContext";
import { cityStringsMatch } from "../utils/cityMatch";
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
  formatExpiryChipLabel,
  formatExpiryExpiresPrefixedLabel,
  expiryChipBg,
  expiryGiftCardBg,
  formatExpiryDateDdMmYyyy,
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useTranslation();
  const isCompanyMode = location.pathname.startsWith("/companies");
  const { locName, locDescription, locTitle, locAddress } =
    useLocalizedContent();
  const { selectedCity } = useCityFilter();
  const { toggleLike, isProductLiked, recordView } = useUserTracking();

  const productMatchesSelectedCity = useCallback(
    (product) =>
      cityStringsMatch(
        selectedCity,
        product?.storeId?.storecity || product?.storeId?.city || "",
      ),
    [selectedCity],
  );

  const [dialogOpen, setDialogOpen] = useState(false);

  // Notification dialog state
  const [loginNotificationOpen, setLoginNotificationOpen] = useState(false);

  // Product detail dialog state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productImageFullscreen, setProductImageFullscreen] = useState(null);

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

  // Like functionality states
  const [likeCounts, setLikeCounts] = useState({});
  const [likeStates, setLikeStates] = useState({});
  const [likeLoading, setLikeLoading] = useState({});

  const [filters] = useState({
    name: "",
    store: "",
    barcode: "",
    type: "",
  });
  

  // Filter states

  const productsInSelectedCityCount = useMemo(
    () => products.filter(productMatchesSelectedCity).length,
    [products, productMatchesSelectedCity],
  );

  const jobsInSelectedCity = useMemo(
    () =>
      jobs.filter((j) => {
        const jc = String(j?.city || "").trim();
        if (!jc) return true;
        return cityStringsMatch(selectedCity, jc);
      }),
    [jobs, selectedCity],
  );

  const productViewRecordedRef = useRef(new Set());

  useEffect(() => {
    setDisplayCounts({});
  }, [
    id,
    activeTabKey,
    selectedCity,
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
  }, [id, isCompanyMode]);

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

      // Fetch brand/company details
      const brandResponse = await (isCompanyMode
        ? companyAPI.getById(id)
        : brandAPI.getById(id));
      setBrand(brandResponse.data);

      // Fetch products for this brand/company
      const productsResponse = await (isCompanyMode
        ? productAPI.getByCompany(id)
        : productAPI.getByBrand(id));
      setProducts(productsResponse.data);

      // Fetch gifts for this brand/company
      const giftsResponse = await (isCompanyMode
        ? giftAPI.getAll()
        : giftAPI.getByBrand(id));
      const giftsList = Array.isArray(giftsResponse?.data)
        ? giftsResponse.data
        : Array.isArray(giftsResponse?.data?.data)
          ? giftsResponse.data.data
          : [];
      setGifts(
        giftsList.filter((g) => {
          if (isCompanyMode) {
            const companyId = g?.companyId?._id || g?.companyId || "";
            if (String(companyId) !== String(id)) return false;
          }
          if (!g?.expireDate) return true;
          return isExpiryStillValid(g.expireDate);
        }),
      );

      // Fetch reels for this brand (exclude expired)
      try {
        const videosRes = await videoAPI.getAll();
        const list = Array.isArray(videosRes?.data) ? videosRes.data : [];
        const filtered = list.filter((v) => {
          const ownerId = isCompanyMode
            ? v?.companyId?._id || v?.companyId || ""
            : v?.brandId?._id || v?.brandId || "";
          if (String(ownerId) !== String(id)) return false;
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
          const ownerId = isCompanyMode
            ? j?.companyId?._id || j?.companyId || ""
            : j?.brandId?._id || j?.brandId || "";
          if (String(ownerId) !== String(id)) return false;
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

      return (
        productMatchesSelectedCity(product) &&
        matchesName &&
        matchesStore &&
        matchesBarcode &&
        matchesType
      );
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

  // Render gift card — premium modern style
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
          cursor: "pointer",
          background: isDark
            ? "linear-gradient(145deg, #1e2a3a, #243040)"
            : "#fff",
          border: isDark
            ? "1px solid rgba(255,255,255,0.07)"
            : "1px solid #f0f2f5",
          boxShadow: isDark
            ? "0 4px 16px rgba(0,0,0,0.35)"
            : "0 2px 12px rgba(0,0,0,0.06)",
          transition: "all 0.25s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: isDark
              ? "0 8px 28px rgba(0,0,0,0.5)"
              : "0 8px 24px rgba(0,0,0,0.1)",
          },
        }}
      >
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
            alt={locDescription(gift)}
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
            {locDescription(gift)}
          </Typography>

            {gift.storeId && gift.storeId.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 0.8 }}>
              {gift.storeId.slice(0, 3).map((store) => (
                <Chip
                      key={store._id}
                  label={locName(store)}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                        navigate(`/stores/${store._id}?tab=gifts`);
                      }}
                      sx={{
                    height: 20,
                    fontSize: "0.65rem",
                    fontWeight: 600,
                        cursor: "pointer",
                    bgcolor: isDark
                      ? "rgba(30,111,217,0.2)"
                      : "rgba(30,111,217,0.08)",
                    color: isDark ? "rgba(30,111,217,0.9)" : "#1E6FD9",
                    "& .MuiChip-label": { px: 0.7 },
                  }}
                />
              ))}
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

  // Render product card — modern premium style
  const renderProductCard = (product, index, showPrice = true) => {
    const discount = calculateDiscount(product.previousPrice, product.newPrice);
    const hasPreviousPrice =
      product.previousPrice &&
      product.newPrice &&
      product.previousPrice > product.newPrice;
    const isDark = theme.palette.mode === "dark";

    return (
      <ProductViewTracker
        key={product._id}
        productId={product._id}
        onVisible={handleProductBecameVisible}
        recordedIdsRef={productViewRecordedRef}
      >
        <Fade in={true} timeout={300 + index * 50}>
        <Card
            onClick={() => { setSelectedProduct(product); setProductDialogOpen(true); }}
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
              textDecoration: "none",
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
            sx={{
              position: "relative",
              overflow: "hidden",
                height: { xs: 140, sm: 160 },
              flexShrink: 0,
                background: isDark ? "rgba(255,255,255,0.04)" : "#f8f9fb",
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

              {/* Discount badge + like button */}
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

              {/* View count */}
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
                  <VisibilityIcon sx={{ fontSize: "0.75rem" }} />
                {product.viewCount}
              </Box>
            )}
          </Box>

            {/* Content */}
          <CardContent
            sx={{
                p: "10px 10px 10px !important",
              flex: 1,
              display: "flex",
              flexDirection: "column",
                gap: 0.4,
            }}
          >
              {product.storeId && locName(product.storeId) && (
            <Typography
                  variant="caption"
              sx={{
                    color: "var(--brand-primary-blue, #1E6FD9)",
                fontWeight: 600,
                    display: "block",
                    whiteSpace: "nowrap",
                overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: "0.68rem",
                    lineHeight: 1.2,
              }}
            >
                  {locName(product.storeId)}
            </Typography>
              )}
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
      const currentDisplayCount = displayCounts[type] || 20;
      const displayProducts = typeProducts.slice(0, currentDisplayCount);
      const hasMore = typeProducts.length > currentDisplayCount;

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
                onClick={() => loadMoreProducts(type)}
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
      count: jobsInSelectedCity.length,
      label: `${t("Jobs")} (${jobsInSelectedCity.length})`,
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
        <Skeleton
          variant="rounded"
          width={80}
          height={36}
          sx={{ mb: 2, borderRadius: "999px" }}
        />
        <Skeleton
          variant="rounded"
          sx={{
            width: "100%",
            height: { xs: 200, sm: 240 },
            borderRadius: "20px",
            mb: 3,
          }}
        />
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
              <Skeleton variant="text" width="55%" height={28} sx={{ mb: 0.5 }} />
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

  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        py: { xs: 8, sm: 4 },
        px: { xs: 1, sm: 1.5, md: 3 },
        pb: { xs: 10, sm: 4 },
      }}
    >
      {/* Back Button */}
      <Button
        startIcon={<ArrowBack sx={{ fontSize: "1rem !important" }} />}
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

      {/* Brand Hero Header */}
      <Box
        sx={{
          mb: 3,
          borderRadius: "20px",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #7c3aed 100%)",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.45)"
            : "0 8px 32px rgba(99,102,241,0.3)",
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
          {/* Logo + Name row */}
          <Box
                sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: { xs: 1.5, sm: 2.5 },
              mb: 1.5,
            }}
          >
              <Avatar
              src={brand.logo ? resolveMediaUrl(brand.logo) : undefined}
              alt={locName(brand)}
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
              {!brand.logo && (
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
                  {locName(brand)}
                </Typography>
                {brand.isVip && (
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
              </Box>

              {/* Stats chips */}
              <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                <Chip
                  icon={
                    <Store
              sx={{
                        fontSize: "0.8rem !important",
                        color: "rgba(255,255,255,0.85) !important",
              }}
                    />
                  }
                label={`${productsInSelectedCityCount} ${t("Products")}`}
                size="small"
                sx={{
                    height: 22,
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    bgcolor: "rgba(255,255,255,0.15)",
                  color: "white",
                    border: "1px solid rgba(255,255,255,0.2)",
                    "& .MuiChip-label": { px: 0.7 },
                  }}
                />
                {discountedProducts.length > 0 && (
              <Chip
                    icon={
                      <LocalOfferIcon
                sx={{
                          fontSize: "0.8rem !important",
                          color: "rgba(255,255,255,0.85) !important",
                        }}
                      />
                    }
                    label={`${discountedProducts.length} ${t("Discounted")}`}
                    size="small"
                sx={{
                      height: 22,
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      bgcolor: "rgba(239,68,68,0.5)",
                  color: "white",
                      border: "none",
                      "& .MuiChip-label": { px: 0.7 },
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Info rows */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
            {locAddress(brand) && (
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
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: { xs: 220, sm: 450 },
                  }}
                >
                  {locAddress(brand)}
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
            <Box>{renderContactRow()}</Box>
            {locDescription(brand) && (
                  <Typography
                variant="body2"
                    sx={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: "0.8rem",
                  lineHeight: 1.5,
                  mt: 0.5,
                }}
              >
                {locDescription(brand)}
                  </Typography>
                )}
                </Box>
          </Box>
        </Box>

      {/* Enhanced Products Section with Tabs */}
      <Box sx={{ mb: 4 }}>
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
                            "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                  color: "white",
                          border: "none",
                          boxShadow: "0 3px 10px rgba(99,102,241,0.4)",
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
              {jobsInSelectedCity.map((job) => (
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

              const categoryId =
                selectedProduct.categoryId?._id || selectedProduct.categoryId;
              const related = products.filter(
                (p) =>
                  p._id !== pid &&
                  productMatchesSelectedCity(p) &&
                  (p.categoryId?._id || p.categoryId) === categoryId &&
                  isExpiryStillValid(p.expireDate || null) !== false &&
                  isDiscountValid(p),
              );

              return (
              <Box>
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
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                      }}
                    >
                      <ShoppingCartIcon sx={{ fontSize: 64, opacity: 0.2 }} />
                    </Box>
                  )}

                  <Box sx={{ px: 2.5, py: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.35 }}>
                      {locName(selectedProduct)}
                    </Typography>

                    {locDescription(selectedProduct) && (
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                        {locDescription(selectedProduct)}
                    </Typography>
                    )}

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
                            setProductDialogOpen(false);
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
                            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(30,111,217,0.08)",
                            color: "var(--color-primary,#1E6FD9)",
                          }}
                        />
                      )}
                      {selectedProduct.storeId && locName(selectedProduct.storeId) && (
                        <Chip
                          icon={<StorefrontIcon sx={{ fontSize: "0.9rem !important" }} />}
                          label={locName(selectedProduct.storeId)}
                          size="small"
                          onClick={() => {
                            setProductDialogOpen(false);
                            navigate(`/stores/${selectedProduct.storeId._id}`);
                          }}
                      sx={{
                            borderRadius: 99,
                        fontWeight: 600,
                            fontSize: "0.72rem",
                            cursor: "pointer",
                            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(30,111,217,0.08)",
                            color: "var(--color-primary,#1E6FD9)",
                          }}
                        />
                      )}
                      {selectedProduct.categoryId && (
                        <Chip
                          icon={<CategoryIcon sx={{ fontSize: "0.9rem !important" }} />}
                          label={locName(selectedProduct.categoryId) || t("Category")}
                          size="small"
                      sx={{
                            borderRadius: 99,
                            fontWeight: 600,
                            fontSize: "0.72rem",
                            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(30,111,217,0.08)",
                            color: "var(--color-primary,#1E6FD9)",
                          }}
                        />
                      )}
                  </Box>

                    {selectedProduct.expireDate &&
                      (() => {
                        const info = getExpiryRemainingInfo(selectedProduct.expireDate);
                        const label = formatExpiryChipLabel(info, t);
                        const chipColor = expiryChipBg(info);
                        const dateStr = formatExpiryDateDdMmYyyy(selectedProduct.expireDate);
                        return (
                  <Box
                    sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              px: 1.25,
                              py: 0.9,
                              borderRadius: 2.5,
                              backgroundColor: isDark ? `${chipColor}22` : `${chipColor}18`,
                              border: `1px solid ${chipColor}55`,
                            }}
                          >
                            <AccessTimeIcon sx={{ fontSize: "1rem", color: chipColor, flexShrink: 0 }} />
                            <Box sx={{ display: "flex", flexDirection: "column" }}>
                              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: chipColor, lineHeight: 1.3 }}>
                                {info.kind === "expired" ? t("Expired") : label || t("Expires")}
                              </Typography>
                              {dateStr && (
                                <Typography sx={{ fontSize: "0.66rem", fontWeight: 500, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)", lineHeight: 1.2 }}>
                                  {dateStr}
                                </Typography>
                )}
              </Box>
                          </Box>
                        );
                      })()}

                  <Box
                    sx={{
                        mt: 0.5,
                        p: 1.75,
                        borderRadius: 3,
                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.025)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.25,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {t("Price")}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        {hasDiscount && selectedProduct.previousPrice && Number(selectedProduct.previousPrice) > Number(selectedProduct.newPrice) && (
                          <Typography sx={{ textDecoration: "line-through", color: "text.disabled", fontSize: "0.9rem" }}>
                            {formatPrice(selectedProduct.previousPrice)}
                          </Typography>
                        )}
                        <Typography sx={{ fontWeight: 900, fontSize: "1.65rem", color: "var(--color-secondary,#0d47a1)", lineHeight: 1 }}>
                          {formatPrice(selectedProduct.newPrice)}
                        </Typography>
                        {hasDiscount && (
                          <Chip
                            label={discountLabel}
                            size="small"
                            sx={{ height: 22, fontSize: "0.72rem", fontWeight: 800, backgroundColor: "#e53e3e", color: "#fff", borderRadius: 99 }}
                          />
                        )}
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mt: 0.25,
                        px: 1.5,
                        py: 1,
                        borderRadius: 3,
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"}`,
                      }}
                    >
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
                          backgroundColor: liked ? "rgba(229,62,62,0.12)" : "transparent",
                          "&:active": { transform: "scale(0.93)" },
                        }}
                        onClick={(e) => !isLikeLoading && handleLikeClick(pid, e)}
                      >
                        {liked ? (
                          <FavoriteIcon sx={{ fontSize: "1.2rem", color: "#e53e3e", transform: "scale(1.15)", transition: "transform 0.15s" }} />
                        ) : (
                          <FavoriteBorderIcon sx={{ fontSize: "1.2rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }} />
                        )}
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: liked ? "#e53e3e" : isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)", minWidth: 14 }}>
                          {likeCount > 0 ? likeCount : ""}
                    </Typography>
                  </Box>

                      <Box sx={{ width: "1px", height: 20, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)", flexShrink: 0 }} />

                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <VisibilityIcon sx={{ fontSize: "1.1rem", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)" }} />
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)" }}>
                          {viewCount > 0 ? viewCount.toLocaleString() : "0"}
                        </Typography>
                      </Box>

                      <Box sx={{ width: "1px", height: 20, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)", flexShrink: 0 }} />

                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <FavoriteIcon sx={{ fontSize: "1rem", color: isDark ? "rgba(255,100,100,0.45)" : "rgba(229,62,62,0.4)" }} />
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)" }}>
                          {likeCount > 0 ? likeCount.toLocaleString() : "0"}
                        </Typography>
                      </Box>

                      {selectedProduct.averageRating > 0 && (
                        <>
                          <Box sx={{ width: "1px", height: 20, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)", flexShrink: 0 }} />
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <StarIcon sx={{ fontSize: "1rem", color: "#ffc107" }} />
                            <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)" }}>
                              {selectedProduct.averageRating.toFixed(1)}
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Box>

                    {related.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Box sx={{ pb: 0.75, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)" }}>
                            {t("Related Products")}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "var(--color-primary,#1E6FD9)", fontWeight: 600 }}>
                            {related.length}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", gap: 1.25, overflowX: "auto", pb: 1, mx: -2.5, px: 2.5, "&::-webkit-scrollbar": { display: "none" }, scrollbarWidth: "none" }}>
                          {related.map((rel) => {
                            const relDiscount = calculateDiscount(rel.previousPrice, rel.newPrice);
                            const relHasDiscount = isDiscountValid(rel);
                            const relDiscountLabel = relDiscount !== null ? `-${relDiscount}%` : t("Discount");
                            return (
                              <Box
                                key={rel._id}
                                onClick={(e) => { e.stopPropagation(); setSelectedProduct(rel); }}
                    sx={{
                                  flexShrink: 0,
                                  width: 120,
                                  borderRadius: 2.5,
                                  overflow: "hidden",
                                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                                  border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
                                  cursor: "pointer",
                                  "&:active": { transform: "scale(0.95)" },
                                }}
                              >
                                <Box sx={{ position: "relative" }}>
                                  {rel.image ? (
                                    <Box component="img" src={resolveMediaUrl(rel.image)} alt={locName(rel) || ""} sx={{ width: "100%", height: 90, objectFit: "contain", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", display: "block" }} />
                                  ) : (
                                    <Box sx={{ width: "100%", height: 90, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                                      <ShoppingCartIcon sx={{ fontSize: 28, opacity: 0.2 }} />
                      </Box>
                                  )}
                                  {relHasDiscount && (
                                    <Box sx={{ position: "absolute", top: 5, left: 5, background: "linear-gradient(135deg,#e53e3e,#c53030)", color: "#fff", fontSize: "0.58rem", fontWeight: 800, px: 0.6, py: 0.2, borderRadius: 0.75, pointerEvents: "none" }}>
                                      {relDiscountLabel}
                  </Box>
                )}
              </Box>
                                <Box sx={{ px: 0.75, py: 0.75 }}>
                                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, lineHeight: 1.3, color: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.8)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", mb: 0.4 }}>
                                    {locName(rel) || "\u00A0"}
                                  </Typography>
                                  {rel.newPrice && (
                                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--color-secondary,#0d47a1)", lineHeight: 1 }}>
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

      <FullScreenImageModal
        open={Boolean(productImageFullscreen)}
        onClose={() => setProductImageFullscreen(null)}
        imageUrl={productImageFullscreen?.url}
        alt={productImageFullscreen?.alt || ""}
      />

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





