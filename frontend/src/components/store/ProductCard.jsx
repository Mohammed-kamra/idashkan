import React, { memo } from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Fade,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import EditIcon from "@mui/icons-material/Edit";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ProductViewTracker from "../ProductViewTracker";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import {
  expiryChipBg,
  formatExpiryChipLabel,
  getExpiryRemainingInfo,
  shouldShowExpiryChip,
} from "../../utils/expiryDate";

const ProductCard = memo(function ProductCard({
  product,
  index,
  layoutMode = "row",
  showPriceMode = true,
  theme,
  t,
  locName,
  parseProductPrice,
  calculateDiscount,
  likeStates,
  likeLoading,
  isProductLiked,
  handleLikeClick,
  profileAdminEdit,
  setAdminEditProduct,
  setSelectedProduct,
  setProductDialogOpen,
  storeHasDelivery,
  addToCart,
  formatPrice,
  handleProductBecameVisible,
  productViewRecordedRef,
}) {
  const isGrid = layoutMode === "grid2";
  const prevNum = parseProductPrice(product.previousPrice);
  const newNum = parseProductPrice(product.newPrice);
  const showPriceBlock =
    showPriceMode === false
      ? false
      : showPriceMode === "ifPresent"
        ? prevNum != null || newNum != null
        : true;
  const discount = calculateDiscount(product.previousPrice, product.newPrice);
  const hasPreviousPrice = prevNum != null && newNum != null && prevNum > newNum;
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
            ...(isGrid
              ? {
                  width: "100%",
                  minWidth: 0,
                  maxWidth: "100%",
                  flexShrink: 1,
                }
              : {
                  width: { xs: 155, sm: 190, md: 230 },
                  minWidth: { xs: 155, sm: 190, md: 230 },
                  maxWidth: { xs: 155, sm: 190, md: 230 },
                  flexShrink: 0,
                }),
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            cursor: "pointer",
            background: isDark ? "linear-gradient(145deg, #1e2a3a, #243040)" : "#ffffff",
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
                  icon={<LocalOfferIcon sx={{ fontSize: "11px !important" }} />}
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
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
                {profileAdminEdit ? (
                  <Tooltip title={t("Edit Product")}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAdminEditProduct(product);
                      }}
                      sx={{
                        width: 35,
                        height: 35,
                        bgcolor: "rgba(255,255,255,0.92)",
                        backdropFilter: "blur(8px)",
                        color: "var(--brand-primary-blue, #1E6FD9)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                        transition: "all 0.2s ease",
                        p: 0,
                        "&:hover": {
                          bgcolor: "white",
                          transform: "scale(1.15)",
                        },
                      }}
                    >
                      <EditIcon sx={{ fontSize: "1.2rem" }} />
                    </IconButton>
                  </Tooltip>
                ) : null}
                <IconButton
                  size="small"
                  onClick={(e) => handleLikeClick(product._id, e)}
                  disabled={likeLoading[product._id]}
                  sx={{
                    width: 35,
                    height: 35,
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
                    <FavoriteIcon sx={{ fontSize: "1.2rem" }} />
                  ) : (
                    <FavoriteBorderIcon sx={{ fontSize: "1.2rem" }} />
                  )}
                </IconButton>
              </Box>
            </Box>
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

            {showPriceBlock && (
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
                    {formatPrice(prevNum)}
                  </Typography>
                )}
                {newNum != null && (
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: "0.9rem", sm: "0.95rem" },
                      color: "var(--color-secondary, #1E6FD9)",
                      lineHeight: 1.2,
                    }}
                  >
                    {formatPrice(newNum)}
                  </Typography>
                )}
                {newNum == null && prevNum != null && !hasPreviousPrice && (
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: "0.9rem", sm: "0.95rem" },
                      color: "var(--color-secondary, #1E6FD9)",
                      lineHeight: 1.2,
                    }}
                  >
                    {formatPrice(prevNum)}
                  </Typography>
                )}
              </Box>
            )}

            {storeHasDelivery && (
              <Box sx={{ mt: 0.5 }}>
                <IconButton
                  onClick={(e) => addToCart(product, e)}
                  size="small"
                  sx={{
                    width: 32,
                    height: 32,
                    p: 0,
                    bgcolor: "linear-gradient(135deg, #f59e0b, #d97706)",
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
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
});

export default ProductCard;

