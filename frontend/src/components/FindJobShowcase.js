import React, { memo } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
} from "@mui/material";
import { Link } from "react-router-dom";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import BusinessIcon from "@mui/icons-material/Business";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { useTheme } from "@mui/material/styles";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";

const genderLabel = (t, g) => {
  const v = String(g || "any").toLowerCase();
  if (v === "male") return t("Male");
  if (v === "female") return t("Female");
  return t("Any");
};

const FindJobShowcase = memo(function FindJobShowcase({ jobs }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { locName, locTitle } = useLocalizedContent();
  const isDark = theme.palette.mode === "dark";
  const isRtl = i18n.dir() === "rtl";

  const displayJobs = Array.isArray(jobs) ? jobs.slice(-5) : [];
  if (displayJobs.length === 0) return null;

  const slideCount = displayJobs.length;
  const settings = {
    dots: false,
    infinite: slideCount > 1,
    speed: 800,
    autoplay: slideCount > 1,
    autoplaySpeed: 6000,
    cssEase: "ease-in-out",
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    swipeToSlide: true,
  };

  return (
    <Box
      sx={{
        borderRadius: "20px",
        overflow: "hidden",
        background: isDark
          ? "linear-gradient(145deg, #0d1b2a 0%, #1a2a3a 100%)"
          : "linear-gradient(145deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)",
        border: isDark
          ? "1px solid rgba(52,211,153,0.2)"
          : "1px solid rgba(52,211,153,0.3)",
        boxShadow: isDark
          ? "0 4px 20px rgba(0,0,0,0.4)"
          : "0 4px 20px rgba(52,211,153,0.1)",
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
            ? "1px solid rgba(52,211,153,0.15)"
            : "1px solid rgba(52,211,153,0.2)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 3px 10px rgba(16,185,129,0.4)",
            }}
          >
            <WorkOutlineIcon sx={{ fontSize: 18, color: "white" }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1rem", sm: "1.05rem" },
                color: isDark ? "rgba(255,255,255,0.95)" : "#064e3b",
                lineHeight: 1.2,
              }}
            >
              {t("Find Job")}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isDark ? "rgba(52,211,153,0.8)" : "#065f46",
                display: "block",
                lineHeight: 1,
                fontSize: "0.68rem",
              }}
            >
              {t("Opportunities Near You")}
            </Typography>
          </Box>
        </Box>

        <Button
          component={Link}
          to="/findjob"
          size="small"
          sx={{
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.8rem",
            color: "#10b981",
            px: 1.2,
            py: 0.5,
            borderRadius: "10px",
            bgcolor: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.25)",
            "&:hover": {
              bgcolor: isDark
                ? "rgba(16,185,129,0.2)"
                : "rgba(16,185,129,0.14)",
            },
          }}
        >
          {t("See All")}
        </Button>
      </Box>

      {/* Slider */}
      <Box sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 1.2, sm: 1.5 } }}>
        <Slider {...settings}>
          {displayJobs.map((job) => {
            const ownerName =
              locName(job?.storeId) || locName(job?.brandId) || "";
            const ownerIsBrand = Boolean(job?.brandId?._id);
            const label = locTitle(job) || t("Job");

            return (
              <Box key={job._id} sx={{ px: 0.5 }}>
                <Card
                  component={Link}
                  to="/findjob"
                  sx={{
                    display: "flex",
                    height: { xs: 140, sm: 200, md: 220 },
                    width: "100%",
                    borderRadius: "14px",
                    overflow: "hidden",
                    textDecoration: "none",
                    position: "relative",
                    border: isDark
                      ? "1px solid rgba(52,211,153,0.15)"
                      : "1px solid rgba(52,211,153,0.2)",
                    boxShadow: isDark
                      ? "0 4px 16px rgba(0,0,0,0.3)"
                      : "0 4px 16px rgba(16,185,129,0.1)",
                    transition: "all 0.25s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: isDark
                        ? "0 8px 24px rgba(0,0,0,0.4)"
                        : "0 8px 24px rgba(16,185,129,0.18)",
                    },
                  }}
                >
                  {job?.image ? (
                    <CardMedia
                      component="img"
                      image={resolveMediaUrl(job.image)}
                      alt={label}
                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isDark
                          ? "linear-gradient(135deg, #065f46, #047857)"
                          : "linear-gradient(135deg, #d1fae5, #a7f3d0)",
                      }}
                    >
                      <WorkOutlineIcon
                        sx={{
                          fontSize: 64,
                          color: isDark
                            ? "rgba(52,211,153,0.6)"
                            : "rgba(16,185,129,0.5)",
                        }}
                      />
                    </Box>
                  )}

                  {/* Gradient overlay */}
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 50%, transparent 100%)",
                    }}
                  />

                  <CardContent
                    sx={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      p: "12px !important",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "white",
                        fontWeight: 800,
                        fontSize: { xs: "0.9rem", sm: "1rem" },
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        mb: 0.8,
                        textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      }}
                    >
                      {label}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                      <Chip
                        size="small"
                        label={genderLabel(t, job?.gender)}
                        sx={{
                          height: 22,
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          bgcolor: "rgba(255,255,255,0.18)",
                          color: "white",
                          border: "1px solid rgba(255,255,255,0.3)",
                          backdropFilter: "blur(4px)",
                          "& .MuiChip-label": { px: 0.8 },
                        }}
                      />
                      {ownerName && (
                        <Chip
                          size="small"
                          icon={
                            ownerIsBrand ? <BusinessIcon /> : <StorefrontIcon />
                          }
                          label={ownerName}
                          sx={{
                            height: 22,
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            bgcolor: "rgba(16,185,129,0.3)",
                            color: "white",
                            border: "1px solid rgba(16,185,129,0.4)",
                            backdropFilter: "blur(4px)",
                            maxWidth: 160,
                            "& .MuiChip-label": {
                              px: 0.6,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            },
                            "& .MuiChip-icon": {
                              color: "rgba(255,255,255,0.85)",
                              fontSize: "0.8rem",
                              marginInlineStart: "6px",
                              marginInlineEnd: "2px",
                            },
                          }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Slider>
      </Box>
    </Box>
  );
});

export default FindJobShowcase;
