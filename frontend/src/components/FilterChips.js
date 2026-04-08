import React from "react";
import { Box, Chip, TextField, InputAdornment, IconButton, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import CategoryIcon from "@mui/icons-material/Category";
import ClearIcon from "@mui/icons-material/Clear";
import ViewStreamIcon from "@mui/icons-material/ViewStream";
import GridViewIcon from "@mui/icons-material/GridView";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { useLocalizedContent } from "../hooks/useLocalizedContent";

const FilterChips = ({
  search,
  onSearchChange,
  storeTypes,
  selectedStoreTypeId,
  onStoreTypeSelect,
  visibleCategories,
  selectedCategory,
  onCategorySelect,
  sortByNewest,
  sortByNarMe,
  sortByNearMe,
  onToggleNewest,
  onToggleNearMe,
  geoLoading,
  onClearAll,
  productLayout = "row",
  onLayoutChange,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { locName } = useLocalizedContent();
  const isDark = theme.palette.mode === "dark";

  const activePillSx = {
    background: "linear-gradient(135deg, var(--brand-primary-blue, #1E6FD9) 0%, #4A90E2 100%)",
    color: "white",
    fontWeight: 700,
    border: "none",
    boxShadow: "0 2px 8px rgba(30,111,217,0.35)",
    "&:hover": {
      background: "linear-gradient(135deg, #1660c2 0%, #3a7fd2 100%)",
    },
    "&.MuiChip-root": { height: 34 },
  };

  const inactivePillSx = {
    background: isDark ? "rgba(255,255,255,0.07)" : "#f3f4f6",
    color: isDark ? "rgba(255,255,255,0.85)" : "#374151",
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
    fontWeight: 500,
    "&:hover": {
      background: isDark ? "rgba(255,255,255,0.12)" : "#e9ecf0",
      border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #d1d5db",
    },
    "&.MuiChip-root": { height: 34 },
  };

  const sortActiveSx = {
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    fontWeight: 700,
    border: "none",
    boxShadow: "0 2px 8px rgba(245,158,11,0.35)",
    "&.MuiChip-root": { height: 32 },
  };

  const sortInactiveSx = {
    ...inactivePillSx,
    "&.MuiChip-root": { height: 32 },
  };

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
    <Box sx={{ mb: 2 }}>
      {/* Search bar */}
      <TextField
        variant="outlined"
        placeholder={t("Search for products or stores...")}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        fullWidth
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: isDark ? "rgba(255,255,255,0.5)" : "text.secondary", fontSize: 20 }} />
            </InputAdornment>
          ),
          endAdornment: search ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => onSearchChange("")} edge="end" sx={{ p: 0.5 }}>
                <ClearIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
        sx={{
          mb: 1.25,
          "& .MuiOutlinedInput-root": {
            borderRadius: "14px",
            background: isDark ? "rgba(255,255,255,0.06)" : "#f9fafb",
            "& fieldset": { borderColor: isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb" },
            "&:hover fieldset": { borderColor: "var(--brand-primary-blue, #1E6FD9)" },
            "&.Mui-focused fieldset": { borderColor: "var(--brand-primary-blue, #1E6FD9)", borderWidth: 1.5 },
          },
          "& .MuiInputBase-input": {
            fontSize: "0.9rem",
            py: "9px",
          },
        }}
      />

      {/* Store type chips row */}
      <Box
        sx={{
          display: "flex",
          gap: 0.8,
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          pb: 0.5,
          alignItems: "center",
        }}
      >
        <Chip
          label={t("All")}
          icon={
            <Box component="span" sx={{ fontSize: "0.9rem", ml: "4px !important" }}>
              🏪
            </Box>
          }
          onClick={() => onStoreTypeSelect("all")}
          sx={selectedStoreTypeId === "all" ? activePillSx : inactivePillSx}
        />
        {storeTypes.map((type) => (
          <Chip
            key={type._id}
            label={locName(type) || t(type.name)}
            icon={
              type.icon ? (
                <Box component="span" sx={{ fontSize: "0.9rem", ml: "4px !important" }}>
                  {type.icon}
                </Box>
              ) : undefined
            }
            onClick={() => onStoreTypeSelect(type._id)}
            sx={
              String(selectedStoreTypeId) === String(type._id)
                ? activePillSx
                : inactivePillSx
            }
          />
        ))}
      </Box>

      {/* Sort row: Newest + Near Me on the left, layout toggle on the right */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          mt: 1,
          pb: 0.25,
        }}
      >
        {/* Sort chips */}
        <Chip
          icon={<AccessTimeIcon sx={{ fontSize: "0.9rem !important" }} />}
          label={t("Newest")}
          onClick={onToggleNewest}
          sx={sortByNewest ? sortActiveSx : sortInactiveSx}
        />
        <Chip
          icon={<MyLocationIcon sx={{ fontSize: "0.9rem !important" }} />}
          label={geoLoading ? t("...") : t("Near Me")}
          onClick={onToggleNearMe}
          disabled={geoLoading}
          sx={sortByNearMe ? sortActiveSx : sortInactiveSx}
        />

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Layout toggle */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            p: 0.4,
            borderRadius: "12px",
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
          }}
        >
          <Tooltip title={t("Single row")} placement="top">
            <IconButton
              size="small"
              onClick={() => onLayoutChange?.("row")}
              sx={layoutBtnSx(productLayout === "row")}
            >
              <ViewStreamIcon sx={{ fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("Two rows")} placement="top">
            <IconButton
              size="small"
              onClick={() => onLayoutChange?.("grid2")}
              sx={layoutBtnSx(productLayout === "grid2")}
            >
              <GridViewIcon sx={{ fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Category chips — only when a store type is selected */}
      {selectedStoreTypeId !== "all" && visibleCategories && visibleCategories.length > 0 && (
        <Box
          sx={{
            display: "flex",
            gap: 0.8,
            overflowX: "auto",
            overflowY: "hidden",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            mt: 1,
            pb: 0.5,
          }}
        >
          <Chip
            icon={<CategoryIcon sx={{ fontSize: "0.9rem !important" }} />}
            label={t("all")}
            onClick={() => onCategorySelect(null)}
            sx={selectedCategory === null ? activePillSx : inactivePillSx}
          />
          {visibleCategories.map((cat) => (
            <Chip
              key={cat._id}
              label={locName(cat) || t(cat.name)}
              onClick={() => onCategorySelect(cat)}
              sx={
                selectedCategory?._id === cat._id ? activePillSx : inactivePillSx
              }
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FilterChips;
