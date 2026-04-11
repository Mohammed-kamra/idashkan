import React from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useTranslation } from "react-i18next";
import useOnlineStatus from "../hooks/useOnlineStatus";

/**
 * Shown when the browser reports offline. Encourages retry once the connection returns.
 */
export default function ConnectionLostBanner() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  const handleRetry = () => {
    window.location.reload();
  };

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
          spacing={{ xs: 1.5, sm: 2 }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          sx={{ width: "100%", gap: { xs: 1.5, sm: 2 } }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 800, letterSpacing: 0.2 }}
            >
              {t("Connection lost")}
            </Typography>
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
          <Button
            variant="contained"
            color="inherit"
            size="medium"
            onClick={handleRetry}
            startIcon={<RefreshRoundedIcon />}
            sx={{
              flexShrink: 0,
              alignSelf: { xs: "stretch", sm: "center" },
              fontWeight: 800,
              borderRadius: 2,
              py: 1,
              px: 2,
              color: theme.palette.error.dark,
              bgcolor: "rgba(255,255,255,0.95)",
              "&:hover": { bgcolor: "#fff" },
            }}
          >
            {t("Try again")}
          </Button>
        </Stack>
      </Alert>
    </Box>
  );
}
