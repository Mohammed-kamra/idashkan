import React, { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import {
  productAPI,
  categoryAPI,
  storeAPI,
  brandAPI,
  companyAPI,
} from "../services/api";
import MultilingualFieldGroup from "../components/MultilingualFieldGroup";
import {
  canAccessPendingPage,
  canApprovePendingProducts,
} from "../utils/adminAccess";
import {
  normalizeExpiryInputForApi,
  toDatetimeLocalValue,
} from "../utils/expiryDate";
import { parseOptionalNonNegativePrice } from "../utils/productPriceInput";
import {
  Box,
  Button,
  Chip,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Grid,
  InputAdornment,
  Autocomplete,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import InventoryIcon from "@mui/icons-material/Inventory";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const FILTERS = [
  { value: "all", key: "pendingFilterAll" },
  { value: "adding", key: "pendingFilterAdding" },
  { value: "editing", key: "pendingFilterEditing" },
];

function entityLabel(obj) {
  if (!obj || typeof obj !== "object") return "—";
  return obj.nameEn || obj.name || obj.nameKu || obj.nameAr || "—";
}

function isRejectable(p) {
  const draft =
    p.pendingDraft && typeof p.pendingDraft === "object"
      ? p.pendingDraft
      : null;
  if (draft && Object.keys(draft).length > 0) return true;
  if (p.status === "pending" && !p.wasEverPublished) return true;
  return false;
}

/** Populated User from audit fields (`createdBy` / `updatedBy`). */
function auditUserDisplayName(u) {
  if (!u || typeof u !== "object") return "—";
  const s =
    (u.displayName && String(u.displayName).trim()) ||
    (u.username && String(u.username).trim()) ||
    (u.email && String(u.email).trim()) ||
    "";
  return s || "—";
}

/** Adding pending → creator; update pending → last updater. */
function pendingSentByLabel(p, isAdding) {
  const u = isAdding ? p.createdBy : p.updatedBy;
  return auditUserDisplayName(u);
}

function draftHas(draft, key) {
  return (
    draft &&
    typeof draft === "object" &&
    Object.prototype.hasOwnProperty.call(draft, key)
  );
}

function mergeRefId(p, draft, key) {
  const v = draftHas(draft, key) ? draft[key] : p[key];
  if (v == null || v === "") return "";
  if (typeof v === "object" && v._id) return String(v._id);
  return String(v);
}

function mergeStr(p, draft, key, fallback = "") {
  const v = draftHas(draft, key) ? draft[key] : p[key];
  if (v == null || v === "") return fallback;
  return String(v);
}

function mergeBool(p, draft, key) {
  if (draftHas(draft, key)) return !!draft[key];
  return !!p[key];
}

function dataEntryEntityLabel(entity) {
  if (!entity) return "";
  return (
    entity.nameEn ||
    entity.name ||
    entity.nameAr ||
    entity.nameKu ||
    (entity._id != null ? String(entity._id) : "")
  );
}

function DataEntryEntityAutocomplete({
  label,
  options = [],
  valueId,
  onChangeId,
  disabled = false,
  required = false,
  placeholder,
  textFieldProps = {},
  sx,
}) {
  const idStr =
    valueId !== undefined && valueId !== null && valueId !== ""
      ? String(valueId)
      : "";
  const selected =
    idStr !== ""
      ? (options.find((o) => String(o._id) === idStr) ?? null)
      : null;
  return (
    <Autocomplete
      sx={sx}
      options={options}
      value={selected}
      onChange={(_, v) => onChangeId(v ? String(v._id) : "")}
      getOptionLabel={(o) => dataEntryEntityLabel(o)}
      isOptionEqualToValue={(o, v) => String(o._id) === String(v._id)}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          placeholder={placeholder}
          {...textFieldProps}
        />
      )}
      ListboxProps={{ style: { maxHeight: 280 } }}
    />
  );
}

