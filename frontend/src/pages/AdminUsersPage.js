import React, { useCallback, useEffect, useState } from "react";
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
  TablePagination,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  IconButton,
  Stack,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useAuth } from "../context/AuthContext";
import { adminAPI, storeAPI, brandAPI, companyAPI } from "../services/api";
import { useTranslation } from "react-i18next";
import { isAdminEmail, normalizeUserRole } from "../utils/adminAccess";
import { normalizeOwnerEntities } from "../utils/ownerEntities";
import { isOwnerDashboardRole, isOwnerDataEntryRole } from "../utils/roles";

const AdminUsersPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  /** Bumps after create/update/delete so we refetch even when page stays 0. */
  const [refreshKey, setRefreshKey] = useState(0);

  /** Lists for Owner role: store / brand / company pickers */
  const [ownerEntityLists, setOwnerEntityLists] = useState({
    stores: [],
    brands: [],
    companies: [],
  });
  const [loadingOwnerEntities, setLoadingOwnerEntities] = useState(false);

  const isAdmin = isAdminEmail(user);

  const fetchUsers = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const res = await adminAPI.getUsers({
        page: page + 1,
        limit: rowsPerPage,
      });
      if (res.data?.success) {
        const list = res.data.data || [];
        const total =
          typeof res.data.total === "number" ? res.data.total : list.length;
        const serverPage =
          typeof res.data.page === "number" ? res.data.page : page + 1;
        setUsers(list);
        setTotalUsers(total);
        if (serverPage >= 1 && serverPage - 1 !== page) {
          setPage(serverPage - 1);
        }
      } else {
        setError(res.data?.message || "Failed to load users");
      }
    } catch (err) {
      console.error("Error loading users:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin, page, rowsPerPage, refreshKey]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [isAuthenticated, isAdmin, fetchUsers]);

  useEffect(() => {
    if (
      !editDialogOpen ||
      !editingUser ||
      (!isOwnerDashboardRole(editingUser) &&
        !isOwnerDataEntryRole(editingUser))
    ) {
      setOwnerEntityLists({ stores: [], brands: [], companies: [] });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingOwnerEntities(true);
      try {
        const [rS, rB, rC] = await Promise.all([
          storeAPI.getAllIncludingHidden(),
          brandAPI.getAllIncludingHidden(),
          companyAPI.getAllIncludingHidden(),
        ]);
        if (!cancelled) {
          setOwnerEntityLists({
            stores: Array.isArray(rS.data) ? rS.data : [],
            brands: Array.isArray(rB.data) ? rB.data : [],
            companies: Array.isArray(rC.data) ? rC.data : [],
          });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setOwnerEntityLists({ stores: [], brands: [], companies: [] });
        }
      } finally {
        if (!cancelled) setLoadingOwnerEntities(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editDialogOpen, editingUser?.role]);

  const getSelectedEntities = (ids, list) => {
    const set = new Set((ids || []).map(String));
    return (list || []).filter((x) => set.has(String(x._id)));
  };

  const getOwnerOptionsForType = (typ) => {
    if (typ === "store") return ownerEntityLists.stores;
    if (typ === "brand") return ownerEntityLists.brands;
    return ownerEntityLists.companies;
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          {t("Access denied. Please login as admin to view users.")}
        </Alert>
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

  if (loading && users.length === 0) {
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

  const openCreateDialog = () => {
    setEditingUser({
      _id: null,
      username: "",
      email: "",
      displayName: "",
      isActive: true,
      role: "user",
      ownerEntities: [],
      ownerDataEntryAllStores: false,
      ownerDataEntryAllBrands: false,
      ownerDataEntryAllCompanies: false,
      ownerDataEntryStoreIds: [],
      ownerDataEntryBrandIds: [],
      ownerDataEntryCompanyIds: [],
    });
    setEditDialogOpen(true);
  };

  const openEditDialog = (row) => {
    const normalized = normalizeOwnerEntities(row);
    setEditingUser({
      ...row,
      role: normalizeUserRole(row),
      ownerEntities:
        normalized.length > 0
          ? normalized
          : [{ entityType: "store", entityId: "" }],
      ownerDataEntryAllStores: !!row.ownerDataEntryAllStores,
      ownerDataEntryAllBrands: !!row.ownerDataEntryAllBrands,
      ownerDataEntryAllCompanies: !!row.ownerDataEntryAllCompanies,
      ownerDataEntryStoreIds: row.ownerDataEntryStoreIds || [],
      ownerDataEntryBrandIds: row.ownerDataEntryBrandIds || [],
      ownerDataEntryCompanyIds: row.ownerDataEntryCompanyIds || [],
    });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingUser(null);
  };

  const handleEditFieldChange = (field, value) => {
    setEditingUser((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    setError("");
    try {
      let res;
      const roleNorm =
        editingUser.role === "support"
          ? "support"
          : editingUser.role === "owner_superadmin"
            ? "owner_superadmin"
          : editingUser.role === "owner"
            ? "owner"
            : editingUser.role === "owner_dataentry"
              ? "owner_dataentry"
              : "user";

      const appendOwnerDataEntry = (payload) => {
        if (roleNorm !== "owner_dataentry" && roleNorm !== "owner_superadmin")
          return;
        const anyAll =
          editingUser.ownerDataEntryAllStores ||
          editingUser.ownerDataEntryAllBrands ||
          editingUser.ownerDataEntryAllCompanies;
        const anyIds =
          (editingUser.ownerDataEntryStoreIds || []).length +
          (editingUser.ownerDataEntryBrandIds || []).length +
          (editingUser.ownerDataEntryCompanyIds || []).length;
        if (!anyAll && !anyIds) {
          setError(
            t(
              "Select All and/or specific stores, brands, and companies for Owner Data Entry.",
              {
                defaultValue:
                  "Select All and/or specific stores, brands, and companies for Owner Data Entry.",
              },
            ),
          );
          throw new Error("scope");
        }
        payload.ownerDataEntryAllStores = !!editingUser.ownerDataEntryAllStores;
        payload.ownerDataEntryAllBrands = !!editingUser.ownerDataEntryAllBrands;
        payload.ownerDataEntryAllCompanies =
          !!editingUser.ownerDataEntryAllCompanies;
        payload.ownerDataEntryStoreIds =
          editingUser.ownerDataEntryStoreIds || [];
        payload.ownerDataEntryBrandIds =
          editingUser.ownerDataEntryBrandIds || [];
        payload.ownerDataEntryCompanyIds =
          editingUser.ownerDataEntryCompanyIds || [];
      };

      if (editingUser._id) {
        const updatePayload = {
          username: editingUser.username,
          email: editingUser.email,
          displayName: editingUser.displayName,
          isActive: editingUser.isActive,
          role: roleNorm,
        };
        if (editingUser.password && editingUser.password.trim() !== "") {
          updatePayload.password = editingUser.password;
        }
        if (roleNorm === "owner" || roleNorm === "owner_superadmin") {
          const valid = (editingUser.ownerEntities || []).filter(
            (e) =>
              e.entityType &&
              e.entityId &&
              String(e.entityId).trim() !== "",
          );
          if (valid.length === 0) {
            setError(
              t("Owner must have at least one linked business.", {
                defaultValue: "Owner must have at least one linked business.",
              }),
            );
            setSaving(false);
            return;
          }
          updatePayload.ownerEntities = valid.map((e) => ({
            entityType: e.entityType,
            entityId: String(e.entityId).trim(),
          }));
        }
        try {
          appendOwnerDataEntry(updatePayload);
        } catch (e) {
          if (e.message === "scope") {
            setSaving(false);
            return;
          }
          throw e;
        }
        res = await adminAPI.updateUser(editingUser._id, updatePayload);
      } else {
        const createPayload = {
          username: editingUser.username,
          email: editingUser.email,
          password: editingUser.password,
          displayName: editingUser.displayName,
          role: roleNorm,
        };
        if (roleNorm === "owner" || roleNorm === "owner_superadmin") {
          const valid = (editingUser.ownerEntities || []).filter(
            (e) =>
              e.entityType &&
              e.entityId &&
              String(e.entityId).trim() !== "",
          );
          if (valid.length === 0) {
            setError(
              t("Owner must have at least one linked business.", {
                defaultValue: "Owner must have at least one linked business.",
              }),
            );
            setSaving(false);
            return;
          }
          createPayload.ownerEntities = valid.map((e) => ({
            entityType: e.entityType,
            entityId: String(e.entityId).trim(),
          }));
        }
        try {
          appendOwnerDataEntry(createPayload);
        } catch (e) {
          if (e.message === "scope") {
            setSaving(false);
            return;
          }
          throw e;
        }
        res = await adminAPI.createUser(createPayload);
      }

      if (res.data?.success) {
        if (!editingUser._id) {
          setPage(0);
        }
        closeEditDialog();
        setRefreshKey((k) => k + 1);
      } else {
        setError(res.data?.message || "Failed to save user");
      }
    } catch (err) {
      console.error("Error saving user:", err);
      setError(
        err?.response?.data?.message || err?.message || "Failed to save user",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm(t("Are you sure you want to delete this user?")))
      return;
    setDeletingId(id);
    setError("");
    try {
      const res = await adminAPI.deleteUser(id);
      if (res.data?.success) {
        setRefreshKey((k) => k + 1);
      } else {
        setError(res.data?.message || "Failed to delete user");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      setError(
        err?.response?.data?.message || err?.message || "Failed to delete user",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, mt: 7 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t("Users")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            "List of all users, including guest device accounts and admin accounts.",
          )}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={openCreateDialog}>
            {t("Create User")}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        {loading && users.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("Name")}</TableCell>
              <TableCell>{t("Email")}</TableCell>
              <TableCell>{t("Device ID")}</TableCell>
              <TableCell>{t("Type")}</TableCell>
              <TableCell>{t("Role")}</TableCell>
              <TableCell>{t("Status")}</TableCell>
              <TableCell>{t("Created At")}</TableCell>
              <TableCell align="right">{t("Actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {t("No users found")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isGuest = !!u.deviceId && !u.email;
                const displayName =
                  u.displayName?.trim() || u.username || (isGuest ? t("Guest user") : t("User"));
                const role = normalizeUserRole(u);
                return (
                  <TableRow key={u._id}>
                    <TableCell>{displayName}</TableCell>
                    <TableCell>{u.email || "-"}</TableCell>
                    <TableCell>{u.deviceId || "-"}</TableCell>
                    <TableCell>
                      {isGuest ? (
                        <Chip size="small" label={t("Guest (device)")} />
                      ) : (
                        <Chip
                          size="small"
                          label={t("Registered")}
                          color="primary"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {role === "support" ? (
                        <Chip
                          size="small"
                          color="secondary"
                          label={t("Support (Data Entry)")}
                        />
                      ) : role === "owner_superadmin" ? (
                        <Chip
                          size="small"
                          color="warning"
                          label={t("Owner Superadmin", {
                            defaultValue: "Owner Superadmin",
                          })}
                        />
                      ) : role === "owner" ? (
                        <Chip
                          size="small"
                          color="warning"
                          label={t("Owner", { defaultValue: "Owner" })}
                        />
                      ) : role === "owner_dataentry" ? (
                        <Chip
                          size="small"
                          color="info"
                          label={t("Owner (Data Entry)", {
                            defaultValue: "Owner (Data Entry)",
                          })}
                        />
                      ) : (
                        <Chip size="small" label={t("Normal user")} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={u.isActive ? t("Active") : t("Inactive")}
                        color={u.isActive ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell align="right">
                      {!isGuest && (
                        <Button
                          size="small"
                          sx={{ mr: 1 }}
                          onClick={() => openEditDialog(u)}
                        >
                          {t("Edit")}
                        </Button>
                      )}
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDeleteUser(u._id)}
                        disabled={deletingId === u._id}
                      >
                        {deletingId === u._id ? t("Deleting...") : t("Delete")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalUsers}
          page={page}
          onPageChange={(e, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage={t("translationPage.rowsPerPage")}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      </TableContainer>
      <Dialog
        open={editDialogOpen}
        onClose={closeEditDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingUser && editingUser._id ? t("Edit User") : t("Create User")}
        </DialogTitle>
        <DialogContent>
          {editingUser && (
            <Box sx={{ mt: 1 }}>
              <TextField
                fullWidth
                margin="normal"
                label={t("Username")}
                value={editingUser.username || ""}
                onChange={(e) =>
                  handleEditFieldChange("username", e.target.value)
                }
              />
              <TextField
                fullWidth
                margin="normal"
                label={t("Email")}
                type="email"
                value={editingUser.email || ""}
                onChange={(e) => handleEditFieldChange("email", e.target.value)}
              />
              <TextField
                fullWidth
                margin="normal"
                label={t("Display Name")}
                value={editingUser.displayName || ""}
                onChange={(e) =>
                  handleEditFieldChange("displayName", e.target.value)
                }
              />
              <TextField
                fullWidth
                margin="normal"
                label={
                  editingUser._id
                    ? t("New Password (leave blank to keep current)")
                    : t("Password")
                }
                type="password"
                value={editingUser.password || ""}
                onChange={(e) =>
                  handleEditFieldChange("password", e.target.value)
                }
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id="user-role-label">{t("Role")}</InputLabel>
                <Select
                  labelId="user-role-label"
                  label={t("Role")}
                  value={
                    editingUser.role === "support"
                      ? "support"
                      : editingUser.role === "owner_superadmin"
                        ? "owner_superadmin"
                      : editingUser.role === "owner"
                        ? "owner"
                        : editingUser.role === "owner_dataentry"
                          ? "owner_dataentry"
                          : "user"
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "owner") {
                      setEditingUser((prev) => ({
                        ...prev,
                        role: v,
                        ownerEntities:
                          Array.isArray(prev.ownerEntities) &&
                          prev.ownerEntities.length > 0
                            ? prev.ownerEntities
                            : [{ entityType: "store", entityId: "" }],
                      }));
                    } else if (v === "owner_superadmin") {
                      setEditingUser((prev) => ({
                        ...prev,
                        role: v,
                        ownerEntities:
                          Array.isArray(prev.ownerEntities) &&
                          prev.ownerEntities.length > 0
                            ? prev.ownerEntities
                            : [{ entityType: "store", entityId: "" }],
                      }));
                    } else if (v === "owner_dataentry") {
                      setEditingUser((prev) => ({
                        ...prev,
                        role: v,
                        ownerEntities: [],
                        ownerDataEntryAllStores:
                          prev.ownerDataEntryAllStores || false,
                        ownerDataEntryAllBrands:
                          prev.ownerDataEntryAllBrands || false,
                        ownerDataEntryAllCompanies:
                          prev.ownerDataEntryAllCompanies || false,
                        ownerDataEntryStoreIds:
                          prev.ownerDataEntryStoreIds || [],
                        ownerDataEntryBrandIds:
                          prev.ownerDataEntryBrandIds || [],
                        ownerDataEntryCompanyIds:
                          prev.ownerDataEntryCompanyIds || [],
                      }));
                    } else {
                      setEditingUser((prev) => ({
                        ...prev,
                        role: v,
                        ownerEntities: [],
                      }));
                    }
                  }}
                >
                  <MenuItem value="user">{t("Normal user")}</MenuItem>
                  <MenuItem value="support">
                    {t("Support (Data Entry)")}
                  </MenuItem>
                  <MenuItem value="owner">
                    {t("Owner", { defaultValue: "Owner" })}
                  </MenuItem>
                  <MenuItem value="owner_dataentry">
                    {t("Owner (Data Entry)", {
                      defaultValue: "Owner (Data Entry)",
                    })}
                  </MenuItem>
                  <MenuItem value="owner_superadmin">
                    {t("Owner Superadmin (dashboard + data entry)", {
                      defaultValue: "Owner Superadmin (dashboard + data entry)",
                    })}
                  </MenuItem>
                </Select>
              </FormControl>
              {(editingUser.role === "owner" ||
                editingUser.role === "owner_superadmin") && (
                <>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, mb: 0.5 }}
                  >
                    {t("Linked businesses (one or more)", {
                      defaultValue: "Linked businesses (one or more)",
                    })}
                  </Typography>
                  {loadingOwnerEntities ? (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        py: 2,
                      }}
                    >
                      <CircularProgress size={28} />
                    </Box>
                  ) : (
                    <>
                      {(editingUser.ownerEntities || []).map((row, idx) => {
                        const options = getOwnerOptionsForType(
                          row.entityType || "store",
                        );
                        const selected =
                          options.find(
                            (o) => String(o._id) === String(row.entityId),
                          ) || null;
                        return (
                          <Stack
                            key={`owner-row-${idx}`}
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            alignItems={{ xs: "stretch", sm: "center" }}
                            sx={{ mb: 1.5 }}
                          >
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <InputLabel id={`admin-owner-typ-${idx}`}>
                                {t("Type", { defaultValue: "Type" })}
                              </InputLabel>
                              <Select
                                labelId={`admin-owner-typ-${idx}`}
                                label={t("Type", { defaultValue: "Type" })}
                                value={row.entityType || "store"}
                                onChange={(e) => {
                                  const next = [
                                    ...(editingUser.ownerEntities || []),
                                  ];
                                  next[idx] = {
                                    entityType: e.target.value,
                                    entityId: "",
                                  };
                                  handleEditFieldChange("ownerEntities", next);
                                }}
                              >
                                <MenuItem value="store">
                                  {t("Store", { defaultValue: "Store" })}
                                </MenuItem>
                                <MenuItem value="brand">
                                  {t("Brand", { defaultValue: "Brand" })}
                                </MenuItem>
                                <MenuItem value="company">
                                  {t("Company", { defaultValue: "Company" })}
                                </MenuItem>
                              </Select>
                            </FormControl>
                            <Autocomplete
                              sx={{ flex: 1, minWidth: 0 }}
                              options={options}
                              value={selected}
                              onChange={(_, option) => {
                                const next = [
                                  ...(editingUser.ownerEntities || []),
                                ];
                                next[idx] = {
                                  ...next[idx],
                                  entityId: option?._id
                                    ? String(option._id)
                                    : "",
                                };
                                handleEditFieldChange("ownerEntities", next);
                              }}
                              getOptionLabel={(opt) =>
                                opt?.nameEn || opt?.name || opt?.nameKu || ""
                              }
                              isOptionEqualToValue={(a, b) =>
                                !!a &&
                                !!b &&
                                String(a._id) === String(b._id)
                              }
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  margin="dense"
                                  label={t("Store / brand / company", {
                                    defaultValue: "Store / brand / company",
                                  })}
                                />
                              )}
                            />
                            <IconButton
                              aria-label={t("Remove", {
                                defaultValue: "Remove",
                              })}
                              color="error"
                              size="small"
                              onClick={() => {
                                const next = (
                                  editingUser.ownerEntities || []
                                ).filter((_, i) => i !== idx);
                                handleEditFieldChange("ownerEntities", next);
                              }}
                            >
                              <DeleteOutlineIcon />
                            </IconButton>
                          </Stack>
                        );
                      })}
                      <Button
                        startIcon={<AddIcon />}
                        size="small"
                        onClick={() =>
                          handleEditFieldChange("ownerEntities", [
                            ...(editingUser.ownerEntities || []),
                            { entityType: "store", entityId: "" },
                          ])
                        }
                        sx={{ mb: 1 }}
                      >
                        {t("Add business", { defaultValue: "Add business" })}
                      </Button>
                    </>
                  )}
                </>
              )}
              {(editingUser.role === "owner_dataentry" ||
                editingUser.role === "owner_superadmin") && (
                <>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, mb: 0.5 }}
                  >
                    {t(
                      "Where this user may add products (choose All and/or specific items)",
                      {
                        defaultValue:
                          "Where this user may add products (choose All and/or specific items)",
                      },
                    )}
                  </Typography>
                  {loadingOwnerEntities ? (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        py: 2,
                      }}
                    >
                      <CircularProgress size={28} />
                    </Box>
                  ) : (
                    <>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!editingUser.ownerDataEntryAllStores}
                            onChange={(e) =>
                              handleEditFieldChange(
                                "ownerDataEntryAllStores",
                                e.target.checked,
                              )
                            }
                          />
                        }
                        label={t("All stores", { defaultValue: "All stores" })}
                      />
                      {!editingUser.ownerDataEntryAllStores && (
                        <Autocomplete
                          multiple
                          sx={{ mb: 1.5 }}
                          options={ownerEntityLists.stores}
                          value={getSelectedEntities(
                            editingUser.ownerDataEntryStoreIds,
                            ownerEntityLists.stores,
                          )}
                          onChange={(_, value) =>
                            handleEditFieldChange(
                              "ownerDataEntryStoreIds",
                              value.map((x) => String(x._id)),
                            )
                          }
                          getOptionLabel={(o) =>
                            o?.nameEn || o?.name || o?.nameKu || ""
                          }
                          isOptionEqualToValue={(a, b) =>
                            !!a && !!b && String(a._id) === String(b._id)
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={t("Stores", { defaultValue: "Stores" })}
                            />
                          )}
                        />
                      )}
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!editingUser.ownerDataEntryAllBrands}
                            onChange={(e) =>
                              handleEditFieldChange(
                                "ownerDataEntryAllBrands",
                                e.target.checked,
                              )
                            }
                          />
                        }
                        label={t("All brands", { defaultValue: "All brands" })}
                      />
                      {!editingUser.ownerDataEntryAllBrands && (
                        <Autocomplete
                          multiple
                          sx={{ mb: 1.5 }}
                          options={ownerEntityLists.brands}
                          value={getSelectedEntities(
                            editingUser.ownerDataEntryBrandIds,
                            ownerEntityLists.brands,
                          )}
                          onChange={(_, value) =>
                            handleEditFieldChange(
                              "ownerDataEntryBrandIds",
                              value.map((x) => String(x._id)),
                            )
                          }
                          getOptionLabel={(o) =>
                            o?.nameEn || o?.name || o?.nameKu || ""
                          }
                          isOptionEqualToValue={(a, b) =>
                            !!a && !!b && String(a._id) === String(b._id)
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={t("Brands", { defaultValue: "Brands" })}
                            />
                          )}
                        />
                      )}
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!editingUser.ownerDataEntryAllCompanies}
                            onChange={(e) =>
                              handleEditFieldChange(
                                "ownerDataEntryAllCompanies",
                                e.target.checked,
                              )
                            }
                          />
                        }
                        label={t("All companies", {
                          defaultValue: "All companies",
                        })}
                      />
                      {!editingUser.ownerDataEntryAllCompanies && (
                        <Autocomplete
                          multiple
                          sx={{ mb: 1 }}
                          options={ownerEntityLists.companies}
                          value={getSelectedEntities(
                            editingUser.ownerDataEntryCompanyIds,
                            ownerEntityLists.companies,
                          )}
                          onChange={(_, value) =>
                            handleEditFieldChange(
                              "ownerDataEntryCompanyIds",
                              value.map((x) => String(x._id)),
                            )
                          }
                          getOptionLabel={(o) =>
                            o?.nameEn || o?.name || o?.nameKu || ""
                          }
                          isOptionEqualToValue={(a, b) =>
                            !!a && !!b && String(a._id) === String(b._id)
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={t("Companies", {
                                defaultValue: "Companies",
                              })}
                            />
                          )}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>{t("Cancel")}</Button>
          <Button onClick={handleSaveUser} disabled={saving}>
            {saving
              ? t("Saving...")
              : editingUser && editingUser._id
                ? t("Save")
                : t("Create")}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminUsersPage;
