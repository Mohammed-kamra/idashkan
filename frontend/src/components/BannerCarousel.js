import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AppImage from "./AppImage";

const PremiumDots = ({ count, activeIndex }) => (
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
    {Array.from({ length: count }).map((_, i) => {
      const isActive = i === activeIndex;
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
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!banners || banners.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [banners]);

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
        height: { xs: "160px", sm: "220px", md: "280px" },
      }}
    >
      {banners.map((ad, index) => (
        <Box
          key={ad._id || index}
          sx={{
            position: "absolute",
            inset: 0,
            opacity: index === activeIndex ? 1 : 0,
            pointerEvents: index === activeIndex ? "auto" : "none",
            transition: "opacity 450ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: { xs: "160px", sm: "220px", md: "280px" },
              cursor: ad.brandId || ad.storeId || ad.giftId ? "pointer" : "default",
            }}
            onClick={() => onBannerClick && onBannerClick(ad)}
          >
            <AppImage
              src={ad.src || ad}
              alt={`Banner ${index + 1}`}
              loading={index === activeIndex ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : undefined}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </Box>
        </Box>
      ))}

      <PremiumDots count={banners.length} activeIndex={activeIndex} />
    </Box>
  );
};

export default BannerCarousel;