export default function PendingPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const { user, isAuthenticated } = useAuth();
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const listEnabled = Boolean(
    isAuthenticated && user && canAccessPendingPage(user),
  );
  const {
    data: items = [],
    isPending: loading,
    error: pendingQueryError,
  } = useQuery({
    queryKey: ["pendingProducts", filter],
    queryFn: async () => {
      const params = filter === "all" ? {} : { pendingReason: filter };
      const res = await productAPI.getPendingList(params);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: listEnabled,
  });
  const [busyKey, setBusyKey] = useState(null);

  const [reviewProduct, setReviewProduct] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    nameEn: "",
    nameAr: "",
    nameKu: "",
    image: "",
    previousPrice: "",
    newPrice: "",
    isDiscount: false,
    description: "",
    descriptionEn: "",
    descriptionAr: "",
    descriptionKu: "",
    barcode: "",
    weight: "",
    storeId: "",
    brandId: "",
    companyId: "",
    categoryId: "",
    categoryTypeId: "",
    storeTypeId: "",
    status: "pending",
    expireDate: "",
    discardPendingDraft: true,
  });
  const [editError, setEditError] = useState("");
  const [editHadDraft, setEditHadDraft] = useState(false);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [brands, setBrands] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [categoryTypes, setCategoryTypes] = useState([]);
  const [selectedEditImage, setSelectedEditImage] = useState(null);

  const [confirmRejectId, setConfirmRejectId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const setBusy = (key) => setBusyKey(key);
  const clearBusy = () => setBusyKey(null);
  const isBusy = (key) => busyKey === key;

  const fetchCategoryTypes = useCallback(async (categoryId) => {
    try {
      if (!categoryId) {
        setCategoryTypes([]);
        return;
      }
      const response = await categoryAPI.getTypes(categoryId);
      setCategoryTypes(response.data || []);
    } catch (err) {
      console.error(err);
      setCategoryTypes([]);
    }
  }, []);

  const uploadProductImage = async (file, expireDateInput) => {
    const formData = new FormData();
    formData.append("image", file);
    const exp = normalizeExpiryInputForApi(expireDateInput);
    if (exp) {
      formData.append("expireDate", exp);
    }
    const response = await fetch(`${API_URL}/api/products/upload-image`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Upload failed");
    }
    const data = await response.json();
    return data.imageUrl;
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "categoryId") {
        fetchCategoryTypes(value);
        next.categoryTypeId = "";
      }
      return next;
    });
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedEditImage(file);
  };

  const handleApprove = async (id) => {
    setBusy(`approve:${id}`);
    setError("");
    try {
      await productAPI.update(id, { status: "published" });
      await queryClient.invalidateQueries({ queryKey: ["pendingProducts"] });
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.msg ||
          e?.response?.data?.message ||
          e?.message ||
          t("pendingApproveError", { defaultValue: "Approve failed." }),
      );
    } finally {
      clearBusy();
    }
  };

  const handleReject = async (id) => {
    setBusy(`reject:${id}`);
    setError("");
    try {
      await productAPI.rejectPending(id);
      setConfirmRejectId(null);
      await queryClient.invalidateQueries({ queryKey: ["pendingProducts"] });
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.msg ||
          e?.response?.data?.message ||
          e?.message ||
          t("pendingRejectError", { defaultValue: "Reject failed." }),
      );
    } finally {
      clearBusy();
    }
  };

  const handleDelete = async (id) => {
    setBusy(`delete:${id}`);
    setError("");
    try {
      await productAPI.delete(id);
      setConfirmDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["pendingProducts"] });
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.msg ||
          e?.response?.data?.message ||
          e?.message ||
          t("pendingDeleteError", { defaultValue: "Delete failed." }),
      );
    } finally {
      clearBusy();
    }
  };

  const openEdit = async (id) => {
    setEditId(id);
    setEditOpen(true);
    setEditError("");
    setEditLoading(true);
    setSelectedEditImage(null);
    try {
      const [modRes, catRes, storeRes, brandRes, compRes] = await Promise.all([
        productAPI.getModeration(id),
        categoryAPI.getAll(),
        storeAPI.getAllIncludingHidden(),
        brandAPI.getAllIncludingHidden(),
        companyAPI.getAllIncludingHidden(),
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setStores(Array.isArray(storeRes.data) ? storeRes.data : []);
      setBrands(Array.isArray(brandRes.data) ? brandRes.data : []);
      setCompanies(Array.isArray(compRes.data) ? compRes.data : []);

      const p = modRes.data;
      const draft =
        p.pendingDraft && typeof p.pendingDraft === "object"
          ? p.pendingDraft
          : {};
      const hadDraft = !!(draft && Object.keys(draft).length > 0);
      setEditHadDraft(hadDraft);

      const productCategoryId = mergeRefId(p, draft, "categoryId");
      const previousPrice = draftHas(draft, "previousPrice")
        ? draft.previousPrice
        : p.previousPrice;
      const newPrice = draftHas(draft, "newPrice")
        ? draft.newPrice
        : p.newPrice;
      const expireRaw = draftHas(draft, "expireDate")
        ? draft.expireDate
        : p.expireDate;

      setEditForm({
        name: mergeStr(p, draft, "name"),
        nameEn: mergeStr(p, draft, "nameEn"),
        nameAr: mergeStr(p, draft, "nameAr"),
        nameKu: mergeStr(p, draft, "nameKu"),
        image: mergeStr(p, draft, "image"),
        previousPrice:
          previousPrice != null && previousPrice !== ""
            ? String(previousPrice)
            : "",
        newPrice: newPrice != null && newPrice !== "" ? String(newPrice) : "",
        isDiscount: mergeBool(p, draft, "isDiscount"),
        description: mergeStr(p, draft, "description"),
        descriptionEn: mergeStr(p, draft, "descriptionEn"),
        descriptionAr: mergeStr(p, draft, "descriptionAr"),
        descriptionKu: mergeStr(p, draft, "descriptionKu"),
        barcode: mergeStr(p, draft, "barcode"),
        weight: mergeStr(p, draft, "weight"),
        storeId: mergeRefId(p, draft, "storeId"),
        brandId: mergeRefId(p, draft, "brandId"),
        companyId: mergeRefId(p, draft, "companyId"),
        categoryId: productCategoryId,
        categoryTypeId: draftHas(draft, "categoryTypeId")
          ? String(draft.categoryTypeId ?? "")
          : p.categoryTypeId != null
            ? String(p.categoryTypeId)
            : "",
        storeTypeId: mergeRefId(p, draft, "storeTypeId"),
        status: draftHas(draft, "status")
          ? draft.status === "published"
            ? "published"
            : "pending"
          : p.status === "published"
            ? "published"
            : "pending",
        expireDate: expireRaw ? toDatetimeLocalValue(expireRaw) : "",
        discardPendingDraft: hadDraft,
      });
      fetchCategoryTypes(productCategoryId);
    } catch (e) {
      console.error(e);
      setEditError(
        e?.response?.data?.msg ||
          e?.response?.data?.message ||
          e?.message ||
          t("pendingEditLoadError", {
            defaultValue: "Could not load product for editing.",
          }),
      );
    } finally {
      setEditLoading(false);
    }
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditId(null);
    setEditError("");
    setEditLoading(false);
    setSelectedEditImage(null);
    setCategoryTypes([]);
  };

  const handleEditSave = async () => {
    if (!editId) return;
    const nameTrim = String(editForm.name || "").trim();
    if (!nameTrim) {
      setEditError(
        t("Product name is required", {
          defaultValue: "Product name is required",
        }),
      );
      return;
    }
    const prevP = parseOptionalNonNegativePrice(
      editForm.previousPrice,
      t("Previous price", { defaultValue: "Previous price" }),
    );
    if (!prevP.ok) {
      setEditError(prevP.msg);
      return;
    }
    const newP = parseOptionalNonNegativePrice(
      editForm.newPrice,
      t("New price", { defaultValue: "New price" }),
    );
    if (!newP.ok) {
      setEditError(newP.msg);
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      let imageUrl = editForm.image;
      if (selectedEditImage) {
        imageUrl = await uploadProductImage(
          selectedEditImage,
          editForm.expireDate,
        );
      }
      const productUpdateData = {
        name: nameTrim,
        nameEn: editForm.nameEn?.trim() || "",
        nameAr: editForm.nameAr?.trim() || "",
        nameKu: editForm.nameKu?.trim() || "",
        image: imageUrl,
        previousPrice: prevP.value ?? null,
        newPrice: newP.value ?? null,
        isDiscount: !!editForm.isDiscount,
        description: editForm.description || "",
        descriptionEn: editForm.descriptionEn || "",
        descriptionAr: editForm.descriptionAr || "",
        descriptionKu: editForm.descriptionKu || "",
        barcode: editForm.barcode || "",
        weight: editForm.weight || "",
        expireDate: normalizeExpiryInputForApi(editForm.expireDate),
        brandId: editForm.brandId || null,
        categoryId: editForm.categoryId,
        categoryTypeId: editForm.categoryTypeId,
        storeId: editForm.storeId || null,
        storeTypeId: editForm.storeId ? editForm.storeTypeId : null,
        companyId: editForm.companyId || null,
        status: editForm.status,
      };
      if (editHadDraft && editForm.discardPendingDraft) {
        productUpdateData.discardPendingDraft = true;
      }
      await productAPI.update(editId, productUpdateData);
      closeEdit();
      await queryClient.invalidateQueries({ queryKey: ["pendingProducts"] });
    } catch (e) {
      console.error(e);
      setEditError(
        e?.response?.data?.msg ||
          e?.response?.data?.message ||
          e?.message ||
          t("pendingEditSaveError", { defaultValue: "Save failed." }),
      );
    } finally {
      setEditSaving(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <Container maxWidth="md" sx={{ pt: 10 }}>
        <Alert severity="info">
          {t("Please sign in to access this page.")}
        </Alert>
      </Container>
    );
  }

  if (!canAccessPendingPage(user)) {
    return (
      <Container maxWidth="md" sx={{ pt: 10 }}>
        <Alert severity="warning">
          {t("pendingAccessDenied", {
            defaultValue: "You do not have access to this page.",
          })}
        </Alert>
      </Container>
    );
  }

  const canModerate = canApprovePendingProducts(user);
  const listErrorMsg =
    error ||
    (pendingQueryError &&
      (pendingQueryError?.response?.data?.message ||
        pendingQueryError?.message ||
        t("pendingLoadError", {
          defaultValue: "Failed to load pending products.",
        })));

  return (
    <Box sx={{ py: 4, pt: { xs: 10, sm: 11 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Button
          component={Link}
          to="/profile"
          startIcon={
            <ArrowBackIcon sx={{ transform: isRtl ? "scaleX(-1)" : undefined }} />
          }
          size="small"
          variant="text"
        >
          {t("Back")}
        </Button>
      </Box>
      <Typography variant="h5" component="h1" gutterBottom fontWeight={700}>
        {t("pendingPageTitle", { defaultValue: "Pending reviews" })}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("pendingPageSubtitle", {
          defaultValue:
            "Products awaiting approval: new submissions and updates after publish.",
        })}
      </Typography>

      <ToggleButtonGroup
        exclusive
        value={filter}
        onChange={(_, v) => v && setFilter(v)}
        size="small"
        sx={{ mb: 2 }}
      >
        {FILTERS.map((f) => (
          <ToggleButton key={f.value} value={f.value}>
            {t(f.key, {
              defaultValue:
                f.value === "all"
                  ? "All"
                  : f.value === "adding"
                    ? "Adding pending"
                    : "Updating pending",
            })}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {listErrorMsg && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => {
            setError("");
            if (pendingQueryError) {
              void queryClient.invalidateQueries({ queryKey: ["pendingProducts"] });
            }
          }}
        >
          {listErrorMsg}
        </Alert>
      )}

      <TableContainer
        variant="outlined"
        sx={{ borderRadius: 1, border: "1px solid", borderColor: "divider" }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("Name")}</TableCell>
                <TableCell>
                  {t("pendingColumnType", { defaultValue: "Type" })}
                </TableCell>
                <TableCell>
                  {t("pendingColumnSentBy", { defaultValue: "Sent by" })}
                </TableCell>
                <TableCell>{t("Store", { defaultValue: "Store" })}</TableCell>
                <TableCell>{t("Brand", { defaultValue: "Brand" })}</TableCell>
                <TableCell>
                  {t("Company", { defaultValue: "Company" })}
                </TableCell>
                <TableCell>{t("Price")}</TableCell>
                <TableCell>
                  {t("pendingColumnUpdated", { defaultValue: "Updated" })}
                </TableCell>
                {canModerate && (
                  <TableCell align="right">
                    {t("Actions", { defaultValue: "Actions" })}
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canModerate ? 9 : 8} align="center">
                    {t("pendingEmpty", {
                      defaultValue: "No pending products.",
                    })}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => {
                  const draft =
                    p.pendingDraft && typeof p.pendingDraft === "object"
                      ? p.pendingDraft
                      : null;
                  const hasDraft = draft && Object.keys(draft).length > 0;
                  const reason = p.pendingReason || "adding";
                  const isAdding =
                    reason === "adding" && p.status === "pending" && !hasDraft;
                  const dispName =
                    (hasDraft && draft.name != null ? draft.name : p.name) ||
                    "—";
                  const dispNewPrice =
                    hasDraft && draft.newPrice !== undefined
                      ? draft.newPrice
                      : p.newPrice;
                  const rejectOk = isRejectable(p);
                  return (
                    <TableRow key={p._id}>
                      <TableCell>
                        <Typography variant="body2">{dispName}</Typography>
                        {hasDraft && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.25 }}
                          >
                            {t("pendingCurrentlyPublished", {
                              defaultValue: "Currently published",
                            })}
                            : {p.name || "—"}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={isAdding ? "warning" : "info"}
                          label={
                            isAdding
                              ? t("pendingTypeAdding", {
                                  defaultValue: "Adding",
                                })
                              : t("pendingTypeEditing", {
                                  defaultValue: "Updating",
                                })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {pendingSentByLabel(p, isAdding)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {entityLabel(p.storeId)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {entityLabel(p.brandId)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {entityLabel(p.companyId)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {dispNewPrice != null ? dispNewPrice : "—"}
                        {hasDraft &&
                          draft.newPrice !== undefined &&
                          draft.newPrice !== p.newPrice && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              {t("pendingLivePrice", { defaultValue: "Live" })}:{" "}
                              {p.newPrice != null ? p.newPrice : "—"}
                            </Typography>
                          )}
                      </TableCell>
                      <TableCell>
                        {p.updatedAt
                          ? new Date(p.updatedAt).toLocaleString()
                          : "—"}
                      </TableCell>
                      {canModerate && (
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            justifyContent="flex-end"
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VisibilityIcon />}
                              onClick={() => setReviewProduct(p)}
                            >
                              {t("pendingReview", { defaultValue: "Review" })}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={() => openEdit(p._id)}
                            >
                              {t("Edit")}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              disabled={!rejectOk}
                              startIcon={<BlockIcon />}
                              onClick={() => setConfirmRejectId(p._id)}
                            >
                              {t("pendingReject", { defaultValue: "Reject" })}
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              disabled={isBusy(`approve:${p._id}`)}
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleApprove(p._id)}
                            >
                              {isBusy(`approve:${p._id}`)
                                ? t("Saving...")
                                : t("pendingApprove", {
                                    defaultValue: "Approve",
                                  })}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteOutlineIcon />}
                              onClick={() => setConfirmDeleteId(p._id)}
                            >
                              {t("Delete")}
                            </Button>
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Dialog
        open={Boolean(reviewProduct)}
        onClose={() => setReviewProduct(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t("pendingReviewTitle", { defaultValue: "Review product" })}
        </DialogTitle>
        <DialogContent dividers>
          {reviewProduct && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2">
                <strong>{t("Name")}:</strong> {reviewProduct.name || "—"}
              </Typography>
              <Typography variant="body2">
                <strong>{t("Barcode", { defaultValue: "Barcode" })}:</strong>{" "}
                {reviewProduct.barcode || "—"}
              </Typography>
              <Typography variant="body2">
                <strong>{t("Status", { defaultValue: "Status" })}:</strong>{" "}
                {reviewProduct.status || "—"}
              </Typography>
              <Typography variant="body2">
                <strong>
                  {t("Previous price", { defaultValue: "Previous price" })}:
                </strong>{" "}
                {reviewProduct.previousPrice ?? "—"}
              </Typography>
              <Typography variant="body2">
                <strong>{t("Price")}:</strong> {reviewProduct.newPrice ?? "—"}
              </Typography>
              <Typography variant="body2">
                <strong>{t("Store", { defaultValue: "Store" })}:</strong>{" "}
                {entityLabel(reviewProduct.storeId)}
              </Typography>
              <Typography variant="body2">
                <strong>{t("Brand", { defaultValue: "Brand" })}:</strong>{" "}
                {entityLabel(reviewProduct.brandId)}
              </Typography>
              <Typography variant="body2">
                <strong>{t("Company", { defaultValue: "Company" })}:</strong>{" "}
                {entityLabel(reviewProduct.companyId)}
              </Typography>
              {reviewProduct.pendingDraft &&
                typeof reviewProduct.pendingDraft === "object" &&
                Object.keys(reviewProduct.pendingDraft).length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      {t("pendingProposedChanges", {
                        defaultValue: "Proposed changes",
                      })}
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        p: 1,
                        bgcolor: "action.hover",
                        borderRadius: 1,
                        fontSize: 12,
                        overflow: "auto",
                        maxHeight: 220,
                      }}
                    >
                      {JSON.stringify(reviewProduct.pendingDraft, null, 2)}
                    </Box>
                  </Box>
                )}
              <Typography variant="caption" color="text.secondary">
                ID: {String(reviewProduct._id)}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewProduct(null)}>{t("Close")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="lg">
        <DialogTitle>
          {t("Edit Product", { defaultValue: "Edit Product" })}
        </DialogTitle>
        <DialogContent dividers>
          {editLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box component="form" sx={{ mt: 1 }}>
              {editError && (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                  onClose={() => setEditError("")}
                >
                  {editError}
                </Alert>
              )}
              <Grid container spacing={2}>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Product Name")}
                    name="name"
                    value={editForm.name}
                    onChange={handleEditFormChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ShoppingCartIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Product name (translations)")}
                    value={{
                      english: editForm.nameEn,
                      arabic: editForm.nameAr,
                      kurdish: editForm.nameKu,
                    }}
                    onValueChange={(v) =>
                      setEditForm((prev) => ({
                        ...prev,
                        nameEn: v.english,
                        nameAr: v.arabic,
                        nameKu: v.kurdish,
                      }))
                    }
                    sourceText={editForm.name}
                    aiType="product"
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Description")}
                    name="description"
                    value={editForm.description || ""}
                    onChange={handleEditFormChange}
                    multiline
                    rows={3}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Description (translations)")}
                    value={{
                      english: editForm.descriptionEn,
                      arabic: editForm.descriptionAr,
                      kurdish: editForm.descriptionKu,
                    }}
                    onValueChange={(v) =>
                      setEditForm((prev) => ({
                        ...prev,
                        descriptionEn: v.english,
                        descriptionAr: v.arabic,
                        descriptionKu: v.kurdish,
                      }))
                    }
                    sourceText={editForm.description}
                    aiType="general"
                    multiline
                    minRows={2}
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Barcode")}
                    name="barcode"
                    value={editForm.barcode}
                    onChange={handleEditFormChange}
                    placeholder="Enter product barcode"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Previous Price")}
                    name="previousPrice"
                    type="number"
                    inputProps={{ min: 0, step: "any" }}
                    value={editForm.previousPrice}
                    onChange={handleEditFormChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">ID</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("New Price")}
                    name="newPrice"
                    type="number"
                    inputProps={{ min: 0, step: "any" }}
                    value={editForm.newPrice}
                    onChange={handleEditFormChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">ID</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Weight")}
                    name="weight"
                    value={editForm.weight}
                    onChange={handleEditFormChange}
                    placeholder="e.g., 500g, 1kg, 2.5kg"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <InventoryIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="isDiscount"
                          checked={editForm.isDiscount}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              isDiscount: e.target.checked,
                            }))
                          }
                        />
                      }
                      label={t("Is Discount Product")}
                    />
                  </FormControl>
                </Grid>
                {editForm.image ? (
                  <Grid xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t("Current Image:")}
                    </Typography>
                    <img
                      src={
                        editForm.image.startsWith("http")
                          ? editForm.image
                          : `${API_URL}${editForm.image}`
                      }
                      alt={t("Current product")}
                      style={{
                        width: "100px",
                        height: "100px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                      }}
                    />
                  </Grid>
                ) : null}
                <Grid xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t("Upload New Image:")}
                  </Typography>
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="pending-edit-product-image-upload"
                    type="file"
                    onChange={handleEditImageChange}
                  />
                  <label htmlFor="pending-edit-product-image-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      sx={{ mb: 1 }}
                    >
                      {t("Choose Image")}
                    </Button>
                  </label>
                  {selectedEditImage ? (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" display="block">
                        {t("Selected:")} {selectedEditImage.name}
                      </Typography>
                      <img
                        src={URL.createObjectURL(selectedEditImage)}
                        alt={t("Preview")}
                        style={{
                          width: "100px",
                          height: "100px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                          marginTop: "8px",
                        }}
                      />
                    </Box>
                  ) : null}
                </Grid>
                <Grid xs={12}>
                  <DataEntryEntityAutocomplete
                    label={t("Store")}
                    options={stores}
                    valueId={editForm.storeId || ""}
                    onChangeId={(sid) =>
                      setEditForm((prev) => ({ ...prev, storeId: sid }))
                    }
                    placeholder={t("Select Store")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Brand")}
                    options={brands}
                    valueId={editForm.brandId}
                    onChangeId={(bid) =>
                      setEditForm((prev) => ({ ...prev, brandId: bid }))
                    }
                    placeholder={t("select brand")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Company")}
                    options={companies}
                    valueId={editForm.companyId || ""}
                    onChangeId={(cid) =>
                      setEditForm((prev) => ({ ...prev, companyId: cid }))
                    }
                    placeholder={t("select company")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Select
                      name="categoryId"
                      value={editForm.categoryId}
                      onChange={handleEditFormChange}
                      label={t("Category")}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>{t("Select Category")}</em>
                      </MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category._id} value={category._id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Select
                      name="categoryTypeId"
                      value={editForm.categoryTypeId ?? ""}
                      onChange={handleEditFormChange}
                      label={t("Category Type")}
                      disabled={!editForm.categoryId}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>{t("Select Category Type")}</em>
                      </MenuItem>
                      {categoryTypes.map((type, index) => {
                        const typeValue =
                          typeof type === "string"
                            ? type
                            : String(type?._id || "");
                        const typeLabel =
                          typeof type === "string" ? type : type?.name || "";
                        return (
                          <MenuItem key={typeValue || index} value={typeValue}>
                            {typeLabel}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel shrink>{t("Status")}</InputLabel>
                    <Select
                      name="status"
                      value={editForm.status || "published"}
                      onChange={handleEditFormChange}
                      label={t("Status")}
                    >
                      <MenuItem value="published">{t("Published")}</MenuItem>
                      <MenuItem value="pending">{t("Pending")}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Expire date & time")}
                    name="expireDate"
                    type="datetime-local"
                    value={editForm.expireDate}
                    onChange={handleEditFormChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                {editHadDraft && (
                  <Grid xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={editForm.discardPendingDraft}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              discardPendingDraft: e.target.checked,
                            }))
                          }
                        />
                      }
                      label={t("pendingDiscardDraftOnSave", {
                        defaultValue:
                          "Clear proposed update (pending draft) on save",
                      })}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} disabled={editSaving}>
            {t("Cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            disabled={editLoading || editSaving}
          >
            {editSaving ? t("Saving...") : t("Save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirmRejectId)}
        onClose={() => setConfirmRejectId(null)}
      >
        <DialogTitle>
          {t("pendingRejectConfirmTitle", {
            defaultValue: "Reject this product?",
          })}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t("pendingRejectConfirmBody", {
              defaultValue:
                "For a new pending product this removes it. For a published product with a proposed update, the live listing stays and the proposal is discarded.",
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRejectId(null)}>
            {t("Cancel")}
          </Button>
          <Button
            color="warning"
            variant="contained"
            disabled={!confirmRejectId || isBusy(`reject:${confirmRejectId}`)}
            onClick={() => confirmRejectId && handleReject(confirmRejectId)}
          >
            {isBusy(`reject:${confirmRejectId}`)
              ? t("Saving...")
              : t("pendingReject", { defaultValue: "Reject" })}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
      >
        <DialogTitle>
          {t("pendingDeleteConfirmTitle", {
            defaultValue: "Delete product permanently?",
          })}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t("pendingDeleteConfirmBody", {
              defaultValue:
                "This cannot be undone. The product will be removed from the database.",
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>
            {t("Cancel")}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={!confirmDeleteId || isBusy(`delete:${confirmDeleteId}`)}
            onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
          >
            {isBusy(`delete:${confirmDeleteId}`) ? t("Saving...") : t("Delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
