import React, { memo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { useTheme } from "@mui/material/styles";
import {
  getExpiryRemainingInfo,
  formatExpiryChipLabel,
  shouldShowExpiryChip,
  expiryChipBg,
} from "../utils/expiryDate";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import AppImage from "./AppImage";
import { isAndroidPerformanceMode } from "../utils/androidPerformance";

const ProductCard = memo(function ProductCard({
  product,
  onOpen,
  isLiked,
  onLike,
  likeLoading,
  formatPrice,
  storeName,
  compact = false,
  t,
}) {
  const theme = useTheme();
  const { locName } = useLocalizedContent();
  const isDark = theme.palette.mode === "dark";
  const isAndroidPerfMode = isAndroidPerformanceMode();

  const hasPreviousPrice =
    product.previousPrice &&
    product.newPrice &&
    product.previousPrice > product.newPrice;

  const discount = hasPreviousPrice
    ? Math.round(
        ((product.previousPrice - product.newPrice) / product.previousPrice) *
          100,
      )
    : 0;

  const showDiscountBadge =
    hasPreviousPrice || Boolean(product.isDiscount);

  const expiryInfo = getExpiryRemainingInfo(product.expireDate);
  const showExpiry = shouldShowExpiryChip(expiryInfo);

  const cardWidth = compact
    ? { xs: 140, sm: 170, md: 190 }
    : { xs: 148, sm: 190, md: 240 };
  const imgHeight = compact
    ? { xs: 100, sm: 120 }
    : { xs: 150, sm: 180, md: 200 };

  return (
    <Card
      sx={{
        cursor: "pointer",
        width: cardWidth,
        minWidth: cardWidth,
        flexShrink: 0,
        borderRadius: "16px",
        overflow: "hidden",
        background: isDark
          ? "linear-gradient(145deg, #1e2a3a, #243040)"
          : "#ffffff",
        border: isDark
          ? "1px solid rgba(255,255,255,0.07)"
          : "1px solid #f0f2f5",
        boxShadow: isDark
          ? isAndroidPerfMode
            ? "0 1px 6px rgba(0,0,0,0.24)"
            : "0 4px 16px rgba(0,0,0,0.3)"
          : isAndroidPerfMode
            ? "0 1px 6px rgba(0,0,0,0.05)"
            : "0 2px 12px rgba(0,0,0,0.06)",
        transition: isAndroidPerfMode
          ? "none"
          : "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          transform: isAndroidPerfMode ? "none" : "translateY(-3px)",
          boxShadow: isDark
            ? isAndroidPerfMode
              ? "0 1px 6px rgba(0,0,0,0.24)"
              : "0 8px 28px rgba(0,0,0,0.45)"
            : isAndroidPerfMode
              ? "0 1px 6px rgba(0,0,0,0.05)"
              : "0 8px 28px rgba(30,111,217,0.14)",
          borderColor: isDark ? "rgba(255,255,255,0.14)" : "#dce8ff",
        },
        "&:active": { transform: "none" },
      }}
    >
      {/* Image area */}
      <Box
        onClick={() => onOpen && onOpen(product)}
        sx={{
          position: "relative",
          height: imgHeight,
          flexShrink: 0,
          background: isDark ? "rgba(255,255,255,0.04)" : "#f8f9fb",
          overflow: "hidden",
        }}
      >
        {product.image ? (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              "& img, & picture": {
                width: "100%",
                height: "100%",
                objectFit: "contain",
                transition: isAndroidPerfMode ? "none" : "transform 0.35s ease",
              },
              ".MuiCard-root:hover & img, .MuiCard-root:hover & picture": {
                transform: isAndroidPerfMode ? "none" : "scale(1.04)",
              },
            }}
          >
            <AppImage
              src={resolveMediaUrl(product.image)}
              webpSrc={
                product.imageUrls?.thumb
                  ? resolveMediaUrl(product.imageUrls.thumb)
                  : undefined
              }
              alt={locName(product) || ""}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 600px) 40vw, 200px"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
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

        {/* Top overlay row: discount badge left, like button right */}
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            right: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          {showDiscountBadge ? (
            <Chip
              icon={<LocalOfferIcon sx={{ fontSize: "11px !important" }} />}
              label={hasPreviousPrice ? `-${discount}%` : t("Discount")}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.68rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "white",
                border: "none",
                boxShadow: isAndroidPerfMode
                  ? "none"
                  : "0 2px 6px rgba(239,68,68,0.4)",
                "& .MuiChip-label": { px: 0.7 },
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
            onClick={(e) => {
              e.stopPropagation();
              onLike && onLike(product._id, e);
            }}
            disabled={likeLoading}
            size="small"
            sx={{
              width: 28,
              height: 28,
              bgcolor: "rgba(255,255,255,0.92)",
              backdropFilter: isAndroidPerfMode ? "none" : "blur(4px)",
              color: isLiked ? "#ef4444" : "#9ca3af",
              boxShadow: isAndroidPerfMode ? "none" : "0 2px 8px rgba(0,0,0,0.12)",
              transition: isAndroidPerfMode ? "none" : "all 0.2s ease",
              "&:hover": {
                bgcolor: "white",
                color: "#ef4444",
                transform: isAndroidPerfMode ? "none" : "scale(1.15)",
              },
              "&:active": { transform: "none" },
              p: 0,
            }}
          >
            {isLiked ? (
              <FavoriteIcon sx={{ fontSize: "0.95rem" }} />
            ) : (
              <FavoriteBorderIcon sx={{ fontSize: "0.95rem" }} />
            )}
          </IconButton>
        </Box>

        {/* Expiry chip bottom-left */}
        {showExpiry && (
          <Chip
            label={formatExpiryChipLabel(expiryInfo, t)}
            size="small"
            sx={{
              position: "absolute",
              bottom: 7,
              left: 7,
              maxWidth: "calc(100% - 14px)",
              backgroundColor: expiryChipBg(expiryInfo),
              color: "white",
              fontWeight: 700,
              fontSize: "0.62rem",
              height: 20,
              "& .MuiChip-label": {
                px: 0.6,
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
          />
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
        {storeName && (
          <Typography
            variant="caption"
            sx={{
              color: isDark
                ? "rgba(240, 16, 16, 0.92)"
                : "var(--brand-primary-blue, #1E6FD9)",
              fontWeight: 600,
              display: "block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: "0.68rem",
              lineHeight: 1.2,
            }}
          >
            {storeName}
          </Typography>
        )}

        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: compact ? "0.78rem" : { xs: "0.8rem", sm: "0.88rem" },
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            color: isDark ? "rgba(255,255,255,0.92)" : "#111827",
            minHeight: "2.7em",
          }}
        >
          {locName(product)}
        </Typography>

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
              fontSize: compact ? "0.9rem" : { xs: "0.95rem", sm: "1rem" },
              color: "var(--color-secondary, #1E6FD9)",
              lineHeight: 1.2,
            }}
          >
            {formatPrice(product.newPrice)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
});

export default ProductCard;
