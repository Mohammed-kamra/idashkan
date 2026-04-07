import React from "react";
import { Box } from "@mui/material";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useTheme } from "@mui/material/styles";

const PremiumDots = ({ dots }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "6px",
      position: "absolute",
      bottom: 12,
      left: 0,
      right: 0,
      pointerEvents: "none",
    }}
  >
    {React.Children.map(dots, (dot, i) => {
      const isActive = dot.props.className?.includes("slick-active");
      return (
        <Box
          key={i}
          sx={{
            width: isActive ? 20 : 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: isActive
              ? "white"
              : "rgba(255,255,255,0.45)",
            transition: "width 0.35s ease, background-color 0.35s ease",
          }}
        />
      );
    })}
  </Box>
);

const BannerCarousel = ({ banners, onBannerClick }) => {
  const theme = useTheme();

  if (!banners || banners.length === 0) {
    return (
      <Box
        sx={{
          width: "100%",
          height: { xs: "160px", sm: "220px", md: "280px" },
          borderRadius: 3,
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #1a2a4a 0%, #2a3a5a 100%)"
              : "linear-gradient(135deg, #e8f4fd 0%, #dbeafe 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 2,
        }}
      />
    );
  }

  const settings = {
    dots: true,
    appendDots: (dots) => <PremiumDots dots={dots} />,
    infinite: true,
    speed: 600,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    cssEase: "cubic-bezier(0.4, 0, 0.2, 1)",
    arrows: false,
    pauseOnHover: true,
  };

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 8px 32px rgba(0,0,0,0.4)"
            : "0 8px 32px rgba(30,111,217,0.15)",
        mb: 2,
        position: "relative",
        "& .slick-slide > div": { lineHeight: 0 },
        "& .slick-dots": {
          position: "absolute",
          bottom: 0,
          listStyle: "none",
          padding: 0,
          margin: 0,
        },
        "& .slick-dots li": { display: "none" },
      }}
    >
      <Slider {...settings}>
        {banners.map((ad, index) => (
          <Box
            key={ad._id || index}
            sx={{
              position: "relative",
              width: "100%",
              height: { xs: "160px", sm: "220px", md: "280px" },
              cursor: ad.brandId || ad.storeId || ad.giftId ? "pointer" : "default",
            }}
            onClick={() => onBannerClick && onBannerClick(ad)}
          >
            <img
              src={ad.src || ad}
              alt={`Banner ${index + 1}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "50%",
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)",
                pointerEvents: "none",
              }}
            />
          </Box>
        ))}
      </Slider>
    </Box>
  );
};

export default BannerCarousel;
