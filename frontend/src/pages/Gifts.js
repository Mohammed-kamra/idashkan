import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  useTheme,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  CardgHeader,
  DialogContent,
  DialogActions,
  Button,
  Skeleton,
} from "@mui/material";
import { Search, FilterList, Store, Business } from "@mui/icons-material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import CardGiftcard from "@mui/icons-material/CardGiftcard";
import { giftAPI, storeAPI, brandAPI, adAPI } from "../services/api";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCityFilter } from "../context/CityFilterContext";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import {
  isExpiryStillValid,
  getExpiryRemainingInfo,
  formatExpiryDateDdMmYyyy,
  formatExpiryChipLabel,
  formatExpiryExpiresPrefixedLabel,
  expiryGiftCardBg,
} from "../utils/expiryDate";

const Gifts = () => {
  const theme = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { t } = useTranslation();
  const { locName, locDescription } = useLocalizedContent();
  const navigate = useNavigate();
  const [gifts, setGifts] = useState([]);
  const [filteredGifts, setFilteredGifts] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stores, setStores] = useState([]);
  const [brands, setBrands] = useState([]);
  const [bannerAds, setBannerAds] = useState([]);
  const { selectedCity } = useCityFilter();

  // Filter states
  const [filters, setFilters] = useState({
    search: "",
    store: "",
    brand: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [gifts, filters, selectedCity]);

  usePullToRefresh(fetchData);

  async function fetchData() {
    try {
      setLoading(true);
      const [giftsResponse, storesResponse, brandsResponse, adsResponse] =
        await Promise.all([
          giftAPI.getAll(),
          storeAPI.getAll(),
          brandAPI.getAll(),
          adAPI.getAll({ page: "gifts" }),
        ]);

      // Handle the API response structure: { success: true, data: gifts }
      const giftsData = Array.isArray(giftsResponse.data?.data)
        ? giftsResponse.data.data
        : [];
      const storesData = Array.isArray(storesResponse.data)
        ? storesResponse.data
        : [];
      const brandsData = Array.isArray(brandsResponse.data)
        ? brandsResponse.data
        : [];

      setGifts(giftsData);
      setStores(storesData);
      setBrands(brandsData);
      setBannerAds(adsResponse?.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.msg ||
          err.message ||
          "Network error. Please check your connection.",
      );
      console.error("Error fetching gifts data:", err);
      // Set empty arrays on error to prevent "not iterable" errors
      setGifts([]);
      setStores([]);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  }

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

  const applyFilters = () => {
    // Ensure gifts is always an array
    if (!Array.isArray(gifts)) {
      setFilteredGifts([]);
      return;
    }

    let filtered = [...gifts];

    filtered = filtered.filter((gift) => {
      if (!gift?.expireDate) return true;
      return isExpiryStillValid(gift.expireDate);
    });

    // Search filter
    if (filters.search) {
      filtered = filtered.filter((gift) =>
        gift.description.toLowerCase().includes(filters.search.toLowerCase()),
      );
    }

    // Store filter
    if (filters.store) {
      filtered = filtered.filter(
        (gift) =>
          gift.storeId &&
          Array.isArray(gift.storeId) &&
          gift.storeId.some((store) => store._id === filters.store),
      );
    }

    // Brand filter
    if (filters.brand) {
      filtered = filtered.filter((gift) => gift.brandId?._id === filters.brand);
    }

    // City filter
    if (Array.isArray(filtered)) {
      filtered = filtered.filter((gift) => {
        if (!gift.storeId || gift.storeId.length === 0) {
          // If a gift is not associated with any store, it should probably be shown in all cities.
          // Or, depending on requirements, it could be hidden. I'll assume it should be shown.
          return true;
        }
        return gift.storeId.some((store) => store.storecity === selectedCity);
      });
    }

    // Sort by newest created first
    filtered.sort((a, b) => {
      const aTs = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTs = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
    });

    setFilteredGifts(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleFilters = () => {
    setFiltersOpen(!filtersOpen);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderFilters = () => (
    <Paper
      elevation={0}
      sx={{
        p: 1,
        mb: 1,
        borderRadius: { xs: 2, md: 3 },
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #1E6FD9 0%, #4A90E2 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
        border: `1px solid ${
          theme.palette.mode === "dark" ? "#1E6FD9" : "#e9ecef"
        }`,
      }}
    >
      {/* Mobile Filter Toggle */}
      <Box
        onClick={toggleFilters}
        sx={{
          display: { xs: "flex", md: "none" },
          mb: 2,
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: theme.palette.text.primary,
          }}
        >
          <FilterList sx={{ color: "var(--brand-accent-orange)" }} />
          {t("Filters")}
        </Typography>
      </Box>

      {/* Desktop Filter Header */}
      <Typography
        variant="h6"
        sx={{
          mb: 3,
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          gap: 1,
          color: theme.palette.text.primary,
        }}
      >
        <FilterList sx={{ color: "var(--brand-accent-orange)" }} />
        {t("Filters")}
      </Typography>

      <Box
        sx={{ display: { xs: filtersOpen ? "block" : "none", md: "block" } }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              sx={{ width: "300px" }}
              label={t("Search Gifts")}
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              onClick={(e) => e.stopPropagation()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl sx={{ width: "140px" }} fullWidth>
              <InputLabel>{t("Store")}</InputLabel>
              <Select
                value={filters.store}
                onChange={(e) => handleFilterChange("store", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                label={t("Store")}
              >
                <MenuItem value="">{t("All Stores")}</MenuItem>
                {stores.map((store) => (
                  <MenuItem key={store._id} value={store._id}>
                    {locName(store)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl sx={{ width: "140px" }} fullWidth>
              <InputLabel>{t("Brand")}</InputLabel>
              <Select
                value={filters.brand}
                onChange={(e) => handleFilterChange("brand", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                label={t("Brand")}
              >
                <MenuItem value="">{t("All Brands")}</MenuItem>
                {brands.map((brand) => (
                  <MenuItem key={brand._id} value={brand._id}>
                    {locName(brand)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );

  const renderGiftCard = (gift) => {
    // Safety check to ensure gift is a valid object
    if (!gift || typeof gift !== "object") {
      return null;
    }

    const giftExp = getExpiryRemainingInfo(gift.expireDate);
    const primaryStore =
      Array.isArray(gift.storeId) && gift.storeId.length > 0
        ? gift.storeId[0]
        : null;
    const brand = gift.brandId || null;

    const expiryChipSx = {
      position: "absolute",
      top: 6,
      left: 6,
      zIndex: 2,
      pointerEvents: "none",
      maxWidth: "calc(100% - 12px)",
      fontSize: { xs: "0.5rem", sm: "0.65rem", md: "0.7rem" },
      height: "auto",
      "& .MuiChip-label": {
        whiteSpace: "normal",
        textAlign: "left",
        display: "block",
        lineHeight: 1.2,
        px: 0.75,
        py: 0.25,
      },
    };

    return (
      <Card
        onClick={() => {
          setSelectedGift(gift);
          setDialogOpen(true);
        }}
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          height: { xs: "200px", sm: "250px", md: "280px" },
          width: "165px",
          borderRadius: 2,
          overflow: "hidden",
          cursor: "pointer",
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
        {gift.expireDate ? (
          <Chip
            label={formatExpiryExpiresPrefixedLabel(giftExp, t)}
            size="small"
            sx={{
              ...expiryChipSx,
              bgcolor: expiryGiftCardBg(giftExp),
              color: "white",
            }}
          />
        ) : null}
        {/* Gift Image */}
        <Box
          sx={{
            width: { xs: "100%", sm: "150px", md: "200px" },
            height: { xs: 130, sm: "100%", md: "100%" },
            flexShrink: 0,
            position: "relative",
          }}
        >
          <CardMedia
            component="img"
            image={resolveMediaUrl(gift.image)}
            alt={locDescription(gift) || locName(gift) || ""}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </Box>

        {/* Gift Content */}
        <CardContent
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            p: { xs: 2, sm: 2.5, md: 3 },
            minHeight: 0,
          }}
        >
          {/* Store / Brand Header */}
          {activeTab === 0 && primaryStore && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 1.5,
                pb: 1,
                borderBottom: "1px solid",
                borderColor: theme.palette.divider,
                gap: 1,
              }}
            >
              {primaryStore.logo && (
                <Box
                  component="img"
                  src={resolveMediaUrl(primaryStore.logo)}
                  alt={locName(primaryStore)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid rgba(0,0,0,0.1)",
                    flexShrink: 0,
                  }}
                />
              )}
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "0.7rem", sm: "0.85rem" },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {locName(primaryStore)}
              </Typography>
            </Box>
          )}
          {activeTab === 1 && brand && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 1.5,
                pb: 1,
                borderBottom: "1px solid",
                borderColor: theme.palette.divider,
                gap: 1,
              }}
            >
              {brand.logo && (
                <Box
                  component="img"
                  src={resolveMediaUrl(brand.logo)}
                  alt={locName(brand)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid rgba(0,0,0,0.1)",
                    flexShrink: 0,
                  }}
                />
              )}
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "0.7rem", sm: "0.85rem" },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {locName(brand)}
              </Typography>
            </Box>
          )}

          {/* Main Description */}
          {/* <Typography
            variant="body1"
            sx={{
              alignItems: "center",
              fontSize: { xs: ".75rem", sm: "0.9rem", md: "1.5rem" },
              lineHeight: 1.4,
              mb: 2,
              color: theme.palette.text.primary,
              fontFamily: "NRT reg, Arial, sans-serif",
              overflow: { xs: "none", sm: "hidden", md: "hidden" },
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {gift.description}
          </Typography> */}

          {/* Store and Brand Info */}
          <Box sx={{ mb: 2, flexShrink: 0 }}>
            {gift.storeId && gift.storeId.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                  <Store
                    sx={{
                      fontSize: { xs: 12, sm: 16, md: 16 },
                      mr: 1,
                      color: "var(--brand-light-orange)",
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: { xs: "0.5rem", sm: "0.75rem", md: "0.75rem" },
                      color: theme.palette.text.secondary,
                      fontFamily: "NRT reg, Arial, sans-serif",
                      fontWeight: 500,
                    }}
                  >
                    {t("Stores")}:
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.5,
                  }}
                >
                  {gift.storeId.map((store, index) => (
                    <Typography
                      key={store._id}
                      variant="body2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/stores/${store._id}?tab=gifts`);
                      }}
                      sx={{
                        fontSize: {
                          xs: "0.5rem",
                          sm: "0.75rem",
                          md: "0.75rem",
                        },
                        color: theme.palette.text.secondary,
                        fontFamily: "NRT reg, Arial, sans-serif",
                        cursor: "pointer",
                        userSelect: "none",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "rgba(255, 122, 26, 0.1)"
                            : "rgba(255, 122, 26, 0.05)",
                        border: `1px solid ${
                          theme.palette.mode === "dark"
                            ? "rgba(255, 122, 26, 0.2)"
                            : "rgba(255, 122, 26, 0.1)"
                        }`,
                        "&:hover": {
                          textDecoration: "underline",
                          color: "var(--brand-light-orange)",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(255, 122, 26, 0.2)"
                              : "rgba(255, 122, 26, 0.1)",
                        },
                      }}
                    >
                      {locName(store)}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            {gift.brandId && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 1,
                  cursor: "pointer",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/brands/${gift.brandId._id}?tab=gifts`);
                }}
              >
                <Business
                  sx={{
                    fontSize: 16,
                    mr: 1,
                    color: "var(--brand-light-orange)",
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: "0.5rem", sm: "0.75rem", md: "0.75rem" },
                    color: theme.palette.text.secondary,
                    fontFamily: "NRT reg, Arial, sans-serif",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("Brand")}: {locName(gift.brandId)}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ py: { xs: 5, md: 10 }, px: { xs: 0.5, sm: 1.5, md: 3 } }}>
        <Skeleton
          variant="rounded"
          sx={{ width: "100%", height: { xs: 150, md: 250 }, mb: 3 }}
        />
        <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
          <Skeleton variant="rounded" width={260} height={42} />
        </Box>
        <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" width={110} height={38} />
          ))}
        </Box>
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={i}>
              <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Skeleton variant="rectangular" sx={{ height: { xs: 130, sm: 160 } }} />
                <CardContent sx={{ p: { xs: 1, sm: 1.5 } }}>
                  <Skeleton variant="text" width="85%" height={24} />
                  <Skeleton variant="text" width="65%" height={20} />
                  <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, mb: 1 }}>
                    <Skeleton variant="rounded" width={56} height={20} />
                    <Skeleton variant="rounded" width={70} height={20} />
                  </Box>
                  <Skeleton variant="rounded" width="62%" height={28} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  const allGifts = Array.isArray(filteredGifts) ? filteredGifts : [];
  const storeGifts = Array.isArray(filteredGifts)
    ? filteredGifts.filter(
        (gift) =>
          gift.storeId &&
          Array.isArray(gift.storeId) &&
          gift.storeId.length > 0,
      )
    : [];
  const brandGifts = Array.isArray(filteredGifts)
    ? filteredGifts.filter((gift) => gift.brandId)
    : [];

  return (
    <Box sx={{ py: { xs: 5, md: 10 }, px: { xs: 0.5, sm: 1.5, md: 3 } }}>
      {/* Banner Slider Section (from Ads: pages includes gifts/all) */}
      <Box
        sx={{
          mb: 2,
          // position: { xs: "sticky", md: "static" },
          top: { xs: 100, md: "auto" },
          zIndex: { xs: 1000, md: "auto" },
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: { xs: "150px", sm: "150px", md: "250px" },
            borderRadius: { xs: 2, md: 3 },
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            mb: 4,
            mt: { xs: 0, md: 5 },
          }}
        >
          {bannerAdsWithImages.length > 0 && (
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
                            : null
                    }
                    src={ad.src}
                    alt={`Banner ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      cursor: ad.brandId ? "pointer" : "default",
                    }}
                  />
                </div>
              ))}
            </Slider>
          )}
        </Box>
      </Box>
      {/* Header */}
      {/* <Box display="flex" alignItems="center" mb={4}>
        <CardGiftcard
          sx={{
            fontSize: { xs: 32, sm: 36, md: 40 },
            mr: { xs: 1, sm: 2 },
            color: "var(--brand-light-orange)",
          }}
        />
        <Box>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              color: theme.palette.mode === "dark" ? "#FFA94D" : "#FF7A1A",
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
            }}
          >
            {t("Gifts")}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            {t("Discover amazing gifts from stores and brands")}
          </Typography>
        </Box>
      </Box> */}

      {/* Filters */}
      {/* {renderFilters()} */}

      {/* Tabs */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: 2,
          backgroundColor:
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.05)"
              : "rgba(255, 122, 26, 0.05)",
          border: `1px solid ${
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.1)"
              : "rgba(255, 122, 26, 0.1)"
          }`,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              width: { xs: "125px", sm: "100px", md: "100%" },
              fontSize: { xs: "0.875rem", sm: "1rem" },
            },
          }}
        >
          {/* <Tab
            sx={{ width: { xs: "100px", sm: "100px", md: "100%" } }}
            label={`${t("All Gifts")} (${allGifts.length})`}
            icon={<CardGiftcard />}
            iconPosition="start"
          /> */}
          <Tab
            label={`${t("Store Gifts")} (${storeGifts.length})`}
            icon={<Store />}
            iconPosition="start"
          />
          <Tab
            label={`${t("Brand Gifts")} (${brandGifts.length})`}
            icon={<Business />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Content */}
      <Box>
        {/* {activeTab === 0 && (
          <Box>
            {allGifts.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 8,
                  color: theme.palette.text.secondary,
                }}
              >
                <CardGiftcard sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  {t("No gifts available")}
                </Typography>
                <Typography variant="body1">
                  {t("No gifts match your current filters.")}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(2, 1fr)",
                  },
                  gap: 3,
                  width: "100%",
                }}
              >
                {allGifts.map((gift) => (
                  <Box key={gift._id} sx={{ display: "flex" }}>
                    {renderGiftCard(gift)}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )} */}

        {activeTab === 0 && (
          <Box>
            {storeGifts.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 8,
                  color: theme.palette.text.secondary,
                }}
              >
                <Store sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  {t("No store gifts available")}
                </Typography>
                <Typography variant="body1">
                  {t("No store gifts match your current filters.")}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(2, 1fr)",
                  },
                  gap: 3,
                  width: "100%",
                }}
              >
                {storeGifts.map((gift) => (
                  <Box key={gift._id} sx={{ display: "flex" }}>
                    {renderGiftCard(gift)}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            {brandGifts.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 8,
                  color: theme.palette.text.secondary,
                }}
              >
                <Business sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  {t("No brand gifts available")}
                </Typography>
                <Typography variant="body1">
                  {t("No brand gifts match your current filters.")}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(2, 1fr)",
                  },
                  gap: 3,
                  width: "100%",
                }}
              >
                {brandGifts.map((gift) => (
                  <Box key={gift._id} sx={{ display: "flex" }}>
                    {renderGiftCard(gift)}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
      {/* Gift Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <ShoppingCartIcon color="primary" />
            <Typography variant="h6" component="span">
              {t("Gift Information")}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedGift && (
            <Paper
              elevation={2}
              sx={{ p: 3, borderRadius: 3, bgcolor: "background.default" }}
            >
              {selectedGift.image && (
                <Box display="flex" justifyContent="center" mb={2}>
                  <img
                    src={resolveMediaUrl(selectedGift.image)}
                    alt={locName(selectedGift) || "Gift image"}
                    style={{
                      maxWidth: 220,
                      maxHeight: 220,
                      borderRadius: 16,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      objectFit: "cover",
                    }}
                  />
                </Box>
              )}
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography
                  variant="h6"
                  color="primary"
                  align="center"
                  gutterBottom
                >
                  {locDescription(selectedGift)}
                </Typography>

                {selectedGift.brandId && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Business fontSize="small" color="action" />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ cursor: "pointer" }}
                      onClick={() => {
                        navigate(
                          `/brands/${selectedGift.brandId._id}?tab=gifts`,
                        );
                      }}
                    >
                      {t("Brand")}: {locName(selectedGift.brandId)}
                    </Typography>
                  </Box>
                )}

                {Array.isArray(selectedGift.storeId) &&
                  selectedGift.storeId.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Store fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {t("Stores")}:
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.75,
                          mt: 0.5,
                        }}
                      >
                        {selectedGift.storeId.map((store) => (
                          <Chip
                            key={store._id}
                            label={locName(store)}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/stores/${store._id}?tab=gifts`);
                            }}
                            size="small"
                            sx={{
                              cursor: "pointer",
                              "&:hover": { opacity: 0.9 },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                {selectedGift.expireDate && (
                  <Box display="flex" flexDirection="column" gap={0.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocalOfferIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {t("Expires")}:{" "}
                        {formatExpiryDateDdMmYyyy(selectedGift.expireDate)}
                      </Typography>
                    </Box>
                    {(() => {
                      const expInfo = getExpiryRemainingInfo(
                        selectedGift.expireDate,
                      );
                      const remain = formatExpiryChipLabel(expInfo, t);
                      return remain ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ pl: 3.5 }}
                        >
                          {remain}
                        </Typography>
                      ) : null;
                    })()}
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDialogOpen(false)}
            variant="contained"
            color="primary"
          >
            {t("Close")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Gifts;
