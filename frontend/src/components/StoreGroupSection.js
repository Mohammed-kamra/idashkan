import React, { memo, useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Button,
  Card,
  CardContent,
} from "@mui/material";
import { Link } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import BusinessIcon from "@mui/icons-material/Business";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonAddDisabledIcon from "@mui/icons-material/PersonAddDisabled";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import ProductCard from "./ProductCard";
import { isAndroidPerformanceMode } from "../utils/androidPerformance";

const PRODUCT_CHUNK = 8;

const showMoreCardSx = (isDark, isAndroidPerfMode) => ({
  flexShrink: 0,
  width: { xs: 148, sm: 190, md: 240 },
  minWidth: { xs: 148, sm: 190, md: 240 },
  borderRadius: "16px",
  textDecoration: "none",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  background: isDark
    ? "linear-gradient(145deg, rgba(30,111,217,0.2), rgba(30,111,217,0.08))"
    : "linear-gradient(145deg, #eff6ff, #ffffff)",
  border: isDark
    ? "1px dashed rgba(74,144,226,0.45)"
    : "1px dashed rgba(30,111,217,0.35)",
  boxShadow: "none",
  transition: isAndroidPerfMode ? "none" : "transform 0.2s ease, box-shadow 0.2s ease",
  "&:hover": {
    transform: isAndroidPerfMode ? "none" : "translateY(-2px)",
    boxShadow: isDark
      ? isAndroidPerfMode
        ? "none"
        : "0 8px 24px rgba(0,0,0,0.35)"
      : isAndroidPerfMode
        ? "none"
        : "0 8px 24px rgba(30,111,217,0.15)",
  },
});

