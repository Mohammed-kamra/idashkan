import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  CardMedia,
  Dialog,
  DialogContent,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CategoryIcon from "@mui/icons-material/Category";
import BusinessIcon from "@mui/icons-material/Business";
import StarIcon from "@mui/icons-material/Star";
import StorefrontIcon from "@mui/icons-material/Storefront";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useCityFilter } from "../context/CityFilterContext";
import { cityStringsMatch } from "../utils/cityMatch";
import {
  isExpiryStillValid,
  getExpiryRemainingInfo,
  formatExpiryChipLabel,
  expiryChipBg,
  formatExpiryDateDdMmYyyy,
} from "../utils/expiryDate";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { useUserTracking } from "../hooks/useUserTracking";
import { resolveMediaUrl } from "../utils/mediaUrl";
import FullScreenImageModal from "./FullScreenImageModal";

/**
 * Same product quick-view pattern as MainPage / BrandProfile / StoreProfile.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {object | null} props.product
 * @param {object[]} [props.candidateProducts] — pool used to build “related” (e.g. search results).
 * @param {(p: object) => void} [props.onProductChange] — when user picks a related product.
 */
const ProductDetailDialog = ({
  open,
  onClose,
  product,
  candidateProducts = [],
  onProductChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locName, locDescription } = useLocalizedContent();
  const { isAuthenticated } = useAuth();
  const { selectedCity } = useCityFilter();
  const { toggleLike, isProductLiked, recordView } = useUserTracking();

  const [productImageFullscreen, setProductImageFullscreen] = useState(null);
  const [likeCounts, setLikeCounts] = useState({});
  const [likeStates, setLikeStates] = useState({});
  const [likeLoading, setLikeLoading] = useState({});

  const lastRecordedId = useRef(null);

  const productMatchesSelectedCity = useCallback(
    (p) =>
      cityStringsMatch(
        selectedCity,
        p?.storeId?.storecity || p?.storeId?.city || "",
      ),
    [selectedCity],
  );

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

  const isDiscountValid = (p) => {
    if (!p.isDiscount) return false;
    if (!p.expireDate) return true;
    return isExpiryStillValid(p.expireDate);
  };

  useEffect(() => {
    if (open && product?._id && isAuthenticated) {
      if (lastRecordedId.current !== product._id) {
        lastRecordedId.current = product._id;
        recordView(product._id);
      }
    }
    if (!open) lastRecordedId.current = null;
  }, [open, product?._id, isAuthenticated, recordView]);

  useEffect(() => {
    if (!product?._id) return;
    setLikeCounts((prev) => {
      if (prev[product._id] !== undefined) return prev;
      return { ...prev, [product._id]: product.likeCount ?? 0 };
    });
    setLikeStates((prev) => {
      if (prev[product._id] !== undefined) return prev;
      return { ...prev, [product._id]: isProductLiked(product._id) };
    });
  }, [product?._id, product?.likeCount, isProductLiked]);

  const handleLikeClick = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (likeLoading[productId]) return;

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
        setLikeStates((prev) => ({ ...prev, [productId]: currentLikeState }));
        setLikeCounts((prev) => ({ ...prev, [productId]: currentLikeCount }));
      }
    } catch {
      setLikeStates((prev) => ({ ...prev, [productId]: currentLikeState }));
      setLikeCounts((prev) => ({ ...prev, [productId]: currentLikeCount }));
    } finally {
      setLikeLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleRelatedPick = (rel) => {
    if (onProductChange) onProductChange(rel);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <>
      <Dialog
        open={open && Boolean(product)}
        onClose={handleClose}
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
            onClick={handleClose}
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
          {product &&
            (() => {
              const isDark = theme.palette.mode === "dark";
              const pid = product._id;
              const liked = likeStates[pid] ?? isProductLiked(pid);
              const likeCount = likeCounts[pid] ?? product.likeCount ?? 0;
              const viewCount = product.viewCount ?? 0;
              const isLikeLoading = likeLoading[pid];
              const discountPct = calculateDiscount(
                product.previousPrice,
                product.newPrice,
              );
              const hasDiscount = isDiscountValid(product);
              const discountLabel =
                discountPct !== null ? `-${discountPct}%` : t("Discount");

              const categoryId =
                product.categoryId?._id || product.categoryId;
              const related = candidateProducts.filter(
                (p) =>
                  p._id !== pid &&
                  productMatchesSelectedCity(p) &&
                  (p.categoryId?._id || p.categoryId) === categoryId &&
                  isExpiryStillValid(p.expireDate || null) !== false &&
                  isDiscountValid(p),
              );

              return (
                <Box>
                  {product.image ? (
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
                          url: resolveMediaUrl(product.image),
                          alt: locName(product),
                        })
                      }
                    >
                      <CardMedia
                        component="img"
                        image={resolveMediaUrl(product.image)}
                        alt={locName(product)}
                        sx={{
                          maxHeight: 260,
                          objectFit: "contain",
                          width: "100%",
                        }}
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        height: 180,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.03)",
                      }}
                    >
                      <ShoppingCartIcon sx={{ fontSize: 64, opacity: 0.2 }} />
                    </Box>
                  )}

                  <Box
                    sx={{
                      px: 2.5,
                      py: 2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.25,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: "1.15rem",
                        lineHeight: 1.35,
                      }}
                    >
                      {locName(product)}
                    </Typography>

                    {locDescription(product) && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ lineHeight: 1.55 }}
                      >
                        {locDescription(product)}
                      </Typography>
                    )}

                    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                      {(product.companyId || product.brandId) &&
                        locName(product.companyId || product.brandId) && (
                          <Chip
                            icon={
                              <BusinessIcon
                                sx={{ fontSize: "0.9rem !important" }}
                              />
                            }
                            label={locName(
                              product.companyId || product.brandId,
                            )}
                            size="small"
                            onClick={() => {
                              const owner =
                                product.companyId || product.brandId;
                              handleClose();
                              navigate(
                                product.companyId
                                  ? `/companies/${owner._id}`
                                  : `/brands/${owner._id}`,
                              );
                            }}
                            sx={{
                              borderRadius: 99,
                              fontWeight: 600,
                              fontSize: "0.72rem",
                              cursor: "pointer",
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(30,111,217,0.08)",
                              color: "var(--color-primary,#1E6FD9)",
                            }}
                          />
                        )}
                      {product.storeId && locName(product.storeId) && (
                        <Chip
                          icon={
                            <StorefrontIcon
                              sx={{ fontSize: "0.9rem !important" }}
                            />
                          }
                          label={locName(product.storeId)}
                          size="small"
                          onClick={() => {
                            handleClose();
                            navigate(`/stores/${product.storeId._id}`);
                          }}
                          sx={{
                            borderRadius: 99,
                            fontWeight: 600,
                            fontSize: "0.72rem",
                            cursor: "pointer",
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(30,111,217,0.08)",
                            color: "var(--color-primary,#1E6FD9)",
                          }}
                        />
                      )}
                      {product.categoryId && (
                        <Chip
                          icon={
                            <CategoryIcon
                              sx={{ fontSize: "0.9rem !important" }}
                            />
                          }
                          label={
                            locName(product.categoryId) || t("Category")
                          }
                          size="small"
                          sx={{
                            borderRadius: 99,
                            fontWeight: 600,
                            fontSize: "0.72rem",
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(30,111,217,0.08)",
                            color: "var(--color-primary,#1E6FD9)",
                          }}
                        />
                      )}
                    </Box>

                    {product.expireDate &&
                      (() => {
                        const info = getExpiryRemainingInfo(product.expireDate);
                        const label = formatExpiryChipLabel(info, t);
                        const chipColor = expiryChipBg(info);
                        const dateStr = formatExpiryDateDdMmYyyy(
                          product.expireDate,
                        );
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
                            }}
                          >
                            <AccessTimeIcon
                              sx={{
                                fontSize: "1rem",
                                color: chipColor,
                                flexShrink: 0,
                              }}
                            />
                            <Box
                              sx={{ display: "flex", flexDirection: "column" }}
                            >
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
                                  : label || t("Expires")}
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

                    <Box
                      sx={{
                        mt: 0.5,
                        p: 1.75,
                        borderRadius: 3,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.025)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.25,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {t("Price")}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        {hasDiscount &&
                          product.previousPrice &&
                          Number(product.previousPrice) >
                            Number(product.newPrice) && (
                            <Typography
                              sx={{
                                textDecoration: "line-through",
                                color: "text.disabled",
                                fontSize: "0.9rem",
                              }}
                            >
                              {formatPrice(product.previousPrice)}
                            </Typography>
                          )}
                        <Typography
                          sx={{
                            fontWeight: 900,
                            fontSize: "1.65rem",
                            color: "var(--color-secondary,#0d47a1)",
                            lineHeight: 1,
                          }}
                        >
                          {formatPrice(product.newPrice)}
                        </Typography>
                        {hasDiscount && (
                          <Chip
                            label={discountLabel}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              backgroundColor: "#e53e3e",
                              color: "#fff",
                              borderRadius: 99,
                            }}
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
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.025)",
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
                          backgroundColor: liked
                            ? "rgba(229,62,62,0.12)"
                            : "transparent",
                          "&:active": { transform: "scale(0.93)" },
                        }}
                        onClick={(e) =>
                          !isLikeLoading && handleLikeClick(pid, e)
                        }
                      >
                        {liked ? (
                          <FavoriteIcon
                            sx={{
                              fontSize: "1.2rem",
                              color: "#e53e3e",
                              transform: "scale(1.15)",
                              transition: "transform 0.15s",
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

                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
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

                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
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

                      {product.averageRating > 0 && (
                        <>
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
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <StarIcon
                              sx={{ fontSize: "1rem", color: "#ffc107" }}
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
                              {product.averageRating.toFixed(1)}
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Box>

                    {related.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Box
                          sx={{
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRelatedPick(rel);
                                }}
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
                                  "&:active": { transform: "scale(0.95)" },
                                }}
                              >
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
    </>
  );
};

export default ProductDetailDialog;
