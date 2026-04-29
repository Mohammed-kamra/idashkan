import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { adminAPI, translationAPI } from "../services/api";
import { mergeRemoteTranslations } from "../mergeRemoteTranslations";
import { resources } from "../i18nResources";

function buildMergedTranslationRows(dbRows = []) {
  const bundledEn = resources?.en?.translation || {};
  const bundledAr = resources?.ar?.translation || {};
  const bundledKu = resources?.ku?.translation || {};

  const byKey = new Map();

  const putBundled = (key) => {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey || byKey.has(normalizedKey)) return;
    byKey.set(normalizedKey, {
      key: normalizedKey,
      en: bundledEn[normalizedKey] || "",
      ar: bundledAr[normalizedKey] || "",
      ku: bundledKu[normalizedKey] || "",
      source: "bundled",
    });
  };

  Object.keys(bundledEn).forEach(putBundled);
  Object.keys(bundledAr).forEach(putBundled);
  Object.keys(bundledKu).forEach(putBundled);

  for (const row of dbRows) {
    const normalizedKey = String(row?.key || "").trim();
    if (!normalizedKey) continue;
    const existing = byKey.get(normalizedKey) || {
      key: normalizedKey,
      en: "",
      ar: "",
      ku: "",
      source: "database",
    };
    byKey.set(normalizedKey, {
      ...existing,
      _id: row?._id,
      en: typeof row?.en === "string" && row.en.length > 0 ? row.en : existing.en,
      ar: typeof row?.ar === "string" && row.ar.length > 0 ? row.ar : existing.ar,
      ku: typeof row?.ku === "string" && row.ku.length > 0 ? row.ku : existing.ku,
      source: existing.source === "bundled" ? "merged" : "database",
    });
  }

  return Array.from(byKey.values()).sort((a, b) => a.key.localeCompare(b.key));
}

const TranslationPage = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formKey, setFormKey] = useState("");
  const [formEn, setFormEn] = useState("");
  const [formAr, setFormAr] = useState("");
  const [formKu, setFormKu] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filterMode, setFilterMode] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const isAdmin =
    user?.email === "mshexani45@gmail.com" || user?.email === "admin@gmail.com";

  const loadRows = useCallback(async () => {
    try {
      const res = await translationAPI.getAll();
      if (res.data?.success) {
        setRows(buildMergedTranslationRows(res.data.data || []));
        setError("");
      } else {
        setError(res.data?.message || t("translationPage.loadError"));
      }
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("translationPage.loadError"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadRows();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin, loadRows]);

  const filtered = useMemo(() => {
    let list = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const blob = [r.key, r.en, r.ar, r.ku]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });
    }
    if (filterMode === "incomplete") {
      list = list.filter((r) => {
        const ar = String(r?.ar ?? "").trim();
        const ku = String(r?.ku ?? "").trim();
        return !ar || !ku;
      });
    }
    return list;
  }, [rows, search, filterMode]);

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [search, filterMode]);

  const openCreate = () => {
    setEditing(null);
    setFormKey("");
    setFormEn("");
    setFormAr("");
    setFormKu("");
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormKey(row.key || "");
    setFormEn(row.en || "");
    setFormAr(row.ar || "");
    setFormKu(row.ku || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const key = formKey.trim();
    if (!key) return;
    setSaving(true);
    setError("");
    try {
      const res = await adminAPI.upsertTranslation({
        key,
        en: formEn,
        ar: formAr,
        ku: formKu,
      });
      if (res.data?.success) {
        await mergeRemoteTranslations();
        await i18n.changeLanguage(i18n.language);
        await loadRows();
        setDialogOpen(false);
      } else {
        setError(res.data?.message || t("translationPage.saveError"));
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("translationPage.saveError"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;
    setDeleting(true);
    setError("");
    try {
      const res = await adminAPI.deleteTranslation(deleteTarget._id);
      if (res.data?.success) {
        setDeleteTarget(null);
        window.location.reload();
      } else {
        setError(res.data?.message || t("translationPage.deleteError"));
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("translationPage.deleteError"),
      );
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{t("translationPage.loginRequired")}</Alert>
      </Container>
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

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2, pt: 7 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {t("translationPage.title")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("translationPage.intro")}
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          display="flex"
          flexWrap="wrap"
          gap={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <TextField
            size="small"
            label={t("translationPage.searchLabel")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="translation-filter-label">
              {t("translationPage.filterLabel")}
            </InputLabel>
            <Select
              labelId="translation-filter-label"
              label={t("translationPage.filterLabel")}
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <MenuItem value="all">{t("translationPage.filterAll")}</MenuItem>
              <MenuItem value="incomplete">
                {t("translationPage.filterIncomplete")}
              </MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
          >
            {t("translationPage.addRow")}
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("translationPage.colKey")}</TableCell>
              <TableCell width={120}>
                {t("translationPage.colSource", { defaultValue: "Source" })}
              </TableCell>
              <TableCell>{t("English")}</TableCell>
              <TableCell>{t("Arabic")}</TableCell>
              <TableCell>{t("Kurdish")}</TableCell>
              <TableCell align="right" width={100}>
                {t("Actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {t("translationPage.empty")}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => (
                <TableRow key={row._id || row.key} hover>
                  <TableCell sx={{ maxWidth: 220, wordBreak: "break-word" }}>
                    {row.key}
                  </TableCell>
                  <TableCell>
                    {t(`translationPage.source.${row.source}`, {
                      defaultValue: row.source,
                    })}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, wordBreak: "break-word" }}>
                    {row.en}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, wordBreak: "break-word" }}>
                    {row.ar}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, wordBreak: "break-word" }}>
                    {row.ku}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t("translationPage.edit")}>
                      <IconButton
                        size="small"
                        onClick={() => openEdit(row)}
                        aria-label={t("translationPage.edit")}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("Delete")}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => row._id && setDeleteTarget(row)}
                          aria-label={t("Delete")}
                          disabled={!row._id}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage={t("translationPage.rowsPerPage")}
          labelDisplayedRows={({ from, to, count }) =>
            t("translationPage.displayedRows", { from, to, count })
          }
        />
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {editing ? t("translationPage.editRow") : t("translationPage.addRow")}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t("translationPage.fieldKey")}
            fullWidth
            value={formKey}
            onChange={(e) => setFormKey(e.target.value)}
            disabled={!!editing || saving}
            helperText={t("translationPage.fieldKeyHelp")}
          />
          <TextField
            margin="dense"
            label={t("English")}
            fullWidth
            multiline
            minRows={2}
            value={formEn}
            onChange={(e) => setFormEn(e.target.value)}
            disabled={saving}
          />
          <TextField
            margin="dense"
            label={t("Arabic")}
            fullWidth
            multiline
            minRows={2}
            value={formAr}
            onChange={(e) => setFormAr(e.target.value)}
            disabled={saving}
          />
          <TextField
            margin="dense"
            label={t("Kurdish")}
            fullWidth
            multiline
            minRows={2}
            value={formKu}
            onChange={(e) => setFormKu(e.target.value)}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            {t("Close")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formKey.trim()}
          >
            {saving ? t("Saving...") : t("Save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
      >
        <DialogTitle>{t("translationPage.confirmDeleteTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t("translationPage.confirmDeleteBody")}
          </Typography>
          {deleteTarget?.key ? (
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
              {deleteTarget.key}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            {t("Close")}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? t("Deleting...") : t("Delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TranslationPage;
