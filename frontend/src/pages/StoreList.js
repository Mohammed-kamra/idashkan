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
  CardContent,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { storeAPI, adAPI, storeTypeAPI } from "../services/api";
import BannerCarousel from "../components/BannerCarousel";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
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

/** Matches store cards on `ShoppingPage` (logo band, Delivery/VIP chips, title + type). */
const StoreCard = ({ store, index, isDark, onClick, locName, t }) => {
  const titleRaw = store.statusAll === "off" ? "" : locName(store);
  const title =
    typeof titleRaw === "string"
      ? titleRaw.trim()
      : String(titleRaw || "").trim();

  return (
    <Fade in timeout={280 + Math.min(index * 50, 400)}>
      <Card
        elevation={0}
        onClick={onClick}
        sx={{
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          borderRadius: "16px",
          overflow: "hidden",
          width: "100%",
          height: "100%",
          background: isDark
            ? "linear-gradient(145deg,#1e2a3a,#243040)"
            : "#ffffff",
          border: isDark
            ? "1px solid rgba(255,255,255,0.07)"
            : "1px solid #eef0f4",
          boxShadow: isDark
            ? "0 4px 16px rgba(0,0,0,0.3)"
            : "0 2px 12px rgba(0,0,0,0.05)",
          transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: isDark
              ? "0 8px 28px rgba(0,0,0,0.45)"
              : "0 8px 24px rgba(245,158,11,0.16)",
            borderColor: isDark ? "rgba(245,158,11,0.3)" : "#fde68a",
          },
          "&:active": { transform: "translateY(0)" },
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: { xs: 115, sm: 130, md: 145 },
            flexShrink: 0,
            background: isDark ? "rgba(255,255,255,0.04)" : "#f9fafb",
            overflow: "hidden",
          }}
        >
          {store.logo ? (
            <CardMedia
              component="img"
              image={resolveMediaUrl(store.logo)}
              alt={title || store.name}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                transition: "transform 0.35s ease",
                ".MuiCard-root:hover &": { transform: "scale(1.05)" },
              }}
            />
          ) : (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <StorefrontIcon
                sx={{
                  fontSize: { xs: 40, sm: 48 },
                  color: isDark ? "rgba(255,255,255,0.18)" : "#d1d5db",
                }}
              />
            </Box>
          )}

          {store.isHasDelivery && (
            <Chip
              icon={
                <LocalShippingIcon
                  sx={{
                    fontSize: "0.75rem !important",
                    color: "white !important",
                  }}
                />
              }
              label={t("Delivery")}
              size="small"
              sx={{
                position: "absolute",
                bottom: 7,
                left: 7,
                height: 22,
                fontSize: "0.65rem",
                fontWeight: 700,
                bgcolor: "rgba(239,68,68,0.85)",
                color: "white",
                border: "none",
                backdropFilter: "blur(4px)",
                "& .MuiChip-label": { px: 0.6 },
              }}
            />
          )}

          {store.isVip && (
            <Chip
              label="VIP"
              size="small"
              sx={{
                position: "absolute",
                top: 7,
                right: 7,
                height: 20,
                fontSize: "0.6rem",
                fontWeight: 800,
                bgcolor: "#f59e0b",
                color: "white",
                border: "none",
                boxShadow: "0 2px 6px rgba(245,158,11,0.5)",
                "& .MuiChip-label": { px: 0.6 },
              }}
            />
          )}
        </Box>

        {title ? (
          <CardContent
            sx={{
              p: "10px 10px 12px !important",
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 0.4,
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: "0.82rem", sm: "0.88rem" },
                color: isDark ? "rgba(255,255,255,0.92)" : "#111827",
                textAlign: "center",
                lineHeight: 1.3,
                minHeight: "2.6em",
              }}
            >
              {title}
            </Typography>
            {store.storeTypeId?.name && (
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af",
                  fontSize: "0.7rem",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {locName(store.storeTypeId) || t(store.storeTypeId.name)}
              </Typography>
            )}
          </CardContent>
        ) : null}
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
  const skeletonHighlight = isDark
    ? alpha("#fff", 0.12)
    : alpha("#0d111c", 0.1);

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
          <Box sx={{ mb: 2 }}>
            <Skeleton
              variant="rounded"
              animation="wave"
              sx={{
                width: "100%",
                height: { xs: "160px", sm: "220px", md: "280px" },
                borderRadius: 3,
                bgcolor: skeletonBase,
                boxShadow: isDark
                  ? "0 8px 32px rgba(0,0,0,0.4)"
                  : "0 8px 32px rgba(30,111,217,0.15)",
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

          {/* Grid — mirrors ShoppingPage / StoreCard */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(3, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
                lg: "repeat(5, minmax(0, 1fr))",
              },
              gap: { xs: 1.2, sm: 1.5, md: 2 },
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Box key={i} sx={{ minWidth: 0, width: "100%" }}>
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  sx={{
                    width: "100%",
                    height: { xs: 115, sm: 130, md: 145 },
                    borderRadius: "16px 16px 0 0",
                  }}
                />
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  sx={{
                    width: "100%",
                    height: 70,
                    borderRadius: "0 0 16px 16px",
                    mt: "1px",
                  }}
                />
              </Box>
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
        {/* Ads banner — same as MainPage `BannerCarousel` */}
        <BannerCarousel
          banners={bannerAdsWithImages}
          onBannerClick={(ad) => {
            if (ad.brandId) navigate(`/brands/${ad.brandId}`);
            else if (ad.storeId) navigate(`/stores/${ad.storeId}`);
            else if (ad.giftId) navigate(`/gifts/${ad.giftId}`);
          }}
        />

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
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(4, 1fr)",
              lg: "repeat(5, 1fr)",
            },
            gap: { xs: 1.2, sm: 1.5, md: 2 },
          }}
        >
          {filteredStores.map((store, index) => (
            <StoreCard
              sx={{
                alignItems: "center",
                justifyContent: "center",
              }}
              key={store._id}
              store={store}
              index={index}
              isDark={isDark}
              locName={locName}
              t={t}
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
