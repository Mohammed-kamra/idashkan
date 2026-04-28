import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../services/api";

const AdminFeedbackPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedRow, setSelectedRow] = useState(null);

  const canAccess =
    user?.email === "mshexani45@gmail.com" ||
    user?.email === "admin@gmail.com" ||
    user?.role === "support";

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page,
        limit,
        ...(typeFilter !== "all" ? { type: typeFilter } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      };
      const res = await adminAPI.getFeedback(params);
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
      setTotal(Number(res?.data?.total) || 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(
        e?.response?.data?.message ||
          t("Failed to load feedback", { defaultValue: "Failed to load feedback" }),
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter, statusFilter, t]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!canAccess) {
      navigate("/");
      return;
    }
    loadRows();
  }, [isAuthenticated, canAccess, navigate, loadRows]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  return (
    <Box
      sx={{
        py: 3,
        pb: 6,
        minHeight: "100vh",
        bgcolor: theme.palette.mode === "dark" ? "rgba(13,17,28,1)" : "rgba(248,249,252,1)",
        pt: 7,
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 2 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1.5,
            mb: 2,
          }}
        >
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            {t("Back")}
          </Button>
          <Typography variant="h5" fontWeight={800}>
            {t("User feedback", { defaultValue: "User feedback" })}
          </Typography>
        </Box>

        <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t("Type", { defaultValue: "Type" })}</InputLabel>
              <Select
                value={typeFilter}
                label={t("Type", { defaultValue: "Type" })}
                onChange={(e) => {
                  setPage(1);
                  setTypeFilter(e.target.value);
                }}
              >
                <MenuItem value="all">{t("All", { defaultValue: "All" })}</MenuItem>
                <MenuItem value="suggestion">
                  {t("Suggestion", { defaultValue: "Suggestion" })}
                </MenuItem>
                <MenuItem value="problem">
                  {t("Report a problem", { defaultValue: "Report a problem" })}
                </MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t("Status", { defaultValue: "Status" })}</InputLabel>
              <Select
                value={statusFilter}
                label={t("Status", { defaultValue: "Status" })}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
              >
                <MenuItem value="all">{t("All", { defaultValue: "All" })}</MenuItem>
                <MenuItem value="new">{t("New", { defaultValue: "New" })}</MenuItem>
                <MenuItem value="reviewed">
                  {t("Reviewed", { defaultValue: "Reviewed" })}
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label={t("Page", { defaultValue: "Page" })}
              value={page}
              onChange={(e) => {
                const next = Math.max(1, Number(e.target.value) || 1);
                setPage(next);
              }}
              sx={{ width: 110 }}
            />
          </Box>
        </Paper>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("Date", { defaultValue: "Date" })}</TableCell>
                <TableCell>{t("Type", { defaultValue: "Type" })}</TableCell>
                <TableCell>{t("Sender", { defaultValue: "Sender" })}</TableCell>
                <TableCell>{t("Note", { defaultValue: "Note" })}</TableCell>
                <TableCell>{t("Status", { defaultValue: "Status" })}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    {t("No feedback found", { defaultValue: "No feedback found" })}
                  </TableCell>
                </TableRow>
              ) : null}
              {rows.map((row) => {
                const sender =
                  row?.userId?.email ||
                  row?.userId?.displayName ||
                  row?.guestName ||
                  row?.guestDeviceId ||
                  "Guest";
                return (
                  <TableRow
                    key={row._id}
                    hover
                    onClick={() => setSelectedRow(row)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={row.type === "problem" ? "error" : "primary"}
                        label={
                          row.type === "problem"
                            ? t("Problem", { defaultValue: "Problem" })
                            : t("Suggestion", { defaultValue: "Suggestion" })
                        }
                      />
                    </TableCell>
                    <TableCell>{sender}</TableCell>
                    <TableCell>
                      {String(row.note || "").length > 90
                        ? `${String(row.note).slice(0, 90)}...`
                        : String(row.note || "")}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={row.status || "new"} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t("Total", { defaultValue: "Total" })}: {total}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("Previous", { defaultValue: "Previous" })}
            </Button>
            <Button
              size="small"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("Next", { defaultValue: "Next" })}
            </Button>
          </Box>
        </Box>
      </Container>

      <Dialog open={Boolean(selectedRow)} onClose={() => setSelectedRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("Feedback details", { defaultValue: "Feedback details" })}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {selectedRow?.note || "-"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRow(null)}>{t("Close", { defaultValue: "Close" })}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminFeedbackPage;
