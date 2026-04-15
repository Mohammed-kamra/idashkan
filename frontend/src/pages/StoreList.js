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
  Chip,
  Fade,
  useTheme,
  Skeleton,
  Container,
  TextField,
  InputAdornment,
  Paper,
  alpha,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { storeAPI, adAPI, storeTypeAPI } from "../services/api";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import StorefrontIcon from "@mui/icons-material/Storefront";
import SearchIcon from "@mui/icons-material/Search";
import Loader from "../components/Loader";
import { useTranslation } from "react-i18next";
import { useCityFilter } from "../context/CityFilterContext";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { storeMatchesSelectedCity } from "../utils/cityMatch";
import { getAllLocalizedFieldValues } from "../utils/localize";
function getID(id) {
  if (typeof id === "string") return id;
  if (id && typeof id === "object") {
    return id.$oid || String(id._id) || String(id);
  }
  return id;
}

/** Matches `BrandCard` in `BrandCompanyList.js` (square logo, title, address). */
const StoreCard = ({
  store,
  index,
  isDark,
  onClick,
  locName,
  locAddress,
  theme,
}) => {
  const accent = theme.palette.primary.main;
  const titleRaw = store.statusAll === "off" ? "" : locName(store);
  const title =
    typeof titleRaw === "string"
      ? titleRaw.trim()
      : String(titleRaw || "").trim();
  const displayAddress = String(locAddress(store) || "").trim();

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
            "& .store-card-logo": { transform: "scale(1.04)" },
          },
        }}
      >
        <Box
          className="store-card-logo"
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
          {store.logo ? (
            <CardMedia
              component="img"
              image={resolveMediaUrl(store.logo)}
              alt={title || store.name}
              sx={{
                objectFit: "contain",
                width: "100%",
                height: "100%",
                p: 1.5,
              }}
            />
          ) : (
            <StorefrontIcon sx={{ fontSize: 56, color: alpha(accent, 0.35) }} />
          )}

          {store.isVip && (
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

const StoreList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { t } = useTranslation();
  const { locName, locAddress } = useLocalizedContent();
  const { selectedCity } = useCityFilter();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bannerAds, setBannerAds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const storeTypeParam = searchParams.get("type");
  const [selectedTypeId, setSelectedTypeId] = useState(storeTypeParam || "all");
  const [storeTypes, setStoreTypes] = useState([]);

  useEffect(() => {
    setSelectedTypeId(storeTypeParam || "all");
  }, [storeTypeParam]);

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await storeAPI.getVisible();
      setStores(response.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.msg ||
          err.message ||
          t("Network error. Please check your connection."),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchStores();
    (async () => {
      try {
        const res = await storeTypeAPI.getAll();
        setStoreTypes(res.data || []);
      } catch {
        setStoreTypes([]);
      }
    })();
    (async () => {
      try {
        const res = await adAPI.getAll({ page: "stores" });
        setBannerAds(res.data || []);
      } catch {
        setBannerAds([]);
      }
    })();
  }, [fetchStores]);

  const filteredStores = useMemo(() => {
    let list = stores;

    if (selectedTypeId && selectedTypeId !== "all") {
      list = list.filter((s) => getID(s.storeTypeId) === selectedTypeId);
    }

    list = list.filter((s) => storeMatchesSelectedCity(s, selectedCity));

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const parts = [
          ...getAllLocalizedFieldValues(s, "name"),
          ...getAllLocalizedFieldValues(s, "address"),
        ];
        if (s.storeTypeId && typeof s.storeTypeId === "object") {
          parts.push(...getAllLocalizedFieldValues(s.storeTypeId, "name"));
        }
        if (typeof s.storeType === "string" && s.storeType.trim()) {
          parts.push(s.storeType.trim());
        }
        if (s.phone != null && String(s.phone).trim()) {
          parts.push(String(s.phone).trim());
        }
        const haystack = parts.join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }

    return list;
  }, [stores, selectedTypeId, selectedCity, searchQuery]);

  const handleTypeSelect = (id) => {
    setSelectedTypeId(id);
    if (id === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ type: id });
    }
  };

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

  const handleStoreClick = (store) => navigate(`/stores/${store._id}`);

  const accent = theme.palette.primary.main;
  const primaryOnSurface =
    theme.palette.primary.dark ||
    (theme.palette.mode === "light" ? "#1565c0" : accent);

  const storeTypeScrollRef = useRef(null);
  const [, setShowScrollLeft] = useState(false);
  const [, setShowScrollRight] = useState(false);

  const updateStoreTypeScrollHints = useCallback(() => {
    const el = storeTypeScrollRef.current;
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
  useEffect(() => {
    updateStoreTypeScrollHints();
    const el = storeTypeScrollRef.current;
    if (!el) {
      const retry = window.setTimeout(updateStoreTypeScrollHints, 350);
      return () => window.clearTimeout(retry);
    }
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateStoreTypeScrollHints());
      ro.observe(el);
    }
    const onWin = () => updateStoreTypeScrollHints();
    window.addEventListener("resize", onWin);
    const t = window.setTimeout(updateStoreTypeScrollHints, 150);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", onWin);
      ro?.disconnect();
    };
  }, [updateStoreTypeScrollHints, storeTypes, loading]);

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

  const mainPageStyleStoreTypeChipSx = (active) => ({
    ...(active ? mainPageStyleActivePillSx : mainPageStyleInactivePillSx),
    flexShrink: 0,
  });

  const skeletonBase = isDark ? alpha("#fff", 0.08) : alpha("#0d111c", 0.07);
  const skeletonHighlight = isDark ? alpha("#fff", 0.12) : alpha("#0d111c", 0.1);

  if (loading) {
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
          {/* Banner — matches loaded banner frame */}
          <Box sx={{ mb: 3 }}>
            <Skeleton
              variant="rounded"
              animation="wave"
              sx={{
                width: "100%",
                height: { xs: 150, md: 220 },
                borderRadius: { xs: 3, md: 4 },
                bgcolor: skeletonBase,
                boxShadow: isDark
                  ? "0 12px 40px rgba(0,0,0,0.45)"
                  : "0 12px 40px rgba(0,0,0,0.08)",
              }}
            />
          </Box>

          {/* Page header — icon, title, chips, search */}
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
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
              <Skeleton
                variant="rounded"
                animation="wave"
                width={48}
                height={48}
                sx={{
                  borderRadius: 2.5,
                  flexShrink: 0,
                  bgcolor: skeletonHighlight,
                }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  width={{ xs: "70%", sm: 180 }}
                  height={28}
                  sx={{ mb: 1, borderRadius: 1, bgcolor: skeletonBase }}
                />
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  <Skeleton
                    variant="rounded"
                    animation="wave"
                    width={88}
                    height={24}
                    sx={{ borderRadius: 3, bgcolor: skeletonBase }}
                  />
                  <Skeleton
                    variant="rounded"
                    animation="wave"
                    width={100}
                    height={24}
                    sx={{ borderRadius: 3, bgcolor: skeletonBase }}
                  />
                </Box>
              </Box>
            </Box>
            <Skeleton
              variant="rounded"
              animation="wave"
              height={40}
              sx={{
                width: { xs: "100%", sm: 260 },
                alignSelf: { sm: "center" },
                borderRadius: 3,
                flexShrink: 0,
                bgcolor: isDark ? alpha("#fff", 0.06) : alpha("#fff", 0.9),
                border: "1px solid",
                borderColor: isDark
                  ? alpha("#fff", 0.08)
                  : alpha(theme.palette.divider, 0.9),
              }}
            />
          </Box>

          {/* Store type chips row */}
          <Box
            sx={{
              display: "flex",
              gap: 0.8,
              overflow: "hidden",
              mb: 3,
              pb: 0.25,
            }}
          >
            {[72, 96, 84, 108, 76, 92].map((w, idx) => (
              <Skeleton
                key={idx}
                variant="rounded"
                animation="wave"
                width={w}
                height={34}
                sx={{
                  flexShrink: 0,
                  borderRadius: "17px",
                  bgcolor: skeletonBase,
                }}
              />
            ))}
          </Box>

          {/* Grid — mirrors StoreCard */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: { xs: 1.5, sm: 2 },
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
                  border: "1px solid",
                  borderColor: isDark
                    ? alpha("#fff", 0.08)
                    : alpha(theme.palette.divider, 0.9),
                  background: isDark
                    ? alpha("#1a2235", 0.92)
                    : theme.palette.background.paper,
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1",
                    maxHeight: { xs: 140, sm: 160 },
                    background: isDark
                      ? `linear-gradient(145deg, ${alpha("#2d3a52", 0.35)} 0%, ${alpha("#1a2235", 0.5)} 100%)`
                      : `linear-gradient(145deg, ${alpha(accent, 0.04)} 0%, ${alpha("#f8fafc", 0.9)} 100%)`,
                  }}
                >
                  <Skeleton
                    variant="rounded"
                    animation="wave"
                    sx={{
                      position: "absolute",
                      inset: "18%",
                      borderRadius: 2,
                      bgcolor: skeletonHighlight,
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    px: 1,
                    py: 1.25,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 44,
                    gap: 0.5,
                  }}
                >
                  <Skeleton
                    variant="rounded"
                    animation="wave"
                    width="88%"
                    height={14}
                    sx={{ borderRadius: 1, bgcolor: skeletonBase }}
                  />
                  <Skeleton
                    variant="rounded"
                    animation="wave"
                    width="62%"
                    height={14}
                    sx={{ borderRadius: 1, bgcolor: skeletonBase }}
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

  const filterRow = [{ _id: "all", name: t("All"), icon: "🏪" }, ...storeTypes];

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
        {/* Banner */}
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

        {/* Page header */}
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
              <StorefrontIcon sx={{ color: "#fff", fontSize: "1.5rem" }} />
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
                {t("Stores")}
              </Typography>
              <Box
                sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.75 }}
              >
                <Chip
                  size="small"
                  label={`${filteredStores.length} ${t("Stores")}`}
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
                <Chip
                  size="small"
                  icon={<span style={{ marginLeft: 8 }}>📍</span>}
                  label={t(`city.${selectedCity}`, {
                    defaultValue: selectedCity,
                  })}
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    color: isDark ? alpha("#fff", 0.9) : "text.primary",
                    borderColor: isDark
                      ? alpha(accent, 0.4)
                      : alpha(theme.palette.text.primary, 0.22),
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

        {/* Store types — same chip + scroll styling as MainPage `FilterChips` */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ position: "relative", pb: 0.25 }}>
            <Box
              ref={storeTypeScrollRef}
              onScroll={updateStoreTypeScrollHints}
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
                const active = selectedTypeId === tItem._id;
                const label =
                  tItem._id === "all"
                    ? t(tItem.name)
                    : locName(tItem) || t(tItem.name);
                const iconChar = tItem.icon || "🏪";
                return (
                  <Chip
                    key={tItem._id}
                    label={label}
                    icon={
                      <Box
                        component="span"
                        sx={{ fontSize: "0.9rem", ml: "4px !important" }}
                      >
                        {iconChar}
                      </Box>
                    }
                    onClick={() => handleTypeSelect(tItem._id)}
                    sx={mainPageStyleStoreTypeChipSx(active)}
                  />
                );
              })}
            </Box>
          </Box>
        </Box>

        {/* Grid — same as BrandCompanyList */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          {filteredStores.map((store, index) => (
            <StoreCard
              key={store._id}
              store={store}
              index={index}
              isDark={isDark}
              locName={locName}
              locAddress={locAddress}
              theme={theme}
              onClick={() => handleStoreClick(store)}
            />
          ))}
        </Box>

        {filteredStores.length === 0 && (
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
            <StorefrontIcon
              sx={{
                fontSize: 72,
                color: alpha(theme.palette.text.secondary, 0.45),
                mb: 2,
              }}
            />
            <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
              {t("No stores found")}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 360, mx: "auto" }}
            >
              {t("No stores match the current filters.")}
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default StoreList;
