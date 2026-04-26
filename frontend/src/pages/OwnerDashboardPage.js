import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  TextField,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  ownerDashboardAPI,
  storeAPI,
  brandAPI,
  companyAPI,
} from "../services/api";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { useAuth } from "../context/AuthContext";
import { normalizeOwnerEntities } from "../utils/ownerEntities";
import { getAllLocalizedFieldValues } from "../utils/localize";

/** Prefer localized name; fall back when primary `name` is empty but nameEn/nameKu exist. */
function resolveEntityDisplayName(doc, locName) {
  if (!doc) return "";
  const direct = String(locName(doc) || "").trim();
  if (direct) return direct;
  const fromLocales = getAllLocalizedFieldValues(doc, "name");
  if (fromLocales.length) return fromLocales[0];
  return String(doc.name ?? doc.nameEn ?? doc.nameKu ?? "").trim();
}

function findDocById(list, entityId) {
  if (!Array.isArray(list)) return null;
  return list.find((x) => String(x._id ?? x.id) === String(entityId)) || null;
}

function formatInputDate(d) {
  return d.toISOString().slice(0, 10);
}

function buildQueryParams(preset, customFrom, customTo) {
  if (preset === "custom" && customFrom && customTo) {
    return {
      from: new Date(`${customFrom}T00:00:00`).toISOString(),
      to: new Date(`${customTo}T23:59:59.999`).toISOString(),
    };
  }
  const map = {
    last7: "last7",
    last30: "last30",
    thisMonth: "thismonth",
  };
  return { preset: map[preset] || "last30" };
}

function TrendIcon({ direction, changePercent }) {
  if (changePercent === 0 || changePercent == null) {
    return <TrendingFlatIcon sx={{ fontSize: 18, opacity: 0.6 }} />;
  }
  return direction === "up" ? (
    <TrendingUpIcon color="success" sx={{ fontSize: 18 }} />
  ) : (
    <TrendingDownIcon color="error" sx={{ fontSize: 18 }} />
  );
}

