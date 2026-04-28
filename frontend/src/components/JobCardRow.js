import React from "react";
import { Box, Card, CardContent, CardMedia, Chip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import BusinessIcon from "@mui/icons-material/Business";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { useTranslation } from "react-i18next";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { normalizeImage } from "../utils/mediaUrl";

const genderLabel = (t, g) => {
  const v = String(g || "any").toLowerCase();
  if (v === "male") return t("Male");
  if (v === "female") return t("Female");
  return t("Any");
};

export default function JobCardRow({ job, onClick }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { locName, locTitle } = useLocalizedContent();
  const isDark = theme.palette.mode === "dark";
  const ownerName =
    locName(job?.storeId) || locName(job?.brandId) || "";
  const ownerIsBrand = Boolean(job?.brandId?._id || job?.brandId);
  const imageSrc = normalizeImage(job?.image);

  return (
    <Card
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "stretch",
        borderRadius: 3,
        overflow: "hidden",
        cursor: "pointer",
        border: isDark
          ? "1px solid rgba(120,145,185,0.25)"
          : `1px solid ${theme.palette.divider}`,
        background: isDark
          ? "linear-gradient(145deg, rgba(24,33,50,0.98), rgba(18,27,43,0.98))"
          : theme.palette.background.paper,
        boxShadow: isDark
          ? "0 3px 14px rgba(5,10,22,0.4)"
          : "0 1px 6px rgba(15,23,42,0.08)",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: isDark
            ? "0 8px 24px rgba(2,8,24,0.6)"
            : "0 8px 18px rgba(15,23,42,0.18)",
          borderColor: isDark
            ? "rgba(145,178,225,0.45)"
            : theme.palette.primary.light,
          transform: "translateY(-1px)",
        },
      }}
    >
      <CardMedia
        component="img"
        image={imageSrc || "/logo192.png"}
        alt={locTitle(job) || "job"}
        sx={{
          width: 110,
          height: 92,
          objectFit: "cover",
          backgroundColor: isDark ? "#101826" : "#f3f4f6",
          flexShrink: 0,
        }}
      />
      <CardContent sx={{ py: 1.2, px: 1.5, flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 900,
            color: isDark ? "rgba(245,249,255,0.96)" : "text.primary",
          }}
          noWrap
        >
          {locTitle(job) || t("Job")}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
          <Chip
            size="small"
            label={genderLabel(t, job?.gender)}
            sx={
              isDark
                ? {
                    backgroundColor: "rgba(76,110,162,0.28)",
                    color: "rgba(230,238,252,0.95)",
                    border: "1px solid rgba(132,164,214,0.35)",
                    fontWeight: 600,
                  }
                : undefined
            }
          />
          <Chip
            size="small"
            icon={ownerIsBrand ? <BusinessIcon /> : <StorefrontIcon />}
            label={ownerName || t("Owner")}
            sx={{
              maxWidth: "100%",
              ...(isDark
                ? {
                    backgroundColor: "rgba(35,50,74,0.92)",
                    color: "rgba(236,243,255,0.96)",
                    border: "1px solid rgba(118,148,192,0.35)",
                    "& .MuiChip-icon": {
                      color: "rgba(168,197,242,0.95)",
                    },
                    "& .MuiChip-label": {
                      fontWeight: 600,
                    },
                  }
                : null),
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

