import React, { memo } from "react";
import { Box, Chip } from "@mui/material";

const StoreTabs = memo(function StoreTabs({
  tabs,
  activeTabKey,
  onChange,
  isDark = false,
}) {
  if (!Array.isArray(tabs) || tabs.length === 0) return null;

  return (
    <Box
      sx={{
        mb: 2.5,
        display: "flex",
        gap: 0.8,
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
        pb: 0.5,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTabKey;
        const darkActiveStyle = {
          background: "linear-gradient(135deg, #2b7be6 0%, #1f5fb3 100%)",
          color: "rgba(255,255,255,0.97)",
          border: "1px solid rgba(90,156,255,0.45)",
          boxShadow: "0 6px 16px rgba(16,26,48,0.55)",
          "& .MuiChip-icon": {
            color: "rgba(255,255,255,0.95) !important",
          },
        };
        const lightActiveStyle = {
          background: "linear-gradient(135deg, #1E6FD9 0%, #4A90E2 100%)",
          color: "white",
          border: "none",
          boxShadow: "0 3px 10px rgba(30,111,217,0.4)",
          "& .MuiChip-icon": {
            color: "rgba(255,255,255,0.9) !important",
          },
        };
        const darkInactiveStyle = {
          background: "linear-gradient(135deg, rgba(28,38,56,0.9), rgba(21,30,47,0.9))",
          color: "rgba(226,233,246,0.9)",
          border: "1px solid rgba(110,145,196,0.26)",
          "& .MuiChip-icon": {
            color: "rgba(173,196,232,0.9) !important",
          },
          "&:hover": {
            background:
              "linear-gradient(135deg, rgba(36,48,70,0.95), rgba(27,37,57,0.95))",
            borderColor: "rgba(132,170,228,0.42)",
            color: "rgba(244,248,255,0.95)",
          },
        };
        const lightInactiveStyle = {
          background: "#f3f4f6",
          color: "#374151",
          border: "1px solid #e5e7eb",
          "&:hover": {
            background: "#e9ecf0",
          },
        };
        return (
          <Chip
            key={tab.key}
            icon={tab.icon ? React.cloneElement(tab.icon, { sx: { fontSize: "0.9rem !important" } }) : undefined}
            label={tab.label}
            onClick={() => onChange(tab.key)}
            sx={{
              height: 38,
              fontSize: "0.8rem",
              fontWeight: isActive ? 700 : 500,
              flexShrink: 0,
              borderRadius: "999px",
              transition: "all 0.2s ease",
              "& .MuiChip-label": {
                px: 1.15,
                whiteSpace: "nowrap",
              },
              "& .MuiChip-icon": {
                ml: 0.85,
                mr: -0.1,
              },
              ...(isActive
                ? isDark
                  ? darkActiveStyle
                  : lightActiveStyle
                : isDark
                  ? darkInactiveStyle
                  : lightInactiveStyle),
            }}
          />
        );
      })}
    </Box>
  );
});

export default StoreTabs;

