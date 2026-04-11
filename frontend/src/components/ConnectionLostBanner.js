import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Stack, Typography, useTheme } from "@mui/material";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import { useTranslation } from "react-i18next";
import useOnlineStatus from "../hooks/useOnlineStatus";

const RESTORED_MS = 3000;

/**
 * Offline: error banner with retry. After reconnecting from offline, shows a short success banner.
 */
export default function ConnectionLostBanner() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const [showRestored, setShowRestored] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      setShowRestored(false);
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setShowRestored(true);
      const id = window.setTimeout(() => setShowRestored(false), RESTORED_MS);
      return () => window.clearTimeout(id);
    }
  }, [isOnline]);

  if (!isOnline) {
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: (z) => z.zIndex.appBar + 2,
          px: 0,
        }}
      >
        <Alert
          severity="error"
          variant="filled"
          icon={<WifiOffRoundedIcon sx={{ fontSize: 28 }} />}
          sx={{
            borderRadius: 0,
            py: 1.5,
            px: { xs: 2, sm: 3 },
            alignItems: "center",
            background: `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 2 }}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            sx={{ width: "100%", gap: { xs: 1, sm: 2 } }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.95,
                  mt: 0.25,
                  lineHeight: 1.45,
                  fontWeight: 500,
                }}
              >
                {t(
                  "You are not connected to the internet. Check your connection, then try again.",
                )}
              </Typography>
            </Box>
          </Stack>
        </Alert>
      </Box>
    );
  }

  if (!showRestored) return null;

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: (z) => z.zIndex.appBar + 2,
        px: 0,
      }}
    >
      <Alert
        severity="success"
        variant="filled"
        icon={<WifiRoundedIcon sx={{ fontSize: 28 }} />}
        sx={{
          borderRadius: 0,
          py: 1.25,
          px: { xs: 2, sm: 3 },
          alignItems: "center",
          background: `linear-gradient(135deg, ${theme.palette.success.dark} 0%, ${theme.palette.success.main} 100%)`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t("Your internet connection was restored.")}
        </Typography>
      </Alert>
    </Box>
  );
}
