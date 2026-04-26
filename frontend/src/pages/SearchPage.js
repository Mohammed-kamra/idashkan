import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Paper,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  IconButton,
  Button,
  useTheme,
} from "@mui/material";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import SearchIcon from "@mui/icons-material/Search";
import StorefrontIcon from "@mui/icons-material/Storefront";
import BusinessIcon from "@mui/icons-material/Business";
import CategoryIcon from "@mui/icons-material/Category";
import HistoryIcon from "@mui/icons-material/History";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { searchAPI } from "../services/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useCityFilter } from "../context/CityFilterContext";
import { getLocalizedField } from "../utils/localize";
import { useDataLanguage } from "../context/DataLanguageContext";
import { getDeviceId } from "../utils/deviceId";
import { formatPriceDigits } from "../utils/formatPriceNumber";
import {
  getSearchHistory,
  addToSearchHistory,
  removeFromSearchHistory,
  clearSearchHistory,
} from "../utils/searchHistory";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { isExpiryStillValid } from "../utils/expiryDate";
import ProductDetailDialog from "../components/ProductDetailDialog";
import useOnlineStatus from "../hooks/useOnlineStatus";
import {
  logSearchEvent,
  recordSearchClick,
} from "../utils/searchAnalyticsTrack";
import { useDraftCartDrawer } from "../hooks/useDraftCartDrawer";

/** Opens Shopping draft cart drawer (EN/KU/AR-friendly keywords). */
function isCartSearchIntent(raw) {
  const q = (raw || "").trim();
  if (q.length < 2) return false;
  const t = q.toLowerCase();
  if (
    /^(my\s*)?(cart|basket|draft|bag)$/.test(t) ||
    /^(my\s+)?(cart|basket|draft(\s+cart)?)$/.test(t) ||
    /^(shopping\s*)?(cart|bag)$/.test(t) ||
    /\b(draft\s+cart|my\s+cart|shopping\s+cart)\b/i.test(q)
  ) {
    return true;
  }
  return /سلة|کارت|باسکێت|هەڵگرتن/i.test(q);
}

