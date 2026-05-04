import React from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import HourglassDisabledRoundedIcon from "@mui/icons-material/HourglassDisabledRounded";
import CloudOffRoundedIcon from "@mui/icons-material/CloudOffRounded";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

/**
 * @param {object} props
 * @param {'offline' | 'server' | 'timeout' | 'backend' | 'dns' | 'client' | 'generic'} props.variant
 * @param {() => void} props.onRetry
 * @param {() => void} [props.onReloadApp]
 */
export default function ApiConnectionErrorPanel({
  variant,
  onRetry,
  onReloadApp,
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  const titleKey =
    variant === "offline"
      ? "error.state.offline.title"
      : variant === "server"
        ? "error.state.server.title"
        : variant === "timeout"
          ? "error.state.timeout.title"
          : variant === "backend"
            ? "error.state.backend.title"
            : variant === "dns"
              ? "error.state.dns.title"
              : "error.state.generic.title";

  const bodyKey =
    variant === "offline"
      ? "error.state.offline.body"
      : variant === "server"
        ? "error.state.server.body"
        : variant === "timeout"
          ? "error.state.timeout.body"
          : variant === "backend"
            ? "error.state.backend.body"
            : variant === "dns"
              ? "error.state.dns.body"
              : "error.state.generic.body";

  const Icon =
    variant === "offline"
      ? WifiOffRoundedIcon
      : variant === "timeout"
        ? HourglassDisabledRoundedIcon
        : variant === "backend" || variant === "dns"
          ? CloudOffRoundedIcon
          : ErrorOutlineRoundedIcon;

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="55vh"
      px={2}
      py={4}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 440,
          width: "100%",
          p: { xs: 3, sm: 4 },
          textAlign: "center",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.04)"
              : "grey.50",
        }}
      >
        <Icon
          sx={{
            fontSize: 56,
            color:
              variant === "offline"
                ? "warning.main"
                : variant === "timeout"
                  ? "info.main"
                  : "error.main",
            mb: 2,
            opacity: 0.95,
          }}
        />
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          {t(titleKey)}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.65 }}
        >
          {bodyKey.includes(".") && bodyKey.startsWith("error.")
            ? t(bodyKey)
            : bodyKey}
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="center"
          alignItems="stretch"
        >
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={onRetry}
            sx={{ borderRadius: 2, py: 1.25, fontWeight: 700 }}
          >
            {t("error.state.retry")}
          </Button>
          {typeof onReloadApp === "function" ? (
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={onReloadApp}
              sx={{ borderRadius: 2, py: 1.25 }}
            >
              {t("error.state.reload_app")}
            </Button>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}
