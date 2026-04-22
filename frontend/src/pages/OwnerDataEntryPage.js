import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
  Stack,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { productAPI, storeAPI, brandAPI, companyAPI } from "../services/api";
import { normalizeExpiryInputForApi } from "../utils/expiryDate";
import { parseOptionalNonNegativePrice } from "../utils/productPriceInput";
import { getApiBaseURL } from "../utils/getApiBaseURL";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { canAccessOwnerDataEntryPage } from "../utils/adminAccess";

const KIND_ORDER = ["store", "brand", "company"];

function allFlagForKind(kind, u) {
  if (!u) return false;
  if (kind === "store") return !!u.ownerDataEntryAllStores;
  if (kind === "brand") return !!u.ownerDataEntryAllBrands;
  return !!u.ownerDataEntryAllCompanies;
}

function listForKind(kind, allowed) {
  if (kind === "store") return allowed.stores;
  if (kind === "brand") return allowed.brands;
  return allowed.companies;
}

/** When not "all", exactly one row → auto id; "all" flag → user picks from list. */
function resolveEntityIdForKind(kind, user, allowed) {
  const list = listForKind(kind, allowed);
  if (allFlagForKind(kind, user)) return null;
  if (list.length === 1) return list[0]._id;
  return null;
}

async function uploadProductImage(file, expireDateInput) {
  const formData = new FormData();
  formData.append("image", file);
  const exp = normalizeExpiryInputForApi(expireDateInput);
  if (exp) formData.append("expireDate", exp);
  const base = getApiBaseURL();
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${base}/products/upload-image`, {
    method: "POST",
    body: formData,
    headers,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Upload failed");
  }
  const data = await response.json();
  return data.imageUrl;
}

export default function OwnerDataEntryPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lists, setLists] = useState({ stores: [], brands: [], companies: [] });
  const [loadingLists, setLoadingLists] = useState(false);

  const [form, setForm] = useState({
    name: "",
    barcode: "",
    previousPrice: "",
    newPrice: "",
    isDiscount: false,
    expireDate: "",
    imageUrl: "",
    ownerKind: "store",
    entityId: null,
  });
  const [imageFile, setImageFile] = useState(null);
  const dialogInitRef = useRef(false);

  const allowed = useMemo(() => {
    if (!user || user.role !== "owner_dataentry") {
      return { stores: [], brands: [], companies: [] };
    }
    const filterList = (all, allFlag, ids) => {
      if (allFlag) return all;
      const allow = new Set((ids || []).map(String));
      return all.filter((x) => allow.has(String(x._id)));
    };
    return {
      stores: filterList(
        lists.stores,
        user.ownerDataEntryAllStores,
        user.ownerDataEntryStoreIds,
      ),
      brands: filterList(
        lists.brands,
        user.ownerDataEntryAllBrands,
        user.ownerDataEntryBrandIds,
      ),
      companies: filterList(
        lists.companies,
        user.ownerDataEntryAllCompanies,
        user.ownerDataEntryCompanyIds,
      ),
    };
  }, [user, lists]);

  const availableKinds = useMemo(() => {
    if (!user || user.role !== "owner_dataentry") return [];
    const k = [];
    if (
      user.ownerDataEntryAllStores ||
      (user.ownerDataEntryStoreIds?.length || 0) > 0
    ) {
      k.push("store");
    }
    if (
      user.ownerDataEntryAllBrands ||
      (user.ownerDataEntryBrandIds?.length || 0) > 0
    ) {
      k.push("brand");
    }
    if (
      user.ownerDataEntryAllCompanies ||
      (user.ownerDataEntryCompanyIds?.length || 0) > 0
    ) {
      k.push("company");
    }
    return k;
  }, [user]);

  const entityOptions = useMemo(() => {
    if (form.ownerKind === "store") return allowed.stores;
    if (form.ownerKind === "brand") return allowed.brands;
    return allowed.companies;
  }, [form.ownerKind, allowed]);

  const selectedEntity = useMemo(() => {
    if (!form.entityId) return null;
    return (
      entityOptions.find((o) => String(o._id) === String(form.entityId)) || null
    );
  }, [form.entityId, entityOptions]);

  const showKindTabs = availableKinds.length > 1;

  const isSingleFixedEntity = useMemo(() => {
    if (!form.ownerKind || !user) return false;
    if (allFlagForKind(form.ownerKind, user)) return false;
    return entityOptions.length === 1;
  }, [form.ownerKind, user, entityOptions]);

  useEffect(() => {
    if (!dialogOpen) {
      dialogInitRef.current = false;
      return;
    }
    if (loadingLists || !user || availableKinds.length === 0) return;
    if (dialogInitRef.current) return;

    const kind =
      availableKinds.length === 1
        ? availableKinds[0]
        : KIND_ORDER.find((x) => availableKinds.includes(x)) ||
          availableKinds[0];
    const entityId = resolveEntityIdForKind(kind, user, allowed);

    setForm((prev) => ({
      ...prev,
      ownerKind: kind,
      entityId,
    }));
    dialogInitRef.current = true;
  }, [
    dialogOpen,
    loadingLists,
    user,
    allowed,
    availableKinds,
  ]);

  useEffect(() => {
    if (!dialogOpen || !isSingleFixedEntity || !entityOptions[0]) return;
    const id = entityOptions[0]._id;
    if (String(form.entityId) !== String(id)) {
      setForm((f) => ({ ...f, entityId: id }));
    }
  }, [dialogOpen, isSingleFixedEntity, entityOptions, form.entityId]);

  const filteredProducts = useMemo(() => {
    const q = String(nameFilter || "").trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      String(p.name || "")
        .toLowerCase()
        .includes(q),
    );
  }, [products, nameFilter]);

  const loadProducts = useCallback(async () => {
    if (!isAuthenticated || !canAccessOwnerDataEntryPage(user)) return;
    setLoading(true);
    setError("");
    try {
      const res = await productAPI.getOwnerDataEntryList();
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message || e?.message || "Failed to load products",
      );
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!dialogOpen || !canAccessOwnerDataEntryPage(user)) return;
    let cancelled = false;
    (async () => {
      setLoadingLists(true);
      try {
        const [rS, rB, rC] = await Promise.all([
          storeAPI.getAllIncludingHidden(),
          brandAPI.getAllIncludingHidden(),
          companyAPI.getAllIncludingHidden(),
        ]);
        if (!cancelled) {
          setLists({
            stores: Array.isArray(rS.data) ? rS.data : [],
            brands: Array.isArray(rB.data) ? rB.data : [],
            companies: Array.isArray(rC.data) ? rC.data : [],
          });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLists({ stores: [], brands: [], companies: [] });
      } finally {
        if (!cancelled) setLoadingLists(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, user]);

  const openDialog = () => {
    dialogInitRef.current = false;
    setForm({
      name: "",
      barcode: "",
      previousPrice: "",
      newPrice: "",
      isDiscount: false,
      expireDate: "",
      imageUrl: "",
      ownerKind: "store",
      entityId: null,
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const nameTrim = String(form.name || "").trim();
    if (!nameTrim) {
      setError(
        t("Product name is required", {
          defaultValue: "Product name is required",
        }),
      );
      return;
    }
    if (!form.entityId) {
      setError(
        t("Select a store, brand, or company", {
          defaultValue: "Select a store, brand, or company",
        }),
      );
      return;
    }
    const prevP = parseOptionalNonNegativePrice(
      form.previousPrice,
      t("Previous price", { defaultValue: "Previous price" }),
    );
    if (!prevP.ok) {
      setError(prevP.msg);
      return;
    }
    const newP = parseOptionalNonNegativePrice(
      form.newPrice,
      t("New price", { defaultValue: "New price" }),
    );
    if (!newP.ok) {
      setError(newP.msg);
      return;
    }
    setSaving(true);
    setError("");
    try {
      let imageUrl = form.imageUrl || "";
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile, form.expireDate);
      }

      const payload = {
        name: nameTrim,
        isDiscount: !!form.isDiscount,
      };
      if (form.barcode?.trim()) payload.barcode = form.barcode.trim();
      if (prevP.value !== undefined) payload.previousPrice = prevP.value;
      if (newP.value !== undefined) payload.newPrice = newP.value;
      const exp = normalizeExpiryInputForApi(form.expireDate);
      if (exp) payload.expireDate = exp;
      if (imageUrl) payload.image = imageUrl;

      if (form.ownerKind === "store") payload.storeId = form.entityId;
      else if (form.ownerKind === "brand") payload.brandId = form.entityId;
      else payload.companyId = form.entityId;

      await productAPI.create(payload);
      setDialogOpen(false);
      await loadProducts();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.msg ||
          e?.response?.data?.message ||
          e?.message ||
          "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">
          {t("Please sign in to access this page.")}
        </Alert>
      </Container>
    );
  }

  if (!canAccessOwnerDataEntryPage(user)) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">
          {t("You do not have access to Owner Data Entry.")}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 7, mb: 6 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="h5" component="h1">
          {t("Owner Data Entry", { defaultValue: "Owner Data Entry" })}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openDialog}
        >
          {t("Add product", { defaultValue: "Add product" })}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t(
          "View products in your scope and add new ones. Editing and deleting are not available here.",
          {
            defaultValue:
              "View products in your scope and add new ones. Editing and deleting are not available here.",
          },
        )}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <TextField
        size="small"
        fullWidth
        sx={{ mb: 2, maxWidth: { sm: 400 } }}
        label={t("Filter by name", { defaultValue: "Filter by name" })}
        placeholder={t("Search products…", { defaultValue: "Search products…" })}
        value={nameFilter}
        onChange={(e) => setNameFilter(e.target.value)}
        disabled={loading}
      />

      <TableContainer component={Paper} variant="outlined">
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("Name")}</TableCell>
                <TableCell align="right">{t("Price")}</TableCell>
                <TableCell align="right">
                  {t("Previous price", { defaultValue: "Previous price" })}
                </TableCell>
                <TableCell>{t("Expiry", { defaultValue: "Expiry" })}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    {t("No products yet", { defaultValue: "No products yet" })}
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    {t("No products match your search.", {
                      defaultValue: "No products match your search.",
                    })}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((p) => {
                  return (
                    <TableRow key={p._id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell align="right">
                        {p.newPrice != null ? p.newPrice : "—"}
                      </TableCell>
                      <TableCell align="right">
                        {p.previousPrice != null ? p.previousPrice : "—"}
                      </TableCell>
                      <TableCell>
                        {p.expireDate
                          ? new Date(p.expireDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t("Add product", { defaultValue: "Add product" })}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {availableKinds.length <= 1
                ? t("Add this product to your linked place below.", {
                    defaultValue: "Add this product to your linked place below.",
                  })
                : t("Choose store, brand, or company, then select the item.", {
                    defaultValue:
                      "Choose store, brand, or company, then select the item.",
                  })}
            </Typography>
            {showKindTabs && (
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={
                  availableKinds.includes(form.ownerKind)
                    ? form.ownerKind
                    : availableKinds[0]
                }
                onChange={(_, v) => {
                  if (!v || !user) return;
                  const eid = resolveEntityIdForKind(v, user, allowed);
                  setForm((f) => ({
                    ...f,
                    ownerKind: v,
                    entityId: eid,
                  }));
                }}
              >
                {availableKinds.includes("store") && (
                  <ToggleButton value="store">
                    {t("Store", { defaultValue: "Store" })}
                  </ToggleButton>
                )}
                {availableKinds.includes("brand") && (
                  <ToggleButton value="brand">
                    {t("Brand", { defaultValue: "Brand" })}
                  </ToggleButton>
                )}
                {availableKinds.includes("company") && (
                  <ToggleButton value="company">
                    {t("Company", { defaultValue: "Company" })}
                  </ToggleButton>
                )}
              </ToggleButtonGroup>
            )}
            {!showKindTabs && availableKinds.length === 1 && (
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={
                  availableKinds[0] === "store"
                    ? t("Store product", { defaultValue: "Store product" })
                    : availableKinds[0] === "brand"
                      ? t("Brand product", { defaultValue: "Brand product" })
                      : t("Company product", {
                          defaultValue: "Company product",
                        })
                }
              />
            )}
            {loadingLists ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={28} />
              </Box>
            ) : isSingleFixedEntity && selectedEntity ? (
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "action.hover" }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {form.ownerKind === "store"
                    ? t("Store", { defaultValue: "Store" })
                    : form.ownerKind === "brand"
                      ? t("Brand", { defaultValue: "Brand" })
                      : t("Company", { defaultValue: "Company" })}
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedEntity?.nameEn ||
                    selectedEntity?.name ||
                    selectedEntity?.nameKu ||
                    "—"}
                </Typography>
              </Paper>
            ) : (
              <Autocomplete
                options={entityOptions}
                value={selectedEntity}
                onChange={(_, opt) =>
                  setForm((f) => ({ ...f, entityId: opt?._id || null }))
                }
                getOptionLabel={(o) => o?.nameEn || o?.name || o?.nameKu || ""}
                isOptionEqualToValue={(a, b) =>
                  !!a && !!b && String(a._id) === String(b._id)
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("Select", { defaultValue: "Select" })}
                    required
                  />
                )}
              />
            )}
            <TextField
              label={t("Product name", { defaultValue: "Product name" })}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label={t("Barcode (optional)", {
                defaultValue: "Barcode (optional)",
              })}
              value={form.barcode}
              onChange={(e) =>
                setForm((f) => ({ ...f, barcode: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label={t("Previous price (optional)", {
                defaultValue: "Previous price (optional)",
              })}
              type="number"
              inputProps={{ min: 0, step: "any" }}
              value={form.previousPrice}
              onChange={(e) =>
                setForm((f) => ({ ...f, previousPrice: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label={t("New price (optional)", {
                defaultValue: "New price (optional)",
              })}
              type="number"
              inputProps={{ min: 0, step: "any" }}
              value={form.newPrice}
              onChange={(e) =>
                setForm((f) => ({ ...f, newPrice: e.target.value }))
              }
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isDiscount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isDiscount: e.target.checked }))
                  }
                />
              }
              label={t("Discount", { defaultValue: "Discount" })}
            />
            <TextField
              label={t("Expiry date (optional)", {
                defaultValue: "Expiry date (optional)",
              })}
              type="datetime-local"
              value={form.expireDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, expireDate: e.target.value }))
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
            >
              {t("Image (optional)", { defaultValue: "Image (optional)" })}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setImageFile(file || null);
                  if (!file) setForm((f) => ({ ...f, imageUrl: "" }));
                }}
              />
            </Button>
            {imageFile && (
              <Typography variant="caption" color="text.secondary">
                {imageFile.name}
              </Typography>
            )}
            {form.imageUrl && !imageFile && (
              <Box
                component="img"
                src={resolveMediaUrl(form.imageUrl)}
                alt=""
                sx={{ maxWidth: 120, maxHeight: 120, borderRadius: 1 }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}>
            {saving ? t("Saving...") : t("Save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