const SearchPage = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { dataLanguage } = useDataLanguage();
  const navigate = useNavigate();
  const { openDraftCart } = useDraftCartDrawer();
  const { user } = useAuth();
  const { selectedCity } = useCityFilter();
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get("q") || "";

  const [query, setQuery] = useState(qParam);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    products: [],
    stores: [],
    brands: [],
    companies: [],
    categories: [],
    categoryTypes: [],
  });
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const isOnline = useOnlineStatus();
  const searchPageLogIdRef = useRef(null);

  const userId = user?.id || user?._id || null;
  const deviceId = userId ? null : getDeviceId();

  const refreshRecentSearches = useCallback(() => {
    setRecentSearches(getSearchHistory(userId, deviceId));
  }, [userId, deviceId]);

  useEffect(() => {
    refreshRecentSearches();
  }, [refreshRecentSearches]);
  const performSearch = useCallback(
    async (q) => {
      const trimmed = (q || "").trim();
      if (trimmed.length < 2) {
        searchPageLogIdRef.current = null;
        setResults({
          products: [],
          stores: [],
          brands: [],
          companies: [],
          categories: [],
          categoryTypes: [],
        });
        setSearched(trimmed.length > 0);
        return;
      }
      if (isCartSearchIntent(trimmed)) {
        searchPageLogIdRef.current = null;
        setResults({
          products: [],
          stores: [],
          brands: [],
          companies: [],
          categories: [],
          categoryTypes: [],
        });
        openDraftCart();
        setSearched(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        if (!isOnline) {
          searchPageLogIdRef.current = null;
          setResults({
            products: [],
            stores: [],
            brands: [],
            companies: [],
            categories: [],
            categoryTypes: [],
          });
          return;
        }
        const res = await searchAPI.search(trimmed, selectedCity || null);
        const data = res?.data?.data || res?.data || {};
        const visibleProducts = (data.products || []).filter((product) => {
          if (!product?.expireDate) return true;
          return isExpiryStillValid(product.expireDate);
        });
        setResults({
          products: visibleProducts,
          stores: data.stores || [],
          brands: data.brands || [],
          companies: data.companies || [],
          categories: data.categories || [],
          categoryTypes: data.categoryTypes || [],
        });
        const totalResults =
          visibleProducts.length +
          (data.stores || []).length +
          (data.brands || []).length +
          (data.companies || []).length +
          (data.categories || []).length +
          (data.categoryTypes || []).length;
        void logSearchEvent({
          searchText: trimmed,
          resultCount: totalResults,
          source: "searchpage",
          filters: {
            category: null,
            city: selectedCity || null,
            store: null,
            sortBy: "default",
            priceMin: null,
            priceMax: null,
          },
        }).then((id) => {
          searchPageLogIdRef.current = id;
        });
        addToSearchHistory(trimmed, userId, deviceId);
        refreshRecentSearches();
      } catch (err) {
        console.error("Search error:", err);
        searchPageLogIdRef.current = null;
        setResults({
          products: [],
          stores: [],
          brands: [],
          companies: [],
          categories: [],
          categoryTypes: [],
        });
      } finally {
        setLoading(false);
      }
    },
    [
      userId,
      deviceId,
      refreshRecentSearches,
      selectedCity,
      openDraftCart,
      isOnline,
    ],
  );

  useEffect(() => {
    if (qParam) {
      setQuery(qParam);
    } else {
      setResults({
        products: [],
        stores: [],
        brands: [],
        companies: [],
        categories: [],
        categoryTypes: [],
      });
      setSearched(false);
    }
  }, [qParam]);

  // Re-run search when selected city changes so results stay in the chosen city
  useEffect(() => {
    if (qParam && (qParam || "").trim().length >= 2) {
      performSearch((qParam || "").trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when city changes
  }, [selectedCity]);

  const handleSearchClick = () => {
    const trimmed = (query || "").trim();
    if (trimmed.length < 2) return;
    setSearchParams({ q: trimmed }, { replace: true });
    performSearch(trimmed);
  };

  const handleRecentClick = (term) => {
    setQuery(term);
    setSearchParams({ q: term }, { replace: true });
    performSearch(term);
  };

  const handleRemoveRecent = (e, term) => {
    e.stopPropagation();
    removeFromSearchHistory(term, userId, deviceId);
    refreshRecentSearches();
  };

  const handleClearRecent = () => {
    clearSearchHistory(userId, deviceId);
    refreshRecentSearches();
  };

  const handleProductClick = (product) => {
    if (searchPageLogIdRef.current && product?._id) {
      recordSearchClick(
        searchPageLogIdRef.current,
        String(product._id),
        "product",
      );
    }
    setSelectedProduct(product);
    setProductDialogOpen(true);
  };
  const handleStoreClick = (id) => {
    if (searchPageLogIdRef.current && id) {
      recordSearchClick(searchPageLogIdRef.current, String(id), "store");
    }
    navigate(`/stores/${id}`);
  };
  const handleBrandClick = (id) => {
    if (searchPageLogIdRef.current && id) {
      recordSearchClick(searchPageLogIdRef.current, String(id), "brand");
    }
    navigate(`/brands/${id}`);
  };
  const handleCompanyClick = (id) => {
    if (searchPageLogIdRef.current && id) {
      recordSearchClick(searchPageLogIdRef.current, String(id), "company");
    }
    navigate(`/companies/${id}`);
  };

  const handleCategoryClick = (cat) => {
    if (searchPageLogIdRef.current && cat?._id) {
      recordSearchClick(
        searchPageLogIdRef.current,
        String(cat._id),
        "category",
      );
    }
    navigate("/categories", {
      state: { category: { _id: cat._id, name: cat.name } },
    });
  };

  const handleCategoryTypeClick = (hit) => {
    if (searchPageLogIdRef.current && hit?.category?._id && hit?.type?._id) {
      recordSearchClick(
        searchPageLogIdRef.current,
        `${hit.category._id}:${hit.type._id}`,
        "categoryType",
      );
    }
    navigate("/categories", {
      state: {
        category: hit.category,
        categoryType: hit.type,
      },
    });
  };

  // const bannerAdsWithImages = useMemo(
  //   () =>
  //     (bannerAds || [])
  //       .filter((a) => !!a.image)
  //       .map((a) => ({
  //         _id: a._id,
  //         src: a.image.startsWith("http")
  //           ? a.image
  //           : `${import.meta.env.VITE_BACKEND_URL}${a.image}`,
  //         brandId: a.brandId,
  //         storeId: a.storeId,
  //         giftId: a.giftId,
  //       })),
  //   [bannerAds],
  // );
  // const bannerSettings = {
  //   dots: true,
  //   infinite: true,
  //   speed: 500,
  //   slidesToShow: 1,
  //   slidesToScroll: 1,
  //   autoplay: true,
  //   autoplaySpeed: 3000,
  //   responsive: [
  //     {
  //       breakpoint: 1024,
  //       settings: { dots: true, arrows: false },
  //     },
  //     {
  //       breakpoint: 600,
  //       settings: { dots: true, arrows: false, autoplaySpeed: 4000 },
  //     },
  //   ],
  // };
  const formatPrice = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return `${formatPriceDigits(n)} ${t("ID")}`;
  };

  const searchProducts = Array.isArray(results.products)
    ? results.products
    : [];
  const searchStores = Array.isArray(results.stores) ? results.stores : [];
  const searchBrands = Array.isArray(results.brands) ? results.brands : [];
  const searchCompanies = Array.isArray(results.companies)
    ? results.companies
    : [];
  const searchCategories = Array.isArray(results.categories)
    ? results.categories
    : [];
  const searchCategoryTypes = Array.isArray(results.categoryTypes)
    ? results.categoryTypes
    : [];

  const hasResults =
    searchProducts.length > 0 ||
    searchStores.length > 0 ||
    searchBrands.length > 0 ||
    searchCompanies.length > 0 ||
    searchCategories.length > 0 ||
    searchCategoryTypes.length > 0;

  return (
    <Box sx={{ pt: 5 }}>
      {/* {bannerAdsWithImages.length > 0 && (
        <Box
          sx={{
            position: "relative",
            backgroundColor:
              theme.palette.mode === "dark" ? "#121212" : "#ffffff",
            borderRadius: { xs: 2, md: 3 },
            mb: 2,
            boxSizing: "border-box",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: "lg",
              margin: "0 auto",
              height: { xs: "150px", sm: "200px", md: "250px" },
              borderRadius: { xs: 2, md: 3 },
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
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
                    src={ad.src || ad}
                    alt={`Banner ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      cursor:
                        ad.brandId || ad.storeId || ad.giftId
                          ? "pointer"
                          : "default",
                    }}
                  />
                </div>
              ))}
            </Slider>
          </Box>
        </Box>
      )} */}

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "stretch" }}>
          <TextField
            fullWidth
            autoFocus
            placeholder={t("Search for products, stores and more...")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchClick();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearchClick}
            disabled={loading || (query || "").trim().length < 2}
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SearchIcon />
              )
            }
            sx={{
              minWidth: 60,
              borderRadius: 2,
              px: 2,
            }}
          >
            {t("Search")}
          </Button>
        </Box>
      </Paper>

      {(query || "").trim().length < 2 && recentSearches.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 4 }}
        >
          {t("No recent searches")}
        </Typography>
      )}

      {(query || "").trim().length < 2 && recentSearches.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "action.hover",
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <HistoryIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight={600}>
                {t("Recent searches")}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleClearRecent}
              sx={{ color: "text.secondary" }}
              title={t("Clear all")}
              aria-label={t("Clear all")}
            >
              <DeleteSweepIcon fontSize="small" />
            </IconButton>
          </Box>
          <List disablePadding>
            {recentSearches.slice(0, 5).map((term) => (
              <ListItemButton
                key={term}
                onClick={() => handleRecentClick(term)}
                sx={{
                  py: 1.25,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                </ListItemAvatar>
                <ListItemText
                  primary={term}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => handleRemoveRecent(e, term)}
                  sx={{
                    color: "text.secondary",
                    "&:hover": { color: "error.main" },
                  }}
                  aria-label={t("Remove from history")}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      {searched &&
        !loading &&
        !hasResults &&
        (query || "").trim().length >= 2 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 4 }}
          >
            {t("No results found")}
          </Typography>
        )}

      {searched && hasResults && (query || "").trim().length >= 2 && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          {searchCategories.length > 0 && (
            <>
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: "action.hover",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <CategoryIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={600}>
                  {t("Categories")}
                </Typography>
              </Box>
              <List disablePadding>
                {searchCategories.map((cat) => (
                  <ListItemButton
                    key={cat._id}
                    onClick={() => handleCategoryClick(cat)}
                    sx={{
                      py: 1.5,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: "grey.200",
                        }}
                      >
                        {cat.image ? (
                          <img
                            src={resolveMediaUrl(cat.image)}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <CategoryIcon sx={{ color: "grey.600" }} />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        getLocalizedField(cat, "name", dataLanguage) || cat.name
                      }
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItemButton>
                ))}
              </List>
              <Divider />
            </>
          )}

          {searchCategoryTypes.length > 0 && (
            <>
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: "action.hover",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <CategoryIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={600}>
                  {t("Category types")}
                </Typography>
              </Box>
              <List disablePadding>
                {searchCategoryTypes.map((hit) => (
                  <ListItemButton
                    key={`${hit.category._id}-${hit.type._id}`}
                    onClick={() => handleCategoryTypeClick(hit)}
                    sx={{
                      py: 1.5,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: "grey.200",
                        }}
                      >
                        {hit.category.image ? (
                          <img
                            src={resolveMediaUrl(hit.category.image)}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <CategoryIcon sx={{ color: "grey.600" }} />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        getLocalizedField(hit.type, "name", dataLanguage) ||
                        hit.type.name
                      }
                      secondary={
                        getLocalizedField(hit.category, "name", dataLanguage) ||
                        hit.category.name
                      }
                      primaryTypographyProps={{ fontWeight: 600 }}
                      secondaryTypographyProps={{ fontSize: "0.8rem" }}
                    />
                  </ListItemButton>
                ))}
              </List>
              <Divider />
            </>
          )}

          {searchProducts.length > 0 && (
            <>
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: "action.hover",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <CategoryIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={600}>
                  {t("Products")}
                </Typography>
              </Box>
              <List disablePadding>
                {searchProducts.map((p, i) => (
                  <ListItemButton
                    key={p._id}
                    onClick={() => handleProductClick(p)}
                    sx={{
                      py: 1.5,
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: "grey.200",
                          objectFit: "contain",
                        }}
                      >
                        {p.image && (
                          <img
                            src={resolveMediaUrl(p.image)}
                            alt={p.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        )}
                        {!p.image && (
                          <CategoryIcon sx={{ color: "grey.600" }} />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        getLocalizedField(p, "name", dataLanguage) || p.name
                      }
                      secondary={
                        [
                          formatPrice(p.newPrice) || formatPrice(p.price),
                          p.brandId?.statusAll === "off"
                            ? null
                            : getLocalizedField(
                                p.brandId,
                                "name",
                                dataLanguage,
                              ) || p.brandId?.name,
                          getLocalizedField(p.storeId, "name", dataLanguage) ||
                            p.storeId?.name,
                        ]
                          .filter(Boolean)
                          .join(" • ") || undefined
                      }
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItemButton>
                ))}
              </List>
              <Divider />
            </>
          )}

          {searchStores.length > 0 && (
            <>
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: "action.hover",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <StorefrontIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={600}>
                  {t("Stores")}
                </Typography>
              </Box>
              <List disablePadding>
                {searchStores.map((s) => (
                  <ListItemButton
                    key={s._id}
                    onClick={() => handleStoreClick(s._id)}
                    sx={{
                      py: 1.5,
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        variant="rounded"
                        src={s.logo ? resolveMediaUrl(s.logo) : undefined}
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: "grey.200",
                        }}
                      >
                        {!s.logo && (
                          <StorefrontIcon sx={{ color: "grey.600" }} />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        getLocalizedField(s, "name", dataLanguage) || s.name
                      }
                      secondary={
                        s.storeTypeId?.name
                          ? getLocalizedField(
                              s.storeTypeId,
                              "name",
                              dataLanguage,
                            ) || t(s.storeTypeId.name)
                          : undefined
                      }
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItemButton>
                ))}
              </List>
              <Divider />
            </>
          )}

          {searchBrands.length > 0 && (
            <>
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: "action.hover",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <BusinessIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={600}>
                  {t("Brands")}
                </Typography>
              </Box>
              <List disablePadding>
                {searchBrands.map((b) => (
                  <ListItemButton
                    key={b._id}
                    onClick={() => handleBrandClick(b._id)}
                    sx={{
                      py: 1.5,
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        variant="rounded"
                        src={b.logo ? resolveMediaUrl(b.logo) : undefined}
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: "grey.200",
                        }}
                      >
                        {!b.logo && <BusinessIcon sx={{ color: "grey.600" }} />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        getLocalizedField(b, "name", dataLanguage) || b.name
                      }
                      secondary={
                        b.brandTypeId?.name
                          ? getLocalizedField(
                              b.brandTypeId,
                              "name",
                              dataLanguage,
                            ) || t(b.brandTypeId.name)
                          : undefined
                      }
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </>
          )}

          {searchCompanies.length > 0 && (
            <>
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: "action.hover",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <BusinessIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={600}>
                  {t("Companies")}
                </Typography>
              </Box>
              <List disablePadding>
                {searchCompanies.map((c) => (
                  <ListItemButton
                    key={c._id}
                    onClick={() => handleCompanyClick(c._id)}
                    sx={{
                      py: 1.5,
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        variant="rounded"
                        src={c.logo ? resolveMediaUrl(c.logo) : undefined}
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: "grey.200",
                        }}
                      >
                        {!c.logo && <BusinessIcon sx={{ color: "grey.600" }} />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        getLocalizedField(c, "name", dataLanguage) || c.name
                      }
                      secondary={
                        c.brandTypeId?.name
                          ? getLocalizedField(
                              c.brandTypeId,
                              "name",
                              dataLanguage,
                            ) || t(c.brandTypeId.name)
                          : undefined
                      }
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </>
          )}
        </Paper>
      )}

      <ProductDetailDialog
        open={productDialogOpen}
        onClose={() => {
          setProductDialogOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        candidateProducts={searchProducts}
        onProductChange={setSelectedProduct}
      />
    </Box>
  );
};

export default SearchPage;
