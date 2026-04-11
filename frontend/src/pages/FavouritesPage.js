import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  IconButton,
  Alert,
  Chip,
  Button,
  Skeleton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import FavoriteIcon from "@mui/icons-material/Favorite";

import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";

import StorefrontIcon from "@mui/icons-material/Storefront";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import { useUserTracking } from "../hooks/useUserTracking";
import { resolveMediaUrl } from "../utils/mediaUrl";
import {
  isExpiryStillValid,
  getExpiryRemainingInfo,
  formatExpiryChipLabel,
  shouldShowExpiryChip,
  expiryChipBg,
} from "../utils/expiryDate";
import ProductViewTracker from "../components/ProductViewTracker";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { formatPriceDigits } from "../utils/formatPriceNumber";
import ProductDetailDialog from "../components/ProductDetailDialog";

const FavouritesPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locName } = useLocalizedContent();
  const { getLikedProducts, toggleLike, isProductLiked, user, recordView } =
    useUserTracking();
  const [products, setProducts] = useState([]);
  const productViewRecordedRef = useRef(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likeStates, setLikeStates] = useState({});
  const [likeLoading, setLikeLoading] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  const isProductExpired = (product) =>
    Boolean(product.expireDate) && !isExpiryStillValid(product.expireDate);

  const nonExpiredProducts = useMemo(
    () => products.filter((p) => !isProductExpired(p)),
    [products],
  );

  const favouriteProductIdsKey = useMemo(
    () =>
      (products || [])
        .map((p) => String(p._id))
        .sort()
        .join(","),
    [products],
  );

  useEffect(() => {
    productViewRecordedRef.current = new Set();
  }, [favouriteProductIdsKey]);

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
    const fetchLiked = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getLikedProducts();
        if (result.success && result.data) {
          setProducts(Array.isArray(result.data) ? result.data : []);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Error fetching favourites:", err);
        setError("Failed to load favourites");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLiked();
  }, [getLikedProducts, user]);

  // Sync like states when products or user loads (use products + user to avoid unstable refs)
  useEffect(() => {
    const filtered = products.filter((p) => !isProductExpired(p));
    if (filtered.length === 0) return;
    const states = {};
    filtered.forEach((p) => {
      states[p._id] = isProductLiked(p._id);
    });
    setLikeStates(states);
  }, [products, user]);

  const formatPrice = (price) => {
    const num = typeof price === "number" ? price : parseFloat(price);
    if (!Number.isFinite(num)) return `${t("ID")} 0`;
    return ` ${formatPriceDigits(num)} ${t("ID")}`;
  };

  const handleLikeClick = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (likeLoading[productId]) return;

    const isCurrentlyLiked = likeStates[productId] ?? isProductLiked(productId);
    setLikeLoading((prev) => ({ ...prev, [productId]: true }));
    setLikeStates((prev) => ({ ...prev, [productId]: !isCurrentlyLiked }));

    try {
      const result = await toggleLike(productId);
      if (!result.success) {
        setLikeStates((prev) => ({ ...prev, [productId]: isCurrentlyLiked }));
      } else if (!isCurrentlyLiked) {
        // Unlike - remove from list
        setProducts((prev) => prev.filter((p) => p._id !== productId));
      }
    } catch (err) {
      setLikeStates((prev) => ({ ...prev, [productId]: isCurrentlyLiked }));
    } finally {
      setLikeLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };
  const getMarketInfo = (product) => {
    const store = product.storeId;
    const brand = product.brandId;
    if (locName(store) || store?.logo)
      return { name: locName(store), logo: store.logo };
    if (locName(brand) || brand?.logo)
      return { name: locName(brand), logo: brand.logo };
    return null;
  };

  if (loading) {
    return (
      <Box sx={{ py: 3, px: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{
            mt: { xs: 4, md: 3 },
            mb: 3,
            borderRadius: 2,
            borderColor: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
            color: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
            "&:hover": {
              borderColor:
                theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
              backgroundColor:
                theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
              color: theme.palette.mode === "dark" ? "#FFA94D" : "white",
            },
          }}
        >
          {t("Back")}
        </Button>
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="text" sx={{ width: "50%", mb: 2 }} />
          {Array.from({ length: 4 }).map((_, idx) => (
            <Box key={idx} sx={{ mb: 2 }}>
              <Skeleton
                variant="rectangular"
                sx={{ width: "100%", height: 140, borderRadius: 2, mb: 1 }}
              />
              <Skeleton variant="text" sx={{ width: "60%" }} />
              <Skeleton variant="text" sx={{ width: "40%" }} />
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 3, px: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{
            mt: { xs: 4, md: 3 },
            mb: 3,
            borderRadius: 2,
            borderColor: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
            color: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
            "&:hover": {
              borderColor:
                theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
              backgroundColor:
                theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
              color: theme.palette.mode === "dark" ? "#FFA94D" : "white",
            },
          }}
        >
          {t("Back")}
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        py: 3,
        px: 2,
        pb: { xs: 10, sm: 3 },
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "hidden",
        boxSizing: "border-box",
        minHeight: "100vh",
        backgroundColor: isDark ? "rgba(13,17,28,1)" : "rgba(248,249,252,1)",
      }}
    >
      <Button
        variant="outlined"
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{
          mt: { xs: 4, md: 3 },
          mb: 3,
          borderRadius: 2,
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
      <Typography
        variant="h4"
        sx={{
          mb: 3,
          fontWeight: 800,
          color: isDark ? "#fff" : "#111827",
        }}
      >
        {t("Favourites")}
      </Typography>

      {nonExpiredProducts.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            px: 2,
            borderRadius: 4,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.02)",
          }}
        >
          <FavoriteBorderIcon
            sx={{
              fontSize: 80,
              mb: 2,
              color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
            }}
          />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
            }}
            gutterBottom
          >
            {t("No favourites yet")}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
            }}
          >
            {t("Like products to add them to your favourites")}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr 1fr",
              sm: "repeat(3, 1fr)",
              md: "repeat(4, 1fr)",
            },
            gap: 2,
            width: "100%",
          }}
        >
          {nonExpiredProducts.map((product) => {
            const isLiked =
              likeStates[product._id] ?? isProductLiked(product._id);
            const expInfo = getExpiryRemainingInfo(product.expireDate);
            const showExpiryChip = shouldShowExpiryChip(expInfo);
            const market = getMarketInfo(product);

            return (
              <ProductViewTracker
                key={product._id}
                productId={product._id}
                onVisible={handleProductBecameVisible}
                recordedIdsRef={productViewRecordedRef}
              >
                <Card
                  onClick={() => {
                    setSelectedProduct(product);
                    setProductDialogOpen(true);
                  }}
                  sx={{
                    textDecoration: "none",
                    color: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    width: { xs: "160px", sm: "100%" },
                    maxWidth: { xs: "160px", sm: "100%" },
                    minWidth: 0,
                    overflow: "hidden",
                    borderRadius: 3,
                    background: isDark
                      ? "linear-gradient(145deg,#1a2235,#1e2a42)"
                      : "#ffffff",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
                    boxShadow: isDark
                      ? "0 2px 12px rgba(0,0,0,0.3)"
                      : "0 2px 10px rgba(0,0,0,0.05)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: isDark
                        ? "0 6px 24px rgba(0,0,0,0.45)"
                        : "0 6px 20px rgba(30,111,217,0.12)",
                      borderColor: isDark ? "rgba(74,144,226,0.4)" : "#dce8ff",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  {/* Logo and market name at top */}
                  {market && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        p: 1,
                        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
                        minWidth: 0,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.02)",
                      }}
                    >
                      {market.logo ? (
                        <Box
                          component="img"
                          src={
                            market.logo
                              ? resolveMediaUrl(market.logo)
                              : undefined
                          }
                          alt={market.name}
                          sx={{
                            width: 24,
                            height: 24,
                            objectFit: "contain",
                            borderRadius: 0.5,
                          }}
                        />
                      ) : (
                        <StorefrontIcon
                          sx={{ fontSize: 20, color: "text.secondary" }}
                        />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: isDark
                            ? "rgba(255,255,255,0.7)"
                            : "rgba(0,0,0,0.65)",
                        }}
                      >
                        {market.name}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ position: "relative" }}>
                    {product.image ? (
                      <CardMedia
                        component="img"
                        image={resolveMediaUrl(product.image)}
                        alt={locName(product)}
                        sx={{
                          height: 110,
                          width: "100%",
                          maxWidth: "100%",
                          objectFit: "contain",
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "#f8f9fb",
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 110,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "#f8f9fb",
                        }}
                      >
                        <ShoppingCartIcon
                          sx={{
                            fontSize: 48,
                            color: isDark
                              ? "rgba(255,255,255,0.15)"
                              : "rgba(0,0,0,0.12)",
                          }}
                        />
                      </Box>
                    )}
                    {/* {product.viewCount > 0 && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.25,
                        backgroundColor: "rgba(0, 0, 0, 0.65)",
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
                      {product.viewCount}
                    </Box>
                  )} */}
                    <IconButton
                      onClick={(e) => handleLikeClick(product._id, e)}
                      disabled={likeLoading[product._id]}
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "rgba(255,255,255,0.9)",
                        "&:hover": { backgroundColor: "white" },
                        zIndex: 2,
                      }}
                    >
                      {isLiked ? (
                        <FavoriteIcon
                          sx={{ color: "#e53e3e", fontSize: "1.2rem" }}
                        />
                      ) : (
                        <FavoriteBorderIcon sx={{ fontSize: "1.2rem" }} />
                      )}
                    </IconButton>
                    {showExpiryChip && (
                      <Chip
                        label={formatExpiryChipLabel(expInfo, t)}
                        size="small"
                        sx={{
                          position: "absolute",
                          bottom: 8,
                          left: 8,
                          backgroundColor: expiryChipBg(expInfo),
                          color: "white",
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                  <CardContent
                    sx={{
                      flexGrow: 1,
                      p: 1.25,
                      minWidth: 0,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        fontSize: { xs: "0.82rem", sm: "0.88rem" },
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        textAlign: "center",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                        minHeight: "2.6em",
                        color: isDark
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(0,0,0,0.85)",
                      }}
                    >
                      {locName(product)}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.25,
                        mt: 0.5,
                        alignItems: "center",
                      }}
                    >
                      {(() => {
                        const hasPreviousPrice =
                          product.previousPrice &&
                          product.newPrice &&
                          product.previousPrice > product.newPrice;

                        return (
                          <>
                            <Typography
                              variant="body2"
                              sx={{
                                textDecoration: hasPreviousPrice
                                  ? "line-through"
                                  : "none",
                                color: isDark
                                  ? "rgba(255,80,80,0.75)"
                                  : "#e53e3e",
                                fontSize: { xs: "0.72rem", sm: "0.78rem" },
                                fontWeight: 500,
                                minHeight: "1.2em",
                                visibility: hasPreviousPrice
                                  ? "visible"
                                  : "hidden",
                              }}
                            >
                              {hasPreviousPrice
                                ? formatPrice(product.previousPrice)
                                : "\u00A0"}
                            </Typography>

                            <Typography
                              variant="body1"
                              sx={{
                                color: "var(--color-secondary,#0d47a1)",
                                textAlign: "center",
                                fontWeight: 800,
                                fontSize: { xs: "0.95rem", sm: "1.05rem" },
                                minHeight: "1.4em",
                                maxWidth: "100%",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                              }}
                            >
                              {product.newPrice
                                ? formatPrice(product.newPrice)
                                : "\u00A0"}
                            </Typography>
                          </>
                        );
                      })()}
                    </Box>
                  </CardContent>
                </Card>
              </ProductViewTracker>
            );
          })}
        </Box>
      )}

      <ProductDetailDialog
        open={productDialogOpen}
        onClose={() => {
          setProductDialogOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        candidateProducts={nonExpiredProducts}
        onProductChange={setSelectedProduct}
      />
    </Box>
  );
};

export default FavouritesPage;
