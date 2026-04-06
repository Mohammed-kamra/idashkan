import React from "react";
import { Box, Typography, Avatar, Paper, Button } from "@mui/material";
import { Link } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTheme } from "@mui/material/styles";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";

const BrandShowcase = ({ brands }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { locName } = useLocalizedContent();

  if (!brands || brands.length === 0) {
    return null;
  }

  const vipBrands = brands.filter((b) => Boolean(b?.isVip));
  const displayBrands = vipBrands.length > 0 ? vipBrands : brands;

  const slideCount = displayBrands.length;
  const clamp = (maxVisible) => Math.max(1, Math.min(maxVisible, slideCount));
  const desktopShow = clamp(5);
  // slidesToShow > slideCount breaks slick layout (slides stack vertically).
  const settings = {
    dots: false,
    infinite: slideCount > desktopShow,
    speed: 5000,
    autoplay: slideCount > desktopShow,
    autoplaySpeed: 1000,
    cssEase: "linear",
    slidesToShow: desktopShow,
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: clamp(4),
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: clamp(3),
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: clamp(2),
        },
      },
    ],
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
            ? "linear-gradient(145deg, #1E6FD9, #4A90E2)"
            : "linear-gradient(145deg, #e6e6e6, #ffffff)",
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
          {t(vipBrands.length > 0 ? "VIP Brands" : "Featured Brands")}
        </Typography>
        <Button
          component={Link}
          to="/brands"
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
        {displayBrands.map((brand) => (
          <Box
            key={brand._id}
            component={Link}
            to={`/brands/${brand._id}`}
            sx={{
              textAlign: "center",
              textDecoration: "none",
              "&:hover .brand-avatar": {
                transform: "scale(1.1)",
                boxShadow: `0 0 15px ${theme.palette.primary.main}`,
              },
            }}
          >
            <Avatar
              src={resolveMediaUrl(brand.logo)}
              alt={locName(brand)}
              className="brand-avatar"
              sx={{
                width: 80,
                height: 80,
                m: "auto",
                bgcolor: "background.paper",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                transition:
                  "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
                border: `2px solid ${theme.palette.divider}`,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                mt: 1,
                display: "block",
                fontWeight: 500,
                color: theme.palette.text.secondary,
              }}
            >
              {locName(brand)}
            </Typography>
          </Box>
        ))}
      </Slider>
    </Paper>
  );
};

export default BrandShowcase;
