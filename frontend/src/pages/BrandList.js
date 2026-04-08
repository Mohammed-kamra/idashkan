import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  useTheme,
  Container,
  Chip,
  IconButton,
  Skeleton,
} from "@mui/material";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { brandAPI, companyAPI, adAPI, brandTypeAPI } from "../services/api";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import BusinessIcon from "@mui/icons-material/Business";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Loader from "../components/Loader";
import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";

const BrandList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { t } = useTranslation();
  const { locName } = useLocalizedContent();
  const isCompanyMode = location.pathname.startsWith("/companies");

  const [searchParams] = useSearchParams();
  const [Brands, setBrands] = useState([]);
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bannerAds, setBannerAds] = useState([]);
  const [brandTypes, setBrandTypes] = useState([]);

  const brandTypeParam = searchParams.get("type");
  const [selectedType, setSelectedType] = useState(brandTypeParam || "all");

  useEffect(() => {
    fetchBrands();
    fetchAds();
    fetchBrandTypes();
  }, [isCompanyMode]);

  useEffect(() => {
    if (Brands.length === 0) {
      setFilteredBrands([]);
      return;
    }

    if (!selectedType || selectedType === "all") {
      setFilteredBrands(Brands);
      return;
    }

    // Support both legacy name-based filter and new id-based filter
    const isId = typeof selectedType === "string" && selectedType.length >= 12;
    const next = Brands.filter((b) => {
      const bt = b.brandTypeId;
      const btId = bt && (bt._id || bt);
      const btName = (bt && bt.name) || b.type;
      return isId
        ? String(btId) === String(selectedType)
        : String(btName).toLowerCase() === String(selectedType).toLowerCase();
    });
    setFilteredBrands(next);
  }, [Brands, selectedType, brandTypes]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await (isCompanyMode ? companyAPI.getAll() : brandAPI.getAll());

      setBrands(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.msg ||
          err.message ||
          "Network error. Please check your connection.",
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
    } catch (e) {
      // ignore
      setBrandTypes([]);
    }
  };

  const fetchAds = async () => {
    try {
      const res = await adAPI.getAll({ page: "brands" });
      setBannerAds(res.data || []);
    } catch (e) {
      // ignore banner errors
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

  const handleBrandClick = (brand) => {
    navigate(`${isCompanyMode ? "/companies" : "/brands"}/${brand._id}`);
  };

  if (loading)
    return (
      <Box sx={{ py: { xs: 5, md: 10 }, px: { xs: 0.5, sm: 1.5, md: 3 } }}>
        <Skeleton
          variant="rounded"
          sx={{ width: "100%", height: { xs: 150, md: 250 }, mb: 3 }}
        />
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" width={96} height={32} />
          ))}
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} sx={{ width: { xs: "100%", sm: 260, md: 280 } }}>
              <Skeleton variant="rectangular" sx={{ height: 180 }} />
              <CardContent>
                <Skeleton variant="text" width="70%" height={30} />
                <Skeleton variant="text" width="95%" />
                <Skeleton variant="text" width="50%" />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    );
  if (error) return <Loader message={error} />;

  const capitalize = (s) =>
    typeof s === "string" && s.length > 0
      ? s.charAt(0).toUpperCase() + s.slice(1)
      : s;

  return (
    <Box sx={{ py: { xs: 5, md: 10 }, px: { xs: 0.5, sm: 1.5, md: 3 } }}>
      {/* Banner Slider Section (from Ads: pages includes brands/all) */}
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
      {/* Brand Type Filter - Similar to StoreList */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          gap: 1,
          overflowX: "auto",
          color: theme.palette.mode === "dark" ? "white" : "black",
        }}
      >
        {[
          { key: "all", label: t("All") },
          ...brandTypes.map((bt) => ({
            key: bt._id,
            label: locName(bt) || t(capitalize(bt.name)),
          })),
        ].map((tItem) => (
          <Chip
            key={tItem.key}
            label={tItem.label}
            onClick={() => setSelectedType(tItem.key)}
            color={selectedType === tItem.key ? "primary" : "default"}
            variant={selectedType === tItem.key ? "filled" : "outlined"}
            sx={{
              flexShrink: 0,
              backgroundColor:
                selectedType === tItem.key
                  ? theme.palette.mode === "dark"
                    ? theme.palette.secondary.main
                    : theme.palette.primary.main
                  : "transparent",
              color: selectedType === tItem.key ? "white" : "inherit",
            }}
          />
        ))}
      </Box>
      {/* Brands Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(auto-fill, minmax(280px, 1fr))",
            md: "repeat(auto-fill, minmax(280px, 1fr))",
          },
          gap: { xs: 2, sm: 3, md: 4 },
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {filteredBrands.map((brand) => (
          <Card
            key={brand._id}
            sx={{
              height: { xs: "200px", sm: "400px", md: "420px" },
              width: { xs: "100%", sm: "280px", md: "280px" },
              maxWidth: { xs: "100%", sm: "280px", md: "280px" },
              minWidth: { xs: "auto", sm: "280px", md: "280px" },
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              borderRadius: { xs: 2, sm: 3, md: 3 },
              overflow: "hidden",
              background:
                theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, theme.palette.primary.main 0%, theme.palette.secondary.main 100%)"
                  : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
              border: "none",
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 8px 32px rgba(0,0,0,0.3)"
                  : "0 8px 32px rgba(0,0,0,0.1)",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              position: "relative",
              "&:hover": {
                transform: "translateY(-12px) scale(1.02)",
                boxShadow:
                  theme.palette.mode === "dark"
                    ? "0 24px 48px rgba(0,0,0,0.4)"
                    : "0 24px 48px rgba(0,0,0,0.15)",
                "& .brand-arrow": {
                  transform: "translateX(8px)",
                  opacity: 1,
                },
                "& .brand-image": {
                  transform: "scale(1.1)",
                },
              },
            }}
            onClick={() => handleBrandClick(brand)}
          >
            {/* Brand Image/Logo */}
            <Box
              sx={{
                position: "relative",

                height: { xs: "140px", sm: "200px", md: "200px" },
                flexShrink: 0,
                overflow: "hidden",
                background:
                  theme.palette.mode === "dark"
                    ? "linear-gradient(135deg, theme.palette.secondary.main 0%, theme.palette.secondary.main 100%)"
                    : "linear-gradient(135deg, theme.palette.primary.main 0%, theme.palette.secondary.main 100%)",
              }}
            >
              {brand.logo ? (
                <CardMedia
                  component="img"
                  height="200"
                  image={resolveMediaUrl(brand.logo)}
                  alt={locName(brand)}
                  className="brand-image"
                  sx={{
                    objectFit: "cover",
                    transition: "transform 0.4s ease",
                    width: "100%",
                    height: "100%",
                    p: { xs: 0, sm: 0, md: 0 },
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
                    color: "white",
                  }}
                >
                  <StorefrontIcon sx={{ fontSize: 80, opacity: 0.8 }} />
                </Box>
              )}

              {/* Gradient Overlay */}
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%)",
                }}
              />

              {/* Arrow Icon - Hidden on mobile */}
              <IconButton
                className="brand-arrow"
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: "white",
                  opacity: 0,
                  transition: "all 0.3s ease",
                  backdropFilter: "blur(10px)",
                  display: { xs: "none", sm: "flex" },
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.3)",
                  },
                }}
              >
                <ArrowForwardIcon />
              </IconButton>
            </Box>

            {/* Brand Content */}
            <CardContent
              align="center"
              sx={{
                p: { xs: 1, sm: 3, md: 3 },
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                height: { xs: "60px", sm: "200px", md: "200px" },
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography
                  variant="h6"
                  component="h2"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.text.primary,
                    fontSize: { xs: "0.8rem", sm: "1.3rem", md: "1.3rem" },
                    lineHeight: 1.2,
                    mb: { xs: 0, sm: 1, md: 1 },
                    height: { xs: "auto", sm: "50px", md: "50px" },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: { xs: 2, sm: 1, md: 1 },
                    WebkitBoxOrient: "vertical",
                    textAlign: "center",
                  }}
                >
                  {brand.statusAll === "off" ? "" : locName(brand)}
                </Typography>
                {brand.isVip && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      zIndex: 2,
                      borderRadius: "50%",
                      width: { xs: 30, sm: 36 },
                      height: { xs: 30, sm: 36 },
                      display: "flex",
                      backgroundColor: "white",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      "&::before": {
                        content: '"👑"',
                        fontSize: { xs: "14px", sm: "25px" },
                      },
                    }}
                  />
                )}
              </Box>

              {/* Brand Details - Hidden on mobile */}
              <Box
                sx={{
                  mb: 2,
                  overflow: "hidden",
                  display: { xs: "none", sm: "block" },
                }}
              >
                {/* Address - Always show with fixed height */}
                <Box
                  display="flex"
                  alignItems="flex-start"
                  mb={1}
                  sx={{ height: "30px" }}
                >
                  <LocationOnIcon
                    sx={{
                      fontSize: 16,
                      mr: 1,
                      mt: 0.25,
                      color:
                        theme.palette.mode === "dark"
                          ? theme.palette.secondary.main
                          : theme.palette.secondary.main,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.secondary,
                      lineHeight: 1.3,
                      fontSize: "0.875rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {brand.address || t("address not provided")}
                  </Typography>
                </Box>

                {/* Phone - Always show with fixed height */}
                <Box
                  display="flex"
                  alignItems="center"
                  mb={1}
                  sx={{ height: "30px" }}
                >
                  <PhoneIcon
                    sx={{
                      fontSize: 16,
                      mr: 1,
                      color:
                        theme.palette.mode === "dark"
                          ? theme.palette.secondary.main
                          : theme.palette.secondary.main,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontFamily: "monospace",
                      fontSize: "0.875rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {brand.phone || t("phone not provided")}
                  </Typography>
                </Box>

                {/* Description - Always show with fixed height */}
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                    lineHeight: 1.3,
                    fontSize: "0.875rem",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    height: "45px",
                  }}
                >
                  {brand.description || t("description not provided")}
                </Typography>
              </Box>

              {/* Action Area - Hidden on mobile */}
              <Box
                sx={{
                  mt: "auto",
                  height: "60px",
                  display: { xs: "none", sm: "flex" },
                  alignItems: "center",
                }}
              >
                <Box
                  sx={{
                    background:
                      theme.palette.mode === "dark"
                        ? "linear-gradient(135deg, rgba(255, 169, 77, 0.14) 0%, rgba(255, 122, 26, 0.14) 100%)"
                        : "linear-gradient(135deg, rgba(255, 169, 77, 0.08) 0%, rgba(255, 122, 26, 0.08) 100%)",
                    borderRadius: 2,
                    py: 1,
                    px: 2,
                    width: "100%",
                    border: "none",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        theme.palette.mode === "dark"
                          ? theme.palette.secondary.main
                          : theme.palette.secondary.main,
                      fontWeight: 600,
                      textAlign: "center",
                      fontSize: "0.875rem",
                      lineHeight: 1,
                    }}
                  >
                    {t("View Products")}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Empty State */}
      {filteredBrands.length === 0 && (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            px: 4,
          }}
        >
          <StorefrontIcon
            sx={{
              fontSize: 120,
              color:
                theme.palette.mode === "dark"
                  ? theme.palette.text.secondary
                  : theme.palette.primary.main,
              mb: 3,
            }}
          />
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: 600,
              mb: 2,
            }}
          >
            {t("No Brands found")}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              maxWidth: 500,
              mx: "auto",
              lineHeight: 1.6,
            }}
          >
            {t("No Brands found. Add some Brands through the admin panel.")}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BrandList;
