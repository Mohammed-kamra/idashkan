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
  CardContent,
  CardMedia,
  Chip,
  IconButton,
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
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SearchIcon from "@mui/icons-material/Search";
import Loader from "../components/Loader";
import { useTranslation } from "react-i18next";
import { useCityFilter } from "../context/CityFilterContext";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { cityStringsMatch } from "../utils/cityMatch";
import { getAllLocalizedFieldValues } from "../utils/localize";
import { useCachedDatasets } from "../hooks/useCachedData";
import useOnlineStatus from "../hooks/useOnlineStatus";
import OfflineCacheChip from "../components/OfflineCacheChip";

const STORE_LIST_OFFLINE_DATASETS = ["stores", "store-types", "ads"];

const EMPTY_OFFLINE_LIST = [];

function getID(id) {
  if (typeof id === "string") return id;
  if (id && typeof id === "object") {
    return id.$oid || String(id._id) || String(id);
  }
  return id;
}

const StoreCard = ({ store, index, isDark, t, onClick, locName, theme }) => {
  const accent = theme.palette.primary.main;
  /** Readable label on pale tints in light mode */
  const primaryOnSurface =
    theme.palette.primary.dark ||
    (theme.palette.mode === "light" ? "#1565c0" : accent);
  const typeRaw = store?.storeTypeId;
  const typeLabel =
    typeof store?.storeType === "string"
      ? store.storeType
      : typeRaw && typeof typeRaw === "object"
        ? locName(typeRaw)
        : "";

  return (
    <Fade in timeout={280 + Math.min(index * 60, 400)}>
      <Card
        elevation={0}
        onClick={onClick}
        sx={{
          cursor: "pointer",
          display: "flex",
          flexDirection: { xs: "row", sm: "column" },
          alignItems: { xs: "stretch", sm: "initial" },
          borderRadius: 3,
          overflow: "hidden",
          width: "100%",
          maxWidth: { sm: 280, md: 300 },
          mx: { sm: "auto" },
          height: { xs: 180, sm: "auto" },
          border: "1px solid",
          borderColor: isDark
            ? alpha("#fff", 0.08)
            : alpha(theme.palette.divider, 0.9),
          background: isDark
            ? alpha("#1a2235", 0.92)
            : theme.palette.background.paper,
          transition:
            "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.2s",
          "&:hover": {
            transform: { xs: "none", sm: "translateY(-6px)" },
            boxShadow: isDark
              ? `0 14px 36px ${alpha("#000", 0.4)}`
              : `0 14px 36px ${alpha(accent, 0.16)}`,
            borderColor: alpha(accent, isDark ? 0.45 : 0.3),
            "& .store-list-card-media": {
              transform: { xs: "none", sm: "scale(1.06)" },
            },
            "& .store-list-card-arrow": {
              opacity: 1,
              transform: "translateX(4px)",
            },
          },
        }}
      >
        {/* Logo / image — left on mobile, top on sm+ */}
        <Box
          className="store-list-card-media-wrap"
          sx={{
            position: "relative",
            height: { xs: "100%", sm: 180 },
            width: { xs: 120, sm: "100%" },
            flexShrink: { xs: 0, sm: 1 },
            background:
              theme.palette.mode === "dark"
                ? `linear-gradient(135deg, ${alpha("#2d3a52", 0.95)} 0%, ${alpha("#1a2235", 1)} 100%)`
                : alpha(theme.palette.background.default, 0.5),
          }}
        >
          {store.logo ? (
            <CardMedia
              component="img"
              image={resolveMediaUrl(store.logo)}
              alt={store.name}
              className="store-list-card-media"
              sx={{
                objectFit: "contain",
                width: "100%",
                height: "100%",
                p: 1.5,
                transition: "transform 0.35s ease",
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
                color: alpha(accent, 0.4),
              }}
            >
              <StorefrontIcon sx={{ fontSize: { xs: 56, sm: 72 } }} />
            </Box>
          )}

          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.18) 100%)",
            }}
          />

          {store.isVip && (
            <Box
              sx={{
                position: "absolute",
                top: 8,
                left: 8,
                zIndex: 2,
                backgroundColor: "white",
                borderRadius: "50%",
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                "&::before": {
                  content: '"👑"',
                  fontSize: "16px",
                },
              }}
            />
          )}

          <IconButton
            className="store-list-card-arrow"
            size="small"
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              backgroundColor: "rgba(255,255,255,0.28)",
              color: "white",
              opacity: 0,
              transition: "all 0.25s ease",
              backdropFilter: "blur(6px)",
              display: { xs: "none", sm: "flex" },
              "&:hover": { backgroundColor: "rgba(255,255,255,0.4)" },
            }}
            aria-hidden
          >
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </Box>

        <CardContent
          sx={{
            p: { xs: 1.25, sm: 2 },
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
            flexGrow: 1,
            minWidth: 0,
            textAlign: { xs: "left", sm: "center" },
            justifyContent: { xs: "center", sm: "flex-start" },
          }}
        >
          <Typography
            variant="h6"
            component="h2"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "0.95rem", sm: "1.1rem" },
              color: "text.primary",
              textAlign: { xs: "left", sm: "center" },
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {locName(store)}
          </Typography>

          {typeLabel ? (
            <Chip
              label={typeLabel}
              size="small"
              sx={{
                alignSelf: { xs: "flex-start", sm: "center" },
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 26,
                ...(isDark
                  ? {
                      bgcolor: alpha(accent, 0.22),
                      color: alpha("#fff", 0.95),
                      border: `1px solid ${alpha(accent, 0.38)}`,
                    }
                  : {
                      bgcolor: alpha(primaryOnSurface, 0.1),
                      color: primaryOnSurface,
                      border: `1px solid ${alpha(primaryOnSurface, 0.42)}`,
                    }),
              }}
            />
          ) : null}

          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              display: { xs: "block", sm: "-webkit-box" },
              WebkitLineClamp: { sm: 2 },
              WebkitBoxOrient: { sm: "vertical" },
              overflow: "hidden",
              fontSize: "0.8rem",
              textAlign: { xs: "left", sm: "center" },
            }}
          >
            <LocationOnIcon
              sx={{ fontSize: 15, mr: 0.35, verticalAlign: "middle" }}
            />
            {store.address || t("Address not provided")}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              fontSize: "0.8rem",
              textAlign: { xs: "left", sm: "center" },
            }}
          >
            <PhoneIcon
              sx={{ fontSize: 15, mr: 0.35, verticalAlign: "middle" }}
            />
            {store.phone || t("Phone not provided")}
          </Typography>
        </CardContent>
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
  const { locName } = useLocalizedContent();
  const { selectedCity } = useCityFilter();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bannerAds, setBannerAds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const storeTypeParam = searchParams.get("type");
  const [selectedTypeId, setSelectedTypeId] = useState(storeTypeParam || "all");
  const [storeTypes, setStoreTypes] = useState([]);
  const isOnline = useOnlineStatus();
  const { itemsByDataset: offlineCache } = useCachedDatasets(
    STORE_LIST_OFFLINE_DATASETS,
  );
  const cachedStores = offlineCache.stores ?? EMPTY_OFFLINE_LIST;
  const cachedStoreTypes = offlineCache["store-types"] ?? EMPTY_OFFLINE_LIST;
  const cachedAds = offlineCache.ads ?? EMPTY_OFFLINE_LIST;

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

  useEffect(() => {
    if (isOnline) return;
    if (!stores.length && cachedStores.length) {
      setStores(cachedStores);
      setError("");
      setLoading(false);
    }
    if (!storeTypes.length && cachedStoreTypes.length) {
      setStoreTypes(cachedStoreTypes);
    }
    if (!bannerAds.length && cachedAds.length) {
      setBannerAds(cachedAds.filter((ad) => ad?.page === "stores"));
    }
  }, [
    isOnline,
    stores.length,
    storeTypes.length,
    bannerAds.length,
    cachedStores,
    cachedStoreTypes,
    cachedAds,
  ]);

  const filteredStores = useMemo(() => {
    let list = stores;

    if (selectedTypeId && selectedTypeId !== "all") {
      list = list.filter((s) => getID(s.storeTypeId) === selectedTypeId);
    }

    list = list.filter((s) =>
      cityStringsMatch(selectedCity, s.storecity || s.city || ""),
    );

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
  const showCacheChip = !isOnline && filteredStores.length > 0;

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
          <Skeleton variant="rounded" width="55%" height={36} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" width="100%" height={48} sx={{ mb: 3 }} />
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card
                key={i}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: { xs: "row", sm: "column" },
                  height: { xs: 180, sm: "auto" },
                }}
              >
                <Skeleton
                  variant="rectangular"
                  sx={{
                    width: { xs: 120, sm: "100%" },
                    height: { xs: "100%", sm: 180 },
                    flexShrink: 0,
                  }}
                />
                <CardContent sx={{ flex: 1, py: 1.5 }}>
                  <Skeleton variant="text" width="75%" height={28} />
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="90%" />
                </CardContent>
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
      <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 2 } }}>
        {showCacheChip && (
          <Box sx={{ mb: 1, mt: { xs: 2, md: 3 } }}>
            <OfflineCacheChip />
          </Box>
        )}
        {/* Banner */}
        <Box sx={{ mb: 3, mt: { xs: 4, md: 5 } }}>
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

        {/* Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
            },
            gap: { xs: 2, sm: 2.5, md: 3 },
          }}
        >
          {filteredStores.map((store, index) => (
            <StoreCard
              key={store._id}
              store={store}
              index={index}
              isDark={isDark}
              t={t}
              locName={locName}
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





