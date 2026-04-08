import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../services/api";
import { useTranslation } from "react-i18next";
import { isAdminEmail, normalizeUserRole } from "../utils/adminAccess";

const AdminUsersPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const isAdmin = isAdminEmail(user);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await adminAPI.getUsers();
        if (res.data?.success) {
          setUsers(res.data.data || []);
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
    };

    if (isAuthenticated && isAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin]);

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

  const openCreateDialog = () => {
    setEditingUser({
      _id: null,
      username: "",
      email: "",
      displayName: "",
      isActive: true,
      role: "user",
    });
    setEditDialogOpen(true);
  };

  const openEditDialog = (row) => {
    setEditingUser({
      ...row,
      role: normalizeUserRole(row),
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
      if (editingUser._id) {
        const updatePayload = {
          username: editingUser.username,
          email: editingUser.email,
          displayName: editingUser.displayName,
          isActive: editingUser.isActive,
          role: editingUser.role === "support" ? "support" : "user",
        };
        if (editingUser.password && editingUser.password.trim() !== "") {
          updatePayload.password = editingUser.password;
        }
        res = await adminAPI.updateUser(editingUser._id, updatePayload);
      } else {
        res = await adminAPI.createUser({
          username: editingUser.username,
          email: editingUser.email,
          password: editingUser.password,
          displayName: editingUser.displayName,
          role: editingUser.role === "support" ? "support" : "user",
        });
      }

      if (res.data?.success) {
        const updatedUser = res.data.data;
        setUsers((prev) => {
          if (editingUser._id) {
            return prev.map((u) =>
              u._id === updatedUser._id ? updatedUser : u,
            );
          }
          return [updatedUser, ...prev];
        });
        closeEditDialog();
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
        setUsers((prev) => prev.filter((u) => u._id !== id));
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
                  value={editingUser.role === "support" ? "support" : "user"}
                  onChange={(e) =>
                    handleEditFieldChange("role", e.target.value)
                  }
                >
                  <MenuItem value="user">{t("Normal user")}</MenuItem>
                  <MenuItem value="support">
                    {t("Support (Data Entry)")}
                  </MenuItem>
                </Select>
              </FormControl>
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
