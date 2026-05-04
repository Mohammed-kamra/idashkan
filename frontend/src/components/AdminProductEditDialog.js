import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Checkbox,
  Alert,
  Typography,
  CircularProgress,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import InventoryIcon from "@mui/icons-material/Inventory";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useTranslation } from "react-i18next";
import {
  productAPI,
  categoryAPI,
  storeAPI,
  brandAPI,
  companyAPI,
} from "../services/api";
import MultilingualFieldGroup from "./MultilingualFieldGroup";
import {
  normalizeExpiryInputForApi,
  toDatetimeLocalValue,
} from "../utils/expiryDate";
import { parseOptionalNonNegativePrice } from "../utils/productPriceInput";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { getResolvedBackendOrigin } from "../config/backendUrl";

const API_URL = getResolvedBackendOrigin();

function productToEditForm(data) {
  if (!data) return null;
  const productCategoryId = data.categoryId?._id || data.categoryId || "";
  const rawCt =
    data.categoryTypeId?._id != null
      ? String(data.categoryTypeId._id)
      : data.categoryTypeId != null
        ? String(data.categoryTypeId)
        : "";
  return {
    name: data.name || "",
    nameEn: data.nameEn || "",
    nameAr: data.nameAr || "",
    nameKu: data.nameKu || "",
    image: data.image,
    previousPrice: data.previousPrice ?? "",
    newPrice: data.newPrice ?? "",
    isDiscount: data.isDiscount || false,
    description: data.description || "",
    descriptionEn: data.descriptionEn || "",
    descriptionAr: data.descriptionAr || "",
    descriptionKu: data.descriptionKu || "",
    barcode: data.barcode || "",
    weight: data.weight || "",
    storeId: data.storeId?._id || data.storeId || "",
    brandId: data.brandId?._id || data.brandId || "",
    companyId: data.companyId?._id || data.companyId || "",
    categoryId: productCategoryId,
    categoryTypeId: rawCt,
    storeTypeId: data.storeTypeId?._id || data.storeTypeId || "",
    status: data.status || "published",
    expireDate: data.expireDate ? toDatetimeLocalValue(data.expireDate) : "",
  };
}

async function uploadProductImage(file, expireDateInput) {
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
}

async function fetchAdminLists() {
  const [catRes, storeRes, brandRes, compRes] = await Promise.all([
    categoryAPI.getAll(),
    storeAPI.getAllIncludingHidden(),
    brandAPI.getAllIncludingHidden(),
    companyAPI.getAllIncludingHidden(),
  ]);
  return {
    categories: catRes.data || [],
    stores: storeRes.data || [],
    brands: brandRes.data || [],
    companies: compRes.data || [],
  };
}

/**
 * Admin-only product edit dialog — form layout matches Data Entry “Edit Product”.
 */
export default function AdminProductEditDialog({
  open,
  product,
  onClose,
  onSaved,
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [editForm, setEditForm] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [brands, setBrands] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [categoryTypes, setCategoryTypes] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [selectedEditImage, setSelectedEditImage] = useState(null);

  useEffect(() => {
    if (!open) {
      setSelectedEditImage(null);
      setSaveError("");
      setEditForm(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!product?._id) return;

    let cancelled = false;
    (async () => {
      setListsLoading(true);
      setSaveError("");
      setSelectedEditImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      try {
        const lists = await fetchAdminLists();
        if (cancelled) return;
        setCategories(lists.categories);
        setStores(lists.stores);
        setBrands(lists.brands);
        setCompanies(lists.companies);
        setEditForm(productToEditForm(product));

        const catId = product.categoryId?._id || product.categoryId || "";
        if (catId) {
          const typesRes = await categoryAPI.getTypes(catId);
          if (!cancelled) setCategoryTypes(typesRes.data || []);
        } else {
          setCategoryTypes([]);
        }
      } catch (e) {
        if (!cancelled) {
          setSaveError(
            e?.response?.data?.message ||
              e?.message ||
              t("Failed to load edit form."),
          );
        }
      } finally {
        if (!cancelled) setListsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, product?._id]);

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [name]: value };
      if (name === "categoryId") {
        next.categoryTypeId = "";
        categoryAPI
          .getTypes(value)
          .then((res) => setCategoryTypes(res.data || []))
          .catch(() => setCategoryTypes([]));
      }
      return next;
    });
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedEditImage(file);
  };

  const handleSave = async () => {
    if (!product?._id || !editForm) return;
    const prevP = parseOptionalNonNegativePrice(
      editForm.previousPrice,
      t("Previous price", { defaultValue: "Previous price" }),
    );
    if (!prevP.ok) {
      setSaveError(prevP.msg);
      return;
    }
    const newP = parseOptionalNonNegativePrice(
      editForm.newPrice,
      t("New price", { defaultValue: "New price" }),
    );
    if (!newP.ok) {
      setSaveError(newP.msg);
      return;
    }
    try {
      setSaving(true);
      setSaveError("");
      let imageUrl = editForm.image;
      if (selectedEditImage) {
        imageUrl = await uploadProductImage(
          selectedEditImage,
          editForm.expireDate,
        );
      }

      const productUpdateData = {
        ...editForm,
        image: imageUrl,
        previousPrice: prevP.value ?? null,
        newPrice: newP.value ?? null,
        isDiscount: editForm.isDiscount,
        description: editForm.description,
        barcode: editForm.barcode,
        weight: editForm.weight,
        expireDate: normalizeExpiryInputForApi(editForm.expireDate),
        brandId: editForm.brandId || null,
        categoryId: editForm.categoryId,
        categoryTypeId: editForm.categoryTypeId,
        storeId: editForm.storeId || null,
        storeTypeId: editForm.storeId ? editForm.storeTypeId : null,
        companyId: editForm.companyId || null,
      };

      await productAPI.update(String(product._id), productUpdateData);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setSaveError(
        e?.response?.data?.message ||
          e?.message ||
          t("Failed to save product."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle>{t("Edit Product")}</DialogTitle>
      <DialogContent dividers>
        {saveError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        ) : null}
        {listsLoading || !editForm ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box component="form" sx={{ mt: 1 }}>
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
                    src={resolveMediaUrl(editForm.image)}
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
                  id="admin-edit-product-image-upload"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleEditImageChange}
                />
                <label htmlFor="admin-edit-product-image-upload">
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
                <FormControl fullWidth>
                  <InputLabel>{t("Store")}</InputLabel>
                  <Select
                    name="storeId"
                    value={editForm.storeId || ""}
                    onChange={handleEditFormChange}
                    label={t("Store")}
                  >
                    <MenuItem value="">
                      <em>{t("Select Store")}</em>
                    </MenuItem>
                    {stores.map((store) => (
                      <MenuItem key={store._id} value={store._id}>
                        {store.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <Select
                    name="brandId"
                    value={editForm.brandId || ""}
                    onChange={handleEditFormChange}
                    label={t("Brand")}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>{t("select brand")}</em>
                    </MenuItem>
                    {brands.map((brand) => (
                      <MenuItem key={brand._id} value={brand._id}>
                        {brand.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <Select
                    name="companyId"
                    value={editForm.companyId || ""}
                    onChange={handleEditFormChange}
                    label={t("Company")}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>{t("select company")}</em>
                    </MenuItem>
                    {companies.map((company) => (
                      <MenuItem key={company._id} value={company._id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t("Category")}</InputLabel>
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
                  <InputLabel>{t("Category Type")}</InputLabel>
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
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          {t("Cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || listsLoading || !editForm}
        >
          {saving ? t("Saving...") : t("Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
