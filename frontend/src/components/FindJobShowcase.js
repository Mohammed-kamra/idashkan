import React from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
} from "@mui/material";
import { Link } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
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

const FindJobShowcase = ({ jobs }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { locName, locTitle } = useLocalizedContent();

  const displayJobs = Array.isArray(jobs) ? jobs.slice(-5) : [];
  if (displayJobs.length === 0) return null;

  const slideCount = displayJobs.length;
  // infinite + a single slide clones slides (~3) and can stack vertically; keep one row only.
  const settings = {
    dots: false,
    infinite: slideCount > 1,
    speed: 800,
    autoplay: slideCount > 1,
    autoplaySpeed: 6500,
    cssEase: "linear",
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    swipeToSlide: true,
  };

  return (
    <Paper
      elevation={4}
      sx={{
        my: 2,
        p: 2,
        borderRadius: 4,
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(145deg, #0f172a, #1e293b)"
            : "linear-gradient(145deg, #eff6ff, #ffffff)",
        boxShadow:
          theme.palette.mode === "dark"
            ? "10px 10px 20px #111827, -10px -10px 20px #1f2937"
            : "10px 10px 20px #d4d4d4, -10px -10px 20px #ffffff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WorkOutlineIcon color="primary" />
          <Typography
            variant="h5"
            gutterBottom
            textAlign="left"
            sx={{
              fontWeight: 800,
              color: theme.palette.text.primary,
              textTransform: "uppercase",
              letterSpacing: "1px",
              mb: 0,
            }}
          >
            {t("Find Job")}
          </Typography>
        </Box>
        <Button
          component={Link}
          to="/findjob"
          size="small"
          variant="outlined"
          sx={{ textTransform: "none" }}
        >
          {t("See All")}{" "}
          <ArrowForwardIcon
            sx={{ transform: "rotate(180deg)", fontSize: "1rem" }}
          />
        </Button>
      </Box>

      <Slider {...settings}>
        {displayJobs.map((job) => {
          const ownerName =
            locName(job?.storeId) || locName(job?.brandId) || "";
          const ownerIsBrand = Boolean(job?.brandId?._id);
          const label = locTitle(job) || t("Job");

          return (
            <Box key={job._id} sx={{ px: 0.5, width: "100%" }}>
              <Card
                component={Link}
                to="/findjob"
                sx={{
                  display: "flex",
                  height: { xs: 150, sm: 250, md: 280 },
                  width: "100%",
                  borderRadius: 2,
                  overflow: "hidden",
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
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow:
                      theme.palette.mode === "dark"
                        ? "0 8px 24px rgba(0,0,0,0.4)"
                        : "0 8px 24px rgba(0,0,0,0.15)",
                  },
                  textDecoration: "none",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  {job?.image ? (
                    <CardMedia
                      component="img"
                      image={resolveMediaUrl(job.image)}
                      alt={label}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          theme.palette.mode === "dark"
                            ? "rgba(0,0,0,0.35)"
                            : "rgba(30,111,217,0.08)",
                      }}
                    >
                      <WorkOutlineIcon
                        sx={{ fontSize: 64, color: "rgba(255,255,255,0.85)" }}
                      />
                    </Box>
                  )}

                  <CardContent
                    sx={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      p: 1.5,
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0))",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "white",
                        fontWeight: 900,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        mb: 0.6,
                      }}
                    >
                      {label}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Chip
                        size="small"
                        label={genderLabel(t, job?.gender)}
                        sx={{
                          backgroundColor: "rgba(255,255,255,0.18)",
                          color: "white",
                          border: "1px solid rgba(255,255,255,0.25)",
                        }}
                      />
                      {ownerName ? (
                        <Chip
                          size="small"
                          icon={
                            ownerIsBrand ? (
                              <BusinessIcon />
                            ) : (
                              <StorefrontIcon />
                            )
                          }
                          label={ownerName}
                          sx={{
                            backgroundColor: "rgba(255,255,255,0.18)",
                            color: "white",
                            border: "1px solid rgba(255,255,255,0.25)",
                            maxWidth: "100%",
                            overflow: "hidden",
                            "& .MuiChip-icon": {
                              color: "white",
                              fontSize: "0.875rem",
                              marginInlineStart: "6px",
                              marginInlineEnd: "4px",
                            },
                          }}
                        />
                      ) : null}
                    </Box>
                  </CardContent>
                </Box>
              </Card>
            </Box>
          );
        })}
      </Slider>
    </Paper>
  );
};

export default FindJobShowcase;
