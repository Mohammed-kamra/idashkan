import React, { memo } from "react";
import { Box, Typography, Avatar, Button } from "@mui/material";
import { Link } from "react-router-dom";
import DiamondIcon from "@mui/icons-material/Diamond";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useTheme } from "@mui/material/styles";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";

const CompanyShowcase = memo(function CompanyShowcase({ companies }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { locName } = useLocalizedContent();
  const isDark = theme.palette.mode === "dark";
  const isRtl = i18n.dir() === "rtl";

  if (!companies || companies.length === 0) return null;

  const vipCompanies = companies.filter((c) => Boolean(c?.isVip));
  const displayCompanies = vipCompanies.length > 0 ? vipCompanies : companies;
  const isVipMode = vipCompanies.length > 0;

  const slideCount = displayCompanies.length;
  const clamp = (max) => Math.max(1, Math.min(max, slideCount));
  const desktopShow = clamp(6);

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
      { breakpoint: 1024, settings: { slidesToShow: clamp(5) } },
      { breakpoint: 768, settings: { slidesToShow: clamp(4) } },
      { breakpoint: 600, settings: { slidesToShow: clamp(3) } },
      { breakpoint: 400, settings: { slidesToShow: clamp(2) } },
    ],
  };

  return (
    <Box
      sx={{
        borderRadius: "20px",
        overflow: "hidden",
        background: isDark
          ? "linear-gradient(145deg, #1a2236 0%, #1c2640 100%)"
          : "#ffffff",
        border: isDark
          ? "1px solid rgba(255,255,255,0.07)"
          : "1px solid #eef0f4",
        boxShadow: isDark
          ? "0 4px 20px rgba(0,0,0,0.35)"
          : "0 2px 16px rgba(0,0,0,0.06)",
        my: { xs: 1.5, sm: 2 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, sm: 2.5 },
          py: { xs: 1.2, sm: 1.4 },
          borderBottom: isDark
            ? "1px solid rgba(255,255,255,0.07)"
            : "1px solid #f3f4f6",
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
                : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isVipMode
                ? "0 3px 8px rgba(245,158,11,0.4)"
                : "0 3px 8px rgba(99,102,241,0.4)",
            }}
          >
            <DiamondIcon sx={{ fontSize: 16, color: "white" }} />
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
              {t(isVipMode ? "VIP Companies" : "Featured Companies")}
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
                {t("Premium Partners")}
              </Typography>
            )}
          </Box>
        </Box>

        <Button
          component={Link}
          to="/companies"
          size="small"
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.8rem",
            color: "var(--color-primary, #1E6FD9)",
            px: 1,
            py: 0.5,
            borderRadius: 2,
            "&:hover": {
              background: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(30,111,217,0.06)",
            },
          }}
        >
          {t("See All")}
        </Button>
      </Box>

      <Box sx={{ px: { xs: 1, sm: 1.5 }, py: { xs: 1.5, sm: 2 } }}>
        <Slider {...settings}>
          {displayCompanies.map((company) => (
            <Box
              key={company._id}
              component={Link}
              to={`/companies/${company._id}`}
              sx={{
                textAlign: "center",
                textDecoration: "none",
                outline: "none",
                px: 0.5,
                "&:hover .company-avatar": {
                  transform: "scale(1.1)",
                  boxShadow: isVipMode
                    ? "0 0 16px rgba(245,158,11,0.5)"
                    : `0 0 16px ${theme.palette.primary.main}40`,
                },
              }}
            >
              <Avatar
                src={resolveMediaUrl(company.logo)}
                alt={locName(company)}
                className="company-avatar"
                sx={{
                  width: { xs: 64, sm: 72, md: 80 },
                  height: { xs: 64, sm: 72, md: 80 },
                  m: "0 auto 6px",
                  bgcolor: isDark ? "rgba(255,255,255,0.08)" : "#f9fafb",
                  border: isDark
                    ? "2px solid rgba(255,255,255,0.1)"
                    : "2px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  borderRadius: "16px",
                }}
              />
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
                {locName(company)}
              </Typography>
            </Box>
          ))}
        </Slider>
      </Box>
    </Box>
  );
});

export default CompanyShowcase;
