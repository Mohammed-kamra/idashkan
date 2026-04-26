import React, { memo } from "react";
import { Box, Typography, Avatar, Button } from "@mui/material";
import { Link } from "react-router-dom";
import StorefrontIcon from "@mui/icons-material/Storefront";
import BusinessIcon from "@mui/icons-material/Business";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { useTheme } from "@mui/material/styles";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";

const StoreShowcase = memo(function StoreShowcase({ stores }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { locName } = useLocalizedContent();
  const isDark = theme.palette.mode === "dark";

  if (!stores || stores.length === 0) return null;

  const vipStores = stores.filter((s) => Boolean(s?.isVip));
  const displayStores = vipStores.length > 0 ? vipStores : stores;
  const isVipMode = vipStores.length > 0;

  const slideCount = displayStores.length;
  const clamp = (max) => Math.max(1, Math.min(max, slideCount));
  const desktopShow = clamp(5);

  const settings = {
    dots: false,
    infinite: slideCount > desktopShow,
    speed: 4500,
    autoplay: slideCount > desktopShow,
    autoplaySpeed: 800,
    cssEase: "linear",
    slidesToShow: desktopShow,
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: clamp(4) } },
      { breakpoint: 600, settings: { slidesToShow: clamp(3) } },
      { breakpoint: 480, settings: { slidesToShow: clamp(2) } },
    ],
  };

  return (
    <Box
      sx={{
        borderRadius: "20px",
        overflow: "hidden",
        background: isDark
          ? "linear-gradient(145deg, #0f1f3d 0%, #162035 100%)"
          : "linear-gradient(145deg, #f0f7ff 0%, #ffffff 100%)",
        border: isDark
          ? "1px solid rgba(30,111,217,0.25)"
          : "1px solid #dbeafe",
        boxShadow: isDark
          ? "0 4px 20px rgba(0,0,0,0.4)"
          : "0 4px 20px rgba(30,111,217,0.08)",
        my: { xs: 1.5, sm: 2 },
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
            ? "1px solid rgba(30,111,217,0.2)"
            : "1px solid #dbeafe",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "10px",
              background: isVipMode
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "linear-gradient(135deg, #1E6FD9 0%, #4A90E2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isVipMode
                ? "0 3px 8px rgba(245,158,11,0.4)"
                : "0 3px 8px rgba(30,111,217,0.4)",
            }}
          >
            {isVipMode ? (
              <WorkspacePremiumIcon sx={{ fontSize: 16, color: "white" }} />
            ) : (
              <StorefrontIcon sx={{ fontSize: 16, color: "white" }} />
            )}
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "0.95rem", sm: "1.05rem" },
                color: isDark ? "rgba(255,255,255,0.95)" : "#111827",
                lineHeight: 1.2,
              }}
            >
              {t(isVipMode ? "VIP Stores" : "Featured Stores")}
            </Typography>
            {isVipMode && (
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? "rgba(245,158,11,0.8)" : "#b45309",
                  display: "block",
                  lineHeight: 1,
                  fontSize: "0.68rem",
                }}
              >
                {t("Exclusive Partners")}
              </Typography>
            )}
          </Box>
        </Box>

        <Button
          component={Link}
          to="/stores"
          size="small"
          endIcon={
            <ArrowForwardIosIcon
              sx={{ fontSize: "0.6rem !important", transform: "rotate(180deg)" }}
            />
          }
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.8rem",
            color: "var(--color-primary, #1E6FD9)",
            px: 1,
            py: 0.5,
            borderRadius: 2,
            "&:hover": {
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(30,111,217,0.06)",
            },
          }}
        >
          {t("See All")}
        </Button>
      </Box>

      {/* Carousel */}
      <Box sx={{ px: { xs: 1, sm: 1.5 }, py: { xs: 1.5, sm: 2 } }}>
        <Slider {...settings}>
          {displayStores.map((store) => (
            <Box
              key={store._id}
              component={Link}
              to={`/stores/${store._id}`}
              sx={{
                textAlign: "center",
                textDecoration: "none",
                outline: "none",
                px: 0.5,
                "&:hover .store-avatar": {
                  transform: "scale(1.1)",
                  boxShadow: isVipMode
                    ? "0 0 16px rgba(245,158,11,0.5)"
                    : `0 0 16px ${theme.palette.primary.main}40`,
                },
              }}
            >
              <Avatar
                src={store.logo ? resolveMediaUrl(store.logo) : undefined}
                alt={locName(store)}
                className="store-avatar"
                sx={{
                  width: { xs: 64, sm: 72, md: 80 },
                  height: { xs: 64, sm: 72, md: 80 },
                  m: "0 auto 6px",
                  bgcolor: isDark ? "rgba(30,111,217,0.15)" : "#eff6ff",
                  border: isDark
                    ? "2px solid rgba(30,111,217,0.3)"
                    : "2px solid #bfdbfe",
                  boxShadow: "0 2px 8px rgba(30,111,217,0.1)",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  borderRadius: "16px",
                }}
              >
                {!store.logo && (
                  <BusinessIcon
                    sx={{
                      fontSize: { xs: 28, sm: 32 },
                      color: isDark ? "rgba(30,111,217,0.7)" : "#3b82f6",
                    }}
                  />
                )}
              </Avatar>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  fontWeight: 600,
                  fontSize: "0.68rem",
                  color: isDark ? "rgba(255,255,255,0.6)" : "#6b7280",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  px: 0.5,
                  lineHeight: 1.3,
                }}
              >
                {locName(store)}
              </Typography>
            </Box>
          ))}
        </Slider>
      </Box>
    </Box>
  );
});

export default StoreShowcase;
