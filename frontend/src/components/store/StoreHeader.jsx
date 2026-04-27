import React, { memo } from "react";
import { Avatar, Box, Button, Chip, IconButton, Typography } from "@mui/material";
import {
  Business,
  CameraAlt,
  Facebook,
  Instagram,
  LocationOn,
  MusicNote,
  Phone,
  WhatsApp,
} from "@mui/icons-material";
import FollowButton from "./FollowButton";
import { normalizeWhatsAppUrl } from "../../utils/openWhatsAppLink";
import { resolveMediaUrl } from "../../utils/mediaUrl";

const StoreHeader = memo(function StoreHeader({
  store,
  isDark,
  t,
  locName,
  locAddress,
  followerCount,
  isStoreFollowed,
  followLoading,
  onFollowToggle,
  onBack,
  backIcon,
  displayPhone,
  onLocationClick,
  onContactClick,
  onWhatsAppClick,
}) {
  if (!store) return null;

  const storeContactInfo = store.contactInfo || {};
  const storeLocationInfo = store.locationInfo || {};

  const socialLinks = [
    { key: "whatsapp", value: storeContactInfo.whatsapp, icon: <WhatsApp /> },
    { key: "facebook", value: storeContactInfo.facebook, icon: <Facebook /> },
    { key: "instagram", value: storeContactInfo.instagram, icon: <Instagram /> },
    { key: "tiktok", value: storeContactInfo.tiktok, icon: <MusicNote /> },
    { key: "snapchat", value: storeContactInfo.snapchat, icon: <CameraAlt /> },
  ].filter((item) => Boolean(item.value));

  const locationLinks = [
    { key: "googleMaps", label: "Google Maps", value: storeLocationInfo.googleMaps },
    { key: "appleMaps", label: "Apple Maps", value: storeLocationInfo.appleMaps },
    { key: "waze", label: "Waze", value: storeLocationInfo.waze },
  ].filter((item) => Boolean(item.value));

  const normalizeUrl = (url, type) => {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();
    if (type === "whatsapp") {
      if (/^(https?:\/\/)?(wa\.me|api\.whatsapp\.com)\//i.test(trimmed)) {
        const withProto = /^https?:\/\//i.test(trimmed)
          ? trimmed
          : `https://${trimmed}`;
        return normalizeWhatsAppUrl(withProto);
      }
      const digits = trimmed.replace(/[^\d]/g, "");
      return digits ? `https://api.whatsapp.com/send?phone=${digits}` : null;
    }
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  return (
    <>
      <Button
        startIcon={backIcon}
        onClick={onBack}
        size="small"
        sx={{
          mb: 2,
          borderRadius: "999px",
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.85rem",
          color: isDark ? "rgba(255,255,255,0.7)" : "#374151",
          bgcolor: isDark ? "rgba(255,255,255,0.07)" : "#f3f4f6",
          border: isDark
            ? "1px solid rgba(255,255,255,0.1)"
            : "1px solid #e5e7eb",
          px: 2,
          py: 0.6,
          "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.12)" : "#e9ecf0" },
        }}
      >
        {t("Back")}
      </Button>

      <Box
        sx={{
          mb: 3,
          borderRadius: "20px",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #1E6FD9 0%, #4A90E2 60%, #5ba4f5 100%)",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.45)"
            : "0 8px 32px rgba(30,111,217,0.28)",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-40%",
            right: "-10%",
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          },
        }}
      >
        <Box
          sx={{
            p: { xs: "18px 16px", sm: "24px 28px", md: "28px 36px" },
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: { xs: 1.5, sm: 2.5 },
              mb: 1.5,
            }}
          >
            <Avatar
              src={store.logo ? resolveMediaUrl(store.logo) : undefined}
              alt={locName(store)}
              sx={{
                width: { xs: 64, sm: 88, md: 110 },
                height: { xs: 64, sm: 88, md: 110 },
                border: "3px solid rgba(255,255,255,0.3)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                bgcolor: "rgba(255,255,255,0.15)",
                borderRadius: "18px",
                flexShrink: 0,
              }}
            >
              {!store.logo && (
                <Business
                  sx={{
                    fontSize: { xs: 32, sm: 44 },
                    color: "rgba(255,255,255,0.85)",
                  }}
                />
              )}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                  mb: 0.8,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1.15rem", sm: "1.5rem", md: "1.8rem" },
                    color: "white",
                    textShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    lineHeight: 1.2,
                  }}
                >
                  {locName(store)}
                </Typography>
                {store.isVip && (
                  <Chip
                    label={t("VIP")}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      bgcolor: "#f59e0b",
                      color: "white",
                      border: "none",
                      boxShadow: "0 2px 6px rgba(245,158,11,0.5)",
                      "& .MuiChip-label": { px: 0.8 },
                    }}
                  />
                )}
                {store.isHasDelivery && (
                  <Chip
                    label={t("Delivery")}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      bgcolor: "rgba(239,68,68,0.75)",
                      color: "white",
                      border: "none",
                      "& .MuiChip-label": { px: 0.8 },
                    }}
                  />
                )}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(255,255,255,0.85)",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                  }}
                >
                  {followerCount} {t("Followers")}
                </Typography>
                <FollowButton
                  isFollowed={isStoreFollowed}
                  loading={followLoading}
                  onClick={onFollowToggle}
                  t={t}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
            {locAddress(store) && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <LocationOn
                  sx={{
                    fontSize: { xs: 16, md: 18 },
                    color: "rgba(255,255,255,0.8)",
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(255,255,255,0.85)",
                    fontSize: { xs: "0.78rem", sm: "0.875rem" },
                    textOverflow: "ellipsis",
                    maxWidth: { xs: 280, sm: 450 },
                  }}
                >
                  {locAddress(store)}
                </Typography>
              </Box>
            )}

            {(locationLinks.length > 0 || displayPhone) && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                {displayPhone && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Phone sx={{ fontSize: 15, color: "rgba(255,255,255,0.7)" }} />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(255,255,255,0.85)",
                        fontFamily: "monospace",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                      }}
                    >
                      {displayPhone}
                    </Typography>
                  </Box>
                )}
                {locationLinks.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "nowrap",
                      overflowX: "auto",
                      mb: 1,
                    }}
                  >
                    <LocationOn sx={{ fontSize: { xs: 18, md: 24 }, opacity: 0.9 }} />
                    {locationLinks.map((item) => (
                      <Button
                        key={item.key}
                        component="a"
                        href={normalizeUrl(item.value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onLocationClick?.(item.key)}
                        size="small"
                        variant="outlined"
                        sx={{
                          color: "white",
                          borderColor: "rgba(255,255,255,0.45)",
                          textTransform: "none",
                          whiteSpace: "nowrap",
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.15)",
                          },
                        }}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {socialLinks.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  flexWrap: "nowrap",
                  overflowX: "auto",
                }}
              >
                {socialLinks.map((item) => {
                  const href = normalizeUrl(item.value, item.key);
                  if (item.key === "whatsapp" && href) {
                    return (
                      <IconButton
                        key={item.key}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          onWhatsAppClick?.(href);
                        }}
                        size="small"
                        sx={{
                          color: "white",
                          bgcolor: "rgba(255,255,255,0.15)",
                          "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </IconButton>
                    );
                  }
                  return (
                    <IconButton
                      key={item.key}
                      component="a"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      onClick={() => onContactClick?.(item.key)}
                      sx={{
                        color: "white",
                        bgcolor: "rgba(255,255,255,0.15)",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </IconButton>
                  );
                })}
              </Box>
            )}

            {store.description && (
              <Typography
                variant="body2"
                sx={{
                  textAlign: "center",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: "0.8rem",
                  lineHeight: 1.5,
                  mt: 0.5,
                }}
              >
                {store.description}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
});

export default StoreHeader;

