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
        return (
          <Chip
            key={tab.key}
            icon={tab.icon ? React.cloneElement(tab.icon, { sx: { fontSize: "0.9rem !important" } }) : undefined}
            label={tab.label}
            onClick={() => onChange(tab.key)}
            sx={{
              height: 36,
              fontSize: "0.78rem",
              fontWeight: isActive ? 700 : 500,
              flexShrink: 0,
              transition: "all 0.2s ease",
              ...(isActive
                ? {
                    background:
                      "linear-gradient(135deg, #1E6FD9 0%, #4A90E2 100%)",
                    color: "white",
                    border: "none",
                    boxShadow: "0 3px 10px rgba(30,111,217,0.4)",
                    "& .MuiChip-icon": {
                      color: "rgba(255,255,255,0.9) !important",
                    },
                  }
                : {
                    background: isDark ? "rgba(255,255,255,0.07)" : "#f3f4f6",
                    color: isDark ? "rgba(255,255,255,0.7)" : "#374151",
                    border: isDark
                      ? "1px solid rgba(255,255,255,0.1)"
                      : "1px solid #e5e7eb",
                    "&:hover": {
                      background: isDark ? "rgba(255,255,255,0.12)" : "#e9ecf0",
                    },
                  }),
            }}
          />
        );
      })}
    </Box>
  );
});

export default StoreTabs;

