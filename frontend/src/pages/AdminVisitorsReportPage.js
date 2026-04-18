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
  CircularProgress,
  Alert,
  Grid,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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

const AdminVisitorsReportPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const isRtl = i18n.language === "ar" || i18n.language === "ku";

  const [range, setRange] = useState(() => defaultRange());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [series, setSeries] = useState([]);
  const [summary, setSummary] = useState(null);

  const isAdmin =
    user?.email === "mshexani45@gmail.com" ||
    user?.email === "admin@gmail.com" ||
    user?.role === "support";

  const queryParams = useMemo(
    () => ({
      from: range.from,
      to: range.to,
    }),
    [range.from, range.to],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminAPI.getVisitorsReportDaily(queryParams);
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
  }, [queryParams]);

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

  return (
    <Box
      sx={{
        py: 3,
        pb: 6,
        minHeight: "100vh",
        bgcolor: "background.default",
        pt: 7,
      }}
    >
      <Container maxWidth="lg">
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
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ alignSelf: "flex-start" }}
          >
            {t("Back")}
          </Button>
          <Typography variant="h4" component="h1">
            {t("Visitors report")}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("visitorsReportUtcNote")}
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            mb: 3,
            alignItems: "center",
          }}
        >
          <TextField
            label={t("visitorsReportFrom")}
            type="date"
            size="small"
            value={range.from}
            onChange={(e) =>
              setRange((r) => ({ ...r, from: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t("visitorsReportTo")}
            type="date"
            size="small"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" onClick={load} disabled={loading}>
            {t("visitorsReportApply")}
          </Button>
        </Box>

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
            {summary ? (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" variant="body2">
                        {t("visitorsReportTotalVisits")}
                      </Typography>
                      <Typography variant="h5">
                        {summary.totalVisits ?? 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" variant="body2">
                        {t("visitorsReportSumDailyUnique")}
                      </Typography>
                      <Typography variant="h5">
                        {summary.sumDailyUniqueVisitors ?? 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : null}

            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                {t("visitorsReportChartTitle")}
              </Typography>
              <Box sx={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" reversed={isRtl} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="visits"
                      name={t("visitorsReportVisits")}
                      stroke="#1976d2"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="uniqueVisitors"
                      name={t("visitorsReportUniqueVisitors")}
                      stroke="#2e7d32"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("visitorsReportDay")}</TableCell>
                    <TableCell align="right">
                      {t("visitorsReportVisits")}
                    </TableCell>
                    <TableCell align="right">
                      {t("visitorsReportUniqueVisitors")}
                    </TableCell>
                    <TableCell align="right">
                      {t("visitorsReportDeltaVisits")}
                    </TableCell>
                    <TableCell align="right">
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
                      <TableRow key={row.day}>
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
