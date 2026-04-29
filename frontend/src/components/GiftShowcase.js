import React, { memo } from "react";
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BusinessIcon from "@mui/icons-material/Business";
import { useTheme } from "@mui/material/styles";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";

const GiftShowcase = memo(function GiftShowcase({ gifts }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const { locName, locDescription } = useLocalizedContent();

  const displayGifts = Array.isArray(gifts) ? gifts.slice(-5) : [];
  if (displayGifts.length === 0) return null;

  const settings = {
    dots: false,
    infinite: true,
    speed: 800,
    autoplay: true,
    autoplaySpeed: 6000,
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
            ? "linear-gradient(145deg, #c62828, #ff7043)"
            : "linear-gradient(145deg, #fff3e0, #ffffff)",
        boxShadow:
          theme.palette.mode === "dark"
            ? "10px 10px 20px #253444, -10px -10px 20px #3d4a60"
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
        <Typography
          variant="h5"
          gutterBottom
          textAlign="left"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
            textTransform: "uppercase",
            letterSpacing: "1px",
            mb: 0,
          }}
        >
          {t("Featured Gifts")}
        </Typography>
        <Button
          component={Link}
          to="/gifts"
          size="small"
          variant="outlined"
          sx={{ textTransform: "none" }}
        >
          {t("See All")}{" "}
        </Button>
      </Box>

      <Slider {...settings}>
        {displayGifts.map((gift) => {
          const label = locDescription(gift) || locName(gift) || t("Gift");
          // const remainingDays = getRemainingDays(gift?.expireDate);
          // const brandId = gift?.brandId?._id || gift?.brandId;

          return (
            <Box key={gift._id} sx={{ px: 0.5, width: "100%" }}>
              <Card
                component={Link}
                to="/gifts"
                sx={{
                  display: "flex",
                  height: { xs: "150px", sm: "250px", md: "280px" },
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
                  {gift?.image ? (
                    <CardMedia
                      component="img"
                      image={resolveMediaUrl(gift.image)}
                      alt={label}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "fill",
                      }}
                    />
                  ) : null}
                </Box>

                {/* <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    p: { xs: 2, sm: 2.5, md: 3 },
                    minHeight: 0,
                  }}
                > */}
                {/* <Typography
                    variant="h6"
                    sx={{
                      alignItems: "center",
                      fontSize: { xs: "1rem", sm: "1.2rem", md: "1.2rem" },
                      fontWeight: 600,
                      lineHeight: 1.4,
                      // mb: 1.5,
                      color: theme.palette.text.primary,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {label}
                  </Typography> */}

                {/* <Box sx={{ mb: 1 }}>
                    {brandId && gift?.brandId?.name ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <BusinessIcon
                          sx={{
                            fontSize: { xs: 12, sm: 16, md: 16 },
                            color: "var(--brand-light-orange)",
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: {
                              xs: "0.5rem",
                              sm: "0.75rem",
                              md: "0.75rem",
                            },
                            color: theme.palette.text.secondary,
                            fontFamily: "NRT reg, Arial, sans-serif",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t("Brand")}: {gift.brandId.name}
                        </Typography>
                      </Box>
                    ) : null}
                  </Box> */}

                {/* <Box sx={{ flexShrink: 0 }}>
                    {remainingDays !== null ? (
                      <Chip
                        label={`${t("Expires")}: ${remainingDays} ${t("days")}`}
                        size="small"
                        sx={{
                          bgcolor: remainingDays <= 7 ? "#ff6b6b" : "var(--brand-accent-orange)",
                          color: "white",
                          fontSize: {
                            xs: "0.5rem",
                            sm: "0.75rem",
                            md: "0.75rem",
                          },
                        }}
                      />
                    ) : (
                      <Chip
                        label={t("No expiry")}
                        size="small"
                        sx={{
                          bgcolor: "#6c757d",
                          color: "white",
                          fontSize: {
                            xs: "0.5rem",
                            sm: "0.75rem",
                            md: "0.75rem",
                          },
                        }}
                      />
                    )}
                  </Box> */}
                {/* </CardContent> */}
              </Card>
            </Box>
          );
        })}
      </Slider>
    </Paper>
  );
});

export default GiftShowcase;