const StoreGroupSection = memo(function StoreGroupSection({
  store,
  products,
  onProductOpen,
  isStoreFollowed,
  onFollowClick,
  followLoading,
  likeStates,
  isProductLiked,
  onLikeClick,
  likeLoading,
  formatPrice,
  productLayout = "row",
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { locName, locAddress } = useLocalizedContent();
  const isDark = theme.palette.mode === "dark";
  const isAndroidPerfMode = isAndroidPerformanceMode();
  const isRtl = i18n.language === "ar" || i18n.language === "ku";

  const [visibleCount, setVisibleCount] = useState(PRODUCT_CHUNK);

  useEffect(() => {
    setVisibleCount(PRODUCT_CHUNK);
  }, [store._id, products.length]);

  const followed = isStoreFollowed(store._id);
  const discountedCount = products.filter(
    (p) =>
      p.isDiscount ||
      (p.previousPrice && p.newPrice && p.previousPrice > p.newPrice),
  ).length;

  const visibleProducts = products.slice(0, visibleCount);
  const remainingInStore = Math.max(0, products.length - visibleCount);
  const hasMoreOnStore = remainingInStore > 0;
  const nextBatchSize = Math.min(PRODUCT_CHUNK, remainingInStore);

  const loadMoreProducts = useCallback(() => {
    setVisibleCount((c) =>
      Math.min(c + PRODUCT_CHUNK, products.length),
    );
  }, [products.length]);

  const showMoreCard = (
    <Card
      component="button"
      type="button"
      onClick={loadMoreProducts}
      elevation={0}
      aria-label={t("See more")}
      sx={{
        ...showMoreCardSx(isDark, isAndroidPerfMode),
        border: "none",
        font: "inherit",
        color: "inherit",
        ...(productLayout === "grid2" && visibleProducts.length >= 3
          ? {
              gridRow: "span 2",
              width: { xs: 148, sm: 182, md: 220 },
              minWidth: { xs: 148, sm: 182, md: 220 },
              minHeight: { xs: 306, sm: 374 },
            }
          : {}),
      }}
    >
      <CardContent
        sx={{
          py: 2,
          px: 1.25,
          textAlign: "center",
          "&:last-child": { pb: 2 },
        }}
      >
        {isRtl ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        <Typography
          variant="subtitle2"
          fontWeight={800}
          sx={{
            color: isDark ? "rgba(255,255,255,0.92)" : "primary.dark",
            lineHeight: 1.25,
          }}
        >
          {t("See more")}
        </Typography>
        <Typography
          variant="caption"
          display="block"
          sx={{ mt: 0.75, color: "text.secondary", fontWeight: 600 }}
        >
          {hasMoreOnStore
            ? t("storeGroupLoadNextBatch", { count: nextBatchSize })
            : ""}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box
      sx={{
        borderRadius: "20px",
        overflow: "hidden",
        background: isDark
          ? "linear-gradient(145deg, #1a2236 0%, #1e2a40 100%)"
          : "#ffffff",
        border: isDark
          ? "1px solid rgba(255,255,255,0.07)"
          : "1px solid #eef0f4",
        boxShadow: isDark
          ? isAndroidPerfMode
            ? "0 1px 8px rgba(0,0,0,0.26)"
            : "0 4px 20px rgba(0,0,0,0.35)"
          : isAndroidPerfMode
            ? "0 1px 8px rgba(0,0,0,0.06)"
            : "0 2px 16px rgba(0,0,0,0.06)",
        mb: { xs: 1.5, sm: 2 },
        transition: isAndroidPerfMode ? "none" : "box-shadow 0.25s ease",
        "&:hover": {
          boxShadow: isDark
            ? isAndroidPerfMode
              ? "0 1px 8px rgba(0,0,0,0.26)"
              : "0 8px 32px rgba(0,0,0,0.5)"
            : isAndroidPerfMode
              ? "0 1px 8px rgba(0,0,0,0.06)"
              : "0 6px 28px rgba(30,111,217,0.1)",
        },
      }}
    >
      {/* Store header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.5, sm: 2 },
          p: { xs: "12px 14px", sm: "14px 20px" },
          background: isDark
            ? "linear-gradient(135deg, rgba(30,111,217,0.25) 0%, rgba(74,144,226,0.15) 100%)"
            : "linear-gradient(135deg, #1E6FD9 0%, #4A90E2 100%)",
          position: "relative",
          overflow: "hidden",
          "&::after": isAndroidPerfMode
            ? undefined
            : {
            content: '""',
            position: "absolute",
            top: "-30%",
            right: "-5%",
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            pointerEvents: "none",
            },
        }}
      >
        {/* Logo */}
        <Link
          to={`/stores/${store._id}`}
          style={{ textDecoration: "none", flexShrink: 0 }}
        >
          <Avatar
            src={store.logo ? resolveMediaUrl(store.logo) : undefined}
            alt={locName(store)}
            slotProps={{
              img: {
                loading: "lazy",
                decoding: "async",
              },
            }}
            sx={{
              width: { xs: 52, sm: 64 },
              height: { xs: 52, sm: 64 },
              borderRadius: "14px",
              border: "2.5px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.15)",
              backdropFilter: isAndroidPerfMode ? "none" : "blur(10px)",
              boxShadow: isAndroidPerfMode ? "none" : "0 4px 12px rgba(0,0,0,0.2)",
              transition: isAndroidPerfMode ? "none" : "transform 0.2s ease",
              "&:hover": { transform: isAndroidPerfMode ? "none" : "scale(1.06)" },
            }}
          >
            {!store.logo && (
              <BusinessIcon
                sx={{
                  fontSize: { xs: 26, sm: 32 },
                  color: "rgba(255,255,255,0.8)",
                }}
              />
            )}
          </Avatar>
        </Link>

        {/* Store info */}
        <Box sx={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              flexWrap: "wrap",
            }}
          >
            <Typography
              component={Link}
              to={`/stores/${store._id}`}
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1rem", sm: "1.1rem" },
                color: "white",
                textDecoration: "none",
                textShadow: "0 1px 3px rgba(0,0,0,0.25)",
                lineHeight: 1.2,
                "&:hover": { opacity: 0.9 },
              }}
            >
              {locName(store)}
            </Typography>

            {store.isVip && (
              <WorkspacePremiumIcon
                sx={{
                  fontSize: 18,
                  color: "#fbbf24",
                  filter: isAndroidPerfMode
                    ? "none"
                    : "drop-shadow(0 1px 3px rgba(251,191,36,0.6))",
                }}
              />
            )}

            <IconButton
              onClick={(e) => onFollowClick(store._id, e)}
              disabled={followLoading}
              size="small"
              sx={{
                width: 28,
                height: 28,
                color: "white",
                bgcolor: followed
                  ? "rgba(34,197,94,0.8)"
                  : "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.25)",
                backdropFilter: isAndroidPerfMode ? "none" : "blur(4px)",
                transition: isAndroidPerfMode ? "none" : "all 0.2s ease",
                "&:hover": {
                  bgcolor: followed
                    ? "rgba(34,197,94,1)"
                    : "rgba(255,255,255,0.3)",
                  transform: isAndroidPerfMode ? "none" : "scale(1.1)",
                },
                p: 0,
              }}
              title={followed ? t("Unfollow") : t("Follow")}
            >
              {followed ? (
                <PersonAddDisabledIcon sx={{ fontSize: "0.9rem" }} />
              ) : (
                <PersonAddIcon sx={{ fontSize: "0.9rem" }} />
              )}
            </IconButton>
          </Box>

          {locAddress(store) && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "rgba(255,255,255,0.75)",
                mt: 0.3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: { xs: 300, sm: 350, md: 600 },
                fontSize: "0.72rem",
              }}
            >
              {locAddress(store)}
            </Typography>
          )}

          <Box
            sx={{
              display: "flex",
              gap: 0.8,
              mt: 0.8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {discountedCount > 0 && (
              <Chip
                label={`${discountedCount} ${t("Discounted Products")}`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  bgcolor: "rgba(255,255,255,0.18)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.2)",
                  backdropFilter: isAndroidPerfMode ? "none" : "blur(4px)",
                  "& .MuiChip-label": { px: 0.8 },
                }}
              />
            )}
            {store.isHasDelivery && (
              <Chip
                icon={
                  <LocalShippingIcon
                    sx={{
                      fontSize: "0.8rem !important",
                      color: "white !important",
                    }}
                  />
                }
                label={t("Delivery")}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  bgcolor: "rgba(239,68,68,0.7)",
                  color: "white",
                  border: "none",
                  "& .MuiChip-label": { px: 0.6 },
                }}
              />
            )}
            <Button
              component={Link}
              to={`/stores/${store._id}`}
              size="small"
              endIcon={<OpenInNewIcon sx={{ fontSize: "0.7rem !important" }} />}
              sx={{
                textTransform: "none",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "rgba(255,255,255,0.85)",
                bgcolor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                px: 1,
                py: 0.2,
                minHeight: 0,
                lineHeight: 1.5,
                backdropFilter: isAndroidPerfMode ? "none" : "blur(4px)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
              }}
            >
              {t("View Store")}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Products — single row or 2-row grid */}
      {products.length > 0 ? (
        productLayout === "grid2" && visibleProducts.length >= 3 ? (
          /* ── 2-row horizontal grid ── */
          <Box
            sx={{
              px: { xs: 1, sm: 1.5 },
              py: { xs: 1.2, sm: 1.5 },
              display: "grid",
              gridTemplateRows: "1fr 1fr",
              gridAutoFlow: "column",
              gridAutoColumns: { xs: "148px", sm: "182px", md: "220px" },
              gap: { xs: "8px", sm: "10px" },
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
            {visibleProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onOpen={onProductOpen}
                isLiked={likeStates[product._id] || isProductLiked(product._id)}
                onLike={onLikeClick}
                likeLoading={likeLoading[product._id]}
                formatPrice={formatPrice}
                t={t}
              />
            ))}
            {hasMoreOnStore ? showMoreCard : null}
          </Box>
        ) : (
          /* ── single row horizontal scroll ── */
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
            {visibleProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onOpen={onProductOpen}
                isLiked={likeStates[product._id] || isProductLiked(product._id)}
                onLike={onLikeClick}
                likeLoading={likeLoading[product._id]}
                formatPrice={formatPrice}
                t={t}
              />
            ))}
            {hasMoreOnStore ? showMoreCard : null}
          </Box>
        )
      ) : (
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t("No products available")}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

export default StoreGroupSection;
