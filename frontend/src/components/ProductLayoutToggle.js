import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import ViewStreamIcon from "@mui/icons-material/ViewStream";
import GridViewIcon from "@mui/icons-material/GridView";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

/** Matches MainPage / FilterChips product layout control ("row" | "grid2"). */
export default function ProductLayoutToggle({ value, onChange }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const isDark = theme.palette.mode === "dark";

  const layoutBtnSx = (active) => ({
    width: 34,
    height: 34,
    borderRadius: "10px",
    border: `1.5px solid ${
      active
        ? "var(--brand-primary-blue, #1E6FD9)"
        : isDark
          ? "rgba(255,255,255,0.12)"
          : "#e5e7eb"
    }`,
    backgroundColor: active
      ? isDark
        ? "rgba(30,111,217,0.2)"
        : "rgba(30,111,217,0.1)"
      : isDark
        ? "rgba(255,255,255,0.05)"
        : "#f3f4f6",
    color: active
      ? "var(--brand-primary-blue, #1E6FD9)"
      : isDark
        ? "rgba(255,255,255,0.55)"
        : "#6b7280",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: "var(--brand-primary-blue, #1E6FD9)",
      color: "var(--brand-primary-blue, #1E6FD9)",
      backgroundColor: isDark
        ? "rgba(30,111,217,0.15)"
        : "rgba(30,111,217,0.07)",
    },
  });

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        p: 0.4,
        borderRadius: "12px",
        backgroundColor: isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(0,0,0,0.03)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
      }}
    >
      <Tooltip title={t("Single row")} placement="top">
        <IconButton
          size="small"
          onClick={() => onChange?.("row")}
          sx={layoutBtnSx(value === "row")}
          aria-pressed={value === "row"}
        >
          <ViewStreamIcon sx={{ fontSize: "1.1rem" }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={t("Two rows")} placement="top">
        <IconButton
          size="small"
          onClick={() => onChange?.("grid2")}
          sx={layoutBtnSx(value === "grid2")}
          aria-pressed={value === "grid2"}
        >
          <GridViewIcon sx={{ fontSize: "1.1rem" }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
