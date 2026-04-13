import React, { memo } from "react";
import { Box, Typography } from "@mui/material";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import ProductCard from "./ProductCard";
import { useLocalizedContent } from "../hooks/useLocalizedContent";

const FlashDealsSection = memo(function FlashDealsSection({
  products,
  onProductOpen,
  likeStates,
  isProductLiked,
  onLikeClick,
  likeLoading,
  formatPrice,
  storeById,
  getID,
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { locName } = useLocalizedContent();
  const isDark = theme.palette.mode === "dark";

  if (!products || products.length === 0) return null;

  return (
    <Box
      sx={{
        borderRadius: "20px",
        overflow: "hidden",
        background: isDark
          ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
          : "linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #fff 100%)",
        border: isDark
          ? "1px solid rgba(245,158,11,0.2)"
          : "1px solid rgba(245,158,11,0.25)",
        boxShadow: isDark
          ? "0 4px 20px rgba(0,0,0,0.4)"
          : "0 4px 20px rgba(245,158,11,0.12)",
        mb: { xs: 1.5, sm: 2 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, sm: 2.5 },
          py: { xs: 1.2, sm: 1.4 },
          borderBottom: isDark
            ? "1px solid rgba(245,158,11,0.15)"
            : "1px solid rgba(245,158,11,0.2)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 3px 8px rgba(245,158,11,0.4)",
            }}
          >
            <WhatshotIcon sx={{ fontSize: 18, color: "white" }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1rem", sm: "1.05rem" },
                color: isDark ? "rgba(255,255,255,0.95)" : "#92400e",
                lineHeight: 1.2,
              }}
            >
              {t("Most Viewed")}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isDark ? "rgba(255,255,255,0.5)" : "#b45309",
                display: "block",
                lineHeight: 1,
              }}
            >
              {t("Top products right now")}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            px: 1.2,
            py: 0.4,
            borderRadius: "20px",
            background: isDark
              ? "rgba(245,158,11,0.15)"
              : "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.72rem" }}
          >
            {products.length} {t("items")}
          </Typography>
        </Box>
      </Box>

      {/* Product scroll */}
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
        {products.map((product) => {
          const storeName =
            locName(product?.storeId) ||
            locName(storeById?.[String(getID?.(product?.storeId))]) ||
            "";
          return (
            <ProductCard
              key={`flash-${product._id}`}
              product={product}
              onOpen={onProductOpen}
              isLiked={
                likeStates?.[product._id] || isProductLiked?.(product._id)
              }
              onLike={onLikeClick}
              likeLoading={likeLoading?.[product._id]}
              formatPrice={formatPrice}
              storeName={storeName}
              compact
              t={t}
            />
          );
        })}
      </Box>
    </Box>
  );
});

export default FlashDealsSection;
