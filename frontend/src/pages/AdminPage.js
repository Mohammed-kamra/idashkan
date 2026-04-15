import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { adminAPI, storeAPI, brandAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ShoppingCart as ProductsIcon,
  Store as StoresIcon,
  Business as BrandsIcon,
  CardGiftcard as GiftsIcon,
  FileDownload as FileDownloadIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

const AdminPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalStores: 0,
    totalBrands: 0,
    totalGifts: 0,
    totalViews: 0,
    totalLikes: 0,
  });

  // Tab data
  const [mostLikedProducts, setMostLikedProducts] = useState([]);
  const [mostViewedProducts, setMostViewedProducts] = useState([]);
  const [storeReport, setStoreReport] = useState([]);
  const [brandReport, setBrandReport] = useState([]);
  const [storeNameFilter, setStoreNameFilter] = useState("");
  const [storeFromDate, setStoreFromDate] = useState("");
  const [storeToDate, setStoreToDate] = useState("");
  const [brandNameFilter, setBrandNameFilter] = useState("");
  const [brandFromDate, setBrandFromDate] = useState("");
  const [brandToDate, setBrandToDate] = useState("");
  const [expirePlanFilter, setExpirePlanFilter] = useState("all");
  const [expireStores, setExpireStores] = useState([]);
  const [expireBrands, setExpireBrands] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20); // 20, 50, 100, -1 = all

  const isAdmin =
    user?.email === "mshexani45@gmail.com" || user?.email === "admin@gmail.com";

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!isAdmin) {
      navigate("/");
      return;
    }
    setLoading(false);
    loadAdminStats();
  }, [isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 0) loadMostLiked();
    else if (activeTab === 1) loadMostViewed();
    else if (activeTab === 2) {
      loadStoreReport({
        storeName: storeNameFilter.trim() || undefined,
        fromDate: storeFromDate || undefined,
        toDate: storeToDate || undefined,
      });
    } else if (activeTab === 3) {
      loadBrandReport({
        brandName: brandNameFilter.trim() || undefined,
        fromDate: brandFromDate || undefined,
        toDate: brandToDate || undefined,
      });
    } else if (activeTab === 4) {
      loadExpirePlanData();
    }
  }, [
    activeTab,
    isAdmin,
    storeNameFilter,
    storeFromDate,
    storeToDate,
    brandNameFilter,
    brandFromDate,
    brandToDate,
  ]);

  const loadAdminStats = async () => {
    try {
      const res = await adminAPI.getStats();
      const data = res.data || {};
      setStats({
        totalUsers: data.totalUsers || 0,
        totalProducts: data.totalProducts || 0,
        totalStores: data.totalStores || 0,
        totalBrands: data.totalBrands || 0,
        totalGifts: data.totalGifts || 0,
        totalViews: data.totalViews || 0,
        totalLikes: data.totalLikes || 0,
      });
    } catch (error) {
      console.error("Error loading admin stats:", error);
    }
  };

  const loadMostLiked = async () => {
    setTabLoading(true);
    try {
      const res = await adminAPI.getMostLikedProducts();
      setMostLikedProducts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error loading most liked:", error);
      setMostLikedProducts([]);
    } finally {
      setTabLoading(false);
    }
  };

  const loadMostViewed = async () => {
    setTabLoading(true);
    try {
      const res = await adminAPI.getMostViewedProducts();
      setMostViewedProducts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error loading most viewed:", error);
      setMostViewedProducts([]);
    } finally {
      setTabLoading(false);
    }
  };

  const loadStoreReport = async (params) => {
    setTabLoading(true);
    try {
      const res = await adminAPI.getStoreReport(params || {});
      setStoreReport(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error loading store report:", error);
      setStoreReport([]);
    } finally {
      setTabLoading(false);
    }
  };

  const loadBrandReport = async (params) => {
    setTabLoading(true);
    try {
      const res = await adminAPI.getBrandReport(params || {});
      setBrandReport(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error loading brand report:", error);
      setBrandReport([]);
    } finally {
      setTabLoading(false);
    }
  };

  const loadExpirePlanData = async () => {
    setTabLoading(true);
    try {
      const [storesRes, brandsRes] = await Promise.all([
        storeAPI.getAllIncludingHidden(),
        brandAPI.getAllIncludingHidden(),
      ]);
      setExpireStores(Array.isArray(storesRes.data) ? storesRes.data : []);
      setExpireBrands(Array.isArray(brandsRes.data) ? brandsRes.data : []);
    } catch (error) {
      console.error("Error loading expire plan data:", error);
      setExpireStores([]);
      setExpireBrands([]);
    } finally {
      setTabLoading(false);
    }
  };

  const handleDeleteExpiredProducts = async () => {
    if (
      !window.confirm(
        t(
          "Are you sure you want to delete all products whose expire date is more than 1 month in the past? This cannot be undone.",
        ),
      )
    ) {
      return;
    }
    try {
      setTabLoading(true);
      const res = await adminAPI.deleteExpiredProducts();
      const msg =
        res.data?.message ||
        t("Expired products deleted successfully from the database.");
      alert(msg);
      // Reload stats and current tab data after deletion
      loadAdminStats();
      if (activeTab === 0) {
        loadMostLiked();
      } else if (activeTab === 1) {
        loadMostViewed();
      } else if (activeTab === 2) {
        loadStoreReport({
          storeName: storeNameFilter.trim() || undefined,
          fromDate: storeFromDate || undefined,
          toDate: storeToDate || undefined,
        });
      } else if (activeTab === 3) {
        loadBrandReport({
          brandName: brandNameFilter.trim() || undefined,
          fromDate: brandFromDate || undefined,
          toDate: brandToDate || undefined,
        });
      } else if (activeTab === 4) {
        loadExpirePlanData();
      }
    } catch (error) {
      console.error("Error deleting expired products:", error);
      alert(
        error?.response?.data?.message ||
          error?.message ||
          t("Failed to delete expired products."),
      );
    } finally {
      setTabLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "-";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatDateForExcel = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toISOString().split("T")[0];
  };

  const exportToExcel = (products, showStore, showBrand, sheetName) => {
    const headers = [];
    if (showStore) headers.push(t("Store Name"));
    if (showBrand) headers.push(t("Brand Name"));
    headers.push(
      t("Product Name"),
      t("Expire Date"),
      t("Like"),
      t("Viewed"),
      t("Review"),
    );

    const rows = products.map((p) => {
      const row = {};
      if (showStore) row[t("Store Name")] = p.storeId?.name || "-";
      if (showBrand) row[t("Brand Name")] = p.brandId?.name || "-";
      row[t("Product Name")] = p.name;
      row[t("Expire Date")] = formatDateForExcel(p.expireDate);
      row[t("Like")] = p.likeCount || 0;
      row[t("Viewed")] = p.viewCount || 0;
      row[t("Review")] = p.reviewCount || 0;
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${sheetName}_${date}.xlsx`);
  };

  const getDaysLeft = (dateStr) => {
    if (!dateStr) return null;
    const dateObj = new Date(dateStr);
    if (Number.isNaN(dateObj.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateObj);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / 86400000);
  };

  const expirePlanRows = useMemo(() => {
    const merged = [
      ...(expireStores || []).map((s) => ({
        _id: `store-${s._id}`,
        type: t("Store"),
        name: s.name || "-",
        statusAll: s.statusAll === "off" ? "off" : "on",
        expireDate: s.expireDate || null,
        daysLeft: getDaysLeft(s.expireDate),
      })),
      ...(expireBrands || []).map((b) => ({
        _id: `brand-${b._id}`,
        type: t("Brand"),
        name: b.name || "-",
        statusAll: b.statusAll === "off" ? "off" : "on",
        expireDate: b.expireDate || null,
        daysLeft: getDaysLeft(b.expireDate),
      })),
    ];

    const limitMap = {
      less7: 7,
      less14: 14,
      less30: 30,
    };

    const filtered = merged.filter((row) => {
      if (expirePlanFilter === "all") return true;
      if (expirePlanFilter === "expired") {
        return row.daysLeft !== null && row.daysLeft < 0;
      }
      const limit = limitMap[expirePlanFilter];
      if (!limit || row.daysLeft === null) return false;
      return row.daysLeft >= 0 && row.daysLeft <= limit;
    });

    filtered.sort((a, b) => {
      if (a.expireDate && b.expireDate) {
        return new Date(a.expireDate) - new Date(b.expireDate);
      }
      if (a.expireDate) return -1;
      if (b.expireDate) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    return filtered;
  }, [expireStores, expireBrands, expirePlanFilter, t]);

  const exportExpirePlanToExcel = () => {
    const rows = expirePlanRows.map((r) => ({
      [t("Type")]: r.type,
      [t("Name")]: r.name,
      [t("Status All")]: r.statusAll,
      [t("Expire Date")]: formatDateForExcel(r.expireDate),
      [t("Days Left")]:
        r.daysLeft === null
          ? "-"
          : r.daysLeft < 0
            ? `${t("Expired")} (${Math.abs(r.daysLeft)})`
            : r.daysLeft,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ExpireDatePlan");
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `ExpireDatePlan_${date}.xlsx`);
  };

  const handleRowsPerPageChange = (event) => {
    const value = parseInt(event.target.value, 10);
    setRowsPerPage(value);
    setPage(0);
  };

  const getPagedData = (data) => {
    if (!Array.isArray(data)) return [];
    if (rowsPerPage === -1) return data;
    const start = page * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  };

  const getActiveTabData = () => {
    if (activeTab === 0) return mostLikedProducts;
    if (activeTab === 1) return mostViewedProducts;
    if (activeTab === 2) return storeReport;
    if (activeTab === 3) return brandReport;
    if (activeTab === 4) return expirePlanRows;
    return [];
  };

  const totalItems = getActiveTabData().length;
  const totalPages =
    rowsPerPage === -1 || totalItems === 0
      ? 1
      : Math.ceil(totalItems / rowsPerPage);

  const handleNextPage = () => {
    if (rowsPerPage === -1) return;
    setPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const handlePrevPage = () => {
    if (rowsPerPage === -1) return;
    setPage((prev) => Math.max(prev - 1, 0));
  };

  const ProductTable = ({ products, showStore, showBrand }) => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: "action.hover" }}>
            {showStore && <TableCell>{t("Store Name")}</TableCell>}
            {showBrand && <TableCell>{t("Brand Name")}</TableCell>}
            <TableCell>{t("Product Name")}</TableCell>
            <TableCell>{t("Expire Date")}</TableCell>
            <TableCell align="center">{t("Like")}</TableCell>
            <TableCell align="center">{t("Viewed")}</TableCell>
            <TableCell align="center">{t("Review")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showStore || showBrand ? 7 : 5}
                align="center"
              >
                {t("No data to display")}
              </TableCell>
            </TableRow>
          ) : (
            products.map((p) => (
              <TableRow key={p._id} hover>
                {showStore && <TableCell>{p.storeId?.name || "-"}</TableCell>}
                {showBrand && <TableCell>{p.brandId?.name || "-"}</TableCell>}
                <TableCell>{p.name}</TableCell>
                <TableCell>{formatDate(p.expireDate)}</TableCell>
                <TableCell align="center">{p.likeCount || 0}</TableCell>
                <TableCell align="center">{p.viewCount || 0}</TableCell>
                <TableCell align="center">{p.reviewCount || 0}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          {t("Access denied. Admin privileges required.")}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ mt: 5 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            <DashboardIcon sx={{ mr: 2, verticalAlign: "middle" }} />
            {t("Admin Dashboard")}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {t("Welcome back, Admin")} - {user?.displayName || user?.username}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate("/admin/search-analytics")}
          >
            Search analytics
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteExpiredProducts}
            disabled={tabLoading}
          >
            {t("Remove products expired 1 month ago")}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: "primary.light", color: "white" }}>
            <CardContent>
              <Typography variant="h4">{stats.totalUsers}</Typography>
              <Typography variant="body2">
                <PeopleIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                {t("Total Users")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: "secondary.light", color: "white" }}>
            <CardContent>
              <Typography variant="h4">{stats.totalProducts}</Typography>
              <Typography variant="body2">
                <ProductsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                {t("Total Products")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: "success.light", color: "white" }}>
            <CardContent>
              <Typography variant="h4">{stats.totalStores}</Typography>
              <Typography variant="body2">
                <StoresIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                {t("Total Stores")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: "warning.light", color: "white" }}>
            <CardContent>
              <Typography variant="h4">{stats.totalBrands}</Typography>
              <Typography variant="body2">
                <BrandsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                {t("Total Brands")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: "info.light", color: "white" }}>
            <CardContent>
              <Typography variant="h4">{stats.totalGifts}</Typography>
              <Typography variant="body2">
                <GiftsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                {t("Total Gifts")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ width: "100%" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={t("Most liked Products list")} />
          <Tab label={t("Most viewed products list")} />
          <Tab label={t("Report for stores")} />
          <Tab label={t("Report for brands")} />
          <Tab
            label={t("ExpireDate Plan")}
            icon={<AccessTimeIcon />}
            iconPosition="start"
          />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 2,
                  mb: 2,
                }}
              >
                <Typography variant="h5">
                  {t("Most liked Products list")}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={() =>
                    exportToExcel(
                      mostLikedProducts,
                      true,
                      true,
                      "MostLikedProducts",
                    )
                  }
                  disabled={tabLoading || mostLikedProducts.length === 0}
                >
                  {t("Export to Excel")}
                </Button>
              </Box>
              {tabLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <ProductTable
                  products={getPagedData(mostLikedProducts)}
                  showStore
                  showBrand
                />
              )}
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 2,
                  mb: 2,
                }}
              >
                <Typography variant="h5">
                  {t("Most viewed products list")}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={() =>
                    exportToExcel(
                      mostViewedProducts,
                      true,
                      true,
                      "MostViewedProducts",
                    )
                  }
                  disabled={tabLoading || mostViewedProducts.length === 0}
                >
                  {t("Export to Excel")}
                </Button>
              </Box>
              {tabLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <ProductTable
                  products={getPagedData(mostViewedProducts)}
                  showStore
                  showBrand
                />
              )}
            </Box>
          )}

          {activeTab === 2 && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 2,
                  mb: 2,
                }}
              >
                <Typography variant="h5">{t("Report for stores")}</Typography>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={() =>
                    exportToExcel(storeReport, true, false, "StoreReport")
                  }
                  disabled={tabLoading || storeReport.length === 0}
                >
                  {t("Export to Excel")}
                </Button>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
                <TextField
                  size="small"
                  label={t("Filter by store name")}
                  value={storeNameFilter}
                  onChange={(e) => setStoreNameFilter(e.target.value)}
                  sx={{ minWidth: 220 }}
                  placeholder={t("Search by store name...")}
                />
                <TextField
                  size="small"
                  label={t("From date")}
                  type="date"
                  value={storeFromDate}
                  onChange={(e) => setStoreFromDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 160 }}
                />
                <TextField
                  size="small"
                  label={t("To date")}
                  type="date"
                  value={storeToDate}
                  onChange={(e) => setStoreToDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 160 }}
                />
              </Box>
              {tabLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <ProductTable products={getPagedData(storeReport)} showStore />
              )}
            </Box>
          )}

          {activeTab === 3 && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 2,
                  mb: 2,
                }}
              >
                <Typography variant="h5">{t("Report for brands")}</Typography>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={() =>
                    exportToExcel(brandReport, false, true, "BrandReport")
                  }
                  disabled={tabLoading || brandReport.length === 0}
                >
                  {t("Export to Excel")}
                </Button>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
                <TextField
                  size="small"
                  label={t("Filter by brand name")}
                  value={brandNameFilter}
                  onChange={(e) => setBrandNameFilter(e.target.value)}
                  sx={{ minWidth: 220 }}
                  placeholder={t("Search by brand name...")}
                />
                <TextField
                  size="small"
                  label={t("From date")}
                  type="date"
                  value={brandFromDate}
                  onChange={(e) => setBrandFromDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 160 }}
                />
                <TextField
                  size="small"
                  label={t("To date")}
                  type="date"
                  value={brandToDate}
                  onChange={(e) => setBrandToDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 160 }}
                />
              </Box>
              {tabLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <ProductTable products={getPagedData(brandReport)} showBrand />
              )}
            </Box>
          )}
          {activeTab === 4 && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 2,
                  mb: 2,
                }}
              >
                <Typography variant="h5">{t("ExpireDate Plan")}</Typography>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={exportExpirePlanToExcel}
                  disabled={tabLoading || expirePlanRows.length === 0}
                >
                  {t("Export to Excel")}
                </Button>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
                <TextField
                  select
                  size="small"
                  label={t("Near Expire Duration")}
                  value={expirePlanFilter}
                  onChange={(e) => setExpirePlanFilter(e.target.value)}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="all">{t("All")}</MenuItem>
                  <MenuItem value="expired">{t("Expired")}</MenuItem>
                  <MenuItem value="less7">{t("less 7 days")}</MenuItem>
                  <MenuItem value="less14">{t("less 2 weeks")}</MenuItem>
                  <MenuItem value="less30">{t("less 1 month")}</MenuItem>
                </TextField>
              </Box>
              {tabLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "action.hover" }}>
                        <TableCell>{t("Type")}</TableCell>
                        <TableCell>{t("Name")}</TableCell>
                        <TableCell>{t("Status All")}</TableCell>
                        <TableCell>{t("Expire Contact")}</TableCell>
                        <TableCell>{t("Days Left")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getPagedData(expirePlanRows).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            {t("No data to display")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        getPagedData(expirePlanRows).map((row) => (
                          <TableRow key={row._id} hover>
                            <TableCell>{row.type}</TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>{row.statusAll}</TableCell>
                            <TableCell>{formatDate(row.expireDate)}</TableCell>
                            <TableCell>
                              {row.daysLeft === null
                                ? "-"
                                : row.daysLeft < 0
                                  ? `${t("Expired")} (${Math.abs(row.daysLeft)})`
                                  : row.daysLeft}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
          <Box
            sx={{
              mt: 3,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography variant="body2">{t("Rows per page")}:</Typography>
              <TextField
                select
                size="small"
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
                sx={{ minWidth: 80 }}
              >
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={-1}>{t("All")}</MenuItem>
              </TextField>
            </Box>
            {rowsPerPage !== -1 && totalItems > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography variant="body2">
                  {t("Page")} {page + 1} {t("of")} {totalPages}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handlePrevPage}
                  disabled={page === 0}
                >
                  {t("Previous page")}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleNextPage}
                  disabled={page >= totalPages - 1}
                >
                  {t("Next page")}
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default AdminPage;