function MiniSparkline({ values, color }) {
  const theme = useTheme();
  const stroke = color || theme.palette.primary.main;
  if (!Array.isArray(values) || values.length < 2) return null;
  const data = values.map((v, i) => ({ i, v: Number(v) || 0 }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={stroke}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function SummaryMetricCard({ title, metric, onCardClick, sparkColor, t }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { current, changePercent, direction, spark } = metric || {};
  const pct =
    changePercent == null || Number.isNaN(changePercent)
      ? "—"
      : `${changePercent > 0 ? "+" : ""}${changePercent}%`;

  return (
    <Card
      variant="outlined"
      onClick={onCardClick}
      sx={{
        height: "100%",
        cursor: onCardClick ? "pointer" : "default",
        bgcolor: "background.paper",
        borderColor: isDark ? alpha(theme.palette.divider, 0.9) : "divider",
        backgroundImage: isDark
          ? `linear-gradient(145deg, ${alpha("#1e293b", 0.55)} 0%, ${alpha("#0f172a", 0.35)} 100%)`
          : undefined,
        boxShadow: isDark
          ? "0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)"
          : undefined,
        transition: "box-shadow 0.2s, transform 0.15s, border-color 0.2s",
        "&:hover": onCardClick
          ? {
              boxShadow: isDark ? 6 : 3,
              transform: "translateY(-1px)",
              borderColor: isDark
                ? alpha(theme.palette.primary.main, 0.45)
                : undefined,
            }
          : undefined,
      }}
    >
      <CardContent sx={{ pb: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {title}
        </Typography>
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ mt: 0.5, lineHeight: 1.2 }}
        >
          {current ?? "—"}
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ mt: 0.5 }}
        >
          <TrendIcon direction={direction} changePercent={changePercent} />
          <Typography
            variant="caption"
            color={
              changePercent === 0
                ? "text.secondary"
                : direction === "up"
                  ? "success.main"
                  : "error.main"
            }
            fontWeight={600}
          >
            {t("vs previous period", { defaultValue: "vs previous period" })}{" "}
            {pct}
          </Typography>
        </Stack>
        {spark?.length ? (
          <Box sx={{ mt: 1, opacity: 0.9 }}>
            <MiniSparkline values={spark} color={sparkColor} />
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}

const ProductThumb = ({ image, displayName }) => {
  const url = resolveMediaUrl(image);
  if (!url) {
    return (
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 1,
          bgcolor: "action.hover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <Box
      component="img"
      src={url}
      alt={displayName || ""}
      sx={{
        width: 44,
        height: 44,
        borderRadius: 1,
        objectFit: "cover",
        bgcolor: "action.hover",
        flexShrink: 0,
      }}
    />
  );
};

export default function OwnerDashboardPage() {
  const { t, i18n } = useTranslation();
  const { locName } = useLocalizedContent();
  const { user } = useAuth();
  const isRtl = i18n.language === "ar" || i18n.language === "ku";
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const ownerEntities = useMemo(() => normalizeOwnerEntities(user), [user]);
  const [selectionKey, setSelectionKey] = useState("");

  useEffect(() => {
    if (!ownerEntities.length) {
      setSelectionKey("");
      return;
    }
    const keys = ownerEntities.map((e) => `${e.entityType}:${e.entityId}`);
    if (!selectionKey || !keys.includes(selectionKey)) {
      setSelectionKey(keys[0]);
    }
  }, [ownerEntities, selectionKey]);

  const selectedOwnerEntity = useMemo(() => {
    if (!ownerEntities.length || !selectionKey) return null;
    const sep = selectionKey.indexOf(":");
    if (sep === -1) return ownerEntities[0];
    const entityType = selectionKey.slice(0, sep);
    const entityId = selectionKey.slice(sep + 1);
    return (
      ownerEntities.find(
        (e) => e.entityType === entityType && e.entityId === entityId,
      ) || ownerEntities[0]
    );
  }, [ownerEntities, selectionKey]);

  const [entityNameMap, setEntityNameMap] = useState({});

  useEffect(() => {
    if (!ownerEntities.length) {
      setEntityNameMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Full lists: visible-only stores miss `show: false` owner links; /all for brands & companies includes "off" rows.
        const [storesRes, brandsRes, companiesRes] = await Promise.all([
          storeAPI.getAll(),
          brandAPI.getAllIncludingHidden(),
          companyAPI.getAllIncludingHidden(),
        ]);
        const stores = Array.isArray(storesRes.data) ? storesRes.data : [];
        const brands = Array.isArray(brandsRes.data) ? brandsRes.data : [];
        const companies = Array.isArray(companiesRes.data)
          ? companiesRes.data
          : [];
        const map = {};

        const resolveOne = async (e) => {
          const k = `${e.entityType}:${e.entityId}`;
          let doc = null;
          if (e.entityType === "store") {
            doc = findDocById(stores, e.entityId);
          } else if (e.entityType === "brand") {
            doc = findDocById(brands, e.entityId);
          } else {
            doc = findDocById(companies, e.entityId);
          }
          if (!doc) {
            try {
              const r =
                e.entityType === "store"
                  ? await storeAPI.getById(e.entityId)
                  : e.entityType === "brand"
                    ? await brandAPI.getById(e.entityId)
                    : await companyAPI.getById(e.entityId);
              doc = r.data;
            } catch {
              doc = null;
            }
          }
          const name = resolveEntityDisplayName(doc, locName);
          map[k] = name || `${e.entityType} (${String(e.entityId).slice(-8)})`;
        };

        await Promise.all(ownerEntities.map((e) => resolveOne(e)));
        if (!cancelled) setEntityNameMap(map);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          const fb = {};
          ownerEntities.forEach((e) => {
            const k = `${e.entityType}:${e.entityId}`;
            fb[k] = `${e.entityType} (${String(e.entityId).slice(-8)})`;
          });
          setEntityNameMap(fb);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerEntities, locName]);

  const [preset, setPreset] = useState("last30");
  const [customFrom, setCustomFrom] = useState(() =>
    formatInputDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
  );
  const [customTo, setCustomTo] = useState(() => formatInputDate(new Date()));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [topViewed, setTopViewed] = useState([]);
  const [topLiked, setTopLiked] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [chartMode, setChartMode] = useState("bar");

  const queryParams = useMemo(() => {
    const base = buildQueryParams(preset, customFrom, customTo);
    if (!selectedOwnerEntity) return base;
    return {
      ...base,
      entityType: selectedOwnerEntity.entityType,
      entityId: selectedOwnerEntity.entityId,
    };
  }, [preset, customFrom, customTo, selectedOwnerEntity]);

  const loadAll = useCallback(async () => {
    if (!selectedOwnerEntity) {
      setLoading(false);
      setSummary(null);
      setTopViewed([]);
      setTopLiked([]);
      setComparison(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [sRes, vRes, lRes, cRes] = await Promise.all([
        ownerDashboardAPI.getSummary(queryParams),
        ownerDashboardAPI.getTopViewedProducts(queryParams),
        ownerDashboardAPI.getTopLikedProducts(queryParams),
        ownerDashboardAPI.getComparisonChart(queryParams),
      ]);
      if (sRes.data?.success) setSummary(sRes.data.data);
      else setSummary(null);
      if (vRes.data?.success) setTopViewed(vRes.data.data || []);
      else setTopViewed([]);
      if (lRes.data?.success) setTopLiked(lRes.data.data || []);
      else setTopLiked([]);
      if (cRes.data?.success) setComparison(cRes.data.data);
      else setComparison(null);
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
          e?.message ||
          t("Failed to load dashboard", {
            defaultValue: "Failed to load dashboard",
          }),
      );
      setSummary(null);
      setTopViewed([]);
      setTopLiked([]);
      setComparison(null);
    } finally {
      setLoading(false);
    }
  }, [queryParams, t, selectedOwnerEntity]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const cards = summary?.cards;
  const entityLabel = useMemo(() => {
    if (summary?.entity) {
      const n = locName(summary.entity);
      if (n && String(n).trim()) return n;
    }
    if (summary?.entityName) return summary.entityName;
    const k = selectionKey;
    if (k && entityNameMap[k]) return entityNameMap[k];
    return "—";
  }, [
    summary?.entity,
    summary?.entityName,
    selectionKey,
    entityNameMap,
    locName,
  ]);
  const periodHint = summary?.period
    ? `${new Date(summary.period.from).toLocaleDateString()} – ${new Date(summary.period.to).toLocaleDateString()}`
    : "";

  const comparisonChartData = useMemo(() => {
    if (!comparison?.current || !comparison?.previous) return [];
    const c = comparison.current;
    const p = comparison.previous;
    return [
      {
        key: "viewers",
        name: t("Viewers", { defaultValue: "Viewers" }),
        thisPeriod: c.profileViews,
        lastPeriod: p.profileViews,
      },
      {
        key: "likes",
        name: t("Product likes (total)", {
          defaultValue: "Product likes (total)",
        }),
        thisPeriod: c.likes,
        lastPeriod: p.likes,
      },
      {
        key: "orders",
        name: t("Order requests", { defaultValue: "Order requests" }),
        thisPeriod: c.orderRequests,
        lastPeriod: p.orderRequests,
      },
      {
        key: "contact",
        name: t("Contact clicks", { defaultValue: "Contact clicks" }),
        thisPeriod: c.contactClicks,
        lastPeriod: p.contactClicks,
      },
    ];
  }, [comparison, t]);

  const lineChartData = useMemo(() => {
    if (!comparisonChartData.length) return [];
    return comparisonChartData.map((row) => ({
      name: row.name,
      thisPeriod: row.thisPeriod,
      lastPeriod: row.lastPeriod,
    }));
  }, [comparisonChartData]);

  const handleCardPlaceholder = () => {
    /* reserved for future detail routes */
  };

  const sectionPaperSx = {
    p: 2,
    mb: 2,
    borderRadius: 2,
    bgcolor: isDark
      ? alpha(theme.palette.background.paper, 0.72)
      : "background.paper",
    borderColor: isDark ? alpha(theme.palette.divider, 0.85) : "divider",
    border: "1px solid",
    boxShadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)"
      : "0 1px 3px rgba(15,23,42,0.06)",
    backdropFilter: isDark ? "blur(10px)" : "none",
  };

  const chartTooltipProps = {
    contentStyle: {
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.9 : 1)}`,
      borderRadius: 10,
      color: theme.palette.text.primary,
      boxShadow: isDark
        ? "0 12px 40px rgba(0,0,0,0.5)"
        : "0 8px 24px rgba(15,23,42,0.12)",
    },
    labelStyle: { color: theme.palette.text.secondary, fontWeight: 600 },
    itemStyle: { color: theme.palette.text.primary },
  };

  const chartAxisTick = {
    fill: theme.palette.text.secondary,
    fontSize: 11,
  };

  const toggleGroupSx = {
    "& .MuiToggleButton-root": {
      borderColor: "divider",
      color: "text.secondary",
      textTransform: "none",
      fontWeight: 600,
      "&.Mui-selected": {
        color: "primary.main",
        bgcolor: isDark
          ? alpha(theme.palette.primary.main, 0.18)
          : alpha(theme.palette.primary.main, 0.12),
        borderColor: alpha(theme.palette.primary.main, 0.45),
        "&:hover": {
          bgcolor: isDark
            ? alpha(theme.palette.primary.main, 0.26)
            : alpha(theme.palette.primary.main, 0.18),
        },
      },
    },
  };

  const tablePaperSx = {
    borderRadius: 2,
    bgcolor: isDark
      ? alpha(theme.palette.background.paper, 0.65)
      : "background.paper",
    borderColor: isDark ? alpha(theme.palette.divider, 0.85) : "divider",
    boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.35)" : undefined,
  };

  const tableHeadRowSx = {
    bgcolor: isDark
      ? alpha(theme.palette.common.white, 0.04)
      : alpha(theme.palette.common.black, 0.03),
    "& th": {
      fontWeight: 700,
      color: "text.secondary",
      borderBottomColor: "divider",
    },
  };

  return (
    <Box
      sx={{
        maxWidth: "100%",
        py: 3,
        pt: { sm: 20 },
      }}
    >
      <Stack spacing={1.5} sx={{ mb: 2, mt: 6 }}>
        <Box>
          <IconButton
            component={RouterLink}
            to="/profile"
            aria-label={t("Back")}
            size="small"
            sx={{
              ml: -0.5,
              color: "text.secondary",
              "&:hover": {
                bgcolor: isDark
                  ? alpha(theme.palette.common.white, 0.06)
                  : "action.hover",
              },
            }}
          >
            <ArrowBackIcon
              sx={{ transform: isRtl ? "scaleX(-1)" : undefined }}
            />
          </IconButton>
        </Box>
        <Typography variant="h5" fontWeight={800}>
          {t("Owner dashboard", { defaultValue: "Owner dashboard" })}
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
          justifyContent="space-between"
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ flex: 1, minWidth: 0 }}
          >
            {entityLabel}
            {selectedOwnerEntity?.entityType || summary?.entityType
              ? ` · ${t(
                  selectedOwnerEntity?.entityType || summary?.entityType,
                  {
                    defaultValue:
                      selectedOwnerEntity?.entityType || summary?.entityType,
                  },
                )}`
              : ""}
          </Typography>
          {ownerEntities.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 220, maxWidth: "100%" }}>
              <InputLabel id="owner-dash-entity-label">
                {t("Business", { defaultValue: "Business" })}
              </InputLabel>
              <Select
                labelId="owner-dash-entity-label"
                label={t("Business", { defaultValue: "Business" })}
                value={selectionKey}
                onChange={(e) => setSelectionKey(e.target.value)}
              >
                {ownerEntities.map((e) => {
                  const k = `${e.entityType}:${e.entityId}`;
                  const label =
                    entityNameMap[k] ||
                    `${e.entityType} (${String(e.entityId).slice(-8)})`;
                  return (
                    <MenuItem key={k} value={k}>
                      {label}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={sectionPaperSx}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              {t("Date range", { defaultValue: "Date range" })}
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={preset}
              onChange={(_, v) => v != null && setPreset(v)}
              sx={toggleGroupSx}
            >
              <ToggleButton value="last7">
                {t("Last 7 days", { defaultValue: "Last 7 days" })}
              </ToggleButton>
              <ToggleButton value="last30">
                {t("Last 30 days", { defaultValue: "Last 30 days" })}
              </ToggleButton>
              <ToggleButton value="thisMonth">
                {t("This month", { defaultValue: "This month" })}
              </ToggleButton>
              <ToggleButton value="custom">
                {t("Custom", { defaultValue: "Custom" })}
              </ToggleButton>
            </ToggleButtonGroup>
            {preset === "custom" && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ mt: 1.5 }}
              >
                <TextField
                  type="date"
                  label={t("From", { defaultValue: "From" })}
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
                <TextField
                  type="date"
                  label={t("To", { defaultValue: "To" })}
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Stack>
            )}
            {periodHint ? (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mt: 1 }}
              >
                {periodHint}
              </Typography>
            ) : null}
          </Box>
          <Button variant="contained" onClick={loadAll} disabled={loading}>
            {t("Refresh", { defaultValue: "Refresh" })}
          </Button>
        </Stack>
      </Paper>

      {loading && !summary ? (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <SummaryMetricCard
              title={t("Total followers", { defaultValue: "Total followers" })}
              metric={cards?.followers}
              onCardClick={handleCardPlaceholder}
              sparkColor={theme.palette.info.main}
              t={t}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <SummaryMetricCard
              title={t("Profile viewers", { defaultValue: "Profile viewers" })}
              metric={cards?.profileViews}
              onCardClick={handleCardPlaceholder}
              sparkColor={theme.palette.primary.main}
              t={t}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <SummaryMetricCard
              title={t("Social / contact clicks", {
                defaultValue: "Social / contact clicks",
              })}
              metric={cards?.contactClicks}
              onCardClick={handleCardPlaceholder}
              sparkColor={theme.palette.secondary.main}
              t={t}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <SummaryMetricCard
              title={t("Product likes (total)", {
                defaultValue: "Product likes (total)",
              })}
              metric={cards?.productLikes}
              onCardClick={handleCardPlaceholder}
              sparkColor={theme.palette.warning.main}
              t={t}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <SummaryMetricCard
              title={t("Searches (your name in query)", {
                defaultValue: "Searches (your name in query)",
              })}
              metric={cards?.searches}
              onCardClick={handleCardPlaceholder}
              sparkColor={theme.palette.success.main}
              t={t}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <SummaryMetricCard
              title={t("Reel views (total)", {
                defaultValue: "Reel views (total)",
              })}
              metric={cards?.reelViews}
              onCardClick={handleCardPlaceholder}
              sparkColor={theme.palette.error.light}
              t={t}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <SummaryMetricCard
              title={t("Order requests", { defaultValue: "Order requests" })}
              metric={cards?.orderRequests}
              onCardClick={handleCardPlaceholder}
              sparkColor={isDark ? "#A78BFA" : "#6D28D9"}
              t={t}
            />
          </Grid>
        </Grid>
      )}

      <Paper variant="outlined" sx={{ ...sectionPaperSx, mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" fontWeight={700}>
            {t("Period comparison", { defaultValue: "Period comparison" })}
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={chartMode}
            onChange={(_, v) => v != null && setChartMode(v)}
            sx={toggleGroupSx}
          >
            <ToggleButton value="bar">
              <BarChartIcon fontSize="small" sx={{ mr: 0.5 }} />
              {t("Bars", { defaultValue: "Bars" })}
            </ToggleButton>
            <ToggleButton value="line">
              <ShowChartIcon fontSize="small" sx={{ mr: 0.5 }} />
              {t("Lines", { defaultValue: "Lines" })}
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {loading && !comparison ? (
          <Skeleton variant="rounded" height={320} />
        ) : comparisonChartData.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
            {t("No comparison data yet", {
              defaultValue: "No comparison data yet",
            })}
          </Typography>
        ) : chartMode === "bar" ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={comparisonChartData}
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
                vertical={false}
                opacity={isDark ? 0.55 : 0.4}
              />
              <XAxis
                dataKey="name"
                tick={chartAxisTick}
                stroke={theme.palette.divider}
                tickLine={{ stroke: theme.palette.divider }}
              />
              <YAxis
                allowDecimals={false}
                tick={chartAxisTick}
                stroke={theme.palette.divider}
                tickLine={{ stroke: theme.palette.divider }}
              />
              <Tooltip {...chartTooltipProps} />
              <Legend
                wrapperStyle={{ color: theme.palette.text.primary }}
                formatter={(value) => (
                  <span style={{ color: theme.palette.text.primary }}>
                    {value}
                  </span>
                )}
              />
              <Bar
                dataKey="thisPeriod"
                name={t("This period", { defaultValue: "This period" })}
                fill={theme.palette.primary.main}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="lastPeriod"
                name={t("Previous period", { defaultValue: "Previous period" })}
                fill={
                  isDark
                    ? alpha(theme.palette.common.white, 0.22)
                    : theme.palette.action.disabled
                }
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={lineChartData}
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
                vertical={false}
                opacity={isDark ? 0.55 : 0.4}
              />
              <XAxis
                dataKey="name"
                tick={chartAxisTick}
                stroke={theme.palette.divider}
                tickLine={{ stroke: theme.palette.divider }}
              />
              <YAxis
                allowDecimals={false}
                tick={chartAxisTick}
                stroke={theme.palette.divider}
                tickLine={{ stroke: theme.palette.divider }}
              />
              <Tooltip {...chartTooltipProps} />
              <Legend
                wrapperStyle={{ color: theme.palette.text.primary }}
                formatter={(value) => (
                  <span style={{ color: theme.palette.text.primary }}>
                    {value}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="thisPeriod"
                name={t("This period", { defaultValue: "This period" })}
                stroke={theme.palette.primary.main}
                strokeWidth={2}
                dot={{ r: 3, fill: theme.palette.primary.main }}
              />
              <Line
                type="monotone"
                dataKey="lastPeriod"
                name={t("Previous period", { defaultValue: "Previous period" })}
                stroke={
                  isDark
                    ? alpha(theme.palette.common.white, 0.45)
                    : theme.palette.text.disabled
                }
                strokeWidth={2}
                dot={{
                  r: 3,
                  fill: isDark
                    ? alpha(theme.palette.common.white, 0.45)
                    : theme.palette.text.disabled,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            {t("Top viewed products", { defaultValue: "Top viewed products" })}
          </Typography>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={tablePaperSx}
          >
            {loading && !topViewed.length ? (
              <Box sx={{ p: 2 }}>
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </Box>
            ) : topViewed.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  {t("No product views in this period", {
                    defaultValue: "No product views in this period",
                  })}
                </Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <TableCell>
                      {t("Product", { defaultValue: "Product" })}
                    </TableCell>
                    <TableCell align="right">
                      {t("Views (period)", { defaultValue: "Views (period)" })}
                    </TableCell>
                    <TableCell align="right">
                      {t("Views (total)", { defaultValue: "Views (total)" })}
                    </TableCell>
                    <TableCell align="right">
                      {t("Likes", { defaultValue: "Likes" })}
                    </TableCell>
                    {/* <TableCell align="right">{t("Trend", { defaultValue: "Trend" })}</TableCell> */}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topViewed.map((row) => (
                    <TableRow
                      key={row._id}
                      hover
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: isDark
                            ? alpha(theme.palette.primary.main, 0.06)
                            : "action.hover",
                        },
                      }}
                    >
                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={0.2}
                          alignItems="center"
                        >
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            noWrap
                            sx={{ maxWidth: 160 }}
                          >
                            {locName(row)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        {row.periodViews ?? 0}
                      </TableCell>
                      <TableCell align="right">{row.viewCount ?? 0}</TableCell>
                      <TableCell align="right">{row.likeCount ?? 0}</TableCell>
                      {/* <TableCell align="right">
                        {row.trendPercent == null
                          ? "—"
                          : `${row.trendPercent > 0 ? "+" : ""}${row.trendPercent}%`}
                      </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            {t("Top liked products", { defaultValue: "Top liked products" })}
          </Typography>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={tablePaperSx}
          >
            {loading && !topLiked.length ? (
              <Box sx={{ p: 2 }}>
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </Box>
            ) : topLiked.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  {t("No likes in this period", {
                    defaultValue: "No likes in this period",
                  })}
                </Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <TableCell>
                      {t("Product", { defaultValue: "Product" })}
                    </TableCell>
                    <TableCell align="right">
                      {t("Likes (period)", { defaultValue: "Likes (period)" })}
                    </TableCell>
                    <TableCell align="right">
                      {t("Likes (total)", { defaultValue: "Likes (total)" })}
                    </TableCell>
                    <TableCell align="right">
                      {t("Views (total)", { defaultValue: "Views (total)" })}
                    </TableCell>
                    {/* <TableCell align="right">{t("Trend", { defaultValue: "Trend" })}</TableCell> */}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topLiked.map((row) => (
                    <TableRow
                      key={row._id}
                      hover
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: isDark
                            ? alpha(theme.palette.primary.main, 0.06)
                            : "action.hover",
                        },
                      }}
                    >
                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={0.6}
                          alignItems="center"
                        >
                          {/* <ProductThumb
                            image={row.image}
                            displayName={locName(row)}
                          /> */}
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            noWrap
                            sx={{ maxWidth: 160 }}
                          >
                            {locName(row)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        {row.periodLikes ?? 0}
                      </TableCell>
                      <TableCell align="right">{row.likeCount ?? 0}</TableCell>
                      <TableCell align="right">{row.viewCount ?? 0}</TableCell>
                      {/* <TableCell align="right">
                        {row.trendPercent == null
                          ? "—"
                          : `${row.trendPercent > 0 ? "+" : ""}${row.trendPercent}%`}
                      </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
}
