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
    getOwner(job)?.type === "brand" ? <BusinessIcon /> : <StorefrontIcon />;

  const genderLabel = (g) => {
    const v = String(g || "any").toLowerCase();
    if (v === "male") return t("Male");
    if (v === "female") return t("Female");
    return t("Any");
  };

  return (
    <Box sx={{ py: { xs: 3, md: 6 }, mt: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        {/* Ads banner */}
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              width: "100%",
              height: { xs: 150, md: 250 },
              borderRadius: { xs: 2, md: 3 },
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
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
            mb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <WorkOutlineIcon color="primary" />
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              {t("Find Job")}
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 180 }}>
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

        <Divider sx={{ mb: 2 }} />

        {/* List */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 1.5 }}>
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rounded" height={92} />
              ))}
            </>
          ) : filteredJobs.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
              >
                {t("No jobs available")}
              </Typography>
              <Typography color="text.secondary">
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
                    border: `1px solid ${theme.palette.divider}`,
                    "&:hover": { boxShadow: 6 },
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      width: 110,
                      height: 92,
                      flexShrink: 0,
                      backgroundColor:
                        theme.palette.mode === "dark" ? "#111" : "#f3f4f6",
                    }}
                  >
                    <CardMedia
                      component="img"
                      image={imageSrc || "/logo192.png"}
                      alt={job?.title || "job"}
                      sx={{
                        width: 110,
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
                          fontSize: "0.65rem",
                          height: 22,
                          "& .MuiChip-label": { px: 0.75, lineHeight: 1.2 },
                        }}
                      />
                    )}
                  </Box>
                  <CardContent sx={{ py: 1.2, px: 1.5, flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900 }} noWrap>
                      {locTitle(job) || t("Job")}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mt: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip size="small" label={genderLabel(job?.gender)} />
                      <Chip
                        size="small"
                        icon={getOwnerIcon(job)}
                        label={getOwnerName(job) || t("Owner")}
                        sx={{ maxWidth: "100%" }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      </Container>

      {/* Dialog */}
      <Dialog
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {locTitle(selectedJob) || t("Job")}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Box
              component="img"
              src={resolveMediaUrl(selectedJob?.image) || "/logo192.png"}
              alt="job"
              sx={{
                width: 110,
                height: 110,
                borderRadius: 2,
                objectFit: "cover",
                border: `1px solid ${theme.palette.divider}`,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                {t("Gender")}: {genderLabel(selectedJob?.gender)}
              </Typography>
              <Typography sx={{ fontWeight: 800 }}>
                {getOwnerName(selectedJob) || "-"}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Typography sx={{ fontWeight: 900, mb: 0.75 }}>
            {t("Description")}
          </Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }} color="text.secondary">
            {locDescription(selectedJob) || "-"}
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FindJob;
