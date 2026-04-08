import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Typography,
  useTheme,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import StorefrontIcon from "@mui/icons-material/Storefront";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useTranslation } from "react-i18next";
import { adAPI, jobAPI, storeTypeAPI } from "../services/api";
import { resolveMediaUrl } from "../utils/mediaUrl";
import {
  getExpiryRemainingInfo,
  formatExpiryChipLabel,
  shouldShowExpiryChip,
  expiryChipBg,
  isExpiryStillValid,
} from "../utils/expiryDate";
import { useLocalizedContent } from "../hooks/useLocalizedContent";

const FindJob = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locName, locDescription, locTitle } = useLocalizedContent();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [bannerAds, setBannerAds] = useState([]);
  const [storeTypes, setStoreTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await storeTypeAPI.getAll();
        setStoreTypes(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setStoreTypes([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [jobsRes, adsRes] = await Promise.all([
          jobAPI.getAll(),
          adAPI.getAll({ page: "findjob" }),
        ]);
        setJobs(Array.isArray(jobsRes?.data) ? jobsRes.data : []);
        const ads = Array.isArray(adsRes?.data) ? adsRes.data : [];
        setBannerAds(ads);
      } catch {
        setJobs([]);
        setBannerAds([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  const publicJobs = useMemo(
    () =>
      (jobs || []).filter((j) => {
        if (j?.active === false) return false;
        return isExpiryStillValid(j?.expireDate);
      }),
    [jobs],
  );

  const filteredJobs = useMemo(() => {
    if (selectedType === "all") return publicJobs;
    return publicJobs.filter((j) => {
      if (!j?.storeId) return true;
      const st = j.storeId?.storeTypeId;
      const stId = st && (st._id || st);
      return String(stId) === String(selectedType);
    });
  }, [publicJobs, selectedType]);

  const getOwner = (job) => {
    if (job?.brandId?._id) return { type: "brand", ...job.brandId };
    if (job?.storeId?._id) return { type: "store", ...job.storeId };
    return null;
  };

  const getOwnerName = (job) => locName(getOwner(job)) || "";
  const getOwnerIcon = (job) =>
    getOwner(job)?.type === "brand" ? (
      <BusinessIcon sx={{ fontSize: "1rem" }} />
    ) : (
      <StorefrontIcon sx={{ fontSize: "1rem" }} />
    );

  const genderLabel = (g) => {
    const v = String(g || "any").toLowerCase();
    if (v === "male") return t("Male");
    if (v === "female") return t("Female");
    return t("Any");
  };

  return (
    <Box
      sx={{
        py: { xs: 3, md: 6 },
        mt: { xs: 3, md: 5 },
        minHeight: "100vh",
        backgroundColor: isDark
          ? "rgba(13,17,28,1)"
          : "rgba(248,249,252,1)",
      }}
    >
      <Container maxWidth="lg">
        {/* Ads banner */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              width: "100%",
              height: { xs: 150, md: 250 },
              borderRadius: { xs: 3, md: 4 },
              overflow: "hidden",
              boxShadow: isDark
                ? "0 8px 32px rgba(0,0,0,0.5)"
                : "0 8px 32px rgba(0,0,0,0.1)",
              backgroundColor: isDark ? "#1a2235" : "#f0f4ff",
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
                              : null
                      }
                      src={ad.src}
                      alt={`Banner ${index + 1}`}
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

        {/* Header + filter */}
        <Box
          sx={{
            mb: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                background: isDark
                  ? "linear-gradient(135deg,#1e6fd9,#4a90e2)"
                  : "linear-gradient(135deg,#1E6FD9,#0d47a1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <WorkOutlineIcon sx={{ color: "#fff", fontSize: "1.3rem" }} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                color: isDark ? "#fff" : "#111827",
              }}
            >
              {t("Find Job")}
            </Typography>
          </Box>

          <FormControl
            size="small"
            sx={{
              minWidth: 180,
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
                "& fieldset": {
                  borderColor: isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.12)",
                },
                "&:hover fieldset": {
                  borderColor: isDark
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(0,0,0,0.25)",
                },
              },
            }}
          >
            <InputLabel>{t("Store Type")}</InputLabel>
            <Select
              value={selectedType}
              label={t("Store Type")}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <MenuItem value="all">{t("All")}</MenuItem>
              {storeTypes.map((st) => (
                <MenuItem key={st._id} value={st._id}>
                  {st.icon || "🏪"} {locName(st) || t(st.name)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Divider
          sx={{
            mb: 3,
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.08)",
          }}
        />

        {/* Job list */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={92}
                  sx={{
                    borderRadius: 3,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.07)"
                      : undefined,
                  }}
                />
              ))}
            </>
          ) : filteredJobs.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 8,
                px: 2,
                borderRadius: 4,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.02)",
              }}
            >
              <WorkOutlineIcon
                sx={{
                  fontSize: 64,
                  mb: 2,
                  color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: isDark
                    ? "rgba(255,255,255,0.5)"
                    : "rgba(0,0,0,0.4)",
                }}
              >
                {t("No jobs available")}
              </Typography>
              <Typography
                sx={{
                  color: isDark
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(0,0,0,0.35)",
                  mt: 0.5,
                }}
              >
                {t("Try another store type filter.")}
              </Typography>
            </Box>
          ) : (
            filteredJobs.map((job) => {
              const imageSrc = resolveMediaUrl(job?.image);
              const expInfo = getExpiryRemainingInfo(job?.expireDate);
              const showExpiryChip = shouldShowExpiryChip(expInfo);

              return (
                <Card
                  key={job._id}
                  onClick={() => setSelectedJob(job)}
                  sx={{
                    display: "flex",
                    alignItems: "stretch",
                    borderRadius: 3,
                    overflow: "hidden",
                    cursor: "pointer",
                    background: isDark
                      ? "linear-gradient(145deg,#1a2235,#1e2a42)"
                      : "#ffffff",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
                    boxShadow: isDark
                      ? "0 2px 12px rgba(0,0,0,0.3)"
                      : "0 2px 10px rgba(0,0,0,0.05)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: isDark
                        ? "0 6px 24px rgba(0,0,0,0.45)"
                        : "0 6px 20px rgba(30,111,217,0.12)",
                      borderColor: isDark
                        ? "rgba(74,144,226,0.4)"
                        : "#dce8ff",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      width: 100,
                      height: 92,
                      flexShrink: 0,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "#f3f4f6",
                    }}
                  >
                    <CardMedia
                      component="img"
                      image={imageSrc || "/logo192.png"}
                      alt={job?.title || "job"}
                      sx={{
                        width: 100,
                        height: 92,
                        objectFit: "cover",
                      }}
                    />
                    {showExpiryChip && (
                      <Chip
                        label={formatExpiryChipLabel(expInfo, t)}
                        size="small"
                        sx={{
                          position: "absolute",
                          bottom: 6,
                          left: 6,
                          maxWidth: "calc(100% - 12px)",
                          backgroundColor: expiryChipBg(expInfo),
                          color: "white",
                          fontWeight: 600,
                          fontSize: "0.6rem",
                          height: 20,
                          "& .MuiChip-label": { px: 0.6, lineHeight: 1.2 },
                        }}
                      />
                    )}
                  </Box>

                  <CardContent
                    sx={{
                      py: 1.25,
                      px: 1.75,
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 0.6,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        color: isDark ? "#fff" : "#111827",
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {locTitle(job) || t("Job")}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip
                        size="small"
                        label={genderLabel(job?.gender)}
                        sx={{
                          height: 22,
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          backgroundColor: isDark
                            ? "rgba(74,144,226,0.15)"
                            : "rgba(30,111,217,0.08)",
                          color: isDark ? "#4a90e2" : "#1E6FD9",
                          border: `1px solid ${isDark ? "rgba(74,144,226,0.25)" : "rgba(30,111,217,0.2)"}`,
                          "& .MuiChip-label": { px: 0.75 },
                        }}
                      />
                      {getOwnerName(job) && (
                        <Chip
                          size="small"
                          icon={getOwnerIcon(job)}
                          label={getOwnerName(job)}
                          sx={{
                            height: 22,
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            maxWidth: "100%",
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.07)"
                              : "rgba(0,0,0,0.04)",
                            color: isDark
                              ? "rgba(255,255,255,0.75)"
                              : "rgba(0,0,0,0.65)",
                            "& .MuiChip-icon": {
                              color: "inherit",
                              fontSize: "0.85rem !important",
                            },
                            "& .MuiChip-label": { px: 0.75 },
                          }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      </Container>

      {/* Job Detail Dialog */}
      <Dialog
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 4,
            backgroundColor: isDark ? "rgba(22,28,44,1)" : "#fff",
            backgroundImage: "none",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "none",
          },
        }}
      >
        {/* Dialog header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2.5,
            py: 1.5,
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          }}
        >
          <IconButton
            size="small"
            onClick={() => setSelectedJob(null)}
            sx={{
              mr: 1.5,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.07)"
                : "rgba(0,0,0,0.05)",
              borderRadius: 2,
            }}
          >
            <CloseIcon sx={{ fontSize: "1.1rem" }} />
          </IconButton>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: "1.05rem",
              flex: 1,
              color: isDark ? "#fff" : "#111827",
            }}
          >
            {locTitle(selectedJob) || t("Job")}
          </Typography>
        </Box>

        <DialogContent sx={{ px: 2.5, py: 2.5 }}>
          <Box sx={{ display: "flex", gap: 2, mb: 2.5 }}>
            <Box
              component="img"
              src={resolveMediaUrl(selectedJob?.image) || "/logo192.png"}
              alt="job"
              onError={(e) => { e.currentTarget.src = "/logo192.png"; }}
              sx={{
                width: 100,
                height: 100,
                borderRadius: 3,
                objectFit: "cover",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6",
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  label={`${t("Gender")}: ${genderLabel(selectedJob?.gender)}`}
                  sx={{
                    height: 24,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    backgroundColor: isDark
                      ? "rgba(74,144,226,0.15)"
                      : "rgba(30,111,217,0.08)",
                    color: isDark ? "#4a90e2" : "#1E6FD9",
                    borderRadius: 99,
                  }}
                />
              </Box>
              {getOwnerName(selectedJob) && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <StorefrontIcon
                    sx={{
                      fontSize: "1rem",
                      color: isDark
                        ? "rgba(255,255,255,0.45)"
                        : "rgba(0,0,0,0.4)",
                    }}
                  />
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      color: isDark
                        ? "rgba(255,255,255,0.8)"
                        : "rgba(0,0,0,0.7)",
                    }}
                  >
                    {getOwnerName(selectedJob)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Divider
            sx={{
              mb: 2,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.08)",
            }}
          />

          <Typography
            sx={{
              fontWeight: 800,
              mb: 0.75,
              fontSize: "0.9rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
            }}
          >
            {t("Description")}
          </Typography>
          <Typography
            sx={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)",
              fontSize: "0.92rem",
            }}
          >
            {locDescription(selectedJob) || "-"}
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FindJob;
