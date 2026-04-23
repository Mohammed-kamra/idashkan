import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "@mui/material/styles";
import { adminAPI } from "../services/api";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
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
  Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import SearchIcon from "@mui/icons-material/Search";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
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

const AdminSearchAnalyticsPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [range, setRange] = useState(() => defaultRange());
  const [city, setCity] = useState("");
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const isRtl = i18n.language === "ar" || i18n.language === "ku";
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [granularity, setGranularity] = useState("day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [topKeywords, setTopKeywords] = useState([]);
  const [noResults, setNoResults] = useState([]);
  const [topFilters, setTopFilters] = useState(null);
  const [topStores, setTopStores] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [popularCities, setPopularCities] = useState([]);
  const [conversion, setConversion] = useState([]);
  const [recent, setRecent] = useState([]);
  const [trending, setTrending] = useState([]);
  const [topClicked, setTopClicked] = useState([]);

  const isAdmin =
    user?.email === "mshexani45@gmail.com" ||
    user?.email === "admin@gmail.com" ||
    user?.role === "support";

  const queryParams = useMemo(() => {
    const p = {
      from: range.from ? new Date(range.from).toISOString() : undefined,
      to: range.to
        ? new Date(range.to + "T23:59:59.999Z").toISOString()
        : undefined,
      granularity,
    };
    if (city.trim()) p.city = city.trim();
    if (category.trim()) p.category = category.trim();
    if (source === "mainpage" || source === "searchpage") p.source = source;
    return p;
  }, [range.from, range.to, city, category, source, granularity]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ov, tr, kw, nr, tf, ts, tc, pc, conv, rec, trd, clk] =
        await Promise.all([
          adminAPI.getSearchAnalyticsOverview(queryParams),
          adminAPI.getSearchAnalyticsTrends(queryParams),
          adminAPI.getSearchAnalyticsTopKeywords({ ...queryParams, limit: 25 }),
          adminAPI.getSearchAnalyticsNoResults({ ...queryParams, limit: 15 }),
          adminAPI.getSearchAnalyticsTopFilters(queryParams),
          adminAPI.getSearchAnalyticsTopStores({ ...queryParams, limit: 15 }),
          adminAPI.getSearchAnalyticsTopCategories({
            ...queryParams,
            limit: 15,
          }),
          adminAPI.getSearchAnalyticsPopularCities({
            ...queryParams,
            limit: 15,
          }),
          adminAPI.getSearchAnalyticsConversion({ ...queryParams, limit: 25 }),
          adminAPI.getSearchAnalyticsRecent({ ...queryParams, limit: 25 }),
          adminAPI.getSearchAnalyticsTrending({
            ...queryParams,
            days: 7,
            limit: 15,
          }),
          adminAPI.getSearchAnalyticsTopClicked({ ...queryParams, limit: 15 }),
        ]);
      setOverview(ov.data?.data ?? ov.data);
      setTrends(Array.isArray(tr.data?.data) ? tr.data.data : (tr.data ?? []));
      setTopKeywords(kw.data?.data ?? kw.data ?? []);
      setNoResults(nr.data?.data ?? nr.data ?? []);
      setTopFilters(tf.data?.data ?? tf.data ?? null);
      setTopStores(ts.data?.data ?? ts.data ?? []);
      setTopCategories(tc.data?.data ?? tc.data ?? []);
      setPopularCities(pc.data?.data ?? pc.data ?? []);
      setConversion(conv.data?.data ?? conv.data ?? []);
      setRecent(rec.data?.data ?? rec.data ?? []);
      setTrending(trd.data?.data ?? trd.data ?? []);
      setTopClicked(clk.data?.data ?? clk.data ?? []);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || e.message || "Failed to load");
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
    loadAll();
  }, [isAuthenticated, isAdmin, navigate, loadAll]);

  const handleExport = async () => {
    try {
      const res = await adminAPI.exportSearchAnalyticsCsv(queryParams);
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "search-analytics.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("Export failed");
    }
  };

  const cur = overview?.current;
  const prev = overview?.previous;
  const isDark = theme.palette.mode === "dark";

  const tableStripeSx = {
    "& .MuiTableBody .MuiTableRow-root:nth-of-type(even)": {
      bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    },
  };

  const tableHeadRowSx = {
    bgcolor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)",
    "& .MuiTableCell-root": { fontWeight: 700 },
  };

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
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2 } }}>
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              startIcon={isRtl ? <ArrowForwardIcon /> : <ArrowBackIcon />}
              onClick={() => navigate("/admin/dashboard")}
            >
              Back
            </Button>

            <Typography variant="h5" fontWeight={800} color="text.primary">
              Search analytics
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
            disabled={loading}
          >
            Export CSV
          </Button>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: isDark
              ? "0 4px 22px rgba(0,0,0,0.4)"
              : "0 2px 12px rgba(0,0,0,0.06)",
            "& .MuiOutlinedInput-root": {
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : undefined,
            },
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 6, sm: 6, md: 2 }} sx={{ minWidth: 0 }}>
              <TextField
                label="From"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={range.from}
                onChange={(e) =>
                  setRange((r) => ({ ...r, from: e.target.value }))
                }
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 2 }} sx={{ minWidth: 0 }}>
              <TextField
                label="To"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={range.to}
                onChange={(e) =>
                  setRange((r) => ({ ...r, to: e.target.value }))
                }
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 2 }} sx={{ minWidth: 0 }}>
              <TextField
                label="City filter"
                size="small"
                fullWidth
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Exact match"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 2 }} sx={{ minWidth: 0 }}>
              <TextField
                label="Category filter"
                size="small"
                fullWidth
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }} sx={{ minWidth: 0 }}>
              <TextField
                select
                label="Source"
                size="small"
                fullWidth
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="mainpage">Main page</MenuItem>
                <MenuItem value="searchpage">Search page</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }} sx={{ minWidth: 0 }}>
              <TextField
                select
                label="Trend granularity"
                size="small"
                fullWidth
                value={granularity}
                onChange={(e) => setGranularity(e.target.value)}
              >
                <MenuItem value="day">Daily</MenuItem>
                <MenuItem value="week">Weekly</MenuItem>
                <MenuItem value="month">Monthly</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" onClick={loadAll} disabled={loading}>
                Apply filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                {
                  label: "Total searches",
                  value: cur?.totalSearches ?? 0,
                  prev: prev?.totalSearches,
                  icon: <SearchIcon />,
                },
                {
                  label: "Unique searchers",
                  value: cur?.uniqueSearchers ?? 0,
                  prev: prev?.uniqueSearchers,
                  icon: <SearchIcon />,
                },
                {
                  label: "Conversion rate",
                  value: `${cur?.conversionRate ?? 0}%`,
                  prev:
                    prev?.conversionRate != null
                      ? `${prev.conversionRate}%`
                      : null,
                  icon: <TrendingUpIcon />,
                },
                {
                  label: "No-result searches",
                  value: cur?.noResultSearches ?? 0,
                  prev: prev?.noResultSearches,
                },
              ].map((card) => (
                <Grid
                  size={{ xs: 6, sm: 6, md: 3 }}
                  sx={{ minWidth: 0 }}
                  key={card.label}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      bgcolor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "background.paper",
                      borderColor: "divider",
                      boxShadow: isDark
                        ? "0 2px 14px rgba(0,0,0,0.35)"
                        : "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                          color: "primary.light",
                        }}
                      >
                        {card.icon}
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="text.primary"
                        >
                          {card.label}
                        </Typography>
                      </Box>
                      <Typography
                        variant="h4"
                        fontWeight={800}
                        sx={{
                          fontSize: { xs: "1.35rem", sm: "2.125rem" },
                          wordBreak: "break-word",
                          color: "text.primary",
                        }}
                      >
                        {card.value}
                      </Typography>
                      {card.prev != null && (
                        <Typography variant="caption" color="text.secondary">
                          Previous period: {card.prev}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    height: 360,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: isDark
                      ? "0 4px 22px rgba(0,0,0,0.35)"
                      : "0 2px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom color="text.primary">
                    Search volume & clicks
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={trends}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "rgba(255,255,255,0.12)" : undefined}
                      />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#666" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#666" }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: isDark ? "#1e293b" : "#fff",
                          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb"}`,
                          borderRadius: 8,
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          color: isDark ? "#e2e8f0" : "#333",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Searches"
                        stroke="#1E6FD9"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="clicks"
                        name="Clicks"
                        stroke="#2e7d32"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    height: 360,
                    overflow: "auto",
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: isDark
                      ? "0 4px 22px rgba(0,0,0,0.35)"
                      : "0 2px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom color="text.primary">
                    Trending (7 days)
                  </Typography>
                  {trending.map((row) => (
                    <Box
                      key={row.keyword}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        py: 0.5,
                      }}
                    >
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ maxWidth: "70%" }}
                      >
                        {row.keyword}
                      </Typography>
                      <Chip
                        size="small"
                        label={row.count}
                        sx={{
                          bgcolor: isDark
                            ? "rgba(30, 111, 217, 0.25)"
                            : undefined,
                          color: "text.primary",
                          fontWeight: 700,
                        }}
                      />
                    </Box>
                  ))}
                  {!trending.length && (
                    <Typography color="text.secondary">No data</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} color="text.primary">
                  Top keywords
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                >
                  <Table size="small" sx={tableStripeSx}>
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell>Keyword</TableCell>
                        <TableCell align="right">Searches</TableCell>
                        <TableCell align="right">Clicks</TableCell>
                        <TableCell align="right">Conv. %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topKeywords.map((row) => (
                        <TableRow key={row.normalized || row.keyword}>
                          <TableCell>{row.keyword}</TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                          <TableCell align="right">{row.clicks}</TableCell>
                          <TableCell align="right">
                            {row.conversionRate ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} color="text.primary">
                  Top clicked terms
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                >
                  <Table size="small" sx={tableStripeSx}>
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell>Keyword</TableCell>
                        <TableCell align="right">Clicks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topClicked.map((row) => (
                        <TableRow key={row.keyword}>
                          <TableCell>{row.keyword}</TableCell>
                          <TableCell align="right">{row.clicks}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} color="text.primary">
                  No-result keywords
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                >
                  <Table size="small" sx={tableStripeSx}>
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell>Keyword</TableCell>
                        <TableCell align="right">Count</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {noResults.map((row) => (
                        <TableRow key={row.keyword}>
                          <TableCell>{row.keyword}</TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} color="text.primary">
                  Top converting keywords (min 5 searches)
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                >
                  <Table size="small" sx={tableStripeSx}>
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell>Keyword</TableCell>
                        <TableCell align="right">Searches</TableCell>
                        <TableCell align="right">Clicks</TableCell>
                        <TableCell align="right">Conv. %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {conversion.map((row) => (
                        <TableRow key={row.keyword}>
                          <TableCell>{row.keyword}</TableCell>
                          <TableCell align="right">{row.searches}</TableCell>
                          <TableCell align="right">{row.clicks}</TableCell>
                          <TableCell align="right">
                            {row.conversionRate}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} color="text.primary">
                  Popular cities (filter)
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                >
                  <Table size="small" sx={tableStripeSx}>
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell>City</TableCell>
                        <TableCell align="right">Searches</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {popularCities.map((row) => (
                        <TableRow key={row.value}>
                          <TableCell>{row.value}</TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} color="text.primary">
                  Top stores (filter)
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                >
                  <Table size="small" sx={tableStripeSx}>
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell>Store</TableCell>
                        <TableCell align="right">Searches</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topStores.map((row) => (
                        <TableRow key={row.value}>
                          <TableCell>{row.value}</TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} color="text.primary">
                  Top categories (filter)
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                >
                  <Table size="small" sx={tableStripeSx}>
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Searches</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topCategories.map((row) => (
                        <TableRow key={row.value}>
                          <TableCell>{row.value}</TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} color="text.primary">
                  Filter usage
                </Typography>
                <Grid container spacing={2}>
                  {topFilters &&
                    ["category", "city", "store", "sortBy"].map((k) => (
                      <Grid size={{ xs: 12, sm: 6, md: 3 }} key={k}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            bgcolor: isDark
                              ? "rgba(255,255,255,0.04)"
                              : "background.paper",
                            borderColor: "divider",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {k}
                          </Typography>
                          {(topFilters[k] || []).slice(0, 8).map((r) => (
                            <Box
                              key={String(r.value)}
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 13,
                              }}
                            >
                              <span
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {r.value}
                              </span>
                              <strong>{r.count}</strong>
                            </Box>
                          ))}
                        </Paper>
                      </Grid>
                    ))}
                </Grid>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} color="text.primary">
                  Recent activity
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                >
                  <Table size="small" sx={tableStripeSx}>
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell>Time</TableCell>
                        <TableCell>Query</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell align="right">Results</TableCell>
                        <TableCell>Clicked</TableCell>
                        <TableCell>City</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recent.map((row) => (
                        <TableRow key={String(row._id)}>
                          <TableCell>
                            {row.searchedAt
                              ? new Date(row.searchedAt).toLocaleString()
                              : ""}
                          </TableCell>
                          <TableCell>{row.searchText}</TableCell>
                          <TableCell>{row.source}</TableCell>
                          <TableCell align="right">{row.resultCount}</TableCell>
                          <TableCell>
                            {row.clickedResult
                              ? row.clickedResultType || "yes"
                              : "—"}
                          </TableCell>
                          <TableCell>{row.filters?.city || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
};

export default AdminSearchAnalyticsPage;
