import React, { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AppImage from "./AppImage";
import { isAndroidPerformanceMode } from "../utils/androidPerformance";

const PremiumDots = ({ count, activeIndex, onSelect }) => (
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
      pointerEvents: "auto",
    }}
  >
    {Array.from({ length: count }).map((_, i) => {
      const isActive = i === activeIndex;
      return (
        <Box
          key={i}
          component="button"
          type="button"
          onClick={() => onSelect?.(i)}
          aria-label={`Show banner ${i + 1}`}
          sx={{
            border: 0,
            p: 0,
            width: isActive ? 20 : 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: isActive
              ? "white"
              : "rgba(255,255,255,0.45)",
            transition: "width 0.35s ease, background-color 0.35s ease",
            cursor: "pointer",
          }}
        />
      );
    })}
  </Box>
);

const BannerCarousel = ({ banners, onBannerClick }) => {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const isAndroidPerfMode = isAndroidPerformanceMode();

  const bannerCount = banners?.length ?? 0;

  useEffect(() => {
    if (bannerCount <= 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((prev) => (prev >= bannerCount ? 0 : prev));
  }, [bannerCount]);

  useEffect(() => {
    if (bannerCount <= 1) return undefined;
    const delay = isAndroidPerfMode ? 5200 : 4000;
    const id = window.setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % bannerCount);
    }, delay);
    return () => window.clearTimeout(id);
  }, [activeIndex, bannerCount, isAndroidPerfMode]);

  const goToBanner = (nextIndex) => {
    if (bannerCount <= 0) return;
    const normalized = ((nextIndex % bannerCount) + bannerCount) % bannerCount;
    setActiveIndex(normalized);
  };

  const handleTouchStart = (event) => {
    if (bannerCount <= 1) return;
    touchStartXRef.current = event.touches?.[0]?.clientX ?? null;
    touchDeltaXRef.current = 0;
  };

  const handleTouchMove = (event) => {
    if (touchStartXRef.current == null) return;
    const currentX = event.touches?.[0]?.clientX ?? touchStartXRef.current;
    touchDeltaXRef.current = currentX - touchStartXRef.current;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current == null || bannerCount <= 1) return;
    const threshold = 35;
    if (touchDeltaXRef.current <= -threshold) {
      goToBanner(activeIndex + 1);
    } else if (touchDeltaXRef.current >= threshold) {
      goToBanner(activeIndex - 1);
    }
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
  };

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
            ? isAndroidPerfMode
              ? "0 2px 8px rgba(0,0,0,0.28)"
              : "0 8px 32px rgba(0,0,0,0.4)"
            : isAndroidPerfMode
              ? "0 2px 8px rgba(30,111,217,0.1)"
              : "0 8px 32px rgba(30,111,217,0.15)",
        mb: 2,
        position: "relative",
        height: { xs: "160px", sm: "220px", md: "280px" },
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
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
              loading={index === 0 ? "eager" : "lazy"}
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

      <PremiumDots
        count={banners.length}
        activeIndex={activeIndex}
        onSelect={goToBanner}
      />
    </Box>
  );
};

export default BannerCarousel;
