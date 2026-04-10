import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  Grid,
  Paper,
  Alert,
  Divider,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { productAPI, categoryAPI } from "../services/api";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import BusinessIcon from "@mui/icons-material/Business";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CategoryIcon from "@mui/icons-material/Category";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import StarIcon from "@mui/icons-material/Star";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import { useUserTracking } from "../hooks/useUserTracking";
import { resolveMediaUrl } from "../utils/mediaUrl";
import {
  isExpiryStillValid,
  getExpiryRemainingInfo,
  formatExpiryChipLabel,
  formatExpiredAgoText,
} from "../utils/expiryDate";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import FullScreenImageModal from "../components/FullScreenImageModal";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [, setCategories] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const { t } = useTranslation();
  const { locName } = useLocalizedContent();
  const theme = useTheme();

  // User tracking hook (user = device user for guests)
  const { toggleLike, recordView, isProductLiked } = useUserTracking();

  // State for tracking like count locally
  const [localLikeCount, setLocalLikeCount] = useState(0);
  const [, setLocalLikeState] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const viewRecordedRef = useRef(false); // Use ref to track if view has been recorded for this product

  // Notification dialog state (reason: "like" | "review")
  const [loginNotificationOpen, setLoginNotificationOpen] = useState(false);
  const [loginNotificationReason] = useState("like");
  const [fullscreenImage, setFullscreenImage] = useState(null);

  // Handle like button click (works for both logged-in and guest/device users)
  const handleLikeClick = async () => {
    // Prevent multiple rapid clicks
    if (likeLoading) {
      return;
    }

    // Get current state
    const currentLikeCount = (localLikeCount ?? product?.likeCount ?? 0) || 0;
    const likedNow =
      optimisticLiked ?? (product?._id ? isProductLiked(product._id) : false);
    const isCurrentlyLiked = Boolean(likedNow);

    // Set loading state
    setLikeLoading(true);

    try {
      // Optimistically update the UI
      if (isCurrentlyLiked) {
        // Currently liked, so unlike
        setLocalLikeCount(Math.max(0, currentLikeCount - 1));
        setLocalLikeState(false);
        setOptimisticLiked(false);
      } else {
        // Currently not liked, so like
        setLocalLikeCount(currentLikeCount + 1);
        setLocalLikeState(true);
        setOptimisticLiked(true);
      }

      // Make the API call
      const result = await toggleLike(product._id);

      if (!result.success) {
        // Revert the optimistic update if the API call failed
        setLocalLikeCount(currentLikeCount);
        setLocalLikeState(isCurrentlyLiked);
        setOptimisticLiked(null);
        alert(result.message || "Failed to update like");
      }
    } catch (error) {
      // Revert on error
      setLocalLikeCount(currentLikeCount);
      setLocalLikeState(isCurrentlyLiked);
      setOptimisticLiked(null);
      alert("Failed to update like");
    } finally {
      // Clear loading state
      setLikeLoading(false);
      // Clear optimistic override after request finishes;
      // actual source of truth is `isProductLiked()` (user/device state).
      setOptimisticLiked(null);
    }
  };

  useEffect(() => {
    fetchProduct();
    fetchCategories();
    // Reset view recorded state when product changes
    viewRecordedRef.current = false;
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getById(id);
      const productData = response.data;
      setProduct(productData);

      // Initialize local like count
      setLocalLikeCount(productData.likeCount ?? 0);
      // Sync local liked state immediately on load
      setLocalLikeState(isProductLiked(productData._id));
      setOptimisticLiked(null);

      // Record view only once when product is loaded
      if (!viewRecordedRef.current) {
        recordView(id);
        viewRecordedRef.current = true;
      }

      // Fetch related products after getting the current product
      fetchRelatedProducts(productData);
    } catch (err) {
      setError("Failed to load product details. Please try again.");
      console.error("Error fetching product:", err);
    } finally {
      setLoading(false);
    }
  };

  // Keep local like state in sync with global liked products
  useEffect(() => {
    if (!product?._id) return;
    setLocalLikeState(isProductLiked(product._id));
    setOptimisticLiked(null);
  }, [product?._id, isProductLiked]);

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      setCategories(response.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchRelatedProducts = async (currentProduct) => {
    try {
      setRelatedLoading(true);
      // Get all products and filter for related ones
      const response = await productAPI.getAll();
      const allProducts = response.data;

      // Filter products by same category (excluding current product and expired discounts)
      const sameCategoryProducts = allProducts
        .filter((p) => p._id !== currentProduct._id)
        .filter((p) => {
          // Exclude expired discounted products
          if (p.isDiscount && !isDiscountValid(p)) {
            return false;
          }

          if (
            currentProduct.categoryId &&
            p.categoryId &&
            currentProduct.categoryId._id === p.categoryId._id
          ) {
            return true;
          }
          return false;
        })
        .slice(0, 5); // Limit to 5 products

      // Filter products by same store (excluding current product, already selected category products, and expired discounts)
      const sameStoreProducts = allProducts
        .filter((p) => p._id !== currentProduct._id)
        .filter((p) => {
          // Exclude expired discounted products
          if (p.isDiscount && !isDiscountValid(p)) {
            return false;
          }

          // Exclude products already in sameCategoryProducts
          const isAlreadyInCategory = sameCategoryProducts.some(
            (catProduct) => catProduct._id === p._id,
          );
          if (isAlreadyInCategory) return false;

          if (
            currentProduct.storeId &&
            p.storeId &&
            currentProduct.storeId._id === p.storeId._id
          ) {
            return true;
          }
          return false;
        })
        .slice(0, 5); // Limit to 5 products

      // Combine both arrays
      const related = [...sameCategoryProducts, ...sameStoreProducts];
      setRelatedProducts(related);
    } catch (err) {
      console.error("Error fetching related products:", err);
    } finally {
      setRelatedLoading(false);
    }
  };

  // Helper function to get category type name from categoryTypeId
  const formatPrice = (price) => {
    if (typeof price !== "number") return `0 ${t("ID")}`;
    return ` ${price.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ${t("ID")}`;
  };

  /** DD/MM/YYYY, then 24h time (local). */
  const formatExpireDateDdMmYyyyTime = (isoOrDate) => {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy}, ${hh}:${min}:${ss}`;
  };

  const calculateDiscount = (previousPrice, newPrice) => {
    if (!previousPrice || !newPrice) return 0;
    return Math.round(((previousPrice - newPrice) / previousPrice) * 100);
  };

  const isDiscountValid = (product) => {
    if (!product.isDiscount) return false;

    if (!product.expireDate) return true;

    return isExpiryStillValid(product.expireDate);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
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

  if (!product) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Product not found.
      </Alert>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: 2, mt: { xs: 4, md: 3 } }}>
      <Button
        variant="outlined"
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{
          borderRadius: 2,
          mb: { xs: 2, md: 3 },
          borderColor: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
          color: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
          "&:hover": {
            borderColor: theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
            backgroundColor:
              theme.palette.mode === "dark" ? "#4A90E2" : "#1E6FD9",
            color: theme.palette.mode === "dark" ? "#FFA94D" : "white",
          },
        }}
      >
        {t("Back")}
      </Button>

      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Grid container spacing={3}>
          {/* Product Image */}
          <Grid size={{ xs: 12, md: 6 }} alignContent="center">
            {product.image ? (
              <CardMedia
                component="img"
                image={resolveMediaUrl(product.image)}
                alt={locName(product)}
                onClick={() =>
                  setFullscreenImage({
                    url: resolveMediaUrl(product.image),
                    alt: locName(product),
                  })
                }
                role="presentation"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: { xs: 150, sm: 350, md: 400 },
                  objectFit: "contain",
                  borderRadius: 2,
                  cursor: "pointer",
                  "&:focus-visible": { outline: "2px solid", outlineOffset: 4 },
                }}
              />
            ) : (
              <Box
                sx={{
                  height: { xs: 150, sm: 350, md: 400 },
                  bgcolor: "grey.100",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 2,
                }}
              >
                <ShoppingCartIcon
                  sx={{
                    fontSize: { xs: 50, sm: 70, md: 80 },
                    color: "grey.400",
                  }}
                />
              </Box>
            )}
          </Grid>

          {/* Product Details */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box>
              <Box display="flex" alignItems="center" mb={2}>
                <ShoppingCartIcon
                  sx={{
                    fontSize: { xs: 24, sm: 28, md: 32 },
                    mr: { xs: 1, md: 2 },
                    color: "primary.main",
                  }}
                />
                <Typography
                  variant="h3"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontSize: { xs: "1rem", sm: "2rem", md: "3rem" },
                    lineHeight: { xs: 1.2, md: 1.3 },
                  }}
                >
                  {locName(product)}
                </Typography>
              </Box>

              {/* Category Details */}
              {product.categoryId && (
                <Box display="flex" alignItems="center" mb={2}>
                  <CategoryIcon
                    sx={{
                      fontSize: { xs: 16, sm: 18, md: 20 },
                      mr: { xs: 0.5, md: 1 },
                      color: "text.secondary",
                    }}
                  />
                  <Typography
                    variant="h6"
                    color={
                      theme.palette.mode === "dark" ? "white" : "text.secondary"
                    }
                    sx={{
                      fontWeight: "bold",
                      fontSize: { xs: "0.875rem", sm: "1rem", md: "1.25rem" },
                    }}
                  >
                    {t("Category")}:{" "}
                    <span
                      style={{
                        color:
                          theme.palette.mode === "dark"
                            ? "white"
                            : "text.secondary",
                        fontWeight: "bold",
                      }}
                    >
                      {locName(product.categoryId) || "N/A"}
                    </span>
                  </Typography>
                </Box>
              )}

              {product.brandId && product.brandId.statusAll !== "off" && (
                <Box display="flex" alignItems="center" mb={2}>
                  <BusinessIcon
                    sx={{
                      fontSize: { xs: 16, sm: 18, md: 20 },
                      mr: { xs: 0.5, md: 1 },
                      color: "text.secondary",
                    }}
                  />
                  <Typography
                    variant="h6"
                    onClick={() => navigate(`/brands/${product.brandId._id}`)}
                    color="text.secondary"
                    sx={{
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: { xs: "0.875rem", sm: "1rem", md: "1.25rem" },
                    }}
                  >
                    {t("Brand")}:{" "}
                    <span
                      style={{
                        color:
                          theme.palette.mode === "dark"
                            ? "white"
                            : "text.secondary",
                        fontWeight: "bold",
                      }}
                    >
                      {locName(product.brandId)}
                    </span>
                  </Typography>
                </Box>
              )}
              {product.storeId && (
                <Box display="flex" alignItems="center" mb={2}>
                  <StorefrontIcon
                    sx={{
                      fontSize: { xs: 16, sm: 18, md: 20 },
                      mr: { xs: 0.5, md: 1 },
                      color: "text.secondary",
                    }}
                  />
                  <Typography
                    variant="h6"
                    onClick={() => navigate(`/stores/${product.storeId._id}`)}
                    color="text.secondary"
                    sx={{
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: { xs: "0.875rem", sm: "1rem", md: "1.25rem" },
                    }}
                  >
                    {t("store")}:{" "}
                    <span
                      style={{
                        color:
                          theme.palette.mode === "dark"
                            ? "white"
                            : "text.secondary",
                        fontWeight: "bold",
                      }}
                    >
                      {locName(product.storeId)}
                    </span>
                  </Typography>
                </Box>
              )}

              {/* Remaining time / days until expiry + exact expire date/time */}
              {product.expireDate && (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="flex-start"
                  gap={0.5}
                  mb={2}
                >
                  {(() => {
                    const expInfo = getExpiryRemainingInfo(product.expireDate);
                    if (expInfo.kind === "none") return null;
                    if (expInfo.kind === "expired") {
                      return (
                        <Box display="flex" alignItems="center">
                          <AccessTimeIcon
                            sx={{
                              fontSize: { xs: 16, sm: 18, md: 20 },
                              mr: { xs: 0.5, md: 1 },
                              color: "error.main",
                            }}
                          />
                          <Typography
                            variant="h6"
                            color="error.main"
                            sx={{
                              fontWeight: "bold",
                              fontSize: {
                                xs: "0.875rem",
                                sm: "1rem",
                                md: "1.25rem",
                              },
                            }}
                          >
                            {formatExpiredAgoText(product.expireDate, t)}
                          </Typography>
                        </Box>
                      );
                    }
                    if (expInfo.kind === "hours") {
                      return (
                        <Box display="flex" alignItems="center">
                          <AccessTimeIcon
                            sx={{
                              fontSize: { xs: 16, sm: 18, md: 20 },
                              mr: { xs: 0.5, md: 1 },
                              color: "warning.main",
                            }}
                          />
                          <Typography
                            variant="h6"
                            color="warning.main"
                            sx={{
                              fontWeight: "bold",
                              fontSize: {
                                xs: "0.875rem",
                                sm: "1rem",
                                md: "1.25rem",
                              },
                            }}
                          >
                            {formatExpiryChipLabel(expInfo, t)}
                          </Typography>
                        </Box>
                      );
                    }
                    return (
                      <Box display="flex" alignItems="center">
                        <AccessTimeIcon
                          sx={{
                            fontSize: { xs: 16, sm: 18, md: 20 },
                            mr: { xs: 0.5, md: 1 },
                            color: "success.main",
                          }}
                        />
                        <Typography
                          variant="h6"
                          color="success.main"
                          sx={{
                            fontWeight: "bold",
                            fontSize: {
                              xs: "0.875rem",
                              sm: "1rem",
                              md: "1.25rem",
                            },
                          }}
                        >
                          {expInfo.days} {t("days remaining")}
                        </Typography>
                      </Box>
                    );
                  })()}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                  >
                    {t("Expire Date")}:{" "}
                    {formatExpireDateDdMmYyyyTime(product.expireDate)}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: { xs: 2, md: 3 } }} />

              {/* Pricing Section */}
              <Box sx={{ mb: { xs: 2, md: 3 } }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <Typography
                    variant="h4"
                    gutterBottom
                    sx={{
                      fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
                      color: theme.palette.mode === "dark" ? "white" : "black",
                    }}
                  >
                    {t("Price")}:{" "}
                    <span
                      style={{
                        color: "var(--brand-light-orange)",
                        fontWeight: 700,
                      }}
                    >
                      {formatPrice(product.newPrice)}
                    </span>
                  </Typography>
                </Box>

                {product.previousPrice &&
                  product.previousPrice > product.newPrice && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: { xs: 1, md: 2 },
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          textDecoration: "line-through",
                          color: "red",
                          fontSize: { xs: "0.8rem", sm: "0.9rem" },
                          fontWeight: 500,
                        }}
                      >
                        {formatPrice(product.previousPrice)}
                      </Typography>
                      <Chip
                        icon={
                          <LocalOfferIcon
                            sx={{ fontSize: { xs: 16, sm: 20 } }}
                          />
                        }
                        label={`-${calculateDiscount(
                          product.previousPrice,
                          product.newPrice,
                        )}% OFF`}
                        color="error"
                        size="large"
                        sx={{
                          fontSize: { xs: "0.7rem", sm: "0.875rem" },
                          height: { xs: "32px", sm: "40px" },
                        }}
                      />
                    </Box>
                  )}
              </Box>

              {/* User Interaction Section */}
              <Box sx={{ mb: { xs: 2, md: 3 } }}>
                {/* Mobile Layout - Stacked Design */}
                <Box
                  sx={{
                    display: { xs: "flex", sm: "flex" },
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: { xs: 1.5, sm: 2 },
                    mb: { xs: 2, sm: 2 },
                  }}
                >
                  {/* Top Row - Like Button and Stats */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: { xs: 1, sm: 2 },
                      justifyContent: { xs: "space-between", sm: "flex-start" },
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Like Button */}
                    {(() => {
                      const likedUi =
                        optimisticLiked ??
                        (product?._id ? isProductLiked(product._id) : false);
                      return (
                    <IconButton
                      onClick={handleLikeClick}
                      disabled={likeLoading}
                      sx={{
                        backgroundColor: likedUi
                          ? "rgba(229, 62, 62, 0.1)"
                          : "rgba(0, 0, 0, 0.04)",
                        color: likedUi ? "#e53e3e" : "#666",
                        "&:hover": {
                          backgroundColor: likedUi
                            ? "rgba(229, 62, 62, 0.2)"
                            : "rgba(0, 0, 0, 0.08)",
                          transform: "scale(1.05)",
                        },
                        transition: "all 0.2s ease",
                        width: { xs: "48px", sm: "56px" },
                        height: { xs: "48px", sm: "56px" },
                      }}
                      size="large"
                    >
                      {likedUi ? (
                        <FavoriteIcon
                          sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
                        />
                      ) : (
                        <FavoriteBorderIcon
                          sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
                        />
                      )}
                    </IconButton>
                      );
                    })()}

                    {/* Stats Container */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: { xs: 1.5, sm: 2 },
                        flexWrap: "wrap",
                      }}
                    >
                      {/* View Count */}
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={0.5}
                        sx={{
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                          borderRadius: 1,
                          px: { xs: 1, sm: 1.5 },
                          py: { xs: 0.5, sm: 0.75 },
                          minWidth: { xs: "fit-content", sm: "auto" },
                        }}
                      >
                          sx={{
                            color: "text.secondary",
                            fontSize: { xs: "1rem", sm: "1.2rem" },
                          }}
                        />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            fontWeight: 500,
                          }}
                        >
                          {product.viewCount || 0}
                        </Typography>
                      </Box>

                      {/* Like Count */}
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={0.5}
                        sx={{
                          backgroundColor: "rgba(229, 62, 62, 0.1)",
                          borderRadius: 1,
                          px: { xs: 1, sm: 1.5 },
                          py: { xs: 0.5, sm: 0.75 },
                          minWidth: { xs: "fit-content", sm: "auto" },
                        }}
                      >
                        <FavoriteIcon
                          sx={{
                            color: "#e53e3e",
                            fontSize: { xs: "1rem", sm: "1.2rem" },
                          }}
                        />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            fontWeight: 500,
                          }}
                        >
                          {localLikeCount ?? product.likeCount ?? 0}
                        </Typography>
                      </Box>

                      {/* Average Rating */}
                      {product.averageRating > 0 && (
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={0.5}
                          sx={{
                            backgroundColor: "rgba(255, 193, 7, 0.1)",
                            borderRadius: 1,
                            px: { xs: 1, sm: 1.5 },
                            py: { xs: 0.5, sm: 0.75 },
                            minWidth: { xs: "fit-content", sm: "auto" },
                          }}
                        >
                          <StarIcon
                            sx={{
                              color: "#ffc107",
                              fontSize: { xs: "1rem", sm: "1.2rem" },
                            }}
                          />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              fontWeight: 500,
                            }}
                          >
                            {product.averageRating.toFixed(1)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Bottom Row - Review Button */}
                  {/* Review feature removed */}
                </Box>
              </Box>

              {/* Action Buttons */}
              {/* <Box sx={{ mt: 4 }}>
                {product.storeId && product.storeId._id && (
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate(`/stores/${product.storeId._id}`)}
                    sx={{ mr: 2 }}
                  >
                    {t("View Store")}
                  </Button>
                )}
                {product.brandId && product.brandId._id && (
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate(`/brands/${product.brandId._id}`)}
                    sx={{ mr: 2 }}
                  >
                    {t("View Brand")}
                  </Button>
                )}
                <Button variant="contained" size="large" sx={{ mr: 2 }}>
                  {t("Contact Seller")}
                </Button>
              </Box> */}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <Paper
          elevation={2}
          sx={{
            mt: { xs: 3, md: 4 },
            p: { xs: 2, sm: 3, md: 3 },
            borderRadius: 2,
            background:
              theme.palette.mode === "dark"
                ? "linear-gradient(135deg, #1E6FD9 0%, #4A90E2 100%)"
                : "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              mb: { xs: 2, md: 3 },
              fontWeight: 600,
              color: theme.palette.text.primary,
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.5rem" },
            }}
          >
            <ShoppingCartIcon
              sx={{
                fontSize: { xs: 20, sm: 24, md: 28 },
                color: "var(--brand-light-orange)",
              }}
            />
            {t("Related Products")}
          </Typography>

          {relatedLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                overflowX: "auto",
                gap: { xs: 1.5, sm: 2 },
                pb: 2,
                "&::-webkit-scrollbar": {
                  height: 8,
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#4a5568" : "#f1f1f1",
                  borderRadius: 4,
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "var(--brand-accent-orange)",
                  borderRadius: 4,
                  "&:hover": {
                    backgroundColor: "#45a049",
                  },
                },
              }}
            >
              {relatedProducts.map((relatedProduct) => (
                <Card
                  key={relatedProduct._id}
                  to={`/products/${relatedProduct._id}`}
                  sx={{
                    minWidth: { xs: "180px", sm: "220px", md: "250px" },
                    height: { xs: "250px", sm: "280px", md: "320px" },
                    textDecoration: "none",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: { xs: 2, sm: 3, md: 3 },
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
                    flexShrink: 0,
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow:
                        theme.palette.mode === "dark"
                          ? "0 8px 24px rgba(0,0,0,0.4)"
                          : "0 8px 24px rgba(0,0,0,0.15)",
                    },
                  }}
                >
                  {/* Product Image */}
                  <CardMedia
                    component="img"
                    image={resolveMediaUrl(relatedProduct.image)}
                    alt={locName(relatedProduct)}
                    sx={{
                      height: { xs: "120px", sm: "140px", md: "160px" },
                      objectFit: "contain",
                      borderTopLeftRadius: { xs: 8, sm: 12, md: 12 },
                      borderTopRightRadius: { xs: 8, sm: 12, md: 12 },
                    }}
                  />
                  <CardContent
                    sx={{
                      p: { xs: 1, sm: 1.5, md: 2 },
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{
                          fontSize: {
                            xs: "0.875rem",
                            sm: "1rem",
                            md: "1.125rem",
                          },
                          fontWeight: 600,
                          mb: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {locName(relatedProduct)}
                      </Typography>

                      {/* {relatedProduct.categoryTypeId && (
                        <Chip
                          label={getCategoryTypeName(
                            relatedProduct.categoryTypeId,
                            relatedProduct.categoryId,
                          )}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: { xs: "0.6rem", sm: "0.7rem" },
                            mb: 1,
                            borderColor: "var(--brand-accent-orange)",
                            color: "var(--brand-accent-orange)",
                            backgroundColor: "rgba(255, 122, 26, 0.05)",
                            height: { xs: "20px", sm: "24px" },
                          }}
                        />
                      )} */}

                      {relatedProduct.brandId &&
                        relatedProduct.brandId.statusAll !== "off" && (
                          <Box display="flex" alignItems="center" mb={0.5}>
                            <BusinessIcon
                              sx={{
                                fontSize: { xs: 12, sm: 14, md: 16 },
                                mr: 0.5,
                                color: "text.secondary",
                              }}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                color: "text.secondary",
                                fontSize: { xs: "0.7rem", sm: "0.75rem" },
                              }}
                            >
                              {locName(relatedProduct.brandId)}
                            </Typography>
                          </Box>
                        )}

                      {relatedProduct.storeId && (
                        <Box display="flex" alignItems="center" mb={1}>
                          <StorefrontIcon
                            sx={{
                              fontSize: { xs: 12, sm: 14, md: 16 },
                              mr: 0.5,
                              color: "text.secondary",
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                              fontSize: { xs: "0.7rem", sm: "0.75rem" },
                            }}
                          >
                            {locName(relatedProduct.storeId)}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Box>
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        mb={1}
                      >
                        <Box>
                          {relatedProduct.previousPrice &&
                          relatedProduct.previousPrice >
                            relatedProduct.newPrice ? (
                            <Typography
                              variant="body2"
                              sx={{
                                textDecoration: "line-through",
                                color: "red",
                                fontSize: { xs: "0.8rem", sm: "0.9rem" },
                                fontWeight: 500,
                              }}
                            >
                              {formatPrice(relatedProduct.previousPrice)}
                            </Typography>
                          ) : null}
                          <Typography
                            variant="h6"
                            sx={{
                              color: "var(--brand-light-orange)",
                              fontWeight: 700,
                              fontSize: {
                                xs: "1.1rem",
                                sm: "1.3rem",
                              },
                            }}
                          >
                            {formatPrice(relatedProduct.newPrice)}
                          </Typography>
                        </Box>
                        {(relatedProduct.previousPrice &&
                          relatedProduct.previousPrice >
                            relatedProduct.newPrice) ||
                        (relatedProduct.isDiscount &&
                          isDiscountValid(relatedProduct)) ? (
                          <Chip
                            icon={
                              <LocalOfferIcon
                                sx={{ fontSize: { xs: 12, sm: 14 } }}
                              />
                            }
                            label={
                              relatedProduct.previousPrice &&
                              relatedProduct.previousPrice >
                                relatedProduct.newPrice
                                ? `-${calculateDiscount(
                                    relatedProduct.previousPrice,
                                    relatedProduct.newPrice,
                                  )}%`
                                : t("Discount")
                            }
                            color="error"
                            size="small"
                            sx={{
                              fontSize: { xs: "0.6rem", sm: "0.7rem" },
                              height: { xs: "18px", sm: "20px" },
                            }}
                          />
                        ) : null}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Paper>
      )}

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
                state: { from: { pathname: `/products/${id}` } },
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
        open={Boolean(fullscreenImage)}
        onClose={() => setFullscreenImage(null)}
        imageUrl={fullscreenImage?.url}
        alt={fullscreenImage?.alt || ""}
      />
    </Box>
  );
};

export default ProductDetail;










