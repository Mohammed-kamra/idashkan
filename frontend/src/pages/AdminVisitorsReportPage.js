import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../services/api";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Grid,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";

function formatInputDate(d) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: formatInputDate(from), to: formatInputDate(to) };
}

function formatPct(v) {
  if (v == null || Number.isNaN(v)) return "—";
  const n = Math.round(v * 10) / 10;
  return `${n > 0 ? "+" : ""}${n}%`;
}

const ACCENT_VISITS = "#1E6FD9";
const ACCENT_UNIQUE = "#2e7d32";

const AdminVisitorsReportPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const isRtl = i18n.language === "ar" || i18n.language === "ku";
  const isDark = theme.palette.mode === "dark";

  const [range, setRange] = useState(() => defaultRange());
  const [granularity, setGranularity] = useState("day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [series, setSeries] = useState([]);
  const [summary, setSummary] = useState(null);

  const isAdmin =
    user?.email === "mshexani45@gmail.com" ||
    user?.email === "admin@gmail.com" ||
    user?.role === "support";

  const load = useCallback(
    async (override) => {
      setLoading(true);
      setError("");
      try {
        const g = override?.granularity ?? granularity;
        const from = override?.from ?? range.from;
        const to = override?.to ?? range.to;
        const todayStr = formatInputDate(new Date());
        const params =
          g === "today"
            ? { from: todayStr, to: todayStr, granularity: "day" }
            : { from, to, granularity: g };
        const res = await adminAPI.getVisitorsReportDaily(params);
        const data = res.data?.data ?? res.data;
        setSeries(Array.isArray(data?.series) ? data.series : []);
        setSummary(data?.summary ?? null);
      } catch (e) {
        console.error(e);
        setError(e.response?.data?.message || e.message || "Failed to load");
        setSeries([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    },
    [granularity, range.from, range.to],
  );

  const handleReset = () => {
    const r = defaultRange();
    setRange(r);
    setGranularity("day");
    setError("");
    load({ from: r.from, to: r.to, granularity: "day" });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!isAdmin) {
      navigate("/");
      return;
    }
    load();
  }, [isAuthenticated, isAdmin, navigate, load]);

  const chartData = useMemo(
    () =>
      series.map((row) => ({
        day: row.day,
        visits: row.visits,
        uniqueVisitors: row.uniqueVisitors,
      })),
    [series],
  );

  /** Prefer API summary; fall back to summing series so cards always match the table. */
  const effectiveSummary = useMemo(() => {
    const fromSeries = {
      totalVisits: series.reduce((s, r) => s + (Number(r.visits) || 0), 0),
      sumDailyUniqueVisitors: series.reduce(
        (s, r) => s + (Number(r.uniqueVisitors) || 0),
        0,
      ),
      dayCount: series.length,
    };
    if (!summary || typeof summary.totalVisits !== "number") {
      return fromSeries;
    }
    return {
      totalVisits: summary.totalVisits ?? fromSeries.totalVisits,
      sumDailyUniqueVisitors:
        summary.sumDailyUniqueVisitors ?? fromSeries.sumDailyUniqueVisitors,
      dayCount: summary.dayCount ?? fromSeries.dayCount,
    };
  }, [summary, series]);

  const statCardShellSx = (accent) => ({
    height: "100%",
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 2,
    overflow: "hidden",
    background: isDark
      ? `linear-gradient(145deg, ${accent}28 0%, rgba(255,255,255,0.03) 50%)`
      : `linear-gradient(145deg, ${accent}18 0%, #ffffff 55%)`,
    boxShadow: isDark
      ? "0 4px 22px rgba(0,0,0,0.4)"
      : "0 2px 14px rgba(0,0,0,0.07)",
    borderInlineStart: "4px solid",
    borderInlineStartColor: accent,
  });

  const formatInt = (n) =>
    new Intl.NumberFormat(i18n.language || undefined, {
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);

  const periodColumnLabel =
    granularity === "day" || granularity === "today"
      ? t("visitorsReportDay")
      : t("visitorsReportPeriod");

  const utcTodayStr = formatInputDate(new Date());
  const isTodayPreset = granularity === "today";

  return (
    <Box
      sx={{
        py: 3,
        pb: 6,
        minHeight: "100vh",
        bgcolor: isDark ? "rgba(13,17,28,1)" : "rgba(248,249,252,1)",
        pt: 7,
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 2 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
            mb: 3,
          }}
        >
          <Button
            startIcon={
              <ArrowBackIcon sx={{ transform: isRtl ? "scaleX(-1)" : undefined }} />
            }
            onClick={() => navigate(-1)}
            sx={{ alignSelf: "flex-start" }}
          >
            {t("Back")}
          </Button>
          <Typography variant="h4" component="h1" fontWeight={800}>
            {t("Visitors report")}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("visitorsReportUtcNote")}
        </Typography>

        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label={t("visitorsReportFrom")}
              type="date"
              size="small"
              fullWidth
              value={isTodayPreset ? utcTodayStr : range.from}
              onChange={(e) => {
                setGranularity("day");
                setRange((r) => ({ ...r, from: e.target.value }));
              }}
              disabled={isTodayPreset}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: isDark ? "rgba(255,255,255,0.04)" : "background.paper",
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label={t("visitorsReportTo")}
              type="date"
              size="small"
              fullWidth
              value={isTodayPreset ? utcTodayStr : range.to}
              onChange={(e) => {
                setGranularity("day");
                setRange((r) => ({ ...r, to: e.target.value }));
              }}
              disabled={isTodayPreset}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: isDark ? "rgba(255,255,255,0.04)" : "background.paper",
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              select
              label={t("visitorsReportTrendGranularity")}
              size="small"
              fullWidth
              value={granularity}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "today") {
                  const td = formatInputDate(new Date());
                  setRange({ from: td, to: td });
                  setGranularity("today");
                } else {
                  setGranularity(v);
                }
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: isDark ? "rgba(255,255,255,0.04)" : "background.paper",
                },
              }}
            >
              <MenuItem value="today">{t("visitorsReportGranularityToday")}</MenuItem>
              <MenuItem value="day">{t("visitorsReportGranularityDay")}</MenuItem>
              <MenuItem value="week">{t("visitorsReportGranularityWeek")}</MenuItem>
              <MenuItem value="month">{t("visitorsReportGranularityMonth")}</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                justifyContent: { xs: "stretch", md: isRtl ? "flex-start" : "flex-end" },
                flexDirection: { xs: "column", sm: "row" },
              }}
            >
              <Button
                variant="contained"
                onClick={() => load()}
                disabled={loading}
                sx={{ flex: { xs: "1 1 auto", sm: "0 0 auto" }, minWidth: 112 }}
              >
                {t("visitorsReportApply")}
              </Button>
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={loading}
                sx={{ flex: { xs: "1 1 auto", sm: "0 0 auto" }, minWidth: 112 }}
              >
                {t("visitorsReportReset")}
              </Button>
            </Box>
          </Grid>
        </Grid>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }} sx={{ minWidth: 0 }}>
                <Card variant="outlined" sx={statCardShellSx(ACCENT_VISITS)}>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                        color: ACCENT_VISITS,
                      }}
                    >
                      <VisibilityOutlinedIcon fontSize="small" />
                      <Typography variant="body2" fontWeight={700} color="text.primary">
                        {t("visitorsReportTotalVisits")}
                      </Typography>
                    </Box>
                    <Typography
                      variant="h4"
                      fontWeight={900}
                      sx={{
                        fontSize: { xs: "1.75rem", sm: "2.125rem" },
                        letterSpacing: "-0.02em",
                        color: "text.primary",
                      }}
                    >
                      {formatInt(effectiveSummary.totalVisits)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      {t("visitorsReportTotalVisitsHint")}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} sx={{ minWidth: 0 }}>
                <Card variant="outlined" sx={statCardShellSx(ACCENT_UNIQUE)}>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                        color: ACCENT_UNIQUE,
                      }}
                    >
                      <GroupsOutlinedIcon fontSize="small" />
                      <Typography variant="body2" fontWeight={700} color="text.primary">
                        {t("visitorsReportSumDailyUnique")}
                      </Typography>
                    </Box>
                    <Typography
                      variant="h4"
                      fontWeight={900}
                      sx={{
                        fontSize: { xs: "1.75rem", sm: "2.125rem" },
                        letterSpacing: "-0.02em",
                        color: "text.primary",
                      }}
                    >
                      {formatInt(effectiveSummary.sumDailyUniqueVisitors)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      {t("visitorsReportSumDailyUniqueHint")}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("visitorsReportDaysInRange")}: {formatInt(effectiveSummary.dayCount)}{" "}
              ·{" "}
              {isTodayPreset
                ? utcTodayStr
                : `${range.from} → ${range.to}`}
            </Typography>

            <Paper
              sx={{
                p: 2,
                mb: 3,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="subtitle1" gutterBottom fontWeight={700} color="text.primary">
                {t("visitorsReportChartTitle")}
              </Typography>
              {granularity !== "day" && granularity !== "today" ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  {t("visitorsReportGranularityChartHint")}
                </Typography>
              ) : null}
              <Box sx={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "rgba(255,255,255,0.12)" : undefined}
                    />
                    <XAxis dataKey="day" reversed={isRtl} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: isDark ? "#1e293b" : "#fff",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb"}`,
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="visits"
                      name={t("visitorsReportVisits")}
                      stroke={ACCENT_VISITS}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="uniqueVisitors"
                      name={t("visitorsReportUniqueVisitors")}
                      stroke={ACCENT_UNIQUE}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ bgcolor: "background.paper" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700 }}>
                      {periodColumnLabel}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t("visitorsReportVisits")}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t("visitorsReportUniqueVisitors")}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t("visitorsReportDeltaVisits")}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t("visitorsReportDeltaUnique")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {series.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        {t("visitorsReportEmpty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    series.map((row) => (
                      <TableRow
                        key={row.day}
                        sx={{
                          "&:nth-of-type(even)": {
                            bgcolor: isDark
                              ? "rgba(255,255,255,0.03)"
                              : "rgba(0,0,0,0.02)",
                          },
                        }}
                      >
                        <TableCell>{row.day}</TableCell>
                        <TableCell align="right">{row.visits}</TableCell>
                        <TableCell align="right">
                          {row.uniqueVisitors}
                        </TableCell>
                        <TableCell align="right">
                          {formatPct(row.visitsDeltaPct)}
                        </TableCell>
                        <TableCell align="right">
                          {formatPct(row.uniqueDeltaPct)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Container>
    </Box>
  );
};

export default AdminVisitorsReportPage;
