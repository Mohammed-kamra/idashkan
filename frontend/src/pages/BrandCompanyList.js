import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Box,
  Typography,
  Card,
  CardMedia,
  useTheme,
  Container,
  Chip,
  IconButton,
  Skeleton,
  TextField,
  InputAdornment,
  Paper,
  alpha,
  Fade,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { brandAPI, companyAPI, adAPI, brandTypeAPI } from "../services/api";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import BusinessIcon from "@mui/icons-material/Business";
import SearchIcon from "@mui/icons-material/Search";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Loader from "../components/Loader";
import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { getAllLocalizedFieldValues } from "../utils/localize";
import { useCityFilter } from "../context/CityFilterContext";
import { storeMatchesSelectedCity } from "../utils/cityMatch";

function capitalize(s) {
  return typeof s === "string" && s.length > 0
    ? s.charAt(0).toUpperCase() + s.slice(1)
    : s;
}

const BrandCard = ({ brand, index, isDark, theme, locName, locAddress, onClick }) => {
  const accent = theme.palette.primary.main;
  const titleRaw = brand.statusAll === "off" ? "" : locName(brand);
  const title =
    typeof titleRaw === "string"
      ? titleRaw.trim()
      : String(titleRaw || "").trim();
  const displayAddress = String(locAddress(brand) || "").trim();

  return (
    <Fade in timeout={280 + Math.min(index * 50, 400)}>
      <Card
        elevation={0}
        onClick={onClick}
        sx={{
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          borderRadius: 2.5,
          overflow: "hidden",
          width: "100%",
          height: "100%",
          border: "1px solid",
          borderColor: isDark
            ? alpha("#fff", 0.08)
            : alpha(theme.palette.divider, 0.9),
          background: isDark
            ? alpha("#1a2235", 0.92)
            : theme.palette.background.paper,
          transition:
            "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: isDark
              ? `0 10px 28px ${alpha("#000", 0.35)}`
              : `0 10px 28px ${alpha(accent, 0.14)}`,
            borderColor: alpha(accent, isDark ? 0.4 : 0.28),
            "& .brand-card-logo": { transform: "scale(1.04)" },
          },
        }}
      >
        <Box
          className="brand-card-logo"
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "1",
            maxHeight: { xs: 140, sm: 160 },
            background: isDark
              ? `linear-gradient(145deg, ${alpha("#2d3a52", 0.9)} 0%, ${alpha("#1a2235", 1)} 100%)`
              : `linear-gradient(145deg, ${alpha(accent, 0.06)} 0%, ${alpha("#f8fafc", 1)} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.3s ease",
          }}
        >
          {brand.logo ? (
            <CardMedia
              component="img"
              image={resolveMediaUrl(brand.logo)}
              alt={title}
              sx={{
                objectFit: "contain",
                width: "100%",
                height: "100%",
                p: 1.5,
              }}
            />
          ) : (
            <BusinessIcon sx={{ fontSize: 56, color: alpha(accent, 0.35) }} />
          )}

          {brand.isVip && (
            <Box
              sx={{
                position: "absolute",
                top: 6,
                left: 6,
                zIndex: 2,
                backgroundColor: "white",
                borderRadius: "50%",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                "&::before": { content: '"👑"', fontSize: "13px" },
              }}
            />
          )}
        </Box>

        {title ? (
          <Box
            sx={{
              px: 1,
              py: 1.25,
              flex: 1,
              display: "flex",
              alignItems: "center",
              minHeight: 44,
            }}
          >
            <Typography
              variant="subtitle2"
              component="h2"
              align="center"
              sx={{
                width: "100%",
                fontWeight: 800,
                fontSize: { xs: "0.78rem", sm: "0.85rem" },
                lineHeight: 1.3,
                color: "text.primary",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {title}
            </Typography>
          </Box>
        ) : null}

        {/* {displayAddress ? (
          <Typography
            variant="caption"
            component="div"
            sx={{
              px: 1,
              pb: 1.25,
              color: "text.secondary",
              fontSize: "0.72rem",
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              width: "100%",
              minWidth: 0,
            }}
          >
            {displayAddress}
          </Typography>
        ) : null} */}
      </Card>
    </Fade>
  );
};

/**
 * Shared directory UI for `/brands` and `/companies`.
 * @param {{ variant: 'brand' | 'company' }} props
 */
const BrandCompanyList = ({ variant }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { t } = useTranslation();
  const { locName, locAddress } = useLocalizedContent();
  const { selectedCity } = useCityFilter();
  const isCompanyMode = variant === "company";

  const [Brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bannerAds, setBannerAds] = useState([]);
  const [brandTypes, setBrandTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const brandTypeParam = searchParams.get("type");
  const [selectedType, setSelectedType] = useState(brandTypeParam || "all");

  const accent = theme.palette.primary.main;
  const primaryOnSurface =
    theme.palette.primary.dark ||
    (theme.palette.mode === "light" ? "#1565c0" : accent);

  const brandTypeScrollRef = useRef(null);
  const [showScrollLeft, setShowScrollLeft] = useState(false);
  const [showScrollRight, setShowScrollRight] = useState(false);

  const updateBrandTypeScrollHints = useCallback(() => {
    const el = brandTypeScrollRef.current;
    if (!el) {
      setShowScrollLeft(false);
      setShowScrollRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (scrollWidth <= clientWidth + 2) {
      setShowScrollLeft(false);
      setShowScrollRight(false);
      return;
    }
    const max = scrollWidth - clientWidth;
    setShowScrollLeft(scrollLeft > 8);
    setShowScrollRight(scrollLeft < max - 8);
  }, []);

  const scrollBrandTypesBy = useCallback((direction) => {
    const el = brandTypeScrollRef.current;
    if (!el) return;
    const step = Math.min(280, el.clientWidth * 0.72);
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await (isCompanyMode
        ? companyAPI.getAll()
        : brandAPI.getAll());
      setBrands(response.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.msg ||
          err.message ||
          t("Network error. Please check your connection."),
      );
      console.error("Error fetching Brands:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBrandTypes = async () => {
    try {
      const res = await brandTypeAPI.getAll();
      setBrandTypes(res.data || []);
    } catch {
      setBrandTypes([]);
    }
  };

  const fetchAds = async () => {
    try {
      const res = await adAPI.getAll({ page: "brands" });
      setBannerAds(res.data || []);
    } catch {
      setBannerAds([]);
    }
  };

  useEffect(() => {
    setSelectedType(brandTypeParam || "all");
  }, [brandTypeParam]);

  useEffect(() => {
    fetchBrands();
    fetchAds();
    fetchBrandTypes();
  }, [variant]);

  useEffect(() => {
    updateBrandTypeScrollHints();
    const el = brandTypeScrollRef.current;
    if (!el) {
      const retry = window.setTimeout(updateBrandTypeScrollHints, 350);
      return () => window.clearTimeout(retry);
    }
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateBrandTypeScrollHints());
      ro.observe(el);
    }
    const onWin = () => updateBrandTypeScrollHints();
    window.addEventListener("resize", onWin);
    const timer = window.setTimeout(updateBrandTypeScrollHints, 150);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onWin);
      ro?.disconnect();
    };
  }, [updateBrandTypeScrollHints, brandTypes, loading]);

  const bannerSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      { breakpoint: 1024, settings: { dots: true, arrows: false } },
      {
        breakpoint: 600,
        settings: { dots: true, arrows: false, autoplaySpeed: 4000 },
      },
    ],
  };

  const bannerAdsWithImages = useMemo(
    () =>
      (bannerAds || [])
        .filter((ad) => !!ad.image)
        .map((ad) => ({
          _id: ad._id,
          src: resolveMediaUrl(ad.image),
          brandId: ad.brandId,
          storeId: ad.storeId,
          giftId: ad.giftId,
        })),
    [bannerAds],
  );

  const filteredBrands = useMemo(() => {
    if (!Brands.length) return [];

    let list = [...Brands];

    if (selectedType && selectedType !== "all") {
      const isId =
        typeof selectedType === "string" && selectedType.length >= 12;
      list = list.filter((b) => {
        const bt = b.brandTypeId;
        const btId = bt && (bt._id || bt);
        const btName = (bt && bt.name) || b.type;
        return isId
          ? String(btId) === String(selectedType)
          : String(btName).toLowerCase() === String(selectedType).toLowerCase();
      });
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((b) => {
        const parts = [
          ...getAllLocalizedFieldValues(b, "name"),
          ...getAllLocalizedFieldValues(b, "address"),
          ...getAllLocalizedFieldValues(b, "description"),
        ];
        if (b.brandTypeId && typeof b.brandTypeId === "object") {
          parts.push(...getAllLocalizedFieldValues(b.brandTypeId, "name"));
        }
        if (b.phone != null && String(b.phone).trim()) {
          parts.push(String(b.phone).trim());
        }
        return parts.join(" ").toLowerCase().includes(q);
      });
    }

    list = list.filter((b) => storeMatchesSelectedCity(b, selectedCity));

    return list;
  }, [Brands, selectedType, searchQuery, selectedCity]);

  const handleBrandClick = (brand) => {
    navigate(`${isCompanyMode ? "/companies" : "/brands"}/${brand._id}`);
  };

  const handleTypeSelect = (key) => {
    setSelectedType(key);
    if (key === "all") setSearchParams({});
    else setSearchParams({ type: key });
  };

  const filterRow = [
    { key: "all", label: t("All"), icon: "🏪" },
    ...brandTypes.map((bt) => ({
      key: bt._id,
      label: locName(bt) || t(capitalize(bt.name)),
      icon: bt.icon || null,
    })),
  ];

  /** Match MainPage `FilterChips` store-type pill styles */
  const mainPageStyleActivePillSx = {
    background:
      "linear-gradient(135deg, var(--brand-primary-blue, #1E6FD9) 0%, #4A90E2 100%)",
    color: "white",
    fontWeight: 700,
    border: "none",
    boxShadow: "0 2px 8px rgba(30,111,217,0.35)",
    "&:hover": {
      background: "linear-gradient(135deg, #1660c2 0%, #3a7fd2 100%)",
    },
    "&.MuiChip-root": { height: 34 },
  };

  const mainPageStyleInactivePillSx = {
    background: isDark ? "rgba(255,255,255,0.07)" : "#f3f4f6",
    color: isDark ? "rgba(255,255,255,0.85)" : "#374151",
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
    fontWeight: 500,
    "&:hover": {
      background: isDark ? "rgba(255,255,255,0.12)" : "#e9ecf0",
      border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #d1d5db",
    },
    "&.MuiChip-root": { height: 34 },
  };

  const mainPageStyleBrandTypeChipSx = (active) => ({
    ...(active ? mainPageStyleActivePillSx : mainPageStyleInactivePillSx),
    flexShrink: 0,
  });

  const pageTitle = isCompanyMode
    ? t("Companies", { defaultValue: "Companies" })
    : t("Brands", { defaultValue: "Brands" });
  const emptyPrimary = isCompanyMode
    ? t("No companies found", { defaultValue: "No companies found" })
    : t("No brands found", { defaultValue: "No brands found" });
  const emptyHint = isCompanyMode
    ? t("No companies match the current filters.", {
        defaultValue: "No companies match the current filters.",
      })
    : t("No brands match the current filters.", {
        defaultValue: "No brands match the current filters.",
      });

  if (loading) {
    return (
      <Box
        sx={{
          py: { xs: 3, md: 6 },
          minHeight: "100vh",
          bgcolor: isDark ? "rgba(13,17,28,1)" : "rgba(248,249,252,1)",
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Skeleton
            variant="rounded"
            sx={{
              width: "100%",
              height: { xs: 150, md: 220 },
              mb: 3,
              borderRadius: 3,
            }}
          />
          <Skeleton variant="rounded" width="55%" height={32} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" width="100%" height={44} sx={{ mb: 3 }} />
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card
                key={i}
                elevation={0}
                sx={{
                  borderRadius: 2.5,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Skeleton
                  variant="rectangular"
                  sx={{ aspectRatio: "1", width: "100%" }}
                />
                <Box sx={{ px: 1, py: 1 }}>
                  <Skeleton
                    variant="text"
                    width="90%"
                    height={20}
                    sx={{ mx: "auto" }}
                  />
                </Box>
              </Card>
            ))}
          </Box>
        </Container>
      </Box>
    );
  }

  if (error) return <Loader message={error} />;

  return (
    <Box
      sx={{
        py: { xs: 2.5, md: 5 },
        pb: { xs: 10, md: 6 },
        minHeight: "100vh",
        bgcolor: isDark ? "rgba(13,17,28,1)" : "rgba(248,249,252,1)",
      }}
    >
      <Container
        maxWidth="lg"
        sx={{ px: { xs: 1.5, sm: 2 }, mt: { xs: 4, md: 5 } }}
      >
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              width: "100%",
              height: { xs: 150, md: 220 },
              borderRadius: { xs: 3, md: 4 },
              overflow: "hidden",
              boxShadow: isDark
                ? "0 12px 40px rgba(0,0,0,0.45)"
                : "0 12px 40px rgba(0,0,0,0.08)",
              bgcolor: isDark ? "#1a2235" : alpha(accent, 0.06),
            }}
          >
            {bannerAdsWithImages.length > 0 ? (
              <Slider {...bannerSettings}>
                {bannerAdsWithImages.map((ad, index) => (
                  <div key={ad._id || index}>
                    <img
                      onClick={() =>
                        ad.brandId
                          ? navigate(`/brands/${ad.brandId}`)
                          : ad.storeId
                            ? navigate(`/stores/${ad.storeId}`)
                            : ad.giftId
                              ? navigate(`/gifts/${ad.giftId}`)
                              : undefined
                      }
                      src={ad.src}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        cursor:
                          ad.brandId || ad.storeId || ad.giftId
                            ? "pointer"
                            : "default",
                      }}
                    />
                  </div>
                ))}
              </Slider>
            ) : (
              <Skeleton variant="rectangular" width="100%" height="100%" />
            )}
          </Box>
        </Box>

        <Box
          sx={{
            mb: 2.5,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "flex-start" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                background: isDark
                  ? `linear-gradient(135deg, ${alpha(accent, 0.85)}, ${alpha("#4a90e2", 0.75)})`
                  : `linear-gradient(135deg, ${accent}, ${alpha(accent, 0.75)})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: `0 8px 24px ${alpha(accent, 0.35)}`,
              }}
            >
              <BusinessIcon sx={{ color: "#fff", fontSize: "1.5rem" }} />
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  color: "text.primary",
                  lineHeight: 1.2,
                }}
              >
                {pageTitle}
              </Typography>
              <Box
                sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.75 }}
              >
                <Chip
                  size="small"
                  label={`${filteredBrands.length} ${pageTitle}`}
                  sx={{
                    fontWeight: 700,
                    ...(isDark
                      ? {
                          bgcolor: alpha(accent, 0.22),
                          color: alpha("#fff", 0.95),
                        }
                      : {
                          bgcolor: alpha(primaryOnSurface, 0.1),
                          color: primaryOnSurface,
                          border: `1px solid ${alpha(primaryOnSurface, 0.35)}`,
                        }),
                  }}
                />
              </Box>
            </Box>
          </Box>

          <TextField
            size="small"
            placeholder={t("Search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{ color: "text.secondary", fontSize: "1.15rem" }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: { xs: "100%", sm: 260 },
              alignSelf: { sm: "center" },
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                bgcolor: isDark ? alpha("#fff", 0.04) : "#fff",
              },
            }}
          />
        </Box>

        {/* Brand types — same chip + scroll styling as MainPage `FilterChips` */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ position: "relative", pb: 0.25 }}>
            {showScrollLeft && (
              <Box
                aria-hidden
                sx={{
                  pointerEvents: "none",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 10,
                  width: 40,
                  zIndex: 1,
                  background: isDark
                    ? `linear-gradient(90deg, ${alpha("#0d111c", 0.98)} 0%, transparent 100%)`
                    : `linear-gradient(90deg, ${alpha("#f9fafb", 0.98)} 0%, transparent 100%)`,
                }}
              />
            )}
            {showScrollRight && (
              <Box
                aria-hidden
                sx={{
                  pointerEvents: "none",
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 10,
                  width: 40,
                  zIndex: 1,
                  background: isDark
                    ? `linear-gradient(270deg, ${alpha("#0d111c", 0.98)} 0%, transparent 100%)`
                    : `linear-gradient(270deg, ${alpha("#f9fafb", 0.98)} 0%, transparent 100%)`,
                }}
              />
            )}

            {showScrollLeft && (
              <IconButton
                size="small"
                onClick={() => scrollBrandTypesBy(-1)}
                aria-label={t("Scroll left")}
                sx={{
                  position: "absolute",
                  left: 2,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  bgcolor: isDark ? alpha("#fff", 0.1) : alpha("#fff", 0.95),
                  boxShadow: 1,
                  "&:hover": {
                    bgcolor: isDark ? alpha("#fff", 0.18) : "#fff",
                  },
                }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            )}
            {showScrollRight && (
              <IconButton
                size="small"
                onClick={() => scrollBrandTypesBy(1)}
                aria-label={t("Scroll right")}
                sx={{
                  position: "absolute",
                  right: 2,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  bgcolor: isDark ? alpha("#fff", 0.1) : alpha("#fff", 0.95),
                  boxShadow: 1,
                  "&:hover": {
                    bgcolor: isDark ? alpha("#fff", 0.18) : "#fff",
                  },
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            )}

            <Box
              ref={brandTypeScrollRef}
              onScroll={updateBrandTypeScrollHints}
              sx={{
                display: "flex",
                gap: 0.8,
                overflowX: "auto",
                overflowY: "hidden",
                alignItems: "center",
                px: { xs: 0.25, sm: 0.5 },
                pb: 1,
                scrollBehavior: "smooth",
                scrollbarWidth: "auto",
                scrollbarGutter: "stable",
                scrollbarColor: isDark
                  ? `${alpha(accent, 0.55)} ${alpha("#fff", 0.08)}`
                  : `${alpha(primaryOnSurface, 0.45)} ${alpha("#000", 0.08)}`,
                "&::-webkit-scrollbar": { height: 10 },
                "&::-webkit-scrollbar-track": {
                  borderRadius: 5,
                  marginLeft: 1,
                  marginRight: 1,
                  backgroundColor: isDark
                    ? alpha("#fff", 0.07)
                    : alpha("#000", 0.06),
                },
                "&::-webkit-scrollbar-thumb": {
                  borderRadius: 5,
                  border: `2px solid ${
                    isDark ? alpha("#0d111c", 1) : alpha("#f9fafb", 1)
                  }`,
                  backgroundColor: isDark
                    ? alpha(accent, 0.55)
                    : alpha(primaryOnSurface, 0.45),
                },
              }}
            >
              {filterRow.map((tItem) => {
                const active = selectedType === tItem.key;
                return (
                  <Chip
                    key={tItem.key}
                    label={tItem.label}
                    icon={
                      tItem.icon ? (
                        <Box
                          component="span"
                          sx={{ fontSize: "0.9rem", ml: "4px !important" }}
                        >
                          {tItem.icon}
                        </Box>
                      ) : undefined
                    }
                    onClick={() => handleTypeSelect(tItem.key)}
                    sx={mainPageStyleBrandTypeChipSx(active)}
                  />
                );
              })}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          {filteredBrands.map((brand, index) => (
            <BrandCard
              key={brand._id}
              brand={brand}
              index={index}
              isDark={isDark}
              theme={theme}
              locName={locName}
              locAddress={locAddress}
              onClick={() => handleBrandClick(brand)}
            />
          ))}
        </Box>

        {filteredBrands.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              py: 8,
              px: 3,
              textAlign: "center",
              borderRadius: 4,
              border: "1px dashed",
              borderColor: alpha(accent, 0.25),
              bgcolor: isDark ? alpha("#1a2235", 0.5) : alpha(accent, 0.04),
            }}
          >
            <BusinessIcon
              sx={{
                fontSize: 72,
                color: alpha(theme.palette.text.secondary, 0.45),
                mb: 2,
              }}
            />
            <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
              {emptyPrimary}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 400, mx: "auto" }}
            >
              {searchQuery.trim()
                ? t("Try a different search or filter.", {
                    defaultValue: "Try a different search or filter.",
                  })
                : emptyHint}
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default BrandCompanyList;
