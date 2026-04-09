import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  IconButton,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { useCityFilter } from "../context/CityFilterContext";
import { adminAPI } from "../services/api";
import { useTranslation } from "react-i18next";
import { isAdminEmail } from "../utils/adminAccess";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
const emptyForm = () => ({
  name: "",
  flag: "📍",
  sortOrder: 0,
  isActive: true,
});

const AdminCitiesPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { refreshCities } = useCityFilter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const isAdmin = isAdminEmail(user);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await adminAPI.getCities();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.msg ||
          err?.message ||
          t("Failed to load cities", { defaultValue: "Failed to load cities" }),
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      load();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin, load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (city) => {
    setEditingId(city._id);
    setForm({
      name: city.name || "",
      flag: city.flag || "📍",
      sortOrder: city.sortOrder ?? 0,
      isActive: city.isActive !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = String(form.name || "").trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name,
        flag: String(form.flag || "").trim() || "📍",
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive !== false,
      };
      if (editingId) {
        await adminAPI.updateCity(editingId, payload);
      } else {
        await adminAPI.createCity(payload);
      }
      setDialogOpen(false);
      await load();
      await refreshCities();
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.msg ||
          err?.message ||
          t("Save failed", { defaultValue: "Save failed" }),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (city) => {
    if (
      !window.confirm(
        t("Remove this city?", {
          defaultValue:
            "Remove this city? If stores use it, it will be deactivated instead.",
        }),
      )
    ) {
      return;
    }
    setDeletingId(city._id);
    setError("");
    try {
      await adminAPI.deleteCity(city._id);
      await load();
      await refreshCities();
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.msg ||
          err?.message ||
          t("Delete failed", { defaultValue: "Delete failed" }),
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          {t("Please log in to continue.", {
            defaultValue: "Please log in to continue.",
          })}
        </Alert>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          {t("Access denied. Admin privileges required.", {
            defaultValue: "Access denied. Admin privileges required.",
          })}
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
    <Container maxWidth="md" sx={{ mt: 6, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="h5" component="h1">
          {t("City management", { defaultValue: "City management" })}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
        >
          {t("Add city", { defaultValue: "Add city" })}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t(
          "Cities appear in the app city selector and in store addresses. Renaming updates all stores in that city.",
          {
            defaultValue:
              "Cities appear in the app city selector and in store addresses. Renaming updates all stores in that city.",
          },
        )}
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      ) : null}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("Icon", { defaultValue: "Icon" })}</TableCell>
              <TableCell>{t("Name", { defaultValue: "Name" })}</TableCell>
              <TableCell align="right">
                {t("Sort", { defaultValue: "Sort" })}
              </TableCell>
              <TableCell>{t("Active", { defaultValue: "Active" })}</TableCell>
              <TableCell align="right">
                {t("Actions", { defaultValue: "Actions" })}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...rows]
              .sort(
                (a, b) =>
                  (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
                  String(a.name).localeCompare(String(b.name)),
              )
              .map((city) => (
                <TableRow key={city._id}>
                  <TableCell>{city.flag || "📍"}</TableCell>
                  <TableCell>{city.name}</TableCell>
                  <TableCell align="right">{city.sortOrder ?? 0}</TableCell>
                  <TableCell>
                    {city.isActive === false ? t("No") : t("Yes")}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => openEdit(city)}
                      aria-label={t("Edit", { defaultValue: "Edit" })}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(city)}
                      disabled={deletingId === city._id}
                      aria-label={t("Delete", { defaultValue: "Delete" })}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {editingId
            ? t("Edit city", { defaultValue: "Edit city" })
            : t("Add city", { defaultValue: "Add city" })}
        </DialogTitle>
        <DialogContent
          sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            label={t("Name (stored on stores)", {
              defaultValue: "Name (stored on stores)",
            })}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            fullWidth
            required
            autoFocus
          />
          <TextField
            label={t("Icon / emoji", { defaultValue: "Icon / emoji" })}
            value={form.flag}
            onChange={(e) => setForm((f) => ({ ...f, flag: e.target.value }))}
            fullWidth
          />
          <TextField
            label={t("Sort order", { defaultValue: "Sort order" })}
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm((f) => ({ ...f, sortOrder: e.target.value }))
            }
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isActive !== false}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
            }
            label={t("Active in city selector", {
              defaultValue: "Active in city selector",
            })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            {t("Cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !String(form.name || "").trim()}
          >
            {saving ? (
              <CircularProgress size={22} />
            ) : (
              t("Save", { defaultValue: "Save" })
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminCitiesPage;
