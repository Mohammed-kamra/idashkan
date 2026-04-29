import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Fade,
  useTheme,
  TablePagination,
  Checkbox,
  Snackbar,
  Autocomplete,
  OutlinedInput,
} from "@mui/material";
import {
  storeAPI,
  productAPI,
  fetchAllProducts,
  brandAPI,
  companyAPI,
  categoryAPI,
  giftAPI,
  adAPI,
  storeTypeAPI,
  brandTypeAPI,
  settingsAPI,
  adminAPI,
  videoAPI,
  jobAPI,
} from "../services/api";
import * as XLSX from "xlsx";
import {
  isExpiryStillValid,
  normalizeExpiryInputForApi,
  toDatetimeLocalValue,
} from "../utils/expiryDate";

import BusinessIcon from "@mui/icons-material/Business";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory";
import StoreIcon from "@mui/icons-material/Store";
import DownloadIcon from "@mui/icons-material/Download";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import CategoryIcon from "@mui/icons-material/Category";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import TranslateIcon from "@mui/icons-material/Translate";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useAppSettings } from "../context/AppSettingsContext";
import {
  isAdminEmail,
  canUseDataEntryNotifications,
} from "../utils/adminAccess";
import { useCityFilter } from "../context/CityFilterContext";
import MultilingualFieldGroup from "../components/MultilingualFieldGroup";
import { formatPriceDigits } from "../utils/formatPriceNumber";
import { parseOptionalNonNegativePrice } from "../utils/productPriceInput";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

/** Resolve Mongo id for product create from a store document (populate or raw id). */
function getStoreTypeIdFromStore(store) {
  if (!store) return "";
  const st = store.storeTypeId;
  if (st && typeof st === "object" && st._id) return String(st._id);
  if (st) return String(st);
  return "";
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
      ? options.find((o) => String(o._id) === idStr) ?? null
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

function DataEntryEntityIdsAutocomplete({
  label,
  options = [],
  valueIds,
  onChangeIds,
  disabled = false,
  required = false,
  placeholder,
  textFieldProps = {},
  sx,
}) {
  const ids = Array.isArray(valueIds)
    ? valueIds.map((id) => String(id))
    : [];
  const selected = options.filter((o) => ids.includes(String(o._id)));
  return (
    <Autocomplete
      multiple
      sx={sx}
      options={options}
      value={selected}
      onChange={(_, v) => onChangeIds(v.map((o) => String(o._id)))}
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

function makeProductGroupRow() {
  return {
    id: `pgr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    categoryId: "",
    categoryTypeId: "",
    previousPrice: "",
    newPrice: "",
    isDiscount: false,
    brandId: "",
    companyId: "",
    imageFile: null,
  };
}

function makeEditGroupRowFromProduct(product) {
  const catId = product.categoryId?._id || product.categoryId || "";
  const stId = product.storeTypeId?._id || product.storeTypeId || "";
  const sid = product.storeId?._id || product.storeId || "";
  return {
    id: `egr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    productId: String(product._id),
    storeId: sid ? String(sid) : "",
    name: product.name || "",
    categoryId: catId ? String(catId) : "",
    categoryTypeId: product.categoryTypeId || "",
    previousPrice:
      product.previousPrice !== undefined && product.previousPrice !== null
        ? String(product.previousPrice)
        : "",
    newPrice:
      product.newPrice !== undefined && product.newPrice !== null
        ? String(product.newPrice)
        : "",
    isDiscount: !!product.isDiscount,
    brandId: product.brandId?._id || product.brandId || "",
    companyId: product.companyId?._id || product.companyId || "",
    imageFile: null,
    currentImage: product.image || "",
    storeTypeId: stId ? String(stId) : "",
    status: product.status || "published",
    expireDate: product.expireDate
      ? toDatetimeLocalValue(product.expireDate)
      : "",
  };
}

/** Indices for admin Data Lists tabs (grouped UI: managing → service → main system → settings) */
const LIST_TAB = {
  STORES: 0,
  BRANDS: 1,
  COMPANIES: 2,
  PRODUCTS: 3,
  GIFTS: 4,
  REELS: 5,
  ADS: 6,
  JOBS: 7,
  CATEGORIES: 8,
  STORE_TYPES: 9,
  BRAND_TYPES: 10,
  SETTINGS: 11,
  NOTIFICATIONS: 12,
};

/** Horizontal scroll for action + filter rows inside each data-list tab */
const DATA_LIST_TAB_TOOLBAR_SCROLL_SX = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "auto",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",
  flexWrap: "nowrap",
  scrollbarWidth: "thin",
  pb: 0.5,
  "& > *": { flexShrink: 0 },
};

const emptyCategoryTypeRow = () => ({
  name: "",
  nameEn: "",
  nameAr: "",
  nameKu: "",
  description: "",
  descriptionEn: "",
  descriptionAr: "",
  descriptionKu: "",
});

function normalizeCategoryTypeRow(t) {
  if (t == null || t === "") return emptyCategoryTypeRow();
  if (typeof t === "string") {
    return { ...emptyCategoryTypeRow(), name: t };
  }
  return {
    ...emptyCategoryTypeRow(),
    name: t.name || "",
    nameEn: t.nameEn || "",
    nameAr: t.nameAr || "",
    nameKu: t.nameKu || "",
    description: t.description || "",
    descriptionEn: t.descriptionEn || "",
    descriptionAr: t.descriptionAr || "",
    descriptionKu: t.descriptionKu || "",
  };
}

/** Branches reference other stores; form state is string[] of store IDs. API stores name + storeId for stable sync. */
function branchesFromApiToForm(branchRows, allStores) {
  const ids = [];
  for (const br of branchRows || []) {
    if (br?.storeId) {
      const sid = String(br.storeId);
      if ((allStores || []).some((s) => String(s._id) === sid)) {
        ids.push(sid);
        continue;
      }
    }
    const match = (allStores || []).find((s) => s.name === br.name);
    if (match) ids.push(String(match._id));
  }
  return [...new Set(ids)];
}

function branchesToApiPayload(branchStoreIds, allStores) {
  return (branchStoreIds || [])
    .map((id) => {
      const s = (allStores || []).find((st) => String(st._id) === String(id));
      return s ? { name: s.name, storeId: s._id } : null;
    })
    .filter(Boolean);
}

const DataEntryForm = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAuthHeaders, user } = useAuth();
  const isAdmin = isAdminEmail(user);
  const canUseNotificationsTab = canUseDataEntryNotifications(user);
  const { cities: publicCities, citiesNonce } = useCityFilter();
  const {
    contactWhatsAppNumber,
    setContactWhatsAppNumber,
    contactInfo,
    setContactInfo,
    fetchSettings,
  } = useAppSettings();
  const [settingsContactNumber, setSettingsContactNumber] = useState("");
  const [settingsContactInfo, setSettingsContactInfo] = useState({
    whatsapp: "",
    facebook: "",
    instagram: "",
    snapchat: "",
    gmail: "",
    tiktok: "",
    viber: "",
    telegram: "",
  });
  const [activeListTab, setActiveListTab] = useState(0); // State for list tabs
  const [stores, setStores] = useState([]);
  const [brands, setBrands] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryTypes, setCategoryTypes] = useState([]);
  const [categoryTypesByCategoryId, setCategoryTypesByCategoryId] = useState(
    {},
  );
  const [products, setProducts] = useState([]);
  const [productListImageUploadId, setProductListImageUploadId] =
    useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [ads, setAds] = useState([]);
  const [reels, setReels] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Pagination states
  const [storesPage, setStoresPage] = useState(0);
  const [brandsPage, setBrandsPage] = useState(0);
  const [companiesPage, setCompaniesPage] = useState(0);
  const [productsPage, setProductsPage] = useState(0);
  const [giftsPage, setGiftsPage] = useState(0);
  const [adsPage, setAdsPage] = useState(0);
  const [reelsPage, setReelsPage] = useState(0);
  const [jobsPage, setJobsPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [storeNameSearch, setStoreNameSearch] = useState("");
  const [brandNameSearch, setBrandNameSearch] = useState("");
  const [companyNameSearch, setCompanyNameSearch] = useState("");
  const [categoryStoreTypeFilter, setCategoryStoreTypeFilter] = useState("all");
  const [storeTypes, setStoreTypes] = useState([]);
  const [brandTypes, setBrandTypes] = useState([]);
  const EMPTY_TYPE_ADD_FORM = {
    name: "",
    icon: "",
    nameEn: "",
    nameAr: "",
    nameKu: "",
  };
  const [storeTypeAddForm, setStoreTypeAddForm] = useState(() => ({
    ...EMPTY_TYPE_ADD_FORM,
  }));
  const [brandTypeAddForm, setBrandTypeAddForm] = useState(() => ({
    ...EMPTY_TYPE_ADD_FORM,
  }));

  // Notification send form
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationTitleEn, setNotificationTitleEn] = useState("");
  const [notificationTitleAr, setNotificationTitleAr] = useState("");
  const [notificationTitleKu, setNotificationTitleKu] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [notificationBodyEn, setNotificationBodyEn] = useState("");
  const [notificationBodyAr, setNotificationBodyAr] = useState("");
  const [notificationBodyKu, setNotificationBodyKu] = useState("");
  const [notificationType, setNotificationType] = useState("general");
  const [notificationLinkType, setNotificationLinkType] = useState("none");
  const [notificationLinkId, setNotificationLinkId] = useState("");
  const [notificationSending, setNotificationSending] = useState(false);

  // Refs for file inputs
  const brandLogoFileRef = useRef(null);
  const productImageFileRef = useRef(null);
  const giftImageFileRef = useRef(null);
  const adImageFileRef = useRef(null);
  const editAdImageFileRef = useRef(null);
  const videoFileRef = useRef(null);

  // Brand form state
  const [brandForm, setBrandForm] = useState({
    name: "",
    nameEn: "",
    nameAr: "",
    nameKu: "",
    logo: "",
    address: "",
    addressEn: "",
    addressAr: "",
    addressKu: "",
    phone: "",
    whatsapp: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    snapchat: "",
    googleMaps: "",
    appleMaps: "",
    waze: "",
    description: "",
    descriptionEn: "",
    descriptionAr: "",
    descriptionKu: "",
    isVip: false,
    brandTypeId: "",
    storecity: "Erbil",
    expireDate: "",
    statusAll: "on",
    isHasDelivery: false,
    deliveryAllCities: false,
    deliveryCities: [],
  });
  // Store form state
  const [storeForm, setStoreForm] = useState({
    name: "",
    nameEn: "",
    nameAr: "",
    nameKu: "",
    logo: "",
    address: "",
    addressEn: "",
    addressAr: "",
    addressKu: "",
    phone: "",
    whatsapp: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    snapchat: "",
    googleMaps: "",
    appleMaps: "",
    waze: "",
    description: "",
    descriptionEn: "",
    descriptionAr: "",
    descriptionKu: "",
    isVip: false,
    storeTypeId: "",
    storecity: "Erbil",
    branches: [],
    show: true,
    showingOnStoreBranchShowcase: true,
    expireDate: "",
    statusAll: "on",
    isHasDelivery: false,
    deliveryAllCities: false,
    deliveryCities: [],
  });

  // Product form state
  const [productForm, setProductForm] = useState({
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
    brandId: "",
    companyId: "",
    categoryId: "",
    categoryTypeId: "",
    storeIds: [],
    status: "published",
    expireDate: "",
  });

  const [groupAddStoreIds, setGroupAddStoreIds] = useState([]);
  /** Single expiry for all products in this group add (set once beside store type). */
  const [groupAddExpireDate, setGroupAddExpireDate] = useState("");
  /** Single status for all products in this group add. */
  const [groupAddStatus, setGroupAddStatus] = useState("published");
  const [productGroupRows, setProductGroupRows] = useState(() => [
    makeProductGroupRow(),
  ]);
  const [groupAddLoading, setGroupAddLoading] = useState(false);
  const [productGroupDialogOpen, setProductGroupDialogOpen] = useState(false);

  /** Edit by group: products pre-selected in table → edit rows */
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [editGroupRows, setEditGroupRows] = useState([]);
  const [editGroupLoading, setEditGroupLoading] = useState(false);

  // Ad form state
  const [adForm, setAdForm] = useState({
    image: "",
    brandId: "",
    companyId: "",
    storeId: "",
    giftId: "",
    startDate: "",
    endDate: "",
    linkUrl: "",
    active: true,
    priority: 0,
    pages: ["all"],
  });

  const [selectedAdImage, setSelectedAdImage] = useState(null);

  const defaultJobForm = {
    title: "",
    titleEn: "",
    titleAr: "",
    titleKu: "",
    description: "",
    descriptionEn: "",
    descriptionAr: "",
    descriptionKu: "",
    gender: "any",
    storeId: "",
    brandId: "",
    companyId: "",
    city: "Erbil",
    whatsapp: "",
    email: "",
    jobType: "",
    indeed: "",
    image: "",
    expireDate: "",
    active: true,
  };
  const [jobForm, setJobForm] = useState(defaultJobForm);
  const [selectedJobImage, setSelectedJobImage] = useState(null);
  const [editingJobId, setEditingJobId] = useState("");

  const defaultVideoForm = {
    title: "",
    titleEn: "",
    titleAr: "",
    titleKu: "",
    storeId: "",
    brandId: "",
    companyId: "",
    videoUrl: "",
    key: "",
    expireDate: "",
    like: 0,
    views: 0,
    shares: 0,
  };
  const [videoForm, setVideoForm] = useState(defaultVideoForm);
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [editingVideoId, setEditingVideoId] = useState("");

  // Gift form state
  const [giftForm, setGiftForm] = useState({
    image: "",
    description: "",
    descriptionEn: "",
    descriptionAr: "",
    descriptionKu: "",
    storeId: [],
    brandId: "",
    companyId: "",
    productId: "",
    expireDate: "",
  });

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    nameEn: "",
    nameAr: "",
    nameKu: "",
    description: "",
    descriptionEn: "",
    descriptionAr: "",
    descriptionKu: "",
    storeTypeId: "",
    types: [emptyCategoryTypeRow()],
  });

  // File upload state
  const [selectedBrandLogo, setSelectedBrandLogo] = useState(null);
  const [selectedProductImage, setSelectedProductImage] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedExcelFile, setSelectedExcelFile] = useState(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [selectedEditImage, setSelectedEditImage] = useState(null);
  const [selectedStoreLogo, setSelectedStoreLogo] = useState(null);
  const [selectedGiftImage, setSelectedGiftImage] = useState(null);
  const [selectedEditGiftImage, setSelectedEditGiftImage] = useState(null);

  // Brand and Store bulk upload state
  const [selectedBrandExcelFile, setSelectedBrandExcelFile] = useState(null);
  const [selectedStoreExcelFile, setSelectedStoreExcelFile] = useState(null);
  const [brandBulkUploadLoading, setBrandBulkUploadLoading] = useState(false);
  const [storeBulkUploadLoading, setStoreBulkUploadLoading] = useState(false);
  const [deleteExpiredLoading, setDeleteExpiredLoading] = useState(false);
  const [translateMissingLoading, setTranslateMissingLoading] = useState(false);

  const [selectedStoreFilter, setSelectedStoreFilter] = useState("");
  /** Products tab: client-side filters (name search + brand + company) */
  const [productListSearchQuery, setProductListSearchQuery] = useState("");
  const [productListFilterBrandId, setProductListFilterBrandId] = useState("");
  const [productListFilterCompanyId, setProductListFilterCompanyId] =
    useState("");
  const [editDialog, setEditDialog] = useState({
    open: false,
    type: "",
    data: null,
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: "",
    data: null,
  });
  const [addDialog, setAddDialog] = useState({ open: false, type: "" });
  const [bulkDialog, setBulkDialog] = useState({ open: false, type: "" });
  /** Stores selected for product bulk upload (each row is created per store; types come from store). */
  const [bulkProductStoreIds, setBulkProductStoreIds] = useState([]);

  // Load store types for dynamic selects
  useEffect(() => {
    (async () => {
      try {
        const res = await storeTypeAPI.getAll();
        setStoreTypes(res.data || []);
      } catch (e) {
        // ignore
      }
      try {
        const res = await brandTypeAPI.getAll();
        setBrandTypes(res.data || []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Edit dialog form state
  const [editForm, setEditForm] = useState({});
  const [adminCityRows, setAdminCityRows] = useState([]);

  useEffect(() => {
    if (!isAdmin) {
      setAdminCityRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await adminAPI.getCities();
        if (!cancelled && Array.isArray(res.data)) {
          setAdminCityRows(res.data);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, citiesNonce]);

  const baseStoreCityOptions = useMemo(() => {
    const mapRow = (c) => ({
      value: c.name,
      flag: c.flag || "📍",
      label: t(`city.${c.name}`, { defaultValue: c.name }),
      inactive: c.isActive === false,
    });
    if (isAdmin && adminCityRows.length > 0) {
      return [...adminCityRows]
        .sort(
          (a, b) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
            String(a.name).localeCompare(String(b.name)),
        )
        .map(mapRow);
    }
    return publicCities.map((c) => ({
      ...c,
      inactive: false,
    }));
  }, [isAdmin, adminCityRows, publicCities, t]);

  const withLegacyCity = (options, current) => {
    if (!current || options.some((o) => o.value === current)) {
      return options;
    }
    return [
      ...options,
      {
        value: current,
        flag: "📍",
        label: current,
        inactive: true,
      },
    ];
  };

  const storeFormCityOptions = useMemo(
    () => withLegacyCity(baseStoreCityOptions, storeForm.storecity),
    [baseStoreCityOptions, storeForm.storecity],
  );

  const editFormCityOptions = useMemo(
    () => withLegacyCity(baseStoreCityOptions, editForm.storecity),
    [baseStoreCityOptions, editForm.storecity],
  );

  const jobFormCityOptions = useMemo(
    () => withLegacyCity(baseStoreCityOptions, jobForm.city),
    [baseStoreCityOptions, jobForm.city],
  );

  const deliveryFormCityOptions = useMemo(() => {
    let opts = [...baseStoreCityOptions];
    for (const city of storeForm.deliveryCities || []) {
      if (!opts.some((o) => o.value === city)) {
        opts.push({
          value: city,
          flag: "📍",
          label: city,
          inactive: true,
        });
      }
    }
    return opts;
  }, [baseStoreCityOptions, storeForm.deliveryCities]);

  const brandFormCityOptions = useMemo(
    () => withLegacyCity(baseStoreCityOptions, brandForm.storecity),
    [baseStoreCityOptions, brandForm.storecity],
  );

  const deliveryBrandFormCityOptions = useMemo(() => {
    let opts = [...baseStoreCityOptions];
    for (const city of brandForm.deliveryCities || []) {
      if (!opts.some((o) => o.value === city)) {
        opts.push({
          value: city,
          flag: "📍",
          label: city,
          inactive: true,
        });
      }
    }
    return opts;
  }, [baseStoreCityOptions, brandForm.deliveryCities]);

  const deliveryEditCityOptions = useMemo(() => {
    let opts = [...baseStoreCityOptions];
    for (const city of editForm.deliveryCities || []) {
      if (!opts.some((o) => o.value === city)) {
        opts.push({
          value: city,
          flag: "📍",
          label: city,
          inactive: true,
        });
      }
    }
    return opts;
  }, [baseStoreCityOptions, editForm.deliveryCities]);

  useEffect(() => {
    const names = baseStoreCityOptions.map((o) => o.value);
    if (!names.length) return;
    setJobForm((prev) =>
      !prev.city || names.includes(prev.city)
        ? prev
        : { ...prev, city: names[0] },
    );
  }, [baseStoreCityOptions]);

  useEffect(() => {
    const names = baseStoreCityOptions.map((o) => o.value);
    if (!names.length) return;
    setStoreForm((prev) =>
      names.includes(prev.storecity) ? prev : { ...prev, storecity: names[0] },
    );
  }, [baseStoreCityOptions]);

  useEffect(() => {
    const names = baseStoreCityOptions.map((o) => o.value);
    if (!names.length) return;
    setBrandForm((prev) =>
      names.includes(prev.storecity) ? prev : { ...prev, storecity: names[0] },
    );
  }, [baseStoreCityOptions]);

  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchBrands();
    fetchCompanies();
    fetchCategories();
    fetchGifts();
    fetchAds();
    fetchReels();
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchProducts(selectedStoreFilter);
  }, [selectedStoreFilter]);

  useEffect(() => {
    setStoresPage(0);
  }, [storeNameSearch]);

  useEffect(() => {
    setBrandsPage(0);
  }, [brandNameSearch]);

  useEffect(() => {
    setCompaniesPage(0);
  }, [companyNameSearch]);

  useEffect(() => {
    if (activeListTab === LIST_TAB.SETTINGS) {
      setSettingsContactNumber(contactWhatsAppNumber || "");
      setSettingsContactInfo({
        whatsapp: contactInfo?.whatsapp || contactWhatsAppNumber || "",
        facebook: contactInfo?.facebook || "",
        instagram: contactInfo?.instagram || "",
        snapchat: contactInfo?.snapchat || "",
        gmail: contactInfo?.gmail || "",
        tiktok: contactInfo?.tiktok || "",
        viber: contactInfo?.viber || "",
        telegram: contactInfo?.telegram || "",
      });
    }
    if (activeListTab === LIST_TAB.NOTIFICATIONS && canUseNotificationsTab) {
      setNotificationTitle("");
      setNotificationBody("");
      setNotificationType("general");
    }
  }, [
    activeListTab,
    contactWhatsAppNumber,
    contactInfo,
    canUseNotificationsTab,
  ]);

  const fetchStores = async () => {
    try {
      const response = await storeAPI.getAllIncludingHidden();
      setStores(response.data);
    } catch (err) {
      console.error("Error fetching stores:", err);
    }
  };

  const fetchProducts = async (storeId) => {
    try {
      if (storeId) {
        const list = await fetchAllProducts({
          store: storeId,
          includeAll: true,
        });
        setProducts(list);
      } else {
        const list = await fetchAllProducts({ includeAll: true });
        setProducts(list);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await brandAPI.getAllIncludingHidden();
      setBrands(response.data);
    } catch (err) {
      console.error("Error fetching brands:", err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await companyAPI.getAllIncludingHidden();
      setCompanies(response.data || []);
    } catch (err) {
      console.error("Error fetching companies:", err);
      setCompanies([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      setCategories(response.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchGifts = async () => {
    try {
      const response = await giftAPI.getAll();
      setGifts(response.data.data || []);
    } catch (err) {
      console.error("Error fetching gifts:", err);
      setGifts([]);
    }
  };

  const fetchAds = async () => {
    try {
      const response = await adAPI.getAll();
      setAds(response.data);
    } catch (err) {
      console.error("Error fetching ads:", err);
    }
  };

  const fetchReels = async () => {
    try {
      const response = await videoAPI.getAll();
      setReels(response.data || []);
    } catch (err) {
      console.error("Error fetching reels:", err);
      setReels([]);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await jobAPI.getAllAdmin();
      setJobs(response.data || []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setJobs([]);
    }
  };

  const fetchCategoryTypes = async (categoryId) => {
    try {
      if (!categoryId) {
        setCategoryTypes([]);
        return;
      }
      const response = await categoryAPI.getTypes(categoryId);
      setCategoryTypes(response.data);
    } catch (err) {
      console.error("Error fetching category types:", err);
      setCategoryTypes([]);
    }
  };

  // Helper function to get category type name from categoryTypeId
  const getCategoryTypeName = (categoryTypeId, categoryId) => {
    // If categoryTypeId is available, try to find the type name
    if (categoryTypeId && categoryId) {
      const category = categories.find((cat) => cat._id === categoryId);

      if (category && category.types) {
        // First try to find by ID (converting ObjectId to string)
        let type = category.types.find(
          (t) => t._id.toString() === categoryTypeId,
        );

        // If not found by ID, try to find by name directly
        if (!type) {
          type = category.types.find((t) => t.name === categoryTypeId);
        }

        if (type) {
          return type.name;
        }
      }
    }

    // Return N/A if no valid category type found
    return "N/A";
  };
  const handleStoreFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStoreForm((prev) => {
      const next = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "isHasDelivery" && type === "checkbox" && !checked) {
        next.deliveryAllCities = false;
        next.deliveryCities = [];
      }
      return next;
    });
  };

  // Handler for the new list tabs
  const handleListTabChange = (event, newValue) => {
    setActiveListTab(newValue);
  };

  const adminDataListGroupActive = useMemo(() => {
    const managing =
      activeListTab >= LIST_TAB.STORES && activeListTab <= LIST_TAB.REELS;
    const service =
      activeListTab >= LIST_TAB.ADS && activeListTab <= LIST_TAB.JOBS;
    const mainSystem =
      activeListTab >= LIST_TAB.CATEGORIES &&
      activeListTab <= LIST_TAB.BRAND_TYPES;
    const settings =
      activeListTab === LIST_TAB.SETTINGS ||
      (canUseNotificationsTab && activeListTab === LIST_TAB.NOTIFICATIONS);
    return { managing, service, mainSystem, settings };
  }, [activeListTab, canUseNotificationsTab]);

  /** Which tab group row strip to show (only those tabs are mounted). */
  const dataListVisibleGroup = useMemo(() => {
    if (activeListTab >= LIST_TAB.STORES && activeListTab <= LIST_TAB.REELS) {
      return "managing";
    }
    if (activeListTab >= LIST_TAB.ADS && activeListTab <= LIST_TAB.JOBS) {
      return "service";
    }
    if (
      activeListTab >= LIST_TAB.CATEGORIES &&
      activeListTab <= LIST_TAB.BRAND_TYPES
    ) {
      return "mainSystem";
    }
    if (
      activeListTab === LIST_TAB.SETTINGS ||
      (canUseNotificationsTab && activeListTab === LIST_TAB.NOTIFICATIONS)
    ) {
      return "settings";
    }
    return "managing";
  }, [activeListTab, canUseNotificationsTab]);

  const formatDisplayDate = (dateInput) => {
    if (!dateInput) return "-";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "-";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Pagination handlers
  const handleStoresPageChange = (event, newPage) => {
    setStoresPage(newPage);
  };

  const handleBrandsPageChange = (event, newPage) => {
    setBrandsPage(newPage);
  };
  const handleCompaniesPageChange = (event, newPage) => {
    setCompaniesPage(newPage);
  };

  const filteredStores = stores.filter((store) =>
    (store?.name || "")
      .toLowerCase()
      .includes((storeNameSearch || "").trim().toLowerCase()),
  );

  const filteredBrands = brands.filter((brand) =>
    (brand?.name || "")
      .toLowerCase()
      .includes((brandNameSearch || "").trim().toLowerCase()),
  );
  const filteredCompanies = companies.filter((company) =>
    (company?.name || "")
      .toLowerCase()
      .includes((companyNameSearch || "").trim().toLowerCase()),
  );

  const filteredCategoriesByStoreType = categories.filter((cat) => {
    if (categoryStoreTypeFilter === "all") return true;
    const catStoreTypeId =
      cat?.storeTypeId?._id || cat?.storeTypeId || cat?.storeType?._id || "";
    return String(catStoreTypeId) === String(categoryStoreTypeFilter);
  });

  const filteredProducts = useMemo(() => {
    const q = (productListSearchQuery || "").trim().toLowerCase();
    const brandF = (productListFilterBrandId || "").trim();
    const companyF = (productListFilterCompanyId || "").trim();

    return products.filter((p) => {
      if (brandF) {
        const bid =
          p.brandId && typeof p.brandId === "object" && p.brandId._id != null
            ? String(p.brandId._id)
            : p.brandId != null
              ? String(p.brandId)
              : "";
        if (bid !== brandF) return false;
      }
      if (companyF) {
        const cid =
          p.companyId &&
          typeof p.companyId === "object" &&
          p.companyId._id != null
            ? String(p.companyId._id)
            : p.companyId != null
              ? String(p.companyId)
              : "";
        if (cid !== companyF) return false;
      }
      if (q) {
        const hay = [p.name, p.nameEn, p.nameAr, p.nameKu]
          .filter((s) => s != null && String(s).trim() !== "")
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    products,
    productListSearchQuery,
    productListFilterBrandId,
    productListFilterCompanyId,
  ]);

  useEffect(() => {
    setProductsPage(0);
  }, [
    productListSearchQuery,
    productListFilterBrandId,
    productListFilterCompanyId,
    selectedStoreFilter,
  ]);

  const handleProductsPageChange = (event, newPage) => {
    setProductsPage(newPage);
  };

  const handleToggleProductSelection = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const handleSelectAllProductsOnPage = (checked, pageItems) => {
    const pageIds = pageItems.map((p) => p._id);
    if (checked) {
      setSelectedProductIds((prev) => [...new Set([...prev, ...pageIds])]);
      return;
    }
    setSelectedProductIds((prev) => prev.filter((id) => !pageIds.includes(id)));
  };

  const handleBulkPublishSelectedProducts = async () => {
    if (!selectedProductIds.length) {
      setMessage({
        type: "warning",
        text: t("Please select at least one product."),
      });
      return;
    }
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      await Promise.all(
        selectedProductIds.map((id) =>
          productAPI.update(id, { status: "published" }),
        ),
      );
      setMessage({
        type: "success",
        text: t("Updated {{count}} products to published.", {
          count: selectedProductIds.length,
        }),
      });
      setSelectedProductIds([]);
      await fetchProducts(selectedStoreFilter);
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err?.response?.data?.message ||
          err?.message ||
          t("Failed to update product status."),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPendingSelectedProducts = async () => {
    if (!selectedProductIds.length) {
      setMessage({
        type: "warning",
        text: t("Please select at least one product."),
      });
      return;
    }
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      await Promise.all(
        selectedProductIds.map((id) =>
          productAPI.update(id, { status: "pending" }),
        ),
      );
      setMessage({
        type: "success",
        text: t("Updated {{count}} products to pending.", {
          count: selectedProductIds.length,
        }),
      });
      setSelectedProductIds([]);
      await fetchProducts(selectedStoreFilter);
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err?.response?.data?.message ||
          err?.message ||
          t("Failed to update product status."),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGiftsPageChange = (event, newPage) => {
    setGiftsPage(newPage);
  };

  const handleBrandFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBrandForm((prev) => {
      const next = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "isHasDelivery" && type === "checkbox" && !checked) {
        next.deliveryAllCities = false;
        next.deliveryCities = [];
      }
      return next;
    });
  };

  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    setProductForm({
      ...productForm,
      [name]: value,
    });

    // If category is selected, fetch its types
    if (name === "categoryId") {
      fetchCategoryTypes(value);
      // Reset category type when category changes
      setProductForm((prev) => ({
        ...prev,
        categoryTypeId: "",
      }));
    }
  };

  const handleGiftFormChange = (e) => {
    const { name, value } = e.target;
    setGiftForm({
      ...giftForm,
      [name]: value,
    });
  };

  // Handle file selection for brand logo
  const handleBrandLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedBrandLogo(file);
    }
  };

  // Handle file selection for store logo
  const handleStoreLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedStoreLogo(file);
    }
  };

  // Handle file selection for product image
  const handleProductImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedProductImage(file);
    }
  };

  // Handle file selection for edit product image
  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedEditImage(file);
    }
  };

  // Handle file selection for gift image
  const handleGiftImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedGiftImage(file);
    }
  };

  // Handle file selection for edit gift image
  const handleEditGiftImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedEditGiftImage(file);
    }
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedVideoFile(file);
    }
  };

  const openCreateVideoDialog = () => {
    setEditingVideoId("");
    setVideoForm(defaultVideoForm);
    setSelectedVideoFile(null);
    if (videoFileRef.current) {
      videoFileRef.current.value = "";
    }
    setAddDialog({ open: true, type: "video" });
  };

  const openEditVideoDialog = (reel) => {
    setEditingVideoId(reel?._id || "");
    setVideoForm({
      title: reel?.title || "",
      titleEn: reel?.titleEn || "",
      titleAr: reel?.titleAr || "",
      titleKu: reel?.titleKu || "",
      storeId: reel?.storeId?._id || reel?.storeId || "",
      brandId: reel?.brandId?._id || reel?.brandId || "",
      videoUrl: reel?.videoUrl || "",
      key: reel?.key || "",
      expireDate: reel?.expireDate ? toDatetimeLocalValue(reel.expireDate) : "",
      like: Number(reel?.like) || 0,
      views: Number(reel?.views) || 0,
      shares: Number(reel?.shares) || 0,
    });
    setSelectedVideoFile(null);
    if (videoFileRef.current) {
      videoFileRef.current.value = "";
    }
    setAddDialog({ open: true, type: "video" });
  };

  // Upload brand logo
  const uploadBrandLogo = async (file) => {
    const formData = new FormData();
    formData.append("logo", file);

    try {
      const response = await fetch(`${API_URL}/api/brands/upload-logo`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading logo:", error);
      throw error;
    }
  };

  // Upload store logo
  const uploadStoreLogo = async (file) => {
    const formData = new FormData();
    formData.append("logo", file);

    try {
      const response = await fetch(`${API_URL}/api/stores/upload-logo`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading logo:", error);
      throw error;
    }
  };
  // Upload product image
  const uploadProductImage = async (file, expireDateInput) => {
    const formData = new FormData();
    formData.append("image", file);
    const exp = normalizeExpiryInputForApi(expireDateInput);
    if (exp) {
      formData.append("expireDate", exp);
    }

    try {
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
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleProductListImageUpload = async (e, product) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !product?._id) return;
    const pid = String(product._id);
    setProductListImageUploadId(pid);
    try {
      const imageUrl = await uploadProductImage(
        file,
        product.expireDate != null && product.expireDate !== ""
          ? product.expireDate
          : undefined,
      );
      await productAPI.update(pid, { image: imageUrl });
      setMessage({
        type: "success",
        text: t("productListImageUpdated", {
          defaultValue: "Product image updated",
        }),
      });
      await fetchProducts(selectedStoreFilter);
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text:
          err?.response?.data?.msg ||
          err?.response?.data?.message ||
          err?.message ||
          t("productListImageFailed", {
            defaultValue: "Failed to update product image",
          }),
      });
    } finally {
      setProductListImageUploadId(null);
    }
  };

  // Upload gift image
  const uploadGiftImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(`${API_URL}/api/gifts/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error("Error uploading gift image:", error);
      throw error;
    }
  };

  const uploadVideoFile = async (file) => {
    const formData = new FormData();
    formData.append("video", file);
    if (videoForm.storeId) {
      formData.append("storeId", String(videoForm.storeId));
      const exp = normalizeExpiryInputForApi(videoForm.expireDate);
      if (exp) {
        formData.append("expireDate", exp);
      }
    }
    const response = await videoAPI.upload(formData);
    return response.data;
  };

  // Handle Excel file selection
  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedExcelFile(file);
    }
  };

  // Handle Brand Excel file selection
  const handleBrandExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedBrandExcelFile(file);
    }
  };

  // Handle Store Excel file selection
  const handleStoreExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedStoreExcelFile(file);
    }
  };

  // Process Excel file and create products
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!selectedExcelFile) {
      setMessage({
        type: "error",
        text: t("Please select an Excel file."),
      });
      return;
    }

    setBulkUploadLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("excelFile", selectedExcelFile);
      formData.append("storeIds", JSON.stringify(bulkProductStoreIds));

      const response = await fetch(`${API_URL}/api/products/bulk-upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const details = [];
        if (Array.isArray(errorData?.errors) && errorData.errors.length > 0) {
          details.push(errorData.errors.slice(0, 5).join("\n"));
        }
        if (
          Array.isArray(errorData?.receivedHeader) &&
          errorData.receivedHeader.length > 0
        ) {
          details.push(
            `Received header: ${errorData.receivedHeader.join(" | ")}`,
          );
        }
        const fullMessage = [
          errorData.message || "Bulk upload failed",
          ...details,
        ]
          .filter(Boolean)
          .join("\n");
        throw new Error(fullMessage);
      }

      const data = await response.json();
      setMessage({
        type: "success",
        text: t("Successfully uploaded {{count}} products", {
          count: data.createdCount,
        }),
      });

      if (data.errors && data.errors.length > 0) {
        setMessage({
          type: "warning",
          text: `${t("Upload complete with {{count}} errors", {
            count: data.errors.length,
          })}\n${data.errors.slice(0, 5).join("\n")}`,
        });
      }

      fetchProducts(selectedStoreFilter); // Refresh products list
      setSelectedExcelFile(null); // Clear file input
      setBulkProductStoreIds([]);
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err?.message ||
          "Failed to upload products. Please check your Excel file format.",
      });
      console.error("Error uploading products:", err);
    } finally {
      setBulkUploadLoading(false);
    }
  };

  const handleAdSubmit = async () => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      let imageUrl = adForm.image;
      if (selectedAdImage) {
        setUploadLoading(true);
        const formData = new FormData();
        formData.append("image", selectedAdImage);
        const resp = await fetch(`${API_URL}/api/ads/upload-image`, {
          method: "POST",
          body: formData,
        });
        if (!resp.ok) throw new Error("Failed to upload ad image");
        const data = await resp.json();
        imageUrl = data.url;
        setUploadLoading(false);
      }

      const payload = {
        image: imageUrl,
        brandId: adForm.brandId || undefined,
        storeId: adForm.storeId || undefined,
        giftId: adForm.giftId || undefined,
        startDate: adForm.startDate
          ? new Date(adForm.startDate).toISOString()
          : undefined,
        endDate: adForm.endDate
          ? new Date(adForm.endDate).toISOString()
          : undefined,
        linkUrl: adForm.linkUrl || "",
        active: !!adForm.active,
        priority: Number(adForm.priority) || 0,
        pages: (adForm.pages && adForm.pages.length
          ? adForm.pages
          : ["all"]
        ).map((p) => String(p).toLowerCase()),
      };

      await adAPI.create(payload);
      setMessage({ type: "success", text: t("Ad created successfully!") });
      setAdForm({
        image: "",
        brandId: "",
        companyId: "",
        storeId: "",
        giftId: "",
        startDate: "",
        endDate: "",
        linkUrl: "",
        active: true,
        priority: 0,
        pages: ["all"],
      });
      setSelectedAdImage(null);
      fetchAds();
    } catch (err) {
      setMessage({
        type: "error",
        text: t("Failed to create ad. Please try again."),
      });
      console.error("Error creating ad:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJobSubmit = async (e) => {
    e?.preventDefault?.();
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      if (!jobForm.title?.trim()) {
        setMessage({ type: "error", text: t("Please enter a title.") });
        return;
      }
      if (!jobForm.description?.trim()) {
        setMessage({ type: "error", text: t("Please enter a description.") });
        return;
      }
      const hasStore = Boolean(
        jobForm.storeId && String(jobForm.storeId).trim(),
      );
      const hasBrand = Boolean(
        jobForm.brandId && String(jobForm.brandId).trim(),
      );
      const hasCompany = Boolean(
        jobForm.companyId && String(jobForm.companyId).trim(),
      );
      const ownerCount = [hasStore, hasBrand, hasCompany].filter(
        Boolean,
      ).length;
      if (ownerCount !== 1) {
        setMessage({
          type: "error",
          text: t(
            "Please select exactly one owner (Store, Brand, or Company).",
          ),
        });
        return;
      }
      if (!String(jobForm.city || "").trim()) {
        setMessage({
          type: "error",
          text: t("Please select a city."),
        });
        return;
      }

      let imageUrl = jobForm.image || "";
      if (selectedJobImage) {
        setUploadLoading(true);
        const formData = new FormData();
        formData.append("image", selectedJobImage);
        const resp = await jobAPI.uploadImage(formData);
        imageUrl = resp?.data?.url || imageUrl;
        setUploadLoading(false);
      }

      const sid =
        jobForm.storeId && String(jobForm.storeId).trim()
          ? jobForm.storeId
          : null;
      const bid =
        jobForm.brandId && String(jobForm.brandId).trim()
          ? jobForm.brandId
          : null;
      const cid =
        jobForm.companyId && String(jobForm.companyId).trim()
          ? jobForm.companyId
          : null;
      const payload = {
        title: jobForm.title.trim(),
        titleEn: jobForm.titleEn?.trim() || "",
        titleAr: jobForm.titleAr?.trim() || "",
        titleKu: jobForm.titleKu?.trim() || "",
        description: jobForm.description.trim(),
        descriptionEn: jobForm.descriptionEn?.trim() || "",
        descriptionAr: jobForm.descriptionAr?.trim() || "",
        descriptionKu: jobForm.descriptionKu?.trim() || "",
        gender: jobForm.gender || "any",
        image: imageUrl || "",
        storeId: sid,
        brandId: bid,
        companyId: cid,
        whatsapp: (jobForm.whatsapp || "").trim(),
        email: (jobForm.email || "").trim(),
        jobType: (jobForm.jobType || "").trim(),
        indeed: (jobForm.indeed || "").trim(),
        city: String(jobForm.city).trim(),
        expireDate: normalizeExpiryInputForApi(jobForm.expireDate) || undefined,
        active: jobForm.active !== false,
      };

      if (editingJobId) {
        await jobAPI.update(editingJobId, payload);
      } else {
        await jobAPI.create(payload);
      }

      setMessage({
        type: "success",
        text: editingJobId
          ? t("Job updated successfully!")
          : t("Job created successfully!"),
      });
      setJobForm(defaultJobForm);
      setEditingJobId("");
      setSelectedJobImage(null);
      setAddDialog({ open: false, type: "" });
      fetchJobs();
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err?.response?.data?.message ||
          t("Failed to save job. Please try again."),
      });
      console.error("Error saving job:", err);
    } finally {
      setLoading(false);
      setUploadLoading(false);
    }
  };

  const handleVideoSubmit = async (e) => {
    e.preventDefault();

    if (!videoForm.title.trim()) {
      setMessage({ type: "error", text: t("Please enter a video title.") });
      return;
    }

    if (!selectedVideoFile && !editingVideoId) {
      setMessage({ type: "error", text: t("Please select a video file.") });
      return;
    }

    const hasStore = Boolean(videoForm.storeId);
    const hasBrand = Boolean(videoForm.brandId);
    if (hasStore === hasBrand) {
      setMessage({
        type: "error",
        text: t("Please select exactly one owner (Store or Brand)."),
      });
      return;
    }

    try {
      setLoading(true);
      setUploadLoading(true);
      setMessage({ type: "", text: "" });

      let uploaded = null;
      if (selectedVideoFile) {
        uploaded = await uploadVideoFile(selectedVideoFile);
      }

      const payload = {
        title: videoForm.title.trim(),
        titleEn: videoForm.titleEn?.trim() || "",
        titleAr: videoForm.titleAr?.trim() || "",
        titleKu: videoForm.titleKu?.trim() || "",
        videoUrl: uploaded?.videoUrl || videoForm.videoUrl || undefined,
        key: uploaded?.key || videoForm.key || undefined,
        storeId: videoForm.storeId || undefined,
        brandId: videoForm.brandId || undefined,
        expireDate:
          normalizeExpiryInputForApi(videoForm.expireDate) || undefined,
        like: Number(videoForm.like) || 0,
        views: Number(videoForm.views) || 0,
        shares: Number(videoForm.shares) || 0,
      };

      if (editingVideoId) {
        await videoAPI.update(editingVideoId, payload);
      } else {
        await videoAPI.create(payload);
      }

      setMessage({
        type: "success",
        text: editingVideoId
          ? t("Video reel updated successfully!")
          : t("Video reel created successfully!"),
      });
      setVideoForm(defaultVideoForm);
      setEditingVideoId("");
      setSelectedVideoFile(null);
      if (videoFileRef.current) {
        videoFileRef.current.value = "";
      }
      fetchReels();
      setAddDialog({ open: false, type: "" });
    } catch (err) {
      console.error("Error saving video reel:", err);
      if (err?.code === "ECONNABORTED") {
        setMessage({
          type: "error",
          text: t(
            "Video upload timed out. Please wait and check Reels list before retrying (file may have uploaded).",
          ),
        });
        return;
      }
      setMessage({
        type: "error",
        text:
          err?.response?.data?.message ||
          err?.message ||
          t("Failed to save video reel. Please try again."),
      });
    } finally {
      setUploadLoading(false);
      setLoading(false);
    }
  };

  // Process Excel file and create brands
  const handleBrandBulkUpload = async (e) => {
    e.preventDefault();
    if (!selectedBrandExcelFile) {
      setMessage({
        type: "error",
        text: t("Please select an Excel file."),
      });
      return;
    }

    setBrandBulkUploadLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("excelFile", selectedBrandExcelFile);

      const response = await fetch(`${API_URL}/api/brands/bulk-upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Bulk upload failed");
      }

      const data = await response.json();
      setMessage({
        type: "success",
        text: t("Successfully uploaded {{count}} brands", {
          count: data.createdCount,
        }),
      });

      if (data.errors && data.errors.length > 0) {
        setMessage({
          type: "warning",
          text: t("Upload complete with {{count}} errors", {
            count: data.errors.length,
          }),
        });
      }

      fetchBrands(); // Refresh brands list
      setSelectedBrandExcelFile(null); // Clear file input
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err?.message ||
          "Failed to upload brands. Please check your Excel file format.",
      });
      console.error("Error uploading brands:", err);
    } finally {
      setBrandBulkUploadLoading(false);
    }
  };

  // Process Excel file and create stores
  const handleStoreBulkUpload = async (e) => {
    e.preventDefault();
    if (!selectedStoreExcelFile) {
      setMessage({
        type: "error",
        text: t("Please select an Excel file."),
      });
      return;
    }

    setStoreBulkUploadLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("excelFile", selectedStoreExcelFile);

      const response = await fetch(`${API_URL}/api/stores/bulk-upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Bulk upload failed");
      }

      const data = await response.json();
      setMessage({
        type: "success",
        text: t("Successfully uploaded {{count}} stores", {
          count: data.createdCount,
        }),
      });

      if (data.errors && data.errors.length > 0) {
        setMessage({
          type: "warning",
          text: t("Upload complete with {{count}} errors", {
            count: data.errors.length,
          }),
        });
      }

      fetchStores(); // Refresh stores list
      setSelectedStoreExcelFile(null); // Clear file input
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err?.message ||
          "Failed to upload stores. Please check your Excel file format.",
      });
      console.error("Error uploading stores:", err);
    } finally {
      setStoreBulkUploadLoading(false);
    }
  };

  useEffect(() => {
    // Keep selection valid after refresh/filtering
    setSelectedProductIds((prev) =>
      prev.filter((id) => products.some((p) => p._id === id)),
    );
  }, [products]);

  // Export brands to Excel
  const exportBrandsToExcel = () => {
    try {
      // Prepare data for export
      const exportData = brands.map((brand, index) => ({
        "No.": index + 1,
        ID: brand._id || "",
        Name: brand.name || "",
        Logo: brand.logo || "",
        Address: brand.address || "",
        Phone: brand.phone || "",
        Description: brand.description || "",
        "Created Date": brand.createdAt
          ? new Date(brand.createdAt).toLocaleDateString()
          : "",
        "Updated Date": brand.updatedAt
          ? new Date(brand.updatedAt).toLocaleDateString()
          : "",
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 5 }, // No.
        { wch: 25 }, // ID
        { wch: 25 }, // Name
        { wch: 30 }, // Logo
        { wch: 30 }, // Address
        { wch: 15 }, // Phone
        { wch: 40 }, // Description
        { wch: 15 }, // Created Date
        { wch: 15 }, // Updated Date
      ];
      worksheet["!cols"] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Brands");

      // Generate filename with current date
      const date = new Date().toISOString().split("T")[0];
      const filename = `brands_export_${date}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);

      setMessage({
        type: "success",
        text: t("Brands exported successfully to {{filename}}", {
          filename,
        }),
      });
    } catch (error) {
      console.error("Error exporting brands:", error);
      setMessage({
        type: "error",
        text: t("Failed to export brands. Please try again."),
      });
    }
  };

  const handleBrandSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    if (!selectedBrandLogo) {
      setMessage({ type: "error", text: t("Please select a logo file.") });
      setLoading(false);
      return;
    }

    try {
      if (
        brandForm.isHasDelivery &&
        !brandForm.deliveryAllCities &&
        (!brandForm.deliveryCities || brandForm.deliveryCities.length === 0)
      ) {
        setMessage({
          type: "error",
          text: t("Select delivery cities or enable delivery for all cities."),
        });
        setLoading(false);
        return;
      }

      setUploadLoading(true);
      const logoUrl = await uploadBrandLogo(selectedBrandLogo);
      setUploadLoading(false);

      const hasDel = !!brandForm.isHasDelivery;
      const brandData = {
        ...brandForm,
        logo: logoUrl,
        expireDate: normalizeExpiryInputForApi(brandForm.expireDate),
        deliveryAllCities: hasDel ? !!brandForm.deliveryAllCities : false,
        deliveryCities:
          hasDel && !brandForm.deliveryAllCities
            ? brandForm.deliveryCities || []
            : [],
        contactInfo: {
          phone: brandForm.phone || "",
          whatsapp: brandForm.whatsapp || "",
          facebook: brandForm.facebook || "",
          instagram: brandForm.instagram || "",
          tiktok: brandForm.tiktok || "",
          snapchat: brandForm.snapchat || "",
        },
        locationInfo: {
          googleMaps: brandForm.googleMaps || "",
          appleMaps: brandForm.appleMaps || "",
          waze: brandForm.waze || "",
        },
      };

      await (addDialog.type === "company"
        ? companyAPI.create(brandData)
        : brandAPI.create(brandData));
      setMessage({
        type: "success",
        text:
          addDialog.type === "company"
            ? t("Company created successfully!")
            : t("Brand created successfully!"),
      });
      setBrandForm({
        name: "",
        nameEn: "",
        nameAr: "",
        nameKu: "",
        logo: "",
        address: "",
        addressEn: "",
        addressAr: "",
        addressKu: "",
        phone: "",
        whatsapp: "",
        facebook: "",
        instagram: "",
        tiktok: "",
        snapchat: "",
        googleMaps: "",
        appleMaps: "",
        waze: "",
        brandTypeId: "",
        description: "",
        descriptionEn: "",
        descriptionAr: "",
        descriptionKu: "",
        isVip: false,
        expireDate: "",
        statusAll: "on",
        storecity: "Erbil",
        isHasDelivery: false,
        deliveryAllCities: false,
        deliveryCities: [],
      });
      setSelectedBrandLogo(null);
      if (brandLogoFileRef.current) {
        brandLogoFileRef.current.value = "";
      }
      if (addDialog.type === "company") fetchCompanies();
      else fetchBrands();
    } catch (err) {
      console.error("Error creating brand:", err);
      console.error("Error response:", err.response?.data);
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          err.message ||
          t("Failed to create brand. Please try again."),
      });
    } finally {
      setLoading(false);
      setUploadLoading(false);
    }
  };
  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      if (
        storeForm.isHasDelivery &&
        !storeForm.deliveryAllCities &&
        (!storeForm.deliveryCities || storeForm.deliveryCities.length === 0)
      ) {
        setMessage({
          type: "error",
          text: t("Select delivery cities or enable delivery for all cities."),
        });
        setLoading(false);
        return;
      }

      let logoUrl = "";

      if (selectedStoreLogo) {
        setUploadLoading(true);
        logoUrl = await uploadStoreLogo(selectedStoreLogo);
        setUploadLoading(false);
      }

      const hasDel = !!storeForm.isHasDelivery;
      const storeData = {
        ...storeForm,
        logo: logoUrl,
        branches: branchesToApiPayload(storeForm.branches, stores),
        expireDate: normalizeExpiryInputForApi(storeForm.expireDate),
        deliveryAllCities: hasDel ? !!storeForm.deliveryAllCities : false,
        deliveryCities:
          hasDel && !storeForm.deliveryAllCities
            ? storeForm.deliveryCities || []
            : [],
        contactInfo: {
          phone: storeForm.phone || "",
          whatsapp: storeForm.whatsapp || "",
          facebook: storeForm.facebook || "",
          instagram: storeForm.instagram || "",
          tiktok: storeForm.tiktok || "",
          snapchat: storeForm.snapchat || "",
        },
        locationInfo: {
          googleMaps: storeForm.googleMaps || "",
          appleMaps: storeForm.appleMaps || "",
          waze: storeForm.waze || "",
        },
      };

      await storeAPI.create(storeData);
      setMessage({ type: "success", text: t("Store created successfully!") });
      setStoreForm({
        name: "",
        nameEn: "",
        nameAr: "",
        nameKu: "",
        logo: "",
        address: "",
        addressEn: "",
        addressAr: "",
        addressKu: "",
        phone: "",
        whatsapp: "",
        facebook: "",
        instagram: "",
        tiktok: "",
        snapchat: "",
        googleMaps: "",
        appleMaps: "",
        waze: "",
        description: "",
        descriptionEn: "",
        descriptionAr: "",
        descriptionKu: "",
        isVip: false,
        storeTypeId: "",
        storecity: "Erbil",
        branches: [],
        show: true,
        showingOnStoreBranchShowcase: true,
        expireDate: "",
        statusAll: "on",
        isHasDelivery: false,
        deliveryAllCities: false,
        deliveryCities: [],
      });
      setSelectedStoreLogo(null);
      fetchStores(); // Refresh stores list
    } catch (err) {
      setMessage({
        type: "error",
        text: t("Failed to create store. Please try again."),
      });
      console.error("Error creating store:", err);
    } finally {
      setLoading(false);
      setUploadLoading(false);
    }
  };
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const storeTargets = [];
      const missingTypeNames = [];
      if (productForm.storeIds?.length) {
        for (const sid of productForm.storeIds) {
          const store = stores.find((s) => String(s._id) === String(sid));
          const typeId = getStoreTypeIdFromStore(store);
          if (!typeId) {
            missingTypeNames.push(store?.name || String(sid));
            continue;
          }
          storeTargets.push({ storeId: sid, storeTypeId: typeId });
        }
        if (missingTypeNames.length) {
          setMessage({
            type: "error",
            text: t(
              "These stores have no store type — edit each store first: {{names}}",
              {
                names: missingTypeNames.join(", "),
                defaultValue:
                  "These stores have no store type — edit each store first: {{names}}",
              },
            ),
          });
          setLoading(false);
          return;
        }
      }

      const prevPriceCreate = parseOptionalNonNegativePrice(
        productForm.previousPrice,
        "previousPrice",
      );
      if (!prevPriceCreate.ok) {
        setMessage({ type: "error", text: prevPriceCreate.msg });
        setLoading(false);
        return;
      }
      const newPriceCreate = parseOptionalNonNegativePrice(
        productForm.newPrice,
        "newPrice",
      );
      if (!newPriceCreate.ok) {
        setMessage({ type: "error", text: newPriceCreate.msg });
        setLoading(false);
        return;
      }

      let imageUrl = "";
      if (selectedProductImage) {
        setUploadLoading(true);
        imageUrl = await uploadProductImage(
          selectedProductImage,
          productForm.expireDate,
        );
        setUploadLoading(false);
      }

      const basePayload = {
        name: productForm.name,
        nameEn: productForm.nameEn,
        nameAr: productForm.nameAr,
        nameKu: productForm.nameKu,
        description: productForm.description,
        descriptionEn: productForm.descriptionEn,
        descriptionAr: productForm.descriptionAr,
        descriptionKu: productForm.descriptionKu,
        ...(imageUrl ? { image: imageUrl } : {}),
        previousPrice: prevPriceCreate.value ?? null,
        newPrice: newPriceCreate.value ?? null,
        isDiscount: productForm.isDiscount,
        barcode: productForm.barcode || null,
        weight: productForm.weight || null,
        expireDate: normalizeExpiryInputForApi(productForm.expireDate),
        brandId: productForm.brandId || null,
        companyId: productForm.companyId || null,
        ...(productForm.categoryId
          ? {
              categoryId: productForm.categoryId,
              ...(productForm.categoryTypeId
                ? { categoryTypeId: productForm.categoryTypeId }
                : {}),
            }
          : {}),
        status: productForm.status || "published",
      };

      let created = 0;
      if (storeTargets.length === 0) {
        await productAPI.create(basePayload);
        created = 1;
      } else {
        for (const { storeId, storeTypeId } of storeTargets) {
          await productAPI.create({
            ...basePayload,
            storeId,
            storeTypeId,
          });
          created += 1;
        }
      }

      setMessage({
        type: "success",
        text:
          created > 1
            ? t("Created {{count}} product(s).", {
                count: created,
                defaultValue: "Created {{count}} product(s).",
              })
            : t("Product created successfully!"),
      });
      setProductForm({
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
        storeIds: [],
        brandId: "",
        companyId: "",
        categoryId: "",
        categoryTypeId: "",
        status: "published",
        expireDate: "",
      });
      setSelectedProductImage(null);
      if (productImageFileRef.current) {
        productImageFileRef.current.value = "";
      }
      fetchProducts(selectedStoreFilter);
    } catch (err) {
      setMessage({
        type: "error",
        text: t("Failed to create product. Please try again."),
      });
      console.error("Error creating product:", err);
    } finally {
      setLoading(false);
      setUploadLoading(false);
    }
  };

  const handleProductGroupRowFieldChange = (rowId, field, value) => {
    setProductGroupRows((rows) =>
      rows.map((r) => {
        if (r.id !== rowId) return r;
        const next = { ...r, [field]: value };
        if (field === "categoryId") {
          next.categoryTypeId = "";
          if (value) {
            categoryAPI
              .getTypes(value)
              .then((res) => {
                setCategoryTypesByCategoryId((prev) => ({
                  ...prev,
                  [value]: res.data || [],
                }));
              })
              .catch(() => {
                setCategoryTypesByCategoryId((prev) => ({
                  ...prev,
                  [value]: [],
                }));
              });
          }
        }
        return next;
      }),
    );
  };

  const handleProductGroupSubmit = async () => {
    setMessage({ type: "", text: "" });
    const storeTargets = [];
    const missingTypeNames = [];
    if (groupAddStoreIds.length) {
      for (const sid of groupAddStoreIds) {
        const store = stores.find((s) => String(s._id) === String(sid));
        const typeId = getStoreTypeIdFromStore(store);
        if (!typeId) {
          missingTypeNames.push(store?.name || String(sid));
          continue;
        }
        storeTargets.push({ storeId: sid, storeTypeId: typeId });
      }
      if (missingTypeNames.length) {
        setMessage({
          type: "error",
          text: t(
            "These stores have no store type — edit each store and assign a store type first: {{names}}",
            {
              names: missingTypeNames.join(", "),
              defaultValue:
                "These stores have no store type — edit each store and assign a store type first: {{names}}",
            },
          ),
        });
        return;
      }
    }
    const toCreate = productGroupRows.filter((r) =>
      String(r.name || "").trim(),
    );
    if (toCreate.length === 0) {
      setMessage({
        type: "error",
        text: t("Add at least one row with a product name.", {
          defaultValue: "Add at least one row with a product name.",
        }),
      });
      return;
    }
    for (const row of toCreate) {
      const pp = parseOptionalNonNegativePrice(row.previousPrice, "previousPrice");
      if (!pp.ok) {
        setMessage({
          type: "error",
          text: `${String(row.name).trim()}: ${pp.msg}`,
        });
        return;
      }
      const np = parseOptionalNonNegativePrice(row.newPrice, "newPrice");
      if (!np.ok) {
        setMessage({
          type: "error",
          text: `${String(row.name).trim()}: ${np.msg}`,
        });
        return;
      }
    }
    setGroupAddLoading(true);
    let created = 0;
    try {
      for (const row of toCreate) {
        let imageUrl = "";
        if (row.imageFile) {
          imageUrl = await uploadProductImage(
            row.imageFile,
            groupAddExpireDate,
          );
        }
        const targets =
          storeTargets.length > 0
            ? storeTargets
            : [{ storeId: undefined, storeTypeId: undefined }];
        for (const { storeId, storeTypeId } of targets) {
          const ppRow = parseOptionalNonNegativePrice(
            row.previousPrice,
            "previousPrice",
          );
          const npRow = parseOptionalNonNegativePrice(row.newPrice, "newPrice");
          const productData = {
            name: String(row.name).trim(),
            previousPrice: ppRow.value ?? null,
            newPrice: npRow.value ?? null,
            isDiscount: !!row.isDiscount,
            expireDate: normalizeExpiryInputForApi(groupAddExpireDate),
            brandId: row.brandId || null,
            companyId: row.companyId || null,
            ...(row.categoryId
              ? {
                  categoryId: row.categoryId,
                  ...(row.categoryTypeId
                    ? { categoryTypeId: row.categoryTypeId }
                    : {}),
                }
              : {}),
            ...(storeId && storeTypeId ? { storeId, storeTypeId } : {}),
            status: groupAddStatus || "published",
            ...(imageUrl ? { image: imageUrl } : {}),
          };
          await productAPI.create(productData);
          created += 1;
        }
      }
      setMessage({
        type: "success",
        text: t("Created {{count}} product(s).", {
          count: created,
          defaultValue: "Created {{count}} product(s).",
        }),
      });
      setProductGroupRows([makeProductGroupRow()]);
      setGroupAddStoreIds([]);
      setGroupAddExpireDate("");
      setGroupAddStatus("published");
      setProductGroupDialogOpen(false);
      fetchProducts(selectedStoreFilter);
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text:
          err?.response?.data?.message ||
          err?.message ||
          t("Failed to create some products.", {
            defaultValue: "Failed to create some products.",
          }),
      });
    } finally {
      setGroupAddLoading(false);
    }
  };

  const prefetchCategoryTypesForEditGroup = (categoryId) => {
    if (!categoryId) return;
    categoryAPI
      .getTypes(categoryId)
      .then((res) => {
        setCategoryTypesByCategoryId((prev) => ({
          ...prev,
          [categoryId]: res.data || [],
        }));
      })
      .catch(() => {
        setCategoryTypesByCategoryId((prev) => ({
          ...prev,
          [categoryId]: [],
        }));
      });
  };

  const handleEditGroupRowFieldChange = (rowId, field, value) => {
    setEditGroupRows((rows) =>
      rows.map((r) => {
        if (r.id !== rowId) return r;
        const next = { ...r, [field]: value };
        if (field === "categoryId") {
          next.categoryTypeId = "";
          if (value) prefetchCategoryTypesForEditGroup(value);
        }
        return next;
      }),
    );
  };

  const closeEditGroupDialog = () => {
    setEditGroupDialogOpen(false);
    setEditGroupRows([]);
  };

  const handleOpenEditGroupDialog = () => {
    const idSet = new Set(selectedProductIds.map((id) => String(id)));
    if (idSet.size === 0) {
      setMessage({
        type: "warning",
        text: t("Select one or more products in the table first.", {
          defaultValue: "Select one or more products in the table first.",
        }),
      });
      return;
    }
    const selected = products.filter((p) => idSet.has(String(p._id)));
    if (selected.length === 0) {
      setMessage({
        type: "warning",
        text: t(
          "Selected products could not be found. Refresh the list and try again.",
          {
            defaultValue:
              "Selected products could not be found. Refresh the list and try again.",
          },
        ),
      });
      return;
    }
    const rows = selected.map((p) => makeEditGroupRowFromProduct(p));
    rows.forEach((row) => {
      if (row.categoryId) prefetchCategoryTypesForEditGroup(row.categoryId);
    });
    setEditGroupRows(rows);
    setEditGroupDialogOpen(true);
  };

  const handleEditGroupSubmit = async () => {
    setMessage({ type: "", text: "" });
    const toSave = editGroupRows.filter((r) => String(r.name || "").trim());
    if (toSave.length === 0) {
      setMessage({
        type: "error",
        text: t("Each row must have a product name before saving.", {
          defaultValue: "Each row must have a product name before saving.",
        }),
      });
      return;
    }
    setEditGroupLoading(true);
    let updated = 0;
    try {
      for (const row of toSave) {
        const ppEdit = parseOptionalNonNegativePrice(
          row.previousPrice,
          "previousPrice",
        );
        if (!ppEdit.ok) {
          setMessage({
            type: "error",
            text: `${String(row.name).trim()}: ${ppEdit.msg}`,
          });
          setEditGroupLoading(false);
          return;
        }
        const npEdit = parseOptionalNonNegativePrice(row.newPrice, "newPrice");
        if (!npEdit.ok) {
          setMessage({
            type: "error",
            text: `${String(row.name).trim()}: ${npEdit.msg}`,
          });
          setEditGroupLoading(false);
          return;
        }
        const effectiveStoreId = row.storeId || "";
        const storeDoc = effectiveStoreId
          ? stores.find((s) => String(s._id) === String(effectiveStoreId))
          : null;
        let storeTypeForRow =
          row.storeTypeId || getStoreTypeIdFromStore(storeDoc);
        if (effectiveStoreId && !storeTypeForRow) {
          setMessage({
            type: "error",
            text: t(
              "This store has no store type. Assign a store type on the store first.",
              {
                defaultValue:
                  "This store has no store type. Assign a store type on the store first.",
              },
            ),
          });
          setEditGroupLoading(false);
          return;
        }
        let imagePayload = {};
        if (row.imageFile) {
          const imageUrl = await uploadProductImage(
            row.imageFile,
            row.expireDate,
          );
          imagePayload = { image: imageUrl };
        } else if (row.currentImage) {
          imagePayload = { image: row.currentImage };
        }
        const categoryPayload = row.categoryId
          ? {
              categoryId: row.categoryId,
              categoryTypeId: row.categoryTypeId || "",
            }
          : { categoryId: "", categoryTypeId: "" };
        const payload = {
          name: String(row.name).trim(),
          previousPrice: ppEdit.value ?? null,
          newPrice: npEdit.value ?? null,
          isDiscount: !!row.isDiscount,
          expireDate: normalizeExpiryInputForApi(row.expireDate),
          brandId: row.brandId || null,
          companyId: row.companyId || null,
          storeId: effectiveStoreId || null,
          ...(storeTypeForRow ? { storeTypeId: storeTypeForRow } : {}),
          status: row.status || "published",
          ...categoryPayload,
          ...imagePayload,
        };
        await productAPI.update(row.productId, payload);
        updated += 1;
      }
      setMessage({
        type: "success",
        text: t("Updated {{count}} product(s).", {
          count: updated,
          defaultValue: "Updated {{count}} product(s).",
        }),
      });
      closeEditGroupDialog();
      fetchProducts(selectedStoreFilter);
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text:
          err?.response?.data?.message ||
          err?.message ||
          t("Failed to update some products.", {
            defaultValue: "Failed to update some products.",
          }),
      });
    } finally {
      setEditGroupLoading(false);
    }
  };

  const handleGiftSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    if (!selectedGiftImage) {
      setMessage({
        type: "error",
        text: t("Please select an image file."),
      });
      setLoading(false);
      return;
    }

    if (!giftForm.description.trim()) {
      setMessage({
        type: "error",
        text: t("Please enter a description."),
      });
      setLoading(false);
      return;
    }

    if (!giftForm.storeId || giftForm.storeId.length === 0) {
      setMessage({
        type: "error",
        text: t("Please select at least one store."),
      });
      setLoading(false);
      return;
    }

    try {
      setUploadLoading(true);
      const imageUrl = await uploadGiftImage(selectedGiftImage);
      setUploadLoading(false);

      const giftData = {
        ...giftForm,
        image: imageUrl,
        storeId: giftForm.storeId,
        brandId: giftForm.brandId || null,
        productId: giftForm.productId || null,
        expireDate: normalizeExpiryInputForApi(giftForm.expireDate),
      };

      await giftAPI.create(giftData);
      setMessage({ type: "success", text: t("Gift created successfully!") });
      setGiftForm({
        image: "",
        description: "",
        descriptionEn: "",
        descriptionAr: "",
        descriptionKu: "",
        storeId: [],
        brandId: "",
        companyId: "",
        productId: "",
        expireDate: "",
      });
      setSelectedGiftImage(null);
      if (giftImageFileRef.current) {
        giftImageFileRef.current.value = "";
      }
      fetchGifts();
    } catch (err) {
      setMessage({
        type: "error",
        text: t("Failed to create gift. Please try again."),
      });
      console.error("Error creating gift:", err);
    } finally {
      setLoading(false);
      setUploadLoading(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    if (!categoryForm.name.trim()) {
      setMessage({
        type: "error",
        text: t("Please enter a category name."),
      });
      setLoading(false);
      return;
    }

    if (
      !categoryForm.types ||
      categoryForm.types.length === 0 ||
      categoryForm.types.every(
        (type) => !normalizeCategoryTypeRow(type).name.trim(),
      )
    ) {
      setMessage({
        type: "error",
        text: t("Please enter at least one category type."),
      });
      setLoading(false);
      return;
    }

    try {
      const validTypes = categoryForm.types
        .map(normalizeCategoryTypeRow)
        .filter((row) => row.name.trim() !== "")
        .map((row) => ({
          name: row.name.trim(),
          nameEn: row.nameEn?.trim() || "",
          nameAr: row.nameAr?.trim() || "",
          nameKu: row.nameKu?.trim() || "",
          description: row.description?.trim() || "",
          descriptionEn: row.descriptionEn?.trim() || "",
          descriptionAr: row.descriptionAr?.trim() || "",
          descriptionKu: row.descriptionKu?.trim() || "",
        }));

      const categoryData = {
        name: categoryForm.name.trim(),
        nameEn: categoryForm.nameEn?.trim() || "",
        nameAr: categoryForm.nameAr?.trim() || "",
        nameKu: categoryForm.nameKu?.trim() || "",
        description: categoryForm.description?.trim() || "",
        descriptionEn: categoryForm.descriptionEn?.trim() || "",
        descriptionAr: categoryForm.descriptionAr?.trim() || "",
        descriptionKu: categoryForm.descriptionKu?.trim() || "",
        storeTypeId: categoryForm.storeTypeId || "",
        types: validTypes,
      };

      await categoryAPI.create(categoryData);
      setMessage({
        type: "success",
        text: t("Category created successfully!"),
      });
      setCategoryForm({
        name: "",
        nameEn: "",
        nameAr: "",
        nameKu: "",
        description: "",
        descriptionEn: "",
        descriptionAr: "",
        descriptionKu: "",
        storeTypeId: "",
        types: [emptyCategoryTypeRow()],
      });
      fetchCategories();
    } catch (err) {
      setMessage({
        type: "error",
        text: t("Failed to create category. Please try again."),
      });
      console.error("Error creating category:", err);
    } finally {
      setLoading(false);
    }
  };

  // Open edit dialog and set form data
  const handleEditOpen = (type, data) => {
    if (type === "brand" || type === "company") {
      setEditForm({
        name: data.name,
        nameEn: data.nameEn || "",
        nameAr: data.nameAr || "",
        nameKu: data.nameKu || "",
        logo: data.logo,
        address: data.address,
        addressEn: data.addressEn || "",
        addressAr: data.addressAr || "",
        addressKu: data.addressKu || "",
        phone: data.contactInfo?.phone || data.phone || "",
        whatsapp: data.contactInfo?.whatsapp || "",
        facebook: data.contactInfo?.facebook || "",
        instagram: data.contactInfo?.instagram || "",
        tiktok: data.contactInfo?.tiktok || "",
        snapchat: data.contactInfo?.snapchat || "",
        googleMaps: data.locationInfo?.googleMaps || "",
        appleMaps: data.locationInfo?.appleMaps || "",
        waze: data.locationInfo?.waze || "",
        isVip: !!data.isVip,
        brandTypeId:
          (data.brandTypeId && data.brandTypeId._id) || data.brandTypeId || "",
        description: data.description || "",
        descriptionEn: data.descriptionEn || "",
        descriptionAr: data.descriptionAr || "",
        descriptionKu: data.descriptionKu || "",
        expireDate: data.expireDate
          ? toDatetimeLocalValue(data.expireDate)
          : "",
        statusAll: data.statusAll === "off" ? "off" : "on",
        storecity: data.storecity || "Erbil",
        isHasDelivery: !!data.isHasDelivery,
        deliveryAllCities: !!data.deliveryAllCities,
        deliveryCities: Array.isArray(data.deliveryCities)
          ? data.deliveryCities
          : [],
      });
    } else if (type === "store") {
      setEditForm({
        name: data.name,
        nameEn: data.nameEn || "",
        nameAr: data.nameAr || "",
        nameKu: data.nameKu || "",
        logo: data.logo,
        address: data.address,
        addressEn: data.addressEn || "",
        addressAr: data.addressAr || "",
        addressKu: data.addressKu || "",
        phone: data.contactInfo?.phone || data.phone || "",
        whatsapp: data.contactInfo?.whatsapp || "",
        facebook: data.contactInfo?.facebook || "",
        instagram: data.contactInfo?.instagram || "",
        tiktok: data.contactInfo?.tiktok || "",
        snapchat: data.contactInfo?.snapchat || "",
        googleMaps: data.locationInfo?.googleMaps || "",
        appleMaps: data.locationInfo?.appleMaps || "",
        waze: data.locationInfo?.waze || "",
        isVip: !!data.isVip,
        storeTypeId:
          (data.storeTypeId && data.storeTypeId._id) || data.storeTypeId || "",
        storecity: data.storecity || "Erbil",
        description: data.description || "",
        descriptionEn: data.descriptionEn || "",
        descriptionAr: data.descriptionAr || "",
        descriptionKu: data.descriptionKu || "",
        branches: branchesFromApiToForm(data.branches, stores),
        show: data.show !== undefined ? data.show : true,
        showingOnStoreBranchShowcase:
          data.showingOnStoreBranchShowcase !== undefined
            ? !!data.showingOnStoreBranchShowcase
            : true,
        expireDate: data.expireDate
          ? toDatetimeLocalValue(data.expireDate)
          : "",
        lastReleaseDiscountDate: data.lastReleaseDiscountDate
          ? new Date(data.lastReleaseDiscountDate).toISOString().split("T")[0]
          : "",
        statusAll: data.statusAll === "off" ? "off" : "on",
        isHasDelivery: !!data.isHasDelivery,
        deliveryAllCities: !!data.deliveryAllCities,
        deliveryCities: Array.isArray(data.deliveryCities)
          ? data.deliveryCities
          : [],
      });
    } else if (type === "category") {
      const rawStoreTypeId =
        (data.storeTypeId && data.storeTypeId._id) || data.storeTypeId || "";
      setEditForm({
        name: data.name || "",
        nameEn: data.nameEn || "",
        nameAr: data.nameAr || "",
        nameKu: data.nameKu || "",
        description: data.description || "",
        descriptionEn: data.descriptionEn || "",
        descriptionAr: data.descriptionAr || "",
        descriptionKu: data.descriptionKu || "",
        storeTypeId: rawStoreTypeId != null ? String(rawStoreTypeId) : "",
        types: Array.isArray(data.types)
          ? data.types.map((t) => normalizeCategoryTypeRow(t))
          : [emptyCategoryTypeRow()],
      });
    } else if (type === "product") {
      const productCategoryId = data.categoryId?._id || data.categoryId || "";
      setEditForm({
        name: data.name,
        nameEn: data.nameEn || "",
        nameAr: data.nameAr || "",
        nameKu: data.nameKu || "",
        image: data.image,
        previousPrice: data.previousPrice,
        newPrice: data.newPrice,
        isDiscount: data.isDiscount || false,
        description: data.description || "",
        descriptionEn: data.descriptionEn || "",
        descriptionAr: data.descriptionAr || "",
        descriptionKu: data.descriptionKu || "",
        barcode: data.barcode || "",
        weight: data.weight || "",
        storeId: data.storeId?._id || data.storeId,
        brandId: data.brandId?._id || data.brandId,
        companyId: data.companyId?._id || data.companyId || "",
        categoryId: productCategoryId,
        categoryTypeId: data.categoryTypeId,
        storeTypeId: data.storeTypeId?._id || data.storeTypeId || "",
        status: data.status || "published",
        expireDate: data.expireDate
          ? toDatetimeLocalValue(data.expireDate)
          : "",
      });
      fetchCategoryTypes(productCategoryId);
    } else if (type === "gift") {
      setEditForm({
        image: data.image,
        description: data.description || "",
        descriptionEn: data.descriptionEn || "",
        descriptionAr: data.descriptionAr || "",
        descriptionKu: data.descriptionKu || "",
        storeId: data.storeId?.map((m) => m._id) || data.storeId || [],
        brandId: data.brandId?._id || data.brandId || "",
        companyId: data.companyId?._id || data.companyId || "",
        productId: data.productId || "",
        expireDate: data.expireDate
          ? toDatetimeLocalValue(data.expireDate)
          : "",
      });
    } else if (type === "ad") {
      setEditForm({
        image: data.image || "",
        brandId: data.brandId?._id || data.brandId || "",
        companyId: data.companyId?._id || data.companyId || "",
        storeId: data.storeId?._id || data.storeId || "",
        giftId: data.giftId?._id || data.giftId || "",
        startDate: data.startDate
          ? new Date(data.startDate).toISOString().split("T")[0]
          : "",
        endDate: data.endDate
          ? new Date(data.endDate).toISOString().split("T")[0]
          : "",
        linkUrl: data.linkUrl || "",
        active: !!data.active,
        priority: data.priority ?? 0,
        pages:
          Array.isArray(data.pages) && data.pages.length
            ? data.pages
            : [data.page || "all"],
      });
    }

    setEditDialog({ open: true, type, data });
  };

  const updateEditCategoryTypeField = (index, partial) => {
    setEditForm((prev) => {
      const updated = [...(prev.types || [])].map(normalizeCategoryTypeRow);
      updated[index] = { ...updated[index], ...partial };
      return { ...prev, types: updated };
    });
  };

  const handleEditCategoryTypeChange = (index, value) => {
    updateEditCategoryTypeField(index, { name: value });
  };

  const addEditCategoryType = () => {
    setEditForm((prev) => ({
      ...prev,
      types: [
        ...(prev.types || []).map(normalizeCategoryTypeRow),
        emptyCategoryTypeRow(),
      ],
    }));
  };

  const removeEditCategoryType = (index) => {
    setEditForm((prev) => {
      const updated = [...(prev.types || [])];
      if (updated.length <= 1) return prev;
      updated.splice(index, 1);
      return { ...prev, types: updated };
    });
  };

  /** After enabling delivery, put the selected store/brand city first in delivery cities. */
  const mergeDeliveryCitiesWithStoreCityFirst = useCallback((prev) => {
    if (prev.deliveryAllCities) return prev;
    const city = prev.storecity;
    if (!city || typeof city !== "string") return prev;
    const list = Array.isArray(prev.deliveryCities)
      ? [...prev.deliveryCities]
      : [];
    const rest = list.filter((c) => c !== city);
    return { ...prev, deliveryCities: [city, ...rest] };
  }, []);

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === "pages" && typeof value === "string" ? value.split(",") : value;
    setEditForm((prev) => {
      const next = { ...prev, [name]: nextValue };
      if (name === "categoryId") {
        fetchCategoryTypes(value);
        next.categoryTypeId = "";
      }
      return next;
    });
  };

  const handleEditSave = async () => {
    try {
      setEditLoading(true);
      setMessage({ type: "", text: "" });

      if (
        editDialog.type === "store" ||
        editDialog.type === "brand" ||
        editDialog.type === "company"
      ) {
        if (
          editForm.isHasDelivery &&
          !editForm.deliveryAllCities &&
          (!editForm.deliveryCities || editForm.deliveryCities.length === 0)
        ) {
          setMessage({
            type: "error",
            text: t(
              "Select delivery cities or enable delivery for all cities.",
            ),
          });
          setEditLoading(false);
          return;
        }
      }

      if (editDialog.type === "brand" || editDialog.type === "company") {
        let logoUrl = editForm.logo;
        if (selectedEditImage) {
          logoUrl = await uploadBrandLogo(selectedEditImage);
        }
        const hasDel = !!editForm.isHasDelivery;
        const brandUpdateData = {
          ...editForm,
          logo: logoUrl,
          expireDate: normalizeExpiryInputForApi(editForm.expireDate),
          deliveryAllCities: hasDel ? !!editForm.deliveryAllCities : false,
          deliveryCities:
            hasDel && !editForm.deliveryAllCities
              ? editForm.deliveryCities || []
              : [],
          contactInfo: {
            phone: editForm.phone || "",
            whatsapp: editForm.whatsapp || "",
            facebook: editForm.facebook || "",
            instagram: editForm.instagram || "",
            tiktok: editForm.tiktok || "",
            snapchat: editForm.snapchat || "",
          },
          locationInfo: {
            googleMaps: editForm.googleMaps || "",
            appleMaps: editForm.appleMaps || "",
            waze: editForm.waze || "",
          },
        };
        await (editDialog.type === "company"
          ? companyAPI.update(editDialog.data._id, {
              ...brandUpdateData,
            })
          : brandAPI.update(editDialog.data._id, {
              ...brandUpdateData,
            }));
        setMessage({
          type: "success",
          text:
            editDialog.type === "company"
              ? t("Company updated successfully!")
              : t("Brand updated successfully!"),
        });
        if (editDialog.type === "company") fetchCompanies();
        else fetchBrands();
      } else if (editDialog.type === "store") {
        let logoUrl = editForm.logo;
        if (selectedEditImage) {
          logoUrl = await uploadStoreLogo(selectedEditImage);
        }
        const hasDel = !!editForm.isHasDelivery;
        const storeUpdateData = {
          ...editForm,
          logo: logoUrl,
          branches: branchesToApiPayload(editForm.branches, stores),
          expireDate: normalizeExpiryInputForApi(editForm.expireDate),
          deliveryAllCities: hasDel ? !!editForm.deliveryAllCities : false,
          deliveryCities:
            hasDel && !editForm.deliveryAllCities
              ? editForm.deliveryCities || []
              : [],
          contactInfo: {
            phone: editForm.phone || "",
            whatsapp: editForm.whatsapp || "",
            facebook: editForm.facebook || "",
            instagram: editForm.instagram || "",
            tiktok: editForm.tiktok || "",
            snapchat: editForm.snapchat || "",
          },
          locationInfo: {
            googleMaps: editForm.googleMaps || "",
            appleMaps: editForm.appleMaps || "",
            waze: editForm.waze || "",
          },
        };
        await storeAPI.update(editDialog.data._id, {
          ...storeUpdateData,
        });
        setMessage({
          type: "success",
          text: t("Store updated successfully!"),
        });
        fetchStores();
      } else if (editDialog.type === "category") {
        const prevTypes = editDialog.data?.types || [];
        const rawTypes = editForm.types || [];
        const validTypes = [];
        rawTypes.forEach((t, index) => {
          const row = normalizeCategoryTypeRow(t);
          const name = row.name.trim();
          if (!name) return;
          const prev = prevTypes[index];
          const base =
            prev && typeof prev === "object" && prev !== null
              ? { ...prev }
              : {};
          validTypes.push({
            ...base,
            name,
            nameEn: row.nameEn?.trim() || "",
            nameAr: row.nameAr?.trim() || "",
            nameKu: row.nameKu?.trim() || "",
            description: row.description?.trim() || base.description || "",
            descriptionEn: row.descriptionEn?.trim() || "",
            descriptionAr: row.descriptionAr?.trim() || "",
            descriptionKu: row.descriptionKu?.trim() || "",
          });
        });
        await categoryAPI.update(editDialog.data._id, {
          name: (editForm.name || "").trim(),
          nameEn: editForm.nameEn?.trim() || "",
          nameAr: editForm.nameAr?.trim() || "",
          nameKu: editForm.nameKu?.trim() || "",
          description: editForm.description?.trim() || "",
          descriptionEn: editForm.descriptionEn?.trim() || "",
          descriptionAr: editForm.descriptionAr?.trim() || "",
          descriptionKu: editForm.descriptionKu?.trim() || "",
          storeTypeId: editForm.storeTypeId || "",
          types: validTypes,
        });
        setMessage({
          type: "success",
          text: t("Category updated successfully!"),
        });
        fetchCategories();
      } else if (editDialog.type === "storeType") {
        // Save store type edit via API
        await fetch(`${API_URL}/api/store-types/${editForm._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: (editForm.name || "").trim(),
            icon: editForm.icon || "",
            nameEn: editForm.nameEn?.trim() || "",
            nameAr: editForm.nameAr?.trim() || "",
            nameKu: editForm.nameKu?.trim() || "",
          }),
        });
        const res = await storeTypeAPI.getAll();
        setStoreTypes(res.data || []);
        setMessage({
          type: "success",
          text: t("Store Type updated successfully!"),
        });
      } else if (editDialog.type === "brandType") {
        await brandTypeAPI.update(editDialog.data._id, {
          name: (editForm.name || "").trim(),
          icon: editForm.icon || "",
          nameEn: editForm.nameEn?.trim() || "",
          nameAr: editForm.nameAr?.trim() || "",
          nameKu: editForm.nameKu?.trim() || "",
        });
        const res = await brandTypeAPI.getAll();
        setBrandTypes(res.data || []);
        setMessage({
          type: "success",
          text: t("Brand Type updated successfully!"),
        });
      } else if (editDialog.type === "product") {
        const prevP = parseOptionalNonNegativePrice(
          editForm.previousPrice,
          "previousPrice",
        );
        if (!prevP.ok) {
          setMessage({ type: "error", text: prevP.msg });
          setEditLoading(false);
          return;
        }
        const newP = parseOptionalNonNegativePrice(
          editForm.newPrice,
          "newPrice",
        );
        if (!newP.ok) {
          setMessage({ type: "error", text: newP.msg });
          setEditLoading(false);
          return;
        }
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

        await productAPI.update(String(editDialog.data._id), productUpdateData);
        setMessage({
          type: "success",
          text: t("Product updated successfully!"),
        });
        fetchProducts(selectedStoreFilter);
      } else if (editDialog.type === "gift") {
        let imageUrl = editForm.image;
        if (selectedEditGiftImage) {
          imageUrl = await uploadGiftImage(selectedEditGiftImage);
        }

        const giftUpdateData = {
          ...editForm,
          image: imageUrl,
          storeId: editForm.storeId,
          brandId: editForm.brandId || null,
          productId: editForm.productId || null,
          expireDate: normalizeExpiryInputForApi(editForm.expireDate),
        };

        await giftAPI.update(editDialog.data._id, giftUpdateData);
        setMessage({
          type: "success",
          text: t("Gift updated successfully!"),
        });
        fetchGifts();
      } else if (editDialog.type === "ad") {
        let imageUrl = editForm.image;
        if (editAdImageFileRef?.current?.files?.[0]) {
          // reuse generic upload to /api/ads/upload-image via fetch for consistency
          setUploadLoading(true);
          const file = editAdImageFileRef.current.files[0];
          const formData = new FormData();
          formData.append("image", file);
          const resp = await fetch(`${API_URL}/api/ads/upload-image`, {
            method: "POST",
            body: formData,
          });
          if (!resp.ok) throw new Error("Failed to upload ad image");
          const data = await resp.json();
          imageUrl = data.url;
          setUploadLoading(false);
        }

        const adUpdate = {
          image: imageUrl,
          brandId: editForm.brandId || undefined,
          storeId: editForm.storeId || undefined,
          giftId: editForm.giftId || undefined,
          startDate: editForm.startDate
            ? new Date(editForm.startDate).toISOString()
            : undefined,
          endDate: editForm.endDate
            ? new Date(editForm.endDate).toISOString()
            : undefined,
          linkUrl: editForm.linkUrl || "",
          active: !!editForm.active,
          priority: Number(editForm.priority) || 0,
          pages: (Array.isArray(editForm.pages) && editForm.pages.length
            ? editForm.pages
            : [editForm.page || "all"]
          ).map((p) => String(p).toLowerCase()),
        };

        await adAPI.update(editDialog.data._id, adUpdate);
        setMessage({ type: "success", text: t("Ad updated successfully!") });
        fetchAds();
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: t("Failed to update. Please try again."),
      });
      console.error("Error updating:", err);
    } finally {
      setEditLoading(false);
      setEditDialog({ open: false, type: "", data: null });
      setSelectedEditImage(null);
    }
  };

  const handleDeleteBrandConfirm = async () => {
    setDeleteLoading(true);
    try {
      if (deleteDialog.type === "brand") {
        await brandAPI.delete(deleteDialog.data._id);
        setMessage({
          type: "success",
          text: t("Brand deleted successfully!"),
        });
        fetchBrands();
        fetchProducts(selectedStoreFilter); // Refresh products as some might be deleted
      } else if (deleteDialog.type === "company") {
        await companyAPI.delete(deleteDialog.data._id);
        setMessage({
          type: "success",
          text: t("Company deleted successfully!"),
        });
        fetchCompanies();
        fetchProducts(selectedStoreFilter);
      } else if (deleteDialog.type === "product") {
        await productAPI.delete(deleteDialog.data._id);
        setMessage({
          type: "success",
          text: t("Product deleted successfully!"),
        });
        fetchProducts(selectedStoreFilter);
      } else if (deleteDialog.type === "gift") {
        await giftAPI.delete(deleteDialog.data._id);
        setMessage({
          type: "success",
          text: t("Gift deleted successfully!"),
        });
        fetchGifts();
      } else if (deleteDialog.type === "ad") {
        await adAPI.delete(deleteDialog.data._id);
        setMessage({ type: "success", text: t("Ad deleted successfully!") });
        fetchAds();
      } else if (deleteDialog.type === "video") {
        await videoAPI.delete(deleteDialog.data._id);
        setMessage({ type: "success", text: t("Reel deleted successfully!") });
        fetchReels();
      } else if (deleteDialog.type === "job") {
        await jobAPI.delete(deleteDialog.data._id);
        setMessage({ type: "success", text: t("Job deleted successfully!") });
        fetchJobs();
      }
      setDeleteDialog({ open: false, type: "", data: null });
    } catch (err) {
      console.log("Full error from backend:", err);
      console.log("Error response object:", err.response);
      let errorMsg = t("Failed to delete. Please try again.");
      if (
        err.response?.data?.msg ===
        "Cannot delete brand. It has associated products. Please delete the products first."
      ) {
        errorMsg = t(
          "Cannot delete brand. It has associated products. Please delete the products first.",
        );
      }
      setMessage({
        type: "error",
        text: errorMsg,
      });
      console.error("Error deleting:", err);
    } finally {
      setDeleteLoading(false);
    }
  };
  const handleDeleteCategoryConfirm = async () => {
    setDeleteLoading(true);
    try {
      await categoryAPI.delete(deleteDialog.data._id);
      setMessage({
        type: "success",
        text: t("Category deleted successfully!"),
      });
      fetchCategories();
    } catch (e) {
      setMessage({ type: "error", text: t("Failed to delete category.") });
    } finally {
      setDeleteLoading(false);
      setDeleteDialog({ open: false, type: "", data: null });
    }
  };
  const handleDeleteStoreTypeConfirm = async () => {
    setDeleteLoading(true);
    try {
      await fetch(`${API_URL}/api/store-types/${deleteDialog.data._id}`, {
        method: "DELETE",
      });
      const res = await storeTypeAPI.getAll();
      setStoreTypes(res.data || []);
      setMessage({
        type: "success",
        text: t("Store Type deleted successfully!"),
      });
    } catch (e) {
      setMessage({ type: "error", text: t("Failed to delete store type.") });
    } finally {
      setDeleteLoading(false);
      setDeleteDialog({ open: false, type: "", data: null });
    }
  };
  const handleDeleteStoreConfirm = async () => {
    setDeleteLoading(true);
    try {
      if (deleteDialog.type === "store") {
        await storeAPI.delete(deleteDialog.data._id);
        setMessage({
          type: "success",
          text: t("Store deleted successfully!"),
        });
        fetchStores();
        fetchProducts(selectedStoreFilter); // Refresh products as some might be deleted
      } else if (deleteDialog.type === "product") {
        await productAPI.delete(deleteDialog.data._id);
        setMessage({
          type: "success",
          text: t("Product deleted successfully!"),
        });
        fetchProducts(selectedStoreFilter);
      } else if (deleteDialog.type === "gift") {
        await giftAPI.delete(deleteDialog.data._id);
        setMessage({
          type: "success",
          text: t("Gift deleted successfully!"),
        });
        fetchGifts();
      } else if (deleteDialog.type === "ad") {
        await adAPI.delete(deleteDialog.data._id);
        setMessage({ type: "success", text: t("Ad deleted successfully!") });
        fetchAds();
      } else if (deleteDialog.type === "video") {
        await videoAPI.delete(deleteDialog.data._id);
        setMessage({ type: "success", text: t("Reel deleted successfully!") });
        fetchReels();
      }
      setDeleteDialog({ open: false, type: "", data: null });
    } catch (err) {
      console.log("Full error from backend:", err);
      console.log("Error response object:", err.response);
      let errorMsg = t("Failed to delete. Please try again.");
      if (
        err.response?.data?.msg ===
        "Cannot delete store. It has associated products. Please delete the products first."
      ) {
        errorMsg = t(
          "Cannot delete store. It has associated products. Please delete the products first.",
        );
      }
      setMessage({
        type: "error",
        text: errorMsg,
      });
      console.error("Error deleting:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCategoryFormChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateCategoryFormTypeField = (index, partial) => {
    setCategoryForm((prev) => {
      const newTypes = [...prev.types].map(normalizeCategoryTypeRow);
      newTypes[index] = { ...newTypes[index], ...partial };
      return { ...prev, types: newTypes };
    });
  };

  const handleCategoryTypeChange = (index, value) => {
    updateCategoryFormTypeField(index, { name: value });
  };

  const addCategoryType = () => {
    setCategoryForm((prev) => ({
      ...prev,
      types: [
        ...prev.types.map(normalizeCategoryTypeRow),
        emptyCategoryTypeRow(),
      ],
    }));
  };

  const removeCategoryType = (index) => {
    setCategoryForm((prev) => ({
      ...prev,
      types: prev.types.filter((_, i) => i !== index),
    }));
  };

  const handleTranslateMissingProductLocales = async () => {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      t(
        "Fill missing English, Arabic, and Kurdish names from each product's primary name using Google Translate? Rows that already have an English name are skipped.",
      ),
    );
    if (!confirmed) return;
    setTranslateMissingLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const { data } = await adminAPI.translateMissingProducts();
      if (!data?.success) {
        setMessage({
          type: "error",
          text: data?.message || t("Translation failed."),
        });
        return;
      }
      await fetchProducts(selectedStoreFilter);
      const lines = [
        t("Translated: {{count}} products.", { count: data.updated || 0 }),
        t("Failed: {{count}}.", { count: data.failed || 0 }),
        t("Products that already had English (unchanged): {{count}}.", {
          count: data.skippedAlreadyTranslated ?? 0,
        }),
      ];
      setMessage({
        type: data.failed ? "warning" : "success",
        text: lines.join("\n"),
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t("Translation request failed.");
      setMessage({ type: "error", text: msg });
    } finally {
      setTranslateMissingLoading(false);
    }
  };

  const handleDeleteExpiredDiscountProducts = async () => {
    try {
      // Find expired discount products first
      const expiredDiscountProducts = products.filter((product) => {
        if (!product.isDiscount || !product.expireDate) return false;
        return !isExpiryStillValid(product.expireDate);
      });

      if (expiredDiscountProducts.length === 0) {
        setMessage({
          type: "info",
          text: t("No expired discount products found."),
        });
        return;
      }

      // Show confirmation dialog with count
      const confirmed = window.confirm(
        t(
          "Are you sure you want to delete {{count}} expired discount products? This action cannot be undone.",
          { count: expiredDiscountProducts.length },
        ),
      );

      if (!confirmed) return;

      setDeleteExpiredLoading(true);

      // Delete expired discount products
      let deletedCount = 0;
      for (const product of expiredDiscountProducts) {
        try {
          await productAPI.delete(product._id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete product ${product._id}:`, error);
        }
      }

      // Refresh products list
      await fetchProducts(selectedStoreFilter);

      setMessage({
        type: "success",
        text: t("Successfully deleted {{count}} expired discount products.", {
          count: deletedCount,
        }),
      });
    } catch (error) {
      console.error("Error deleting expired discount products:", error);
      setMessage({
        type: "error",
        text: t(
          "Failed to delete expired discount products. Please try again.",
        ),
      });
    } finally {
      setDeleteExpiredLoading(false);
    }
  };

  const currentPageProducts = filteredProducts.slice(
    productsPage * rowsPerPage,
    productsPage * rowsPerPage + rowsPerPage,
  );
  const allPageSelected =
    currentPageProducts.length > 0 &&
    currentPageProducts.every((p) => selectedProductIds.includes(p._id));
  const somePageSelected =
    currentPageProducts.some((p) => selectedProductIds.includes(p._id)) &&
    !allPageSelected;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        minHeight: "100vh",
        boxSizing: "border-box",
        py: { xs: 8, sm: 9, md: 10 },
        px: { xs: 1, sm: 2, md: 3 },
        bgcolor:
          theme.palette.mode === "dark"
            ? "rgba(13,17,28,1)"
            : "rgba(248,249,252,1)",
      }}
    >
      <Snackbar
        open={!!message.text}
        autoHideDuration={9000}
        onClose={() => setMessage({ type: "", text: "" })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setMessage({ type: "", text: "" })}
          severity={message.type || "info"}
          variant="filled"
          sx={{ width: "100%", whiteSpace: "pre-line" }}
        >
          {message.text}
        </Alert>
      </Snackbar>
      {/* Enhanced Admin Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: 4,
          overflow: "hidden",
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #FFA94D 0%, #FF7A1A 100%)"
              : "linear-gradient(135deg, #1E6FD9 0%, #4A90E2 100%)",
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 12px 40px rgba(0,0,0,0.3)"
              : "0 12px 40px rgba(0,0,0,0.1)",
        }}
      >
        <Box sx={{ p: 4, color: "white", position: "relative" }}>
          <Grid spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    mr: 3,
                    background: "linear-gradient(135deg, #ffffff20, #ffffff40)",
                    backdropFilter: "blur(10px)",
                    border: "3px solid rgba(255,255,255,0.3)",
                  }}
                >
                  <DashboardIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Box>
                  <Typography
                    variant="h2"
                    component="h1"
                    gutterBottom
                    sx={{
                      color: "white",
                      fontWeight: 700,
                      fontSize: { xs: "2rem", md: "2.5rem" },
                      textShadow: "0 4px 8px rgba(0,0,0,0.3)",
                      mb: 1,
                    }}
                  >
                    {t("Admin Dashboard")}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: "white",
                      opacity: 0.9,
                      fontSize: "1.125rem",
                      textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    {t("Manage stores and products efficiently")}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                display="flex"
                gap={2}
                justifyContent={{ xs: "center", md: "flex-end" }}
              >
                <Chip
                  icon={<StoreIcon />}
                  label={`${t("Stores")}(${stores.length})`}
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    color: "white",
                    fontWeight: 600,
                    backdropFilter: "blur(10px)",
                  }}
                />
                <Chip
                  icon={<InventoryIcon />}
                  label={`${t("Products")}(${filteredProducts.length}) `}
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    color: "white",
                    fontWeight: 600,
                    backdropFilter: "blur(10px)",
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Enhanced Tabs */}

      {/* NEW: Tabbed section for lists */}
      <Card
        elevation={0}
        sx={{
          mt: 5,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 4px 28px rgba(0,0,0,0.5)"
              : "0 2px 14px rgba(0,0,0,0.08)",
          "& .MuiTableContainer-root": {
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            overflowX: "auto",
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.03)"
                : undefined,
          },
          "& .MuiTable-root": {
            minWidth: { xs: 980, sm: "100%" },
          },
          "& .MuiTableBody .MuiTableRow-root:nth-of-type(even)": {
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.02)",
          },
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ sm: "center" }}
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.02em",
                mb: 0,
                ...(theme.palette.mode === "dark"
                  ? {
                      background:
                        "linear-gradient(135deg, #b8d9ff 0%, #6ba8f5 45%, #4A90E2 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }
                  : {
                      background:
                        "linear-gradient(135deg, #FFA94D 0%, #FF7A1A 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }),
              }}
            >
              {t("Data Lists")}
            </Typography>
            <Button
              component={Link}
              to="/pending"
              variant="outlined"
              size="small"
              sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
            >
              {t("Pending reviews", { defaultValue: "Pending reviews" })}
            </Button>
          </Stack>
          <Box
            component="div"
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: { xs: 0.75, sm: 1 },
              mb: 2,
              py: 1.25,
              px: { xs: 1, sm: 1.5 },
              borderRadius: 2,
              border: "1px solid",
              borderColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.1)"
                  : "divider",
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.07)"
                  : "action.hover",
            }}
          >
            <Chip
              clickable
              size="small"
              label={t("adminTabGroupManaging")}
              color="primary"
              variant={
                adminDataListGroupActive.managing ? "filled" : "outlined"
              }
              onClick={() => setActiveListTab(LIST_TAB.STORES)}
              sx={{ fontWeight: 700, cursor: "pointer" }}
            />
            <Typography
              component="span"
              variant="body2"
              color="text.disabled"
              sx={{ lineHeight: 1, userSelect: "none" }}
            >
              ·
            </Typography>
            <Chip
              clickable
              size="small"
              label={t("adminTabGroupService")}
              color="primary"
              variant={adminDataListGroupActive.service ? "filled" : "outlined"}
              onClick={() => setActiveListTab(LIST_TAB.ADS)}
              sx={{ fontWeight: 700, cursor: "pointer" }}
            />
            <Typography
              component="span"
              variant="body2"
              color="text.disabled"
              sx={{ lineHeight: 1, userSelect: "none" }}
            >
              ·
            </Typography>
            <Chip
              clickable
              size="small"
              label={t("adminTabGroupMainSystem")}
              color="primary"
              variant={
                adminDataListGroupActive.mainSystem ? "filled" : "outlined"
              }
              onClick={() => setActiveListTab(LIST_TAB.CATEGORIES)}
              sx={{ fontWeight: 700, cursor: "pointer" }}
            />
            <Typography
              component="span"
              variant="body2"
              color="text.disabled"
              sx={{ lineHeight: 1, userSelect: "none" }}
            >
              ·
            </Typography>
            <Chip
              clickable
              size="small"
              label={t("adminTabGroupSettings")}
              color="primary"
              variant={
                adminDataListGroupActive.settings ? "filled" : "outlined"
              }
              onClick={() => setActiveListTab(LIST_TAB.SETTINGS)}
              sx={{ fontWeight: 700, cursor: "pointer" }}
            />
          </Box>
          <Tabs
            value={activeListTab}
            onChange={handleListTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant={
              dataListVisibleGroup === "managing" ? "scrollable" : "fullWidth"
            }
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              mb: 2,
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTabs-scroller": {
                overflowX: "auto !important",
              },
              "& .MuiTabs-flexContainer": {
                flexWrap: "nowrap",
              },
              "& .MuiTab-root": {
                minHeight: 48,
                color:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.58)"
                    : "text.secondary",
                "&.Mui-selected": {
                  color:
                    theme.palette.mode === "dark"
                      ? theme.palette.primary.light
                      : theme.palette.primary.main,
                  fontWeight: 700,
                },
              },
              "& .MuiTabScrollButton-root": {
                color: "text.secondary",
                ...(theme.palette.mode === "dark" && {
                  bgcolor: "rgba(255,255,255,0.06)",
                  borderRadius: 1,
                  "&.Mui-disabled": { opacity: 0.35 },
                }),
              },
            }}
          >
            {dataListVisibleGroup === "managing" && [
              <Tab
                key="stores"
                value={LIST_TAB.STORES}
                label={t("Stores")}
                icon={<StoreIcon />}
                iconPosition="start"
              />,
              <Tab
                key="brands"
                value={LIST_TAB.BRANDS}
                label={t("Brands")}
                icon={<BusinessIcon />}
                iconPosition="start"
              />,
              <Tab
                key="companies"
                value={LIST_TAB.COMPANIES}
                label={t("Companies")}
                icon={<BusinessIcon />}
                iconPosition="start"
              />,
              <Tab
                key="products"
                value={LIST_TAB.PRODUCTS}
                label={t("Products")}
                icon={<ShoppingCartIcon />}
                iconPosition="start"
              />,
              <Tab
                key="gifts"
                value={LIST_TAB.GIFTS}
                label={t("Gifts")}
                icon={<CardGiftcardIcon />}
                iconPosition="start"
              />,
              <Tab
                key="reels"
                value={LIST_TAB.REELS}
                label={t("Reels")}
                icon={<VideoLibraryIcon />}
                iconPosition="start"
              />,
            ]}
            {dataListVisibleGroup === "service" && [
              <Tab
                key="ads"
                value={LIST_TAB.ADS}
                label={t("Ads")}
                icon={<DashboardIcon />}
                iconPosition="start"
              />,
              <Tab
                key="jobs"
                value={LIST_TAB.JOBS}
                label={t("Jobs")}
                icon={<WorkOutlineIcon />}
                iconPosition="start"
              />,
            ]}
            {dataListVisibleGroup === "mainSystem" && [
              <Tab
                key="categories"
                value={LIST_TAB.CATEGORIES}
                label={t("Categories")}
                icon={<CategoryIcon />}
                iconPosition="start"
              />,
              <Tab
                key="storeTypes"
                value={LIST_TAB.STORE_TYPES}
                label={t("Store Types")}
                icon={<CategoryIcon />}
                iconPosition="start"
              />,
              <Tab
                key="brandTypes"
                value={LIST_TAB.BRAND_TYPES}
                label={t("Brand Types")}
                icon={<CategoryIcon />}
                iconPosition="start"
              />,
            ]}
            {dataListVisibleGroup === "settings" && [
              <Tab
                key="settings"
                value={LIST_TAB.SETTINGS}
                label={t("Settings")}
                icon={<SettingsIcon />}
                iconPosition="start"
              />,
              ...(canUseNotificationsTab
                ? [
                    <Tab
                      key="notifications"
                      value={LIST_TAB.NOTIFICATIONS}
                      label={t("Notifications")}
                      icon={<NotificationsActiveIcon />}
                      iconPosition="start"
                    />,
                  ]
                : []),
            ]}
          </Tabs>

          {/* Store List Panel */}
          {activeListTab === LIST_TAB.STORES && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: { xs: "flex-start", sm: "space-between" },
                  alignItems: "center",
                  gap: 1,
                  mb: 2,
                  ...DATA_LIST_TAB_TOOLBAR_SCROLL_SX,
                }}
              >
                <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setAddDialog({ open: true, type: "store" })}
                  >
                    {t("New Store")}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => setBulkDialog({ open: true, type: "store" })}
                  >
                    {t("Bulk Upload")}
                  </Button>
                </Box>
                <TextField
                  size="small"
                  label={t("Search by Store Name")}
                  value={storeNameSearch}
                  onChange={(e) => setStoreNameSearch(e.target.value)}
                  sx={{ minWidth: { xs: 180, sm: 260 }, flexShrink: 0 }}
                />
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("No.")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Name")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Logo")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Phone")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Store Type")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("City")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Description")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        VIP
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Status")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Status All")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Expire Contact")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStores
                      .slice(
                        storesPage * rowsPerPage,
                        storesPage * rowsPerPage + rowsPerPage,
                      )
                      .map((store, idx) => (
                        <TableRow key={store._id}>
                          <TableCell>
                            {storesPage * rowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell
                            width={200}
                            sx={{ fontSize: "18px", fontWeight: "bold" }}
                          >
                            {store.name}
                          </TableCell>
                          <TableCell>
                            {store.logo && (
                              <img
                                src={
                                  store.logo.startsWith("http")
                                    ? store.logo
                                    : `${API_URL}${store.logo}`
                                }
                                alt={store.name}
                                width={80}
                                height={80}
                                style={{
                                  objectFit: "cover",
                                  borderRadius: "4px",
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell>{store.phone}</TableCell>
                          <TableCell>
                            {store.storeTypeId?.icon || store.storeType?.icon
                              ? `${
                                  store.storeTypeId?.icon ||
                                  store.storeType?.icon
                                } `
                              : ""}
                            {t(
                              store.storeTypeId?.name ||
                                store.storeType?.name ||
                                "",
                            )}
                          </TableCell>
                          <TableCell>{store.storecity}</TableCell>
                          <TableCell
                            width="100px"
                            height="100px"
                            sx={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {store.description}
                          </TableCell>
                          <TableCell>
                            {store.isVip && (
                              <Box
                                sx={{
                                  backgroundColor: "#FFD700",
                                  borderRadius: "50%",
                                  width: 32,
                                  height: 32,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                  border: "2px solid #FFF",
                                  "&::before": {
                                    content: '"👑"',
                                    fontSize: "16px",
                                  },
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {store.show ? t("Visible") : t("Hidden")}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                store.statusAll === "off" ? t("off") : t("on")
                              }
                              color={
                                store.statusAll === "off" ? "error" : "success"
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {formatDisplayDate(store.expireDate)}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              color="primary"
                              onClick={() => handleEditOpen("store", store)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color={store.show ? "success" : "warning"}
                              onClick={async () => {
                                try {
                                  await storeAPI.toggleVisibility(store._id);
                                  // Refresh stores list
                                  fetchStores();
                                } catch (error) {
                                  console.error(
                                    "Error toggling store visibility:",
                                    error,
                                  );
                                }
                              }}
                              title={
                                store.show ? t("Hide Store") : t("Show Store")
                              }
                            >
                              {store.show ? (
                                <VisibilityIcon />
                              ) : (
                                <VisibilityOffIcon />
                              )}
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  type: "store",
                                  data: store,
                                })
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredStores.length}
                page={storesPage}
                onPageChange={handleStoresPageChange}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[10]}
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
                }
              />
            </Box>
          )}

          {/* Store Types List Panel */}
          {activeListTab === LIST_TAB.STORE_TYPES && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  mb: 2,
                  flexWrap: "nowrap",
                  ...DATA_LIST_TAB_TOOLBAR_SCROLL_SX,
                }}
              >
                <Typography variant="h6" sx={{ flexShrink: 0 }}>
                  {t("Store Types")}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setStoreTypeAddForm({ ...EMPTY_TYPE_ADD_FORM });
                    setAddDialog({ open: true, type: "storeType" });
                  }}
                  sx={{ flexShrink: 0 }}
                >
                  {t("Add Store Type")}
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("No.")}</TableCell>
                      <TableCell>{t("Name")}</TableCell>
                      <TableCell>{t("Icon")}</TableCell>
                      <TableCell>{t("Actions")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(storeTypes || []).map((st, idx) => (
                      <TableRow key={st._id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{st.name}</TableCell>
                        <TableCell style={{ fontSize: 18 }}>
                          {st.icon || "🏪"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ mr: 1 }}
                            onClick={() => {
                              setEditDialog({
                                open: true,
                                type: "storeType",
                                data: st,
                              });
                              setEditForm({
                                _id: st._id,
                                name: st.name,
                                icon: st.icon || "",
                                nameEn: st.nameEn || "",
                                nameAr: st.nameAr || "",
                                nameKu: st.nameKu || "",
                              });
                            }}
                          >
                            <EditIcon />
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                type: "storeType",
                                data: st,
                              })
                            }
                          >
                            <DeleteIcon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Brand Types List Panel */}
          {activeListTab === LIST_TAB.BRAND_TYPES && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  mb: 2,
                  flexWrap: "nowrap",
                  ...DATA_LIST_TAB_TOOLBAR_SCROLL_SX,
                }}
              >
                <Typography variant="h6" sx={{ flexShrink: 0 }}>
                  {t("Brand Types")}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setBrandTypeAddForm({ ...EMPTY_TYPE_ADD_FORM });
                    setAddDialog({ open: true, type: "brandType" });
                  }}
                  sx={{ flexShrink: 0 }}
                >
                  {t("Add Brand Type")}
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("No.")}</TableCell>
                      <TableCell>{t("Name")}</TableCell>
                      <TableCell>{t("Icon")}</TableCell>
                      <TableCell>{t("Actions")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(brandTypes || []).map((bt, idx) => (
                      <TableRow key={bt._id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{bt.name}</TableCell>
                        <TableCell style={{ fontSize: 18 }}>
                          {bt.icon || "🏷️"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ mr: 1 }}
                            onClick={() => {
                              setEditDialog({
                                open: true,
                                type: "brandType",
                                data: bt,
                              });
                              setEditForm({
                                _id: bt._id,
                                name: bt.name,
                                icon: bt.icon || "",
                                nameEn: bt.nameEn || "",
                                nameAr: bt.nameAr || "",
                                nameKu: bt.nameKu || "",
                              });
                            }}
                          >
                            <EditIcon />
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                type: "brandType",
                                data: bt,
                              })
                            }
                          >
                            <DeleteIcon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Settings Panel */}
          {activeListTab === LIST_TAB.SETTINGS && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {t("Contact Us Info")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t(
                  "Contact links shown in profile page. Fill only what you need.",
                )}
              </Typography>
              <Grid spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label={t("WhatsApp")}
                    value={settingsContactNumber}
                    onChange={(e) => {
                      setSettingsContactNumber(e.target.value);
                      setSettingsContactInfo((prev) => ({
                        ...prev,
                        whatsapp: e.target.value,
                      }));
                    }}
                    placeholder="+9647503683478"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label={t("Facebook")}
                    value={settingsContactInfo.facebook}
                    onChange={(e) =>
                      setSettingsContactInfo((prev) => ({
                        ...prev,
                        facebook: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label={t("Instagram")}
                    value={settingsContactInfo.instagram}
                    onChange={(e) =>
                      setSettingsContactInfo((prev) => ({
                        ...prev,
                        instagram: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label={t("Snapchat")}
                    value={settingsContactInfo.snapchat}
                    onChange={(e) =>
                      setSettingsContactInfo((prev) => ({
                        ...prev,
                        snapchat: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label={t("Gmail")}
                    value={settingsContactInfo.gmail}
                    onChange={(e) =>
                      setSettingsContactInfo((prev) => ({
                        ...prev,
                        gmail: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label={t("TikTok")}
                    value={settingsContactInfo.tiktok}
                    onChange={(e) =>
                      setSettingsContactInfo((prev) => ({
                        ...prev,
                        tiktok: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label={t("Viber")}
                    value={settingsContactInfo.viber}
                    onChange={(e) =>
                      setSettingsContactInfo((prev) => ({
                        ...prev,
                        viber: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label={t("Telegram")}
                    value={settingsContactInfo.telegram}
                    onChange={(e) =>
                      setSettingsContactInfo((prev) => ({
                        ...prev,
                        telegram: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={async () => {
                      try {
                        setMessage({ type: "", text: "" });
                        const num = settingsContactNumber.trim();
                        await settingsAPI.update(
                          {
                            contactWhatsAppNumber: num,
                            contactInfo: {
                              ...settingsContactInfo,
                              whatsapp: num,
                            },
                          },
                          getAuthHeaders(),
                        );
                        setContactWhatsAppNumber(num);
                        setContactInfo({
                          ...settingsContactInfo,
                          whatsapp: num,
                        });
                        await fetchSettings();
                        setMessage({
                          type: "success",
                          text: t("Settings saved successfully"),
                        });
                      } catch (err) {
                        setMessage({
                          type: "error",
                          text: t("Failed to save settings"),
                        });
                      }
                    }}
                  >
                    {t("Save Settings")}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Notifications Panel - Send to all users */}
          {activeListTab === LIST_TAB.NOTIFICATIONS &&
            canUseNotificationsTab && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t("Send Notification to All Users")}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {t(
                    "Compose a notification that will be sent to all users (both registered and anonymous).",
                  )}
                </Typography>
                <Grid spacing={2}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <TextField
                      fullWidth
                      label={t("Title")}
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      placeholder={t("e.g. New deals available!")}
                      required
                      sx={{ mb: 2 }}
                    />
                    <MultilingualFieldGroup
                      sectionLabel={t("Title (translations)")}
                      value={{
                        english: notificationTitleEn,
                        arabic: notificationTitleAr,
                        kurdish: notificationTitleKu,
                      }}
                      onValueChange={(v) => {
                        setNotificationTitleEn(v.english);
                        setNotificationTitleAr(v.arabic);
                        setNotificationTitleKu(v.kurdish);
                      }}
                      sourceText={notificationTitle}
                      aiType="general"
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label={t("Message")}
                      value={notificationBody}
                      onChange={(e) => setNotificationBody(e.target.value)}
                      placeholder={t("Optional message body...")}
                      sx={{ mb: 2 }}
                    />
                    <MultilingualFieldGroup
                      sectionLabel={t("Message (translations)")}
                      value={{
                        english: notificationBodyEn,
                        arabic: notificationBodyAr,
                        kurdish: notificationBodyKu,
                      }}
                      onValueChange={(v) => {
                        setNotificationBodyEn(v.english);
                        setNotificationBodyAr(v.arabic);
                        setNotificationBodyKu(v.kurdish);
                      }}
                      sourceText={notificationBody}
                      aiType="general"
                      multiline
                      minRows={3}
                    />
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>{t("Type")}</InputLabel>
                      <Select
                        value={notificationType}
                        onChange={(e) => setNotificationType(e.target.value)}
                        label={t("Type")}
                      >
                        <MenuItem value="general">{t("General")}</MenuItem>
                        <MenuItem value="info">{t("Info")}</MenuItem>
                        <MenuItem value="promo">{t("Promo")}</MenuItem>
                        <MenuItem value="alert">{t("Alert")}</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>{t("Link")}</InputLabel>
                      <Select
                        value={notificationLinkType}
                        onChange={(e) => {
                          setNotificationLinkType(e.target.value);
                          setNotificationLinkId("");
                        }}
                        label={t("Link")}
                      >
                        <MenuItem value="none">{t("No link")}</MenuItem>
                        <MenuItem value="store">{t("Store")}</MenuItem>
                        <MenuItem value="brand">{t("Brand")}</MenuItem>
                      </Select>
                    </FormControl>
                    {notificationLinkType === "store" && (
                      <DataEntryEntityAutocomplete
                        sx={{ mb: 2 }}
                        label={t("Select Store")}
                        options={stores}
                        valueId={notificationLinkId}
                        onChangeId={setNotificationLinkId}
                        placeholder={t("Select Store")}
                      />
                    )}
                    {notificationLinkType === "brand" && (
                      <DataEntryEntityAutocomplete
                        sx={{ mb: 2 }}
                        label={t("Select Brand")}
                        options={brands}
                        valueId={notificationLinkId}
                        onChangeId={setNotificationLinkId}
                        placeholder={t("Select Brand")}
                      />
                    )}
                    <Button
                      variant="contained"
                      startIcon={<NotificationsActiveIcon />}
                      disabled={
                        !notificationTitle.trim() || notificationSending
                      }
                      onClick={async () => {
                        try {
                          setNotificationSending(true);
                          setMessage({ type: "", text: "" });
                          let link = "";
                          if (
                            notificationLinkType === "store" &&
                            notificationLinkId
                          ) {
                            link = `/stores/${notificationLinkId}`;
                          } else if (
                            notificationLinkType === "brand" &&
                            notificationLinkId
                          ) {
                            link = `/brands/${notificationLinkId}`;
                          }
                          const res = await adminAPI.sendNotification({
                            title: notificationTitle.trim(),
                            body: notificationBody.trim(),
                            titleEn: notificationTitleEn.trim(),
                            titleAr: notificationTitleAr.trim(),
                            titleKu: notificationTitleKu.trim(),
                            bodyEn: notificationBodyEn.trim(),
                            bodyAr: notificationBodyAr.trim(),
                            bodyKu: notificationBodyKu.trim(),
                            type: notificationType,
                            ...(link && { link }),
                          });
                          if (res.data.success) {
                            const msg =
                              res.data.pushSent > 0
                                ? t(
                                    "Notification sent to {{count}} users ({{push}} to notification center)",
                                    {
                                      count: res.data.count,
                                      push: res.data.pushSent,
                                    },
                                  )
                                : t("Notification sent to {{count}} users", {
                                    count: res.data.count,
                                  });
                            setMessage({
                              type: "success",
                              text: msg,
                            });
                            setNotificationTitle("");
                            setNotificationTitleEn("");
                            setNotificationTitleAr("");
                            setNotificationTitleKu("");
                            setNotificationBody("");
                            setNotificationBodyEn("");
                            setNotificationBodyAr("");
                            setNotificationBodyKu("");
                            setNotificationType("general");
                            setNotificationLinkType("none");
                            setNotificationLinkId("");
                          } else {
                            setMessage({
                              type: "error",
                              text: res.data.message || t("Failed to send"),
                            });
                          }
                        } catch (err) {
                          setMessage({
                            type: "error",
                            text:
                              err.response?.data?.message ||
                              t("Failed to send notification"),
                          });
                        } finally {
                          setNotificationSending(false);
                        }
                      }}
                    >
                      {notificationSending
                        ? t("Sending...")
                        : t("Send to All Users")}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}

          {/* Brand List Panel */}
          {activeListTab === LIST_TAB.BRANDS && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: { xs: "flex-start", sm: "space-between" },
                  alignItems: "center",
                  gap: 1,
                  mb: 2,
                  ...DATA_LIST_TAB_TOOLBAR_SCROLL_SX,
                }}
              >
                <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setAddDialog({ open: true, type: "brand" })}
                  >
                    {t("New Brand")}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => setBulkDialog({ open: true, type: "brand" })}
                  >
                    {t("Bulk Upload")}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={exportBrandsToExcel}
                    sx={{
                      backgroundColor: "var(--brand-accent-orange)",
                      "&:hover": {
                        backgroundColor: "var(--brand-light-orange)",
                      },
                    }}
                  >
                    {t("Export to Excel")}
                  </Button>
                </Box>
                <TextField
                  size="small"
                  label={t("Search by Brand Name")}
                  value={brandNameSearch}
                  onChange={(e) => setBrandNameSearch(e.target.value)}
                  sx={{ minWidth: { xs: 180, sm: 260 }, flexShrink: 0 }}
                />
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("No.")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Name")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Logo")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Phone")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Type")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Description")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        VIP
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Status All")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Expire Contact")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredBrands
                      .slice(
                        brandsPage * rowsPerPage,
                        brandsPage * rowsPerPage + rowsPerPage,
                      )
                      .map((brand, idx) => (
                        <TableRow key={brand._id}>
                          <TableCell>
                            {brandsPage * rowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell
                            width={200}
                            sx={{ fontSize: "18px", fontWeight: "bold" }}
                          >
                            {brand.name}
                          </TableCell>
                          <TableCell>
                            {brand.logo && (
                              <img
                                src={
                                  brand.logo.startsWith("http")
                                    ? brand.logo
                                    : `${API_URL}${brand.logo}`
                                }
                                alt={brand.name}
                                width={80}
                                height={80}
                                style={{
                                  objectFit: "cover",
                                  borderRadius: "4px",
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell>{brand.phone}</TableCell>
                          <TableCell>
                            {brand.brandTypeId?.name || brand.type || ""}
                          </TableCell>
                          <TableCell
                            width="100px"
                            height="100px"
                            sx={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {brand.description}
                          </TableCell>
                          <TableCell>
                            {brand.isVip && (
                              <Box
                                sx={{
                                  backgroundColor: "#FFD700",
                                  borderRadius: "50%",
                                  width: 32,
                                  height: 32,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                  border: "2px solid #FFF",
                                  "&::before": {
                                    content: '"👑"',
                                    fontSize: "16px",
                                  },
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                brand.statusAll === "off" ? t("off") : t("on")
                              }
                              color={
                                brand.statusAll === "off" ? "error" : "success"
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {formatDisplayDate(brand.expireDate)}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              color="primary"
                              onClick={() => handleEditOpen("brand", brand)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  type: "brand",
                                  data: brand,
                                })
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredBrands.length}
                page={brandsPage}
                onPageChange={handleBrandsPageChange}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[10]}
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
                }
              />
            </Box>
          )}

          {/* Company List Panel */}
          {activeListTab === LIST_TAB.COMPANIES && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: { xs: "flex-start", sm: "space-between" },
                  alignItems: "center",
                  gap: 1,
                  mb: 2,
                  ...DATA_LIST_TAB_TOOLBAR_SCROLL_SX,
                }}
              >
                <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() =>
                      setAddDialog({ open: true, type: "company" })
                    }
                  >
                    {t("New Company")}
                  </Button>
                </Box>
                <TextField
                  size="small"
                  label={t("Search by Company Name")}
                  value={companyNameSearch}
                  onChange={(e) => setCompanyNameSearch(e.target.value)}
                  sx={{ minWidth: { xs: 180, sm: 260 }, flexShrink: 0 }}
                />
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("No.")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Name")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Logo")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Phone")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Type")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Description")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        VIP
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Status All")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Expire Contact")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCompanies
                      .slice(
                        companiesPage * rowsPerPage,
                        companiesPage * rowsPerPage + rowsPerPage,
                      )
                      .map((company, idx) => (
                        <TableRow key={company._id}>
                          <TableCell>
                            {companiesPage * rowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell
                            width={200}
                            sx={{ fontSize: "18px", fontWeight: "bold" }}
                          >
                            {company.name}
                          </TableCell>
                          <TableCell>
                            {company.logo && (
                              <img
                                src={
                                  company.logo.startsWith("http")
                                    ? company.logo
                                    : `${API_URL}${company.logo}`
                                }
                                alt={company.name}
                                width={80}
                                height={80}
                                style={{
                                  objectFit: "cover",
                                  borderRadius: "4px",
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell>{company.phone}</TableCell>
                          <TableCell>
                            {company.brandTypeId?.name || company.type || ""}
                          </TableCell>
                          <TableCell
                            width="100px"
                            height="100px"
                            sx={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {company.description}
                          </TableCell>
                          <TableCell>
                            {company.isVip && (
                              <Box
                                sx={{
                                  backgroundColor: "#FFD700",
                                  borderRadius: "50%",
                                  width: 32,
                                  height: 32,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                  border: "2px solid #FFF",
                                  "&::before": {
                                    content: '"👑"',
                                    fontSize: "16px",
                                  },
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                company.statusAll === "off" ? t("off") : t("on")
                              }
                              color={
                                company.statusAll === "off"
                                  ? "error"
                                  : "success"
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {formatDisplayDate(company.expireDate)}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              color="primary"
                              onClick={() => handleEditOpen("company", company)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  type: "company",
                                  data: company,
                                })
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredCompanies.length}
                page={companiesPage}
                onPageChange={handleCompaniesPageChange}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[10]}
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
                }
              />
            </Box>
          )}

          {/* Product List Panel */}
          {activeListTab === LIST_TAB.PRODUCTS && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 1,
                  mb: 2,
                  ...DATA_LIST_TAB_TOOLBAR_SCROLL_SX,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    justifyContent: "flex-start",
                    flexShrink: 0,
                  }}
                >
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() =>
                      setAddDialog({ open: true, type: "product" })
                    }
                  >
                    {t("New Product")}
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setProductGroupDialogOpen(true)}
                  >
                    {t("Add by group", { defaultValue: "Add by group" })}
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    disabled={!selectedProductIds.length}
                    onClick={handleOpenEditGroupDialog}
                  >
                    {t("Edit by group", { defaultValue: "Edit by group" })}
                  </Button>

                  <Button
                    variant="outlined"
                    sx={{
                      justifyContent: "flex-start",
                    }}
                    startIcon={<CloudUploadIcon />}
                    onClick={() =>
                      setBulkDialog({ open: true, type: "product" })
                    }
                  >
                    {t("Bulk Upload")}
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      disabled={translateMissingLoading || loading}
                      sx={{
                        justifyContent: "flex-start",
                      }}
                      startIcon={
                        translateMissingLoading ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <TranslateIcon />
                        )
                      }
                      onClick={handleTranslateMissingProductLocales}
                    >
                      {translateMissingLoading
                        ? t("Translating...")
                        : t("Translate missing names")}
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    color="warning"
                    disabled={deleteExpiredLoading}
                    sx={{
                      justifyContent: "flex-start",
                    }}
                    startIcon={
                      deleteExpiredLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <DeleteIcon />
                      )
                    }
                    onClick={handleDeleteExpiredDiscountProducts}
                  >
                    {deleteExpiredLoading
                      ? t("Deleting...")
                      : t("Delete Expired Discount Products")}
                  </Button>
                  <Button
                    variant="outlined"
                    color="success"
                    disabled={!selectedProductIds.length || loading}
                    onClick={handleBulkPublishSelectedProducts}
                  >
                    {t("Change Status to Published")} (
                    {selectedProductIds.length})
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    disabled={!selectedProductIds.length || loading}
                    onClick={handleBulkPendingSelectedProducts}
                  >
                    {t("Change Status to Pending")} ({selectedProductIds.length}
                    )
                  </Button>
                </Box>
              </Box>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
                useFlexGap
                sx={{ mb: 2, flexWrap: "wrap" }}
              >
                <TextField
                  size="small"
                  label={t("Search product name", {
                    defaultValue: "Search product name",
                  })}
                  value={productListSearchQuery}
                  onChange={(e) => setProductListSearchQuery(e.target.value)}
                  sx={{
                    minWidth: { xs: "100%", sm: 200 },
                    flex: { sm: "1 1 180px" },
                  }}
                />
                <DataEntryEntityAutocomplete
                  sx={{ minWidth: 200, flex: { sm: "1 1 180px" } }}
                  label={t("Search by Store")}
                  options={stores}
                  valueId={selectedStoreFilter}
                  onChangeId={setSelectedStoreFilter}
                  placeholder={t("All Stores")}
                  textFieldProps={{ size: "small" }}
                />
                <DataEntryEntityAutocomplete
                  sx={{ minWidth: 160 }}
                  label={t("Brand")}
                  options={brands}
                  valueId={productListFilterBrandId}
                  onChangeId={setProductListFilterBrandId}
                  placeholder={t("All brands", { defaultValue: "All brands" })}
                  textFieldProps={{ size: "small" }}
                />
                <DataEntryEntityAutocomplete
                  sx={{ minWidth: 160 }}
                  label={t("Company")}
                  options={companies}
                  valueId={productListFilterCompanyId}
                  onChangeId={setProductListFilterCompanyId}
                  placeholder={t("All companies", {
                    defaultValue: "All companies",
                  })}
                  textFieldProps={{ size: "small" }}
                />
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    setProductListSearchQuery("");
                    setSelectedStoreFilter("");
                    setProductListFilterBrandId("");
                    setProductListFilterCompanyId("");
                  }}
                  disabled={
                    !productListSearchQuery &&
                    !selectedStoreFilter &&
                    !productListFilterBrandId &&
                    !productListFilterCompanyId
                  }
                >
                  {t("Clear filters", { defaultValue: "Clear filters" })}
                </Button>
              </Stack>

              <Dialog
                open={productGroupDialogOpen}
                onClose={() => {
                  if (!groupAddLoading) setProductGroupDialogOpen(false);
                }}
                fullWidth
                maxWidth={false}
                PaperProps={{
                  sx: {
                    width: "calc(100% - 32px)",
                    maxWidth: 1680,
                    m: 2,
                  },
                }}
              >
                <DialogTitle>
                  {t("Add by group", { defaultValue: "Add by group" })}
                </DialogTitle>
                <DialogContent dividers>
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={1}
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <DataEntryEntityIdsAutocomplete
                      sx={{ minWidth: 240 }}
                      label={t("Stores")}
                      options={stores}
                      valueIds={groupAddStoreIds}
                      onChangeIds={setGroupAddStoreIds}
                      placeholder={t("Select stores", {
                        defaultValue: "Select stores",
                      })}
                      textFieldProps={{ size: "small" }}
                    />
                    {groupAddStoreIds.length > 0 ? (
                      <Typography
                        variant="body2"
                        sx={{
                          alignSelf: "center",
                          color: "text.secondary",
                          maxWidth: 520,
                        }}
                      >
                        {t("Store types", { defaultValue: "Store types" })}:{" "}
                        {groupAddStoreIds
                          .map((sid) => {
                            const st = stores.find(
                              (s) => String(s._id) === String(sid),
                            );
                            const ty = st?.storeTypeId;
                            const typeLabel =
                              ty && typeof ty === "object" && ty.name
                                ? `${ty.icon || "🏪"} ${t(ty.name)}`
                                : t("—", { defaultValue: "—" });
                            return st ? `${st.name}: ${typeLabel}` : "";
                          })
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    ) : null}
                    <TextField
                      size="small"
                      label={t("Expire date & time")}
                      type="datetime-local"
                      value={groupAddExpireDate}
                      onChange={(e) => setGroupAddExpireDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 220, flexShrink: 0 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <InputLabel id="group-add-status-label">
                        {t("Status")}
                      </InputLabel>
                      <Select
                        labelId="group-add-status-label"
                        label={t("Status")}
                        value={groupAddStatus}
                        onChange={(e) => setGroupAddStatus(e.target.value)}
                      >
                        <MenuItem value="published">{t("Published")}</MenuItem>
                        <MenuItem value="pending">{t("Pending")}</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() =>
                        setProductGroupRows((rows) => [
                          ...rows,
                          makeProductGroupRow(),
                        ])
                      }
                    >
                      {t("Add row", { defaultValue: "Add row" })}
                    </Button>
                  </Stack>
                  <Box
                    sx={{
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      pb: 0.5,
                    }}
                  >
                    {productGroupRows.map((row, idx) => {
                      const typesForRow =
                        categoryTypesByCategoryId[row.categoryId] || [];
                      return (
                        <Stack
                          key={row.id}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{
                            mb: 1,
                            minWidth: "max-content",
                            flexWrap: "nowrap",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              width: 36,
                              flexShrink: 0,
                              textAlign: "center",
                              fontWeight: 600,
                            }}
                          >
                            {idx + 1}
                          </Typography>
                          <TextField
                            size="small"
                            label={t("Product Name")}
                            value={row.name}
                            onChange={(e) =>
                              handleProductGroupRowFieldChange(
                                row.id,
                                "name",
                                e.target.value,
                              )
                            }
                            sx={{ width: 150, flexShrink: 0 }}
                          />
                          <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select
                              label={t("Category")}
                              value={row.categoryId}
                              onChange={(e) =>
                                handleProductGroupRowFieldChange(
                                  row.id,
                                  "categoryId",
                                  e.target.value,
                                )
                              }
                              displayEmpty
                            >
                              <MenuItem value="">
                                <em>{t("Select Category")}</em>
                              </MenuItem>
                              {categories.map((c) => (
                                <MenuItem key={c._id} value={c._id}>
                                  {c.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl
                            size="small"
                            sx={{ minWidth: 140 }}
                            disabled={!row.categoryId}
                          >
                            <Select
                              label={t("Category Type")}
                              value={row.categoryTypeId ?? ""}
                              onChange={(e) =>
                                handleProductGroupRowFieldChange(
                                  row.id,
                                  "categoryTypeId",
                                  e.target.value,
                                )
                              }
                              displayEmpty
                            >
                              <MenuItem value="">
                                <em>{t("Select Category Type")}</em>
                              </MenuItem>
                              {typesForRow.map((type) => (
                                <MenuItem key={type._id} value={type._id}>
                                  {type.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <TextField
                            size="small"
                            label={t("Previous Price")}
                            type="number"
                            inputProps={{ min: 0, step: "any" }}
                            value={row.previousPrice}
                            onChange={(e) =>
                              handleProductGroupRowFieldChange(
                                row.id,
                                "previousPrice",
                                e.target.value,
                              )
                            }
                            sx={{ width: 110, flexShrink: 0 }}
                          />
                          <TextField
                            size="small"
                            label={t("New Price")}
                            type="number"
                            inputProps={{ min: 0, step: "any" }}
                            value={row.newPrice}
                            onChange={(e) =>
                              handleProductGroupRowFieldChange(
                                row.id,
                                "newPrice",
                                e.target.value,
                              )
                            }
                            sx={{ width: 110, flexShrink: 0 }}
                          />
                          <FormControlLabel
                            sx={{ flexShrink: 0, mr: 0, ml: 0 }}
                            control={
                              <Checkbox
                                size="small"
                                checked={!!row.isDiscount}
                                onChange={(e) =>
                                  handleProductGroupRowFieldChange(
                                    row.id,
                                    "isDiscount",
                                    e.target.checked,
                                  )
                                }
                              />
                            }
                            label={t("Is Discount Product")}
                          />
                          <DataEntryEntityAutocomplete
                            sx={{ minWidth: 140, flexShrink: 0 }}
                            label={t("Brand")}
                            options={brands}
                            valueId={row.brandId}
                            onChangeId={(id) =>
                              handleProductGroupRowFieldChange(
                                row.id,
                                "brandId",
                                id,
                              )
                            }
                            textFieldProps={{ size: "small" }}
                          />
                          <DataEntryEntityAutocomplete
                            sx={{ minWidth: 140, flexShrink: 0 }}
                            label={t("Company")}
                            options={companies}
                            valueId={row.companyId || ""}
                            onChangeId={(id) =>
                              handleProductGroupRowFieldChange(
                                row.id,
                                "companyId",
                                id,
                              )
                            }
                            textFieldProps={{ size: "small" }}
                          />
                          <Button
                            variant="outlined"
                            component="label"
                            size="small"
                            sx={{ flexShrink: 0 }}
                          >
                            {row.imageFile ? row.imageFile.name : t("Image")}
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                handleProductGroupRowFieldChange(
                                  row.id,
                                  "imageFile",
                                  f || null,
                                );
                              }}
                            />
                          </Button>
                          {productGroupRows.length > 1 ? (
                            <IconButton
                              size="small"
                              aria-label={t("Remove row")}
                              onClick={() =>
                                setProductGroupRows((rows) =>
                                  rows.filter((r) => r.id !== row.id),
                                )
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          ) : null}
                        </Stack>
                      );
                    })}
                  </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                  <Button
                    onClick={() => setProductGroupDialogOpen(false)}
                    disabled={groupAddLoading}
                  >
                    {t("Close")}
                  </Button>
                  <Button
                    variant="contained"
                    disabled={groupAddLoading}
                    startIcon={
                      groupAddLoading ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <SaveIcon />
                      )
                    }
                    onClick={handleProductGroupSubmit}
                  >
                    {t("Create all products", {
                      defaultValue: "Create all products",
                    })}
                  </Button>
                </DialogActions>
              </Dialog>

              <Dialog
                open={editGroupDialogOpen}
                onClose={() => {
                  if (!editGroupLoading) closeEditGroupDialog();
                }}
                fullWidth
                maxWidth={false}
                PaperProps={{
                  sx: {
                    width: "calc(100% - 32px)",
                    maxWidth: 1680,
                    m: 2,
                  },
                }}
              >
                <DialogTitle>
                  {t("Edit by group", { defaultValue: "Edit by group" })}
                </DialogTitle>
                <DialogContent dividers>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {t(
                      "Editing {{count}} product(s) from your table selection.",
                      {
                        count: editGroupRows.length,
                        defaultValue:
                          "Editing {{count}} product(s) from your table selection.",
                      },
                    )}
                  </Typography>

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {t("Edit fields", { defaultValue: "Edit fields" })}
                  </Typography>
                  <Box
                    sx={{
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      pb: 0.5,
                    }}
                  >
                    {editGroupRows.map((row, idx) => {
                      const typesForRow =
                        categoryTypesByCategoryId[row.categoryId] || [];
                      return (
                        <Stack
                          key={row.id}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{
                            mb: 1,
                            minWidth: "max-content",
                            flexWrap: "nowrap",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              width: 36,
                              flexShrink: 0,
                              textAlign: "center",
                              fontWeight: 600,
                            }}
                          >
                            {idx + 1}
                          </Typography>
                          <TextField
                            size="small"
                            label={t("Product Name")}
                            value={row.name}
                            onChange={(e) =>
                              handleEditGroupRowFieldChange(
                                row.id,
                                "name",
                                e.target.value,
                              )
                            }
                            sx={{ width: 150, flexShrink: 0 }}
                          />
                          <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select
                              label={t("Category")}
                              value={row.categoryId}
                              onChange={(e) =>
                                handleEditGroupRowFieldChange(
                                  row.id,
                                  "categoryId",
                                  e.target.value,
                                )
                              }
                              displayEmpty
                            >
                              <MenuItem value="">
                                <em>{t("Select Category")}</em>
                              </MenuItem>
                              {categories.map((c) => (
                                <MenuItem key={c._id} value={c._id}>
                                  {c.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl
                            size="small"
                            sx={{ minWidth: 140 }}
                            disabled={!row.categoryId}
                          >
                            <Select
                              label={t("Category Type")}
                              value={row.categoryTypeId ?? ""}
                              onChange={(e) =>
                                handleEditGroupRowFieldChange(
                                  row.id,
                                  "categoryTypeId",
                                  e.target.value,
                                )
                              }
                              displayEmpty
                            >
                              <MenuItem value="">
                                <em>{t("Select Category Type")}</em>
                              </MenuItem>
                              {typesForRow.map((type) => (
                                <MenuItem key={type._id} value={type._id}>
                                  {type.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <TextField
                            size="small"
                            label={t("Previous Price")}
                            type="number"
                            inputProps={{ min: 0, step: "any" }}
                            value={row.previousPrice}
                            onChange={(e) =>
                              handleEditGroupRowFieldChange(
                                row.id,
                                "previousPrice",
                                e.target.value,
                              )
                            }
                            sx={{ width: 110, flexShrink: 0 }}
                          />
                          <TextField
                            size="small"
                            label={t("New Price")}
                            type="number"
                            inputProps={{ min: 0, step: "any" }}
                            value={row.newPrice}
                            onChange={(e) =>
                              handleEditGroupRowFieldChange(
                                row.id,
                                "newPrice",
                                e.target.value,
                              )
                            }
                            sx={{ width: 110, flexShrink: 0 }}
                          />
                          <FormControlLabel
                            sx={{ flexShrink: 0, mr: 0, ml: 0 }}
                            control={
                              <Checkbox
                                size="small"
                                checked={!!row.isDiscount}
                                onChange={(e) =>
                                  handleEditGroupRowFieldChange(
                                    row.id,
                                    "isDiscount",
                                    e.target.checked,
                                  )
                                }
                              />
                            }
                            label={t("Is Discount Product")}
                          />
                          <DataEntryEntityAutocomplete
                            sx={{ minWidth: 140, flexShrink: 0 }}
                            label={t("Brand")}
                            options={brands}
                            valueId={row.brandId || ""}
                            onChangeId={(id) =>
                              handleEditGroupRowFieldChange(
                                row.id,
                                "brandId",
                                id,
                              )
                            }
                            placeholder={t("select brand")}
                            textFieldProps={{ size: "small" }}
                          />
                          <DataEntryEntityAutocomplete
                            sx={{ minWidth: 140, flexShrink: 0 }}
                            label={t("Company")}
                            options={companies}
                            valueId={row.companyId || ""}
                            onChangeId={(id) =>
                              handleEditGroupRowFieldChange(
                                row.id,
                                "companyId",
                                id,
                              )
                            }
                            placeholder={t("select company")}
                            textFieldProps={{ size: "small" }}
                          />
                          <TextField
                            size="small"
                            label={t("Expire date & time")}
                            type="datetime-local"
                            value={row.expireDate}
                            onChange={(e) =>
                              handleEditGroupRowFieldChange(
                                row.id,
                                "expireDate",
                                e.target.value,
                              )
                            }
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 200, flexShrink: 0 }}
                          />
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              label={t("Status")}
                              value={row.status || "published"}
                              onChange={(e) =>
                                handleEditGroupRowFieldChange(
                                  row.id,
                                  "status",
                                  e.target.value,
                                )
                              }
                            >
                              <MenuItem value="published">
                                {t("Published")}
                              </MenuItem>
                              <MenuItem value="pending">
                                {t("Pending")}
                              </MenuItem>
                            </Select>
                          </FormControl>
                          <Button
                            variant="outlined"
                            component="label"
                            size="small"
                            sx={{ flexShrink: 0 }}
                          >
                            {row.imageFile ? row.imageFile.name : t("Image")}
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                handleEditGroupRowFieldChange(
                                  row.id,
                                  "imageFile",
                                  f || null,
                                );
                              }}
                            />
                          </Button>
                          <IconButton
                            size="small"
                            aria-label={t("Remove row")}
                            onClick={() =>
                              setEditGroupRows((rows) =>
                                rows.filter((r) => r.id !== row.id),
                              )
                            }
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      );
                    })}
                  </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                  <Button
                    onClick={() => closeEditGroupDialog()}
                    disabled={editGroupLoading}
                  >
                    {t("Close")}
                  </Button>
                  <Button
                    variant="contained"
                    disabled={editGroupLoading}
                    startIcon={
                      editGroupLoading ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <SaveIcon />
                      )
                    }
                    onClick={handleEditGroupSubmit}
                  >
                    {t("Save all changes", {
                      defaultValue: "Save all changes",
                    })}
                  </Button>
                </DialogActions>
              </Dialog>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        padding="checkbox"
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        <Checkbox
                          checked={allPageSelected}
                          indeterminate={somePageSelected}
                          onChange={(e) =>
                            handleSelectAllProductsOnPage(
                              e.target.checked,
                              currentPageProducts,
                            )
                          }
                          inputProps={{
                            "aria-label": "select all products on page",
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("No.")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Name")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Image")}
                      </TableCell>

                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Category")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Category Type")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Previous Price")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("New Price")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Weight")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Barcode")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Discount")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Store")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Status")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Expire Date")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentPageProducts.map((product, idx) => (
                      <TableRow key={product._id}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedProductIds.includes(product._id)}
                            onChange={() =>
                              handleToggleProductSelection(product._id)
                            }
                            inputProps={{
                              "aria-label": `select ${product.name}`,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {productsPage * rowsPerPage + idx + 1}
                        </TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            {product.image && (
                              <img
                                src={
                                  product.image.startsWith("http")
                                    ? product.image
                                    : `${API_URL}${product.image}`
                                }
                                alt={product.name}
                                style={{
                                  width: 48,
                                  height: 48,
                                  objectFit: "cover",
                                  borderRadius: 4,
                                }}
                              />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              id={`product-list-img-${product._id}`}
                              style={{ display: "none" }}
                              onChange={(ev) =>
                                handleProductListImageUpload(ev, product)
                              }
                            />
                            <IconButton
                              size="small"
                              color="primary"
                              component="span"
                              disabled={
                                productListImageUploadId === String(product._id)
                              }
                              aria-label={t("productListUploadImage", {
                                defaultValue: "Upload or change image",
                              })}
                              onClick={() =>
                                document
                                  .getElementById(
                                    `product-list-img-${product._id}`,
                                  )
                                  ?.click()
                              }
                            >
                              {productListImageUploadId ===
                              String(product._id) ? (
                                <CircularProgress size={20} />
                              ) : (
                                <CloudUploadIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Box>
                        </TableCell>

                        <TableCell>
                          {product.categoryId &&
                          typeof product.categoryId === "object"
                            ? product.categoryId.name
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {getCategoryTypeName(
                            product.categoryTypeId,
                            product.categoryId?._id || product.categoryId,
                          )}
                        </TableCell>
                        <TableCell>
                          {product.previousPrice
                            ? `${t("ID")} ${formatPriceDigits(Number(product.previousPrice))}`
                            : ""}
                        </TableCell>
                        <TableCell>
                          {product.newPrice
                            ? `${t("ID")} ${formatPriceDigits(Number(product.newPrice))}`
                            : ""}
                        </TableCell>
                        <TableCell>{product.weight || ""}</TableCell>
                        <TableCell>{product.barcode || ""}</TableCell>
                        <TableCell>
                          {product.isDiscount ? (
                            <Chip
                              label={t("Yes")}
                              color="success"
                              size="small"
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              label={t("No")}
                              color="default"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>{product.storeId?.name || ""}</TableCell>
                        <TableCell>
                          <Chip
                            label={
                              product.status === "pending"
                                ? t("Pending")
                                : t("Published")
                            }
                            color={
                              product.status === "pending"
                                ? "warning"
                                : "success"
                            }
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {product.expireDate
                            ? new Date(product.expireDate).toLocaleDateString()
                            : ""}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => handleEditOpen("product", product)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                type: "product",
                                data: product,
                              })
                            }
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredProducts.length}
                page={productsPage}
                onPageChange={handleProductsPageChange}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[10]}
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
                }
              />
            </Box>
          )}

          {/* Categories List Panel (with image upload) */}
          {activeListTab === LIST_TAB.CATEGORIES && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: { xs: "flex-start", sm: "space-between" },
                  alignItems: "center",
                  gap: 2,
                  mb: 2,
                  ...DATA_LIST_TAB_TOOLBAR_SCROLL_SX,
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialog({ open: true, type: "category" })}
                  sx={{ flexShrink: 0 }}
                >
                  {t("New Category")}
                </Button>
                <FormControl size="small" sx={{ minWidth: 220, flexShrink: 0 }}>
                  <InputLabel>{t("Store Type Filter")}</InputLabel>
                  <Select
                    value={categoryStoreTypeFilter}
                    label={t("Store Type Filter")}
                    onChange={(e) => setCategoryStoreTypeFilter(e.target.value)}
                  >
                    <MenuItem value="all">{t("All Store Types")}</MenuItem>
                    {storeTypes.map((st) => (
                      <MenuItem key={st._id} value={st._id}>
                        {st.icon || "🏪"} {t(st.name)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("No.")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Name")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Store Type")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Image")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Change Image")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCategoriesByStoreType.map((cat, idx) => (
                      <TableRow key={cat._id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{cat.name}</TableCell>
                        <TableCell>
                          {cat.storeTypeId?.icon || cat.storeType?.icon
                            ? `${cat.storeTypeId?.icon || cat.storeType?.icon} `
                            : ""}
                          {t(
                            cat.storeTypeId?.name || cat.storeType?.name || "",
                          )}
                        </TableCell>
                        <TableCell>
                          {cat.image ? (
                            <img
                              src={`${API_URL}${cat.image}`}
                              alt={cat.name}
                              width={60}
                              height={60}
                              style={{ objectFit: "cover", borderRadius: 4 }}
                            />
                          ) : (
                            <Chip label={t("No Image")} size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          <input
                            id={`cat-image-${cat._id}`}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const formData = new FormData();
                                formData.append("image", file);
                                const res = await fetch(
                                  `${API_URL}/api/categories/${cat._id}/image`,
                                  { method: "POST", body: formData },
                                );
                                if (!res.ok) {
                                  const text = await res.text();
                                  throw new Error(
                                    text || `Upload failed (${res.status})`,
                                  );
                                }
                                await res.json();
                                setMessage({
                                  type: "success",
                                  text: t("Image uploaded"),
                                });
                                // refresh categories list
                                fetchCategories();
                              } catch (err) {
                                setMessage({
                                  type: "error",
                                  text: err.message || t("Upload failed"),
                                });
                              } finally {
                                e.target.value = "";
                              }
                            }}
                          />
                          <label htmlFor={`cat-image-${cat._id}`}>
                            <Button
                              variant="outlined"
                              size="small"
                              component="span"
                              startIcon={<CloudUploadIcon />}
                              disabled={editLoading}
                            >
                              {t("Upload Image")}
                            </Button>
                          </label>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => handleEditOpen("category", cat)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                type: "category",
                                data: cat,
                              })
                            }
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Gift List Panel */}
          {activeListTab === LIST_TAB.GIFTS && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  gap: 1,
                  mb: 2,
                  ...DATA_LIST_TAB_TOOLBAR_SCROLL_SX,
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialog({ open: true, type: "gift" })}
                >
                  {t("New Gift")}
                </Button>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("No.")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Image")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Description")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Stores")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Brand")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Product ID")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Expire Date")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(gifts || [])
                      .slice(
                        giftsPage * rowsPerPage,
                        giftsPage * rowsPerPage + rowsPerPage,
                      )
                      .map((gift, index) => (
                        <TableRow key={gift._id}>
                          <TableCell>
                            {giftsPage * rowsPerPage + index + 1}
                          </TableCell>
                          <TableCell>
                            <img
                              src={gift.image}
                              alt={gift.description}
                              style={{
                                width: "60px",
                                height: "60px",
                                objectFit: "cover",
                                borderRadius: "8px",
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: "200px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {gift.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                              }}
                            >
                              {gift.storeId?.map((store) => (
                                <Chip
                                  key={store._id || store}
                                  label={store.name || store}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {gift.brandId ? (
                              <Chip
                                label={gift.brandId.name || gift.brandId}
                                size="small"
                                variant="outlined"
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {t("None")}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {gift.productId ? (
                              <Typography variant="body2">
                                {gift.productId}
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {t("None")}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {gift.expireDate ? (
                              <Typography variant="body2">
                                {new Date(gift.expireDate).toLocaleDateString()}
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {t("No expiry")}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              onClick={() => handleEditOpen("gift", gift)}
                              size="small"
                              sx={{ color: "primary.main" }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  type: "gift",
                                  data: gift,
                                })
                              }
                              size="small"
                              sx={{ color: "error.main" }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={gifts.length}
                page={giftsPage}
                onPageChange={handleGiftsPageChange}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[10]}
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
                }
              />
            </Box>
          )}

          {/* Ads List Panel */}
          {activeListTab === LIST_TAB.ADS && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  mb: 2,
                  gap: 1,
                  ...DATA_LIST_TAB_TOOLBAR_SCROLL_SX,
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialog({ open: true, type: "ad" })}
                >
                  {t("New Ad")}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<VideoLibraryIcon />}
                  onClick={openCreateVideoDialog}
                >
                  {t("New Reel")}
                </Button>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("No.")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Image")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Page")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Link URL")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Active")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Priority")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Brand")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Store")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Gift")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Start")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("End")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ads
                      .slice(
                        adsPage * rowsPerPage,
                        adsPage * rowsPerPage + rowsPerPage,
                      )
                      .map((ad, idx) => (
                        <TableRow key={ad._id}>
                          <TableCell>
                            {adsPage * rowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell>
                            {ad.image && (
                              <img
                                src={
                                  ad.image.startsWith("http")
                                    ? ad.image
                                    : `${API_URL}${ad.image}`
                                }
                                alt="ad"
                                width={80}
                                height={80}
                                style={{ objectFit: "cover", borderRadius: 4 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {Array.isArray(ad.pages) && ad.pages.length
                              ? ad.pages
                                  .map((p) =>
                                    t(p.charAt(0).toUpperCase() + p.slice(1)),
                                  )
                                  .join(", ")
                              : t("All")}
                          </TableCell>
                          <TableCell>
                            <Typography
                              sx={{
                                maxWidth: 240,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {ad.linkUrl || ""}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {ad.active ? t("Yes") : t("No")}
                          </TableCell>
                          <TableCell>{ad.priority ?? 0}</TableCell>
                          <TableCell>
                            {ad.brandId &&
                              (brands.find((b) => b._id === ad.brandId)?.name ||
                                ad.brandId)}
                          </TableCell>
                          <TableCell>
                            {ad.storeId &&
                              (stores.find((s) => s._id === ad.storeId)?.name ||
                                ad.storeId)}
                          </TableCell>
                          <TableCell>
                            {ad.giftId &&
                              (gifts.find((g) => g._id === ad.giftId)
                                ?.description ||
                                ad.giftId)}
                          </TableCell>
                          <TableCell>
                            {ad.startDate
                              ? new Date(ad.startDate).toLocaleDateString()
                              : ""}
                          </TableCell>
                          <TableCell>
                            {ad.endDate
                              ? new Date(ad.endDate).toLocaleDateString()
                              : ""}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              color="primary"
                              onClick={() => handleEditOpen("ad", ad)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  type: "ad",
                                  data: ad,
                                })
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={ads.length}
                page={adsPage}
                onPageChange={(e, p) => setAdsPage(p)}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[10]}
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
                }
              />
            </Box>
          )}

          {/* Jobs List Panel */}
          {activeListTab === LIST_TAB.JOBS && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  mb: 2,
                  gap: 1,
                  ...DATA_LIST_TAB_TOOLBAR_SCROLL_SX,
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingJobId("");
                    setJobForm(defaultJobForm);
                    setSelectedJobImage(null);
                    setAddDialog({ open: true, type: "job" });
                  }}
                >
                  {t("New Job")}
                </Button>
                <Button variant="outlined" onClick={fetchJobs}>
                  {t("Refresh")}
                </Button>
              </Box>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("No.")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Title")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Owner")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Gender")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("City")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Expire Date")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Expiry status")}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(30, 111, 217, 0.38)"
                              : theme.palette.primary.light,
                          color:
                            theme.palette.mode === "dark"
                              ? "#e8f4ff"
                              : theme.palette.primary.contrastText,
                        }}
                      >
                        {t("Actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(jobs || [])
                      .slice(
                        jobsPage * rowsPerPage,
                        jobsPage * rowsPerPage + rowsPerPage,
                      )
                      .map((job, index) => {
                        const ownerName =
                          job?.storeId?.name || job?.brandId?.name || "";
                        const gender = String(job?.gender || "any");
                        const hasExpiry = Boolean(job.expireDate);
                        const stillValid = hasExpiry
                          ? isExpiryStillValid(job.expireDate)
                          : null;
                        return (
                          <TableRow key={job._id}>
                            <TableCell>
                              {jobsPage * rowsPerPage + index + 1}
                            </TableCell>
                            <TableCell>{job.title}</TableCell>
                            <TableCell>{ownerName || "-"}</TableCell>
                            <TableCell>{gender}</TableCell>
                            <TableCell>
                              {job.city
                                ? t(`city.${job.city}`, {
                                    defaultValue: job.city,
                                  })
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {job.expireDate
                                ? new Date(job.expireDate).toLocaleDateString()
                                : t("No expiry")}
                            </TableCell>
                            <TableCell>
                              {!hasExpiry ? (
                                <Chip
                                  label={t("No expiry")}
                                  color="default"
                                  size="small"
                                  variant="outlined"
                                />
                              ) : stillValid ? (
                                <Chip
                                  label={t("Active")}
                                  color="success"
                                  size="small"
                                  variant="outlined"
                                />
                              ) : (
                                <Chip
                                  label={t("Expired")}
                                  color="error"
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <IconButton
                                onClick={() => {
                                  setEditingJobId(job._id);
                                  setSelectedJobImage(null);
                                  setJobForm({
                                    title: job.title || "",
                                    titleEn: job.titleEn || "",
                                    titleAr: job.titleAr || "",
                                    titleKu: job.titleKu || "",
                                    description: job.description || "",
                                    descriptionEn: job.descriptionEn || "",
                                    descriptionAr: job.descriptionAr || "",
                                    descriptionKu: job.descriptionKu || "",
                                    gender: job.gender || "any",
                                    city:
                                      job.city && String(job.city).trim()
                                        ? String(job.city).trim()
                                        : "Erbil",
                                    storeId:
                                      job?.storeId?._id || job?.storeId || "",
                                    brandId:
                                      job?.brandId?._id || job?.brandId || "",
                                    companyId:
                                      job?.companyId?._id ||
                                      job?.companyId ||
                                      "",
                                    whatsapp: job.whatsapp || "",
                                    email: job.email || "",
                                    jobType: job.jobType || "",
                                    indeed: job.indeed || "",
                                    image: job.image || "",
                                    expireDate: job.expireDate
                                      ? toDatetimeLocalValue(job.expireDate)
                                      : "",
                                    active: job.active !== false,
                                  });
                                  setAddDialog({ open: true, type: "job" });
                                }}
                                size="small"
                                sx={{ color: "primary.main" }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                onClick={() =>
                                  setDeleteDialog({
                                    open: true,
                                    type: "job",
                                    data: job,
                                  })
                                }
                                size="small"
                                sx={{ color: "error.main" }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={(jobs || []).length}
                page={jobsPage}
                onPageChange={(e, p) => setJobsPage(p)}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[10]}
              />
            </Box>
          )}

          {/* Reels List Panel */}
          {activeListTab === LIST_TAB.REELS && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  mb: 2,
                  gap: 1,
                  ...DATA_LIST_TAB_TOOLBAR_SCROLL_SX,
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<VideoLibraryIcon />}
                  onClick={openCreateVideoDialog}
                >
                  {t("New Reel")}
                </Button>
                <Button
                  variant="outlined"
                  onClick={fetchReels}
                  disabled={loading}
                >
                  {t("Refresh")}
                </Button>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("No.")}</TableCell>
                      <TableCell>{t("Title")}</TableCell>
                      {/* <TableCell>{t("Video")}</TableCell> */}
                      <TableCell>{t("Store")}</TableCell>
                      <TableCell>{t("Brand")}</TableCell>
                      <TableCell>{t("Like")}</TableCell>
                      <TableCell>{t("Views")}</TableCell>
                      <TableCell>{t("Shares")}</TableCell>
                      <TableCell>{t("Created Date")}</TableCell>
                      <TableCell>{t("Actions")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reels
                      .slice(
                        reelsPage * rowsPerPage,
                        reelsPage * rowsPerPage + rowsPerPage,
                      )
                      .map((reel, idx) => (
                        <TableRow key={reel._id}>
                          <TableCell>
                            {reelsPage * rowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell>{reel.title || "-"}</TableCell>
                          {/* <TableCell>
                            {reel.videoUrl ? (
                              <video
                                src={
                                  reel.videoUrl.startsWith("http")
                                    ? reel.videoUrl
                                    : `${API_URL}${reel.videoUrl}`
                                }
                                muted
                                playsInline
                                controls
                                preload="metadata"
                                style={{
                                  width: 120,
                                  height: 180,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                }}
                              />
                            ) : (
                              "-"
                            )}
                          </TableCell> */}
                          <TableCell>{reel.storeId?.name || "-"}</TableCell>
                          <TableCell>{reel.brandId?.name || "-"}</TableCell>
                          <TableCell>{reel.like ?? 0}</TableCell>
                          <TableCell>{reel.views ?? 0}</TableCell>
                          <TableCell>{reel.shares ?? 0}</TableCell>
                          <TableCell>
                            {reel.createdAt
                              ? new Date(reel.createdAt).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              color="primary"
                              onClick={() => openEditVideoDialog(reel)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  type: "video",
                                  data: reel,
                                })
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={reels.length}
                page={reelsPage}
                onPageChange={(e, p) => setReelsPage(p)}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[10]}
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
                }
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog
        open={addDialog.open}
        onClose={() => {
          setAddDialog({ open: false, type: "" });
          if (addDialog.type === "video") {
            setEditingVideoId("");
            setVideoForm(defaultVideoForm);
            setSelectedVideoFile(null);
          }
          if (addDialog.type === "job") {
            setEditingJobId("");
            setJobForm(defaultJobForm);
            setSelectedJobImage(null);
          }
        }}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          {addDialog.type === "brand" || addDialog.type === "company"
            ? addDialog.type === "company"
              ? t("Add Company")
              : t("Add Brand")
            : addDialog.type === "store"
              ? t("Add Store")
              : addDialog.type === "gift"
                ? t("Add Gift")
                : addDialog.type === "category"
                  ? t("Add Category")
                  : addDialog.type === "ad"
                    ? t("Add Ad")
                    : addDialog.type === "job"
                      ? editingJobId
                        ? t("Edit Job")
                        : t("Add Job")
                      : addDialog.type === "video"
                        ? editingVideoId
                          ? t("Edit Reel")
                          : t("Add Reel")
                        : addDialog.type === "storeType"
                          ? t("Add Store Type")
                          : addDialog.type === "brandType"
                            ? t("Add Brand Type")
                            : t("Add Product")}
        </DialogTitle>
        <DialogContent dividers>
          {message.text && (
            <Fade in={true}>
              <Alert severity={message.type} sx={{ mb: 3 }}>
                {message.text}
              </Alert>
            </Fade>
          )}

          {addDialog.type === "store" && (
            <Box component="form" onSubmit={handleStoreSubmit} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label={t("Store Name")}
                    name="name"
                    value={storeForm.name}
                    onChange={handleStoreFormChange}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <StoreIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Store name (translations)")}
                    value={{
                      english: storeForm.nameEn,
                      arabic: storeForm.nameAr,
                      kurdish: storeForm.nameKu,
                    }}
                    onValueChange={(v) =>
                      setStoreForm((p) => ({
                        ...p,
                        nameEn: v.english,
                        nameAr: v.arabic,
                        nameKu: v.kurdish,
                      }))
                    }
                    sourceText={storeForm.name}
                    aiType="store"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel shrink>{t("Store Type")}</InputLabel>
                    <Select
                      name="storeTypeId"
                      value={storeForm.storeTypeId}
                      onChange={handleStoreFormChange}
                      label={t("Store Type")}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>{t("Select Store Type")}</em>
                      </MenuItem>
                      {storeTypes.map((st) => (
                        <MenuItem key={st._id} value={st._id}>
                          {st.icon || "🏪"} {t(st.name)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t("Store City")}</InputLabel>
                    <Select
                      name="storecity"
                      value={storeForm.storecity}
                      onChange={handleStoreFormChange}
                      label={t("Store City")}
                    >
                      {storeFormCityOptions.map((c) => (
                        <MenuItem key={c.value} value={c.value}>
                          {c.flag} {c.label}
                          {c.inactive
                            ? ` (${t("Inactive", { defaultValue: "Inactive" })})`
                            : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label={t("Address")}
                    name="address"
                    value={storeForm.address}
                    onChange={handleStoreFormChange}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Address (translations)")}
                    value={{
                      english: storeForm.addressEn,
                      arabic: storeForm.addressAr,
                      kurdish: storeForm.addressKu,
                    }}
                    onValueChange={(v) =>
                      setStoreForm((p) => ({
                        ...p,
                        addressEn: v.english,
                        addressAr: v.arabic,
                        addressKu: v.kurdish,
                      }))
                    }
                    sourceText={storeForm.address}
                    aiType="store"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Phone")}
                    name="phone"
                    value={storeForm.phone}
                    onChange={handleStoreFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("WhatsApp")}
                    name="whatsapp"
                    value={storeForm.whatsapp}
                    onChange={handleStoreFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Facebook")}
                    name="facebook"
                    value={storeForm.facebook}
                    onChange={handleStoreFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Instagram")}
                    name="instagram"
                    value={storeForm.instagram}
                    onChange={handleStoreFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("TikTok")}
                    name="tiktok"
                    value={storeForm.tiktok}
                    onChange={handleStoreFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Snapchat")}
                    name="snapchat"
                    value={storeForm.snapchat}
                    onChange={handleStoreFormChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label={t("Google Maps")}
                    name="googleMaps"
                    value={storeForm.googleMaps}
                    onChange={handleStoreFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={t("Apple Maps")}
                    name="appleMaps"
                    value={storeForm.appleMaps}
                    onChange={handleStoreFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={t("Waze")}
                    name="waze"
                    value={storeForm.waze}
                    onChange={handleStoreFormChange}
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Description")}
                    name="description"
                    value={storeForm.description}
                    onChange={handleStoreFormChange}
                    multiline
                    rows={3}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Description (translations)")}
                    value={{
                      english: storeForm.descriptionEn,
                      arabic: storeForm.descriptionAr,
                      kurdish: storeForm.descriptionKu,
                    }}
                    onValueChange={(v) =>
                      setStoreForm((p) => ({
                        ...p,
                        descriptionEn: v.english,
                        descriptionAr: v.arabic,
                        descriptionKu: v.kurdish,
                      }))
                    }
                    sourceText={storeForm.description}
                    aiType="general"
                    multiline
                    minRows={2}
                  />
                </Grid>
                <Grid xs={12}>
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="dialog-store-logo-file"
                    type="file"
                    onChange={handleStoreLogoChange}
                  />
                  <label htmlFor="dialog-store-logo-file">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<AddIcon />}
                    >
                      {selectedStoreLogo
                        ? selectedStoreLogo.name
                        : t("Upload Logo")}
                    </Button>
                  </label>
                </Grid>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="isVip"
                        checked={storeForm.isVip}
                        onChange={(e) =>
                          setStoreForm({
                            ...storeForm,
                            isVip: e.target.checked,
                          })
                        }
                      />
                    }
                    label={t("VIP Store")}
                  />
                </Grid>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="show"
                        checked={storeForm.show}
                        onChange={(e) =>
                          setStoreForm({
                            ...storeForm,
                            show: e.target.checked,
                          })
                        }
                      />
                    }
                    label={t("Show in Store List")}
                  />
                </Grid>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="showingOnStoreBranchShowcase"
                        checked={
                          storeForm.showingOnStoreBranchShowcase !== false
                        }
                        onChange={(e) =>
                          setStoreForm({
                            ...storeForm,
                            showingOnStoreBranchShowcase: e.target.checked,
                          })
                        }
                      />
                    }
                    label={t("Show in branch showcase")}
                  />
                </Grid>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="isHasDelivery"
                        checked={!!storeForm.isHasDelivery}
                        onChange={handleStoreFormChange}
                      />
                    }
                    label={t("Has Delivery")}
                  />
                </Grid>
                {storeForm.isHasDelivery && (
                  <>
                    <Grid xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="deliveryAllCities"
                            checked={!!storeForm.deliveryAllCities}
                            onChange={(e) =>
                              setStoreForm((prev) => ({
                                ...prev,
                                deliveryAllCities: e.target.checked,
                                deliveryCities: e.target.checked
                                  ? []
                                  : prev.deliveryCities,
                              }))
                            }
                          />
                        }
                        label={t("Delivery for all cities")}
                      />
                    </Grid>
                    {!storeForm.deliveryAllCities && (
                      <Grid xs={12}>
                        <Autocomplete
                          multiple
                          disableCloseOnSelect
                          options={deliveryFormCityOptions.map((o) => o.value)}
                          value={storeForm.deliveryCities || []}
                          onChange={(_, v) =>
                            setStoreForm((prev) => ({
                              ...prev,
                              deliveryCities: v,
                            }))
                          }
                          getOptionLabel={(opt) => {
                            const row = deliveryFormCityOptions.find(
                              (o) => o.value === opt,
                            );
                            return row ? row.label : String(opt);
                          }}
                          isOptionEqualToValue={(a, b) => a === b}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={t("Delivery cities")}
                              placeholder={t("Search...")}
                            />
                          )}
                        />
                      </Grid>
                    )}
                  </>
                )}
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Expire date & time")}
                    name="expireDate"
                    type="datetime-local"
                    value={storeForm.expireDate}
                    onChange={handleStoreFormChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t("Status All")}</InputLabel>
                    <Select
                      name="statusAll"
                      value={storeForm.statusAll}
                      onChange={handleStoreFormChange}
                      label={t("Status All")}
                    >
                      <MenuItem value="on">{t("on")}</MenuItem>
                      <MenuItem value="off">{t("off")}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t("Branches")}
                  </Typography>
                  <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={stores}
                    getOptionLabel={(option) => option?.name ?? ""}
                    isOptionEqualToValue={(a, b) =>
                      String(a?._id) === String(b?._id)
                    }
                    value={(storeForm.branches || [])
                      .map((id) =>
                        stores.find((s) => String(s._id) === String(id)),
                      )
                      .filter(Boolean)}
                    onChange={(_, newValue) => {
                      setStoreForm({
                        ...storeForm,
                        branches: newValue.map((s) => String(s._id)),
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("Branch stores")}
                        placeholder={t("Search...")}
                      />
                    )}
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || uploadLoading}
                    startIcon={
                      loading || uploadLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <AddIcon />
                      )
                    }
                    fullWidth
                  >
                    {loading
                      ? t("Creating...")
                      : uploadLoading
                        ? t("Uploading...")
                        : t("Add Store")}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {addDialog.type === "storeType" && (
            <Box
              component="form"
              sx={{ mt: 1 }}
              onSubmit={async (e) => {
                e.preventDefault();
                const name = storeTypeAddForm.name?.trim();
                if (!name) return;
                try {
                  await fetch(`${API_URL}/api/store-types`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name,
                      icon: storeTypeAddForm.icon || "",
                      nameEn: storeTypeAddForm.nameEn?.trim() || "",
                      nameAr: storeTypeAddForm.nameAr?.trim() || "",
                      nameKu: storeTypeAddForm.nameKu?.trim() || "",
                    }),
                  });
                  const res = await storeTypeAPI.getAll();
                  setStoreTypes(res.data || []);
                  setStoreTypeAddForm({ ...EMPTY_TYPE_ADD_FORM });
                  setAddDialog({ open: false, type: "" });
                } catch (e) {}
              }}
            >
              <TextField
                margin="normal"
                name="name"
                label={t("Name")}
                fullWidth
                required
                value={storeTypeAddForm.name}
                onChange={(e) =>
                  setStoreTypeAddForm((p) => ({ ...p, name: e.target.value }))
                }
              />
              <MultilingualFieldGroup
                sectionLabel={t("Store type name (translations)")}
                value={{
                  english: storeTypeAddForm.nameEn,
                  arabic: storeTypeAddForm.nameAr,
                  kurdish: storeTypeAddForm.nameKu,
                }}
                onValueChange={(v) =>
                  setStoreTypeAddForm((p) => ({
                    ...p,
                    nameEn: v.english,
                    nameAr: v.arabic,
                    nameKu: v.kurdish,
                  }))
                }
                sourceText={storeTypeAddForm.name}
                aiType="storeType"
              />
              <TextField
                margin="normal"
                name="icon"
                label={t("Icon")}
                placeholder="e.g. 🛒"
                fullWidth
                value={storeTypeAddForm.icon}
                onChange={(e) =>
                  setStoreTypeAddForm((p) => ({ ...p, icon: e.target.value }))
                }
              />
              <Box sx={{ mt: 2, textAlign: "right" }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                >
                  {t("Save")}
                </Button>
              </Box>
            </Box>
          )}

          {addDialog.type === "brandType" && (
            <Box
              component="form"
              sx={{ mt: 1 }}
              onSubmit={async (e) => {
                e.preventDefault();
                const name = brandTypeAddForm.name?.trim();
                if (!name) return;
                try {
                  await brandTypeAPI.create({
                    name,
                    icon: brandTypeAddForm.icon || "",
                    nameEn: brandTypeAddForm.nameEn?.trim() || "",
                    nameAr: brandTypeAddForm.nameAr?.trim() || "",
                    nameKu: brandTypeAddForm.nameKu?.trim() || "",
                  });
                  const res = await brandTypeAPI.getAll();
                  setBrandTypes(res.data || []);
                  setBrandTypeAddForm({ ...EMPTY_TYPE_ADD_FORM });
                  setAddDialog({ open: false, type: "" });
                } catch (e) {}
              }}
            >
              <TextField
                margin="normal"
                name="name"
                label={t("Name")}
                fullWidth
                required
                value={brandTypeAddForm.name}
                onChange={(e) =>
                  setBrandTypeAddForm((p) => ({ ...p, name: e.target.value }))
                }
              />
              <MultilingualFieldGroup
                sectionLabel={t("Brand type name (translations)")}
                value={{
                  english: brandTypeAddForm.nameEn,
                  arabic: brandTypeAddForm.nameAr,
                  kurdish: brandTypeAddForm.nameKu,
                }}
                onValueChange={(v) =>
                  setBrandTypeAddForm((p) => ({
                    ...p,
                    nameEn: v.english,
                    nameAr: v.arabic,
                    nameKu: v.kurdish,
                  }))
                }
                sourceText={brandTypeAddForm.name}
                aiType="storeBrand"
              />
              <TextField
                margin="normal"
                name="icon"
                label={t("Icon")}
                placeholder="e.g. 🏷️"
                fullWidth
                value={brandTypeAddForm.icon}
                onChange={(e) =>
                  setBrandTypeAddForm((p) => ({ ...p, icon: e.target.value }))
                }
              />
              <Box sx={{ mt: 2, textAlign: "right" }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                >
                  {t("Save")}
                </Button>
              </Box>
            </Box>
          )}

          {(addDialog.type === "brand" || addDialog.type === "company") && (
            <Box component="form" onSubmit={handleBrandSubmit} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={
                      addDialog.type === "company"
                        ? t("Company Name")
                        : t("Brand Name")
                    }
                    name="name"
                    value={brandForm.name}
                    onChange={handleBrandFormChange}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={
                      addDialog.type === "company"
                        ? t("Company name (translations)")
                        : t("Brand name (translations)")
                    }
                    value={{
                      english: brandForm.nameEn,
                      arabic: brandForm.nameAr,
                      kurdish: brandForm.nameKu,
                    }}
                    onValueChange={(v) =>
                      setBrandForm((p) => ({
                        ...p,
                        nameEn: v.english,
                        nameAr: v.arabic,
                        nameKu: v.kurdish,
                      }))
                    }
                    sourceText={brandForm.name}
                    aiType="brand"
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Address")}
                    name="address"
                    value={brandForm.address}
                    onChange={handleBrandFormChange}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Address (translations)")}
                    value={{
                      english: brandForm.addressEn,
                      arabic: brandForm.addressAr,
                      kurdish: brandForm.addressKu,
                    }}
                    onValueChange={(v) =>
                      setBrandForm((p) => ({
                        ...p,
                        addressEn: v.english,
                        addressAr: v.arabic,
                        addressKu: v.kurdish,
                      }))
                    }
                    sourceText={brandForm.address}
                    aiType="brand"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Phone")}
                    name="phone"
                    value={brandForm.phone}
                    onChange={handleBrandFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("WhatsApp")}
                    name="whatsapp"
                    value={brandForm.whatsapp}
                    onChange={handleBrandFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Facebook")}
                    name="facebook"
                    value={brandForm.facebook}
                    onChange={handleBrandFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Instagram")}
                    name="instagram"
                    value={brandForm.instagram}
                    onChange={handleBrandFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("TikTok")}
                    name="tiktok"
                    value={brandForm.tiktok}
                    onChange={handleBrandFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Snapchat")}
                    name="snapchat"
                    value={brandForm.snapchat}
                    onChange={handleBrandFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={t("Google Maps")}
                    name="googleMaps"
                    value={brandForm.googleMaps}
                    onChange={handleBrandFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={t("Apple Maps")}
                    name="appleMaps"
                    value={brandForm.appleMaps}
                    onChange={handleBrandFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={t("Waze")}
                    name="waze"
                    value={brandForm.waze}
                    onChange={handleBrandFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth required>
                    {/* <InputLabel>{t("Brand Type")}</InputLabel> */}
                    <Select
                      name="brandTypeId"
                      value={brandForm.brandTypeId}
                      onChange={handleBrandFormChange}
                      label={t("Brand Type")}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>{t("Select Brand Type")}</em>
                      </MenuItem>
                      {brandTypes.map((bt) => (
                        <MenuItem key={bt._id} value={bt._id}>
                          {bt.icon || "🏷️"} {t(bt.name)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t("City")}</InputLabel>
                    <Select
                      name="storecity"
                      value={brandForm.storecity}
                      onChange={handleBrandFormChange}
                      label={t("City")}
                    >
                      {brandFormCityOptions.map((c) => (
                        <MenuItem key={c.value} value={c.value}>
                          {c.flag} {c.label}
                          {c.inactive
                            ? ` (${t("Inactive", { defaultValue: "Inactive" })})`
                            : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="isHasDelivery"
                        checked={!!brandForm.isHasDelivery}
                        onChange={handleBrandFormChange}
                      />
                    }
                    label={t("Has Delivery")}
                  />
                </Grid>
                {brandForm.isHasDelivery && (
                  <>
                    <Grid xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="deliveryAllCities"
                            checked={!!brandForm.deliveryAllCities}
                            onChange={(e) =>
                              setBrandForm((prev) => ({
                                ...prev,
                                deliveryAllCities: e.target.checked,
                                deliveryCities: e.target.checked
                                  ? []
                                  : prev.deliveryCities,
                              }))
                            }
                          />
                        }
                        label={t("Delivery for all cities")}
                      />
                    </Grid>
                    {!brandForm.deliveryAllCities && (
                      <Grid xs={12}>
                        <Autocomplete
                          multiple
                          disableCloseOnSelect
                          options={deliveryBrandFormCityOptions.map(
                            (o) => o.value,
                          )}
                          value={brandForm.deliveryCities || []}
                          onChange={(_, v) =>
                            setBrandForm((prev) => ({
                              ...prev,
                              deliveryCities: v,
                            }))
                          }
                          getOptionLabel={(opt) => {
                            const row = deliveryBrandFormCityOptions.find(
                              (o) => o.value === opt,
                            );
                            return row ? row.label : String(opt);
                          }}
                          isOptionEqualToValue={(a, b) => a === b}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={t("Delivery cities")}
                              placeholder={t("Search...")}
                            />
                          )}
                        />
                      </Grid>
                    )}
                  </>
                )}
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Description")}
                    name="description"
                    value={brandForm.description}
                    onChange={handleBrandFormChange}
                    multiline
                    rows={3}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Description (translations)")}
                    value={{
                      english: brandForm.descriptionEn,
                      arabic: brandForm.descriptionAr,
                      kurdish: brandForm.descriptionKu,
                    }}
                    onValueChange={(v) =>
                      setBrandForm((p) => ({
                        ...p,
                        descriptionEn: v.english,
                        descriptionAr: v.arabic,
                        descriptionKu: v.kurdish,
                      }))
                    }
                    sourceText={brandForm.description}
                    aiType="general"
                    multiline
                    minRows={2}
                  />
                </Grid>
                <Grid xs={12}>
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="dialog-brand-logo-file"
                    type="file"
                    ref={brandLogoFileRef}
                    onChange={handleBrandLogoChange}
                  />
                  <label htmlFor="dialog-brand-logo-file">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<AddIcon />}
                    >
                      {selectedBrandLogo
                        ? selectedBrandLogo.name
                        : t("Upload Logo")}
                    </Button>
                  </label>
                </Grid>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="isVip"
                        checked={brandForm.isVip}
                        onChange={(e) =>
                          setBrandForm({
                            ...brandForm,
                            isVip: e.target.checked,
                          })
                        }
                      />
                    }
                    label={
                      addDialog.type === "company"
                        ? t("VIP Company")
                        : t("VIP Brand")
                    }
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Expire date & time")}
                    name="expireDate"
                    type="datetime-local"
                    value={brandForm.expireDate}
                    onChange={handleBrandFormChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Select
                      name="statusAll"
                      value={brandForm.statusAll}
                      onChange={handleBrandFormChange}
                      label={t("Status All")}
                    >
                      <MenuItem value="on">{t("on")}</MenuItem>
                      <MenuItem value="off">{t("off")}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || uploadLoading}
                    startIcon={
                      loading || uploadLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <AddIcon />
                      )
                    }
                    fullWidth
                  >
                    {loading
                      ? t("Creating...")
                      : uploadLoading
                        ? t("Uploading...")
                        : addDialog.type === "company"
                          ? t("Add Company")
                          : t("Add Brand")}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {addDialog.type === "product" && (
            <Box component="form" onSubmit={handleProductSubmit} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Product Name")}
                    name="name"
                    value={productForm.name}
                    onChange={handleProductFormChange}
                    required
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
                      english: productForm.nameEn,
                      arabic: productForm.nameAr,
                      kurdish: productForm.nameKu,
                    }}
                    onValueChange={(v) =>
                      setProductForm((p) => ({
                        ...p,
                        nameEn: v.english,
                        nameAr: v.arabic,
                        nameKu: v.kurdish,
                      }))
                    }
                    sourceText={productForm.name}
                    aiType="product"
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Description")}
                    name="description"
                    value={productForm.description}
                    onChange={handleProductFormChange}
                    multiline
                    rows={3}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Description (translations)")}
                    value={{
                      english: productForm.descriptionEn,
                      arabic: productForm.descriptionAr,
                      kurdish: productForm.descriptionKu,
                    }}
                    onValueChange={(v) =>
                      setProductForm((p) => ({
                        ...p,
                        descriptionEn: v.english,
                        descriptionAr: v.arabic,
                        descriptionKu: v.kurdish,
                      }))
                    }
                    sourceText={productForm.description}
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
                    value={productForm.barcode}
                    onChange={handleProductFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Previous Price")}
                    name="previousPrice"
                    type="number"
                    inputProps={{ min: 0, step: "any" }}
                    value={productForm.previousPrice}
                    onChange={handleProductFormChange}
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
                    value={productForm.newPrice}
                    onChange={handleProductFormChange}
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
                    value={productForm.weight}
                    onChange={handleProductFormChange}
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
                          checked={productForm.isDiscount}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              isDiscount: e.target.checked,
                            })
                          }
                        />
                      }
                      label={t("Is Discount Product")}
                    />
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  <DataEntryEntityIdsAutocomplete
                    sx={{ width: "100%" }}
                    label={t("Stores")}
                    options={stores}
                    valueIds={productForm.storeIds || []}
                    onChangeIds={(ids) =>
                      setProductForm((prev) => ({ ...prev, storeIds: ids }))
                    }
                    placeholder={t("Select stores", {
                      defaultValue: "Select stores",
                    })}
                  />
                </Grid>
                {(productForm.storeIds || []).length > 0 ? (
                  <Grid xs={12}>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      {t("Store types", { defaultValue: "Store types" })}:{" "}
                      {(productForm.storeIds || [])
                        .map((sid) => {
                          const st = stores.find(
                            (s) => String(s._id) === String(sid),
                          );
                          const ty = st?.storeTypeId;
                          const typeLabel =
                            ty && typeof ty === "object" && ty.name
                              ? `${ty.icon || "🏪"} ${t(ty.name)}`
                              : t("—", { defaultValue: "—" });
                          return st ? `${st.name}: ${typeLabel}` : "";
                        })
                        .filter(Boolean)
                        .join(" · ")}
                    </Typography>
                  </Grid>
                ) : null}
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel shrink>{t("Status")}</InputLabel>
                    <Select
                      name="status"
                      value={productForm.status || "published"}
                      onChange={handleProductFormChange}
                      label={t("Status")}
                      displayEmpty
                    >
                      <MenuItem value="published">{t("Published")}</MenuItem>
                      <MenuItem value="pending">{t("Pending")}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Brand")}
                    options={brands}
                    valueId={productForm.brandId}
                    onChangeId={(id) =>
                      setProductForm((p) => ({ ...p, brandId: id }))
                    }
                    placeholder={t("Select Brand")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Company")}
                    options={companies}
                    valueId={productForm.companyId || ""}
                    onChangeId={(id) =>
                      setProductForm((p) => ({ ...p, companyId: id }))
                    }
                    placeholder={t("Select Company")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Select
                      name="categoryId"
                      value={productForm.categoryId}
                      onChange={handleProductFormChange}
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
                      value={productForm.categoryTypeId ?? ""}
                      onChange={handleProductFormChange}
                      label={t("Category Type")}
                      displayEmpty
                      disabled={!productForm.categoryId}
                    >
                      <MenuItem value="">
                        <em>{t("Select Category Type")}</em>
                      </MenuItem>
                      {categoryTypes.map((type) => (
                        <MenuItem key={type._id} value={type._id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Expire date & time")}
                    name="expireDate"
                    type="datetime-local"
                    value={productForm.expireDate}
                    onChange={handleProductFormChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid xs={12}>
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="dialog-product-image-file"
                    type="file"
                    ref={productImageFileRef}
                    onChange={handleProductImageChange}
                  />
                  <label htmlFor="dialog-product-image-file">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<AddIcon />}
                    >
                      {selectedProductImage
                        ? selectedProductImage.name
                        : t("Upload Image")}
                    </Button>
                  </label>
                </Grid>
                <Grid xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || uploadLoading}
                    startIcon={
                      loading || uploadLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <SaveIcon />
                      )
                    }
                    fullWidth
                  >
                    {loading
                      ? t("Creating...")
                      : uploadLoading
                        ? t("Uploading...")
                        : t("Add Product")}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {addDialog.type === "gift" && (
            <Box component="form" onSubmit={handleGiftSubmit} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="dialog-gift-image"
                    type="file"
                    onChange={handleGiftImageChange}
                    ref={giftImageFileRef}
                  />
                  <label htmlFor="dialog-gift-image">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<AddIcon />}
                      sx={{ mb: 2 }}
                    >
                      {selectedGiftImage
                        ? selectedGiftImage.name
                        : t("Select Gift Image")}
                    </Button>
                  </label>
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Description")}
                    name="description"
                    value={giftForm.description}
                    onChange={handleGiftFormChange}
                    required
                    multiline
                    rows={3}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Gift description (translations)")}
                    value={{
                      english: giftForm.descriptionEn,
                      arabic: giftForm.descriptionAr,
                      kurdish: giftForm.descriptionKu,
                    }}
                    onValueChange={(v) =>
                      setGiftForm((p) => ({
                        ...p,
                        descriptionEn: v.english,
                        descriptionAr: v.arabic,
                        descriptionKu: v.kurdish,
                      }))
                    }
                    sourceText={giftForm.description}
                    aiType="gift"
                    multiline
                    minRows={2}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityIdsAutocomplete
                    label={t("Stores")}
                    options={stores}
                    valueIds={giftForm.storeId}
                    onChangeIds={(ids) =>
                      setGiftForm((p) => ({ ...p, storeId: ids }))
                    }
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Brand")}
                    options={brands}
                    valueId={giftForm.brandId}
                    onChangeId={(id) =>
                      setGiftForm((p) => ({ ...p, brandId: id }))
                    }
                    placeholder={t("select brand")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Company")}
                    options={companies}
                    valueId={giftForm.companyId || ""}
                    onChangeId={(id) =>
                      setGiftForm((p) => ({ ...p, companyId: id }))
                    }
                    placeholder={t("select company")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Product ID (Barcode)")}
                    name="productId"
                    value={giftForm.productId}
                    onChange={handleGiftFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Expire date & time")}
                    name="expireDate"
                    type="datetime-local"
                    value={giftForm.expireDate}
                    onChange={handleGiftFormChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading || uploadLoading}
                    startIcon={
                      loading || uploadLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <SaveIcon />
                      )
                    }
                  >
                    {loading || uploadLoading
                      ? t("Creating...")
                      : t("Create Gift")}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {addDialog.type === "category" && (
            <Box
              component="form"
              onSubmit={handleCategorySubmit}
              sx={{ mt: 1 }}
            >
              <Grid container spacing={2}>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Category Name")}
                    name="name"
                    value={categoryForm.name}
                    onChange={handleCategoryFormChange}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CategoryIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Category name (translations)")}
                    value={{
                      english: categoryForm.nameEn,
                      arabic: categoryForm.nameAr,
                      kurdish: categoryForm.nameKu,
                    }}
                    onValueChange={(v) =>
                      setCategoryForm((p) => ({
                        ...p,
                        nameEn: v.english,
                        nameAr: v.arabic,
                        nameKu: v.kurdish,
                      }))
                    }
                    sourceText={categoryForm.name}
                    aiType="category"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t("Store Type")}</InputLabel>
                    <Select
                      name="storeTypeId"
                      value={categoryForm.storeTypeId || ""}
                      onChange={handleCategoryFormChange}
                      label={t("Store Type")}
                    >
                      <MenuItem value="">
                        <em>{t("Select Store Type")}</em>
                      </MenuItem>
                      {storeTypes.map((st) => (
                        <MenuItem key={st._id} value={st._id}>
                          {st.icon || "🏪"} {t(st.name)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Category description (optional)")}
                    name="description"
                    value={categoryForm.description}
                    onChange={handleCategoryFormChange}
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Category description (translations)")}
                    value={{
                      english: categoryForm.descriptionEn,
                      arabic: categoryForm.descriptionAr,
                      kurdish: categoryForm.descriptionKu,
                    }}
                    onValueChange={(v) =>
                      setCategoryForm((p) => ({
                        ...p,
                        descriptionEn: v.english,
                        descriptionAr: v.arabic,
                        descriptionKu: v.kurdish,
                      }))
                    }
                    sourceText={categoryForm.description}
                    aiType="general"
                    multiline
                    minRows={2}
                  />
                </Grid>
                <Grid xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {t("Category Types")}
                  </Typography>
                  {categoryForm.types.map((type, index) => {
                    const row = normalizeCategoryTypeRow(type);
                    return (
                      <Box
                        key={index}
                        sx={{
                          mb: 2,
                          p: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          bgcolor: "action.hover",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          <TextField
                            sx={{ flex: "1 1 240px", minWidth: 0 }}
                            label={`${t("Type name (primary)")} ${index + 1}`}
                            value={row.name}
                            onChange={(e) =>
                              handleCategoryTypeChange(index, e.target.value)
                            }
                            placeholder={t("Enter category type name")}
                          />
                          <IconButton
                            onClick={() => removeCategoryType(index)}
                            disabled={categoryForm.types.length === 1}
                            color="error"
                            sx={{ mt: 0.5 }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <MultilingualFieldGroup
                          sectionLabel={t("Category type name (translations)")}
                          value={{
                            english: row.nameEn,
                            arabic: row.nameAr,
                            kurdish: row.nameKu,
                          }}
                          onValueChange={(v) =>
                            updateCategoryFormTypeField(index, {
                              nameEn: v.english,
                              nameAr: v.arabic,
                              nameKu: v.kurdish,
                            })
                          }
                          sourceText={row.name}
                          aiType="categoryType"
                        />
                        <TextField
                          fullWidth
                          sx={{ mt: 1 }}
                          label={t("Type description (optional)")}
                          value={row.description}
                          onChange={(e) =>
                            updateCategoryFormTypeField(index, {
                              description: e.target.value,
                            })
                          }
                          multiline
                          rows={2}
                        />
                        <MultilingualFieldGroup
                          sectionLabel={t(
                            "Category type description (translations)",
                          )}
                          value={{
                            english: row.descriptionEn,
                            arabic: row.descriptionAr,
                            kurdish: row.descriptionKu,
                          }}
                          onValueChange={(v) =>
                            updateCategoryFormTypeField(index, {
                              descriptionEn: v.english,
                              descriptionAr: v.arabic,
                              descriptionKu: v.kurdish,
                            })
                          }
                          sourceText={row.description}
                          aiType="general"
                          multiline
                          minRows={2}
                        />
                      </Box>
                    );
                  })}
                  <Button
                    variant="outlined"
                    onClick={addCategoryType}
                    startIcon={<AddIcon />}
                    sx={{ mt: 1 }}
                  >
                    {t("Add Category Type")}
                  </Button>
                </Grid>
                <Grid xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    startIcon={
                      loading ? <CircularProgress size={20} /> : <SaveIcon />
                    }
                    fullWidth
                  >
                    {loading ? t("Creating...") : t("Create Category")}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {addDialog.type === "ad" && (
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                handleAdSubmit();
              }}
              sx={{ mt: 1 }}
            >
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="dialog-ad-image-file"
                    type="file"
                    ref={adImageFileRef}
                    onChange={(e) =>
                      setSelectedAdImage(e.target.files?.[0] || null)
                    }
                  />
                  <label htmlFor="dialog-ad-image-file">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<AddIcon />}
                    >
                      {selectedAdImage
                        ? selectedAdImage.name
                        : t("Upload Image")}
                    </Button>
                  </label>
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t("Pages")}</InputLabel>
                    <Select
                      multiple
                      name="pages"
                      value={adForm.pages}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAdForm({
                          ...adForm,
                          pages: Array.isArray(val)
                            ? val
                            : String(val).split(","),
                        });
                      }}
                      label={t("Pages")}
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={t(
                                value.charAt(0).toUpperCase() + value.slice(1),
                              )}
                              size="small"
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {["all", "home", "brands", "stores", "gifts"].map((p) => (
                        <MenuItem key={p} value={p}>
                          {t(p.charAt(0).toUpperCase() + p.slice(1))}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Link URL")}
                    value={adForm.linkUrl}
                    onChange={(e) =>
                      setAdForm({ ...adForm, linkUrl: e.target.value })
                    }
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Brand")}
                    options={brands}
                    valueId={adForm.brandId}
                    onChangeId={(id) =>
                      setAdForm((p) => ({ ...p, brandId: id }))
                    }
                    placeholder={t("select brand")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Store")}
                    options={stores}
                    valueId={adForm.storeId}
                    onChangeId={(id) =>
                      setAdForm((p) => ({ ...p, storeId: id }))
                    }
                    placeholder={t("select store")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Select
                      name="giftId"
                      value={adForm.giftId}
                      onChange={(e) =>
                        setAdForm({ ...adForm, giftId: e.target.value })
                      }
                      label={t("Gift")}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>{t("select gift")}</em>
                      </MenuItem>
                      {gifts.map((g) => (
                        <MenuItem key={g._id} value={g._id}>
                          {g.description?.slice(0, 40) || g._id}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label={t("Start Date")}
                    InputLabelProps={{ shrink: true }}
                    value={adForm.startDate}
                    onChange={(e) =>
                      setAdForm({ ...adForm, startDate: e.target.value })
                    }
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label={t("End Date")}
                    InputLabelProps={{ shrink: true }}
                    value={adForm.endDate}
                    onChange={(e) =>
                      setAdForm({ ...adForm, endDate: e.target.value })
                    }
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t("Priority")}
                    value={adForm.priority}
                    onChange={(e) =>
                      setAdForm({ ...adForm, priority: Number(e.target.value) })
                    }
                  />
                </Grid>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={adForm.active}
                        onChange={(e) =>
                          setAdForm({ ...adForm, active: e.target.checked })
                        }
                      />
                    }
                    label={t("Active")}
                  />
                </Grid>
                <Grid xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || uploadLoading}
                    startIcon={
                      loading || uploadLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <AddIcon />
                      )
                    }
                    fullWidth
                  >
                    {loading || uploadLoading ? t("Creating...") : t("Add Ad")}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {addDialog.type === "job" && (
            <Box component="form" onSubmit={handleJobSubmit} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="dialog-job-image-file"
                    type="file"
                    onChange={(e) =>
                      setSelectedJobImage(e.target.files?.[0] || null)
                    }
                  />
                  <label htmlFor="dialog-job-image-file">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<AddIcon />}
                    >
                      {selectedJobImage
                        ? selectedJobImage.name
                        : t("Upload Image")}
                    </Button>
                  </label>
                </Grid>

                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Title")}
                    value={jobForm.title}
                    onChange={(e) =>
                      setJobForm((p) => ({ ...p, title: e.target.value }))
                    }
                    required
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Job title (translations)")}
                    value={{
                      english: jobForm.titleEn,
                      arabic: jobForm.titleAr,
                      kurdish: jobForm.titleKu,
                    }}
                    onValueChange={(v) =>
                      setJobForm((p) => ({
                        ...p,
                        titleEn: v.english,
                        titleAr: v.arabic,
                        titleKu: v.kurdish,
                      }))
                    }
                    sourceText={jobForm.title}
                    aiType="job"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t("Gender")}</InputLabel>
                    <Select
                      value={jobForm.gender || "any"}
                      label={t("Gender")}
                      onChange={(e) =>
                        setJobForm((p) => ({ ...p, gender: e.target.value }))
                      }
                    >
                      <MenuItem value="any">{t("Any")}</MenuItem>
                      <MenuItem value="male">{t("Male")}</MenuItem>
                      <MenuItem value="female">{t("Female")}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>{t("City")}</InputLabel>
                    <Select
                      value={jobForm.city || ""}
                      label={t("City")}
                      onChange={(e) =>
                        setJobForm((p) => ({ ...p, city: e.target.value }))
                      }
                    >
                      {jobFormCityOptions.map((c) => (
                        <MenuItem
                          key={c.value}
                          value={c.value}
                          disabled={c.inactive}
                        >
                          {c.flag ? `${c.flag} ` : ""}
                          {c.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Store")}
                    options={stores}
                    valueId={jobForm.storeId || ""}
                    disabled={Boolean(jobForm.brandId || jobForm.companyId)}
                    onChangeId={(id) =>
                      setJobForm((p) => ({
                        ...p,
                        storeId: id,
                        brandId: "",
                        companyId: "",
                      }))
                    }
                    placeholder={t("select store")}
                  />
                </Grid>

                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Brand")}
                    options={brands}
                    valueId={jobForm.brandId || ""}
                    disabled={Boolean(jobForm.storeId)}
                    onChangeId={(id) =>
                      setJobForm((p) => ({
                        ...p,
                        brandId: id,
                        storeId: "",
                        companyId: "",
                      }))
                    }
                    placeholder={t("select brand")}
                  />
                </Grid>

                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Company")}
                    options={companies}
                    valueId={jobForm.companyId || ""}
                    disabled={Boolean(jobForm.storeId || jobForm.brandId)}
                    onChangeId={(id) =>
                      setJobForm((p) => ({
                        ...p,
                        companyId: id,
                        storeId: "",
                        brandId: "",
                      }))
                    }
                    placeholder={t("select company")}
                  />
                </Grid>

                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Job WhatsApp")}
                    placeholder={t(
                      "WhatsApp number for applicants (with country code)",
                    )}
                    value={jobForm.whatsapp || ""}
                    onChange={(e) =>
                      setJobForm((p) => ({ ...p, whatsapp: e.target.value }))
                    }
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="email"
                    label={t("Job contact email")}
                    placeholder="name@example.com"
                    value={jobForm.email || ""}
                    onChange={(e) =>
                      setJobForm((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Job type")}
                    placeholder={t("e.g. Full-time, Contract")}
                    value={jobForm.jobType || ""}
                    onChange={(e) =>
                      setJobForm((p) => ({ ...p, jobType: e.target.value }))
                    }
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Indeed")}
                    placeholder={t("Indeed URL or job ID")}
                    value={jobForm.indeed || ""}
                    onChange={(e) =>
                      setJobForm((p) => ({ ...p, indeed: e.target.value }))
                    }
                  />
                </Grid>

                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label={t("Expire date & time")}
                    InputLabelProps={{ shrink: true }}
                    value={jobForm.expireDate || ""}
                    onChange={(e) =>
                      setJobForm((p) => ({ ...p, expireDate: e.target.value }))
                    }
                  />
                </Grid>

                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Description")}
                    value={jobForm.description}
                    onChange={(e) =>
                      setJobForm((p) => ({ ...p, description: e.target.value }))
                    }
                    required
                    multiline
                    minRows={3}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Job description (translations)")}
                    value={{
                      english: jobForm.descriptionEn,
                      arabic: jobForm.descriptionAr,
                      kurdish: jobForm.descriptionKu,
                    }}
                    onValueChange={(v) =>
                      setJobForm((p) => ({
                        ...p,
                        descriptionEn: v.english,
                        descriptionAr: v.arabic,
                        descriptionKu: v.kurdish,
                      }))
                    }
                    sourceText={jobForm.description}
                    aiType="job"
                    multiline
                    minRows={2}
                  />
                </Grid>

                <Grid xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || uploadLoading}
                    startIcon={
                      loading ? <CircularProgress size={20} /> : <SaveIcon />
                    }
                    fullWidth
                  >
                    {loading
                      ? t("Saving...")
                      : editingJobId
                        ? t("Save Changes")
                        : t("Create Job")}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {addDialog.type === "video" && (
            <Box component="form" onSubmit={handleVideoSubmit} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    required
                    label={t("Video Title")}
                    value={videoForm.title}
                    onChange={(e) =>
                      setVideoForm({ ...videoForm, title: e.target.value })
                    }
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Reel title (translations)")}
                    value={{
                      english: videoForm.titleEn,
                      arabic: videoForm.titleAr,
                      kurdish: videoForm.titleKu,
                    }}
                    onValueChange={(v) =>
                      setVideoForm((p) => ({
                        ...p,
                        titleEn: v.english,
                        titleAr: v.arabic,
                        titleKu: v.kurdish,
                      }))
                    }
                    sourceText={videoForm.title}
                    aiType="reel"
                  />
                </Grid>
                <Grid xs={12}>
                  <input
                    accept="video/*"
                    style={{ display: "none" }}
                    id="dialog-video-file"
                    type="file"
                    ref={videoFileRef}
                    onChange={handleVideoFileChange}
                  />
                  <label htmlFor="dialog-video-file">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<VideoLibraryIcon />}
                    >
                      {selectedVideoFile
                        ? selectedVideoFile.name
                        : editingVideoId
                          ? t("Change Video (optional)")
                          : t("Upload Video")}
                    </Button>
                  </label>
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Store")}
                    options={stores}
                    valueId={videoForm.storeId}
                    disabled={Boolean(
                      videoForm.brandId || videoForm.companyId,
                    )}
                    onChangeId={(id) =>
                      setVideoForm((vf) => ({
                        ...vf,
                        storeId: id,
                        brandId: id ? "" : vf.brandId,
                      }))
                    }
                    placeholder={t("select store")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Brand")}
                    options={brands}
                    valueId={videoForm.brandId}
                    disabled={Boolean(
                      videoForm.storeId || videoForm.companyId,
                    )}
                    onChangeId={(id) =>
                      setVideoForm((vf) => ({
                        ...vf,
                        brandId: id,
                        companyId: "",
                        storeId: id ? "" : vf.storeId,
                      }))
                    }
                    placeholder={t("select brand")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Company")}
                    options={companies}
                    valueId={videoForm.companyId || ""}
                    disabled={Boolean(videoForm.storeId || videoForm.brandId)}
                    onChangeId={(id) =>
                      setVideoForm((vf) => ({
                        ...vf,
                        companyId: id,
                        brandId: "",
                        storeId: id ? "" : vf.storeId,
                      }))
                    }
                    placeholder={t("select company")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label={t("Expire date & time")}
                    InputLabelProps={{ shrink: true }}
                    value={videoForm.expireDate}
                    onChange={(e) =>
                      setVideoForm({ ...videoForm, expireDate: e.target.value })
                    }
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t("Like")}
                    value={videoForm.like}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        like: Number(e.target.value),
                      })
                    }
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t("Views")}
                    value={videoForm.views}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        views: Number(e.target.value),
                      })
                    }
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t("Shares")}
                    value={videoForm.shares}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        shares: Number(e.target.value),
                      })
                    }
                  />
                </Grid>
                <Grid xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || uploadLoading}
                    startIcon={
                      loading || uploadLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <SaveIcon />
                      )
                    }
                    fullWidth
                  >
                    {loading || uploadLoading
                      ? t("Uploading...")
                      : editingVideoId
                        ? t("Update Reel")
                        : t("Add Reel")}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddDialog({ open: false, type: "" });
              if (addDialog.type === "video") {
                setEditingVideoId("");
                setVideoForm(defaultVideoForm);
                setSelectedVideoFile(null);
              }
            }}
          >
            {t("Close")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog
        open={bulkDialog.open}
        onClose={() => setBulkDialog({ open: false, type: "" })}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          {bulkDialog.type === "brand"
            ? t("Bulk Upload")
            : bulkDialog.type === "store"
              ? t("Bulk Upload")
              : t("Bulk Upload")}
        </DialogTitle>
        <DialogContent dividers>
          {bulkDialog.type === "store" && (
            <Box sx={{ p: 1 }}>
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <input
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    id="bulk-store-excel-file"
                    type="file"
                    onChange={handleStoreExcelFileChange}
                  />
                  <label htmlFor="bulk-store-excel-file">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<AddIcon />}
                      sx={{ mb: 2 }}
                    >
                      {selectedStoreExcelFile
                        ? selectedStoreExcelFile.name
                        : t("Select Excel File")}
                    </Button>
                  </label>
                </Grid>
                <Grid xs={12}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const sampleData = [
                        ["Name", "Logo", "Address", "Phone", "Description"],
                        [
                          "Sample Store",
                          "logo_url_here",
                          "Sample Address",
                          "+1234567890",
                          "Sample description",
                        ],
                      ];
                      const csvContent = sampleData
                        .map((row) => row.join(","))
                        .join("\n");
                      const blob = new Blob([csvContent], { type: "text/csv" });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "store_template.csv";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    }}
                    fullWidth
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 2 }}
                  >
                    {t("Download Template")}
                  </Button>
                </Grid>
                <Grid xs={12}>
                  <Button
                    onClick={handleStoreBulkUpload}
                    variant="contained"
                    disabled={storeBulkUploadLoading || !selectedStoreExcelFile}
                    startIcon={
                      storeBulkUploadLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <AddIcon />
                      )
                    }
                    fullWidth
                  >
                    {storeBulkUploadLoading
                      ? t("Uploading...")
                      : t("Upload Stores")}
                  </Button>
                </Grid>
                <Grid xs={12}>
                  <Typography variant="body2" sx={{ color: "#B08463", mt: 2 }}>
                    <strong>{t("Excel Format:")}</strong>
                    <br />• {t("Column A: Name (required)")}
                    <br />• {t("Column B: Logo (optional)")}
                    <br />• {t("Column C: Address (optional)")}
                    <br />• {t("Column D: Phone (optional)")}
                    <br />• {t("Column E: Description (optional)")}
                    <br />•{" "}
                    {t(
                      "Column F: Show in Store List (true/false, default: true)",
                    )}
                    <br />•{" "}
                    {t(
                      "Column G: Branches (JSON format: [{'name':'Branch1','address':'Address1'}])",
                    )}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {bulkDialog.type === "brand" && (
            <Box sx={{ p: 1 }}>
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <input
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    id="bulk-brand-excel-file"
                    type="file"
                    onChange={handleBrandExcelFileChange}
                  />
                  <label htmlFor="bulk-brand-excel-file">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<AddIcon />}
                      sx={{ mb: 2 }}
                    >
                      {selectedBrandExcelFile
                        ? selectedBrandExcelFile.name
                        : t("Select Excel File")}
                    </Button>
                  </label>
                </Grid>
                <Grid xs={12}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const sampleData = [
                        ["Name", "Logo", "Address", "Phone", "Description"],
                        [
                          "Sample Brand",
                          "logo_url_here",
                          "Sample Address",
                          "+1234567890",
                          "Sample description",
                        ],
                      ];
                      const csvContent = sampleData
                        .map((row) => row.join(","))
                        .join("\n");
                      const blob = new Blob([csvContent], { type: "text/csv" });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "brand_template.csv";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    }}
                    fullWidth
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 2 }}
                  >
                    {t("Download Template")}
                  </Button>
                </Grid>
                <Grid xs={12}>
                  <Button
                    onClick={handleBrandBulkUpload}
                    variant="contained"
                    disabled={brandBulkUploadLoading || !selectedBrandExcelFile}
                    startIcon={
                      brandBulkUploadLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <AddIcon />
                      )
                    }
                    fullWidth
                  >
                    {brandBulkUploadLoading
                      ? t("Uploading...")
                      : t("Upload Brands")}
                  </Button>
                </Grid>
                <Grid xs={12}>
                  <Typography variant="body2" sx={{ color: "#B08463", mt: 2 }}>
                    <strong>{t("Excel Format:")}</strong>
                    <br />• {t("Column A: Name (required)")}
                    <br />• {t("Column B: Logo (optional)")}
                    <br />• {t("Column C: Address (optional)")}
                    <br />• {t("Column D: Phone (optional)")}
                    <br />• {t("Column E: Description (optional)")}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {bulkDialog.type === "product" && (
            <Box sx={{ p: 1 }}>
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <DataEntryEntityIdsAutocomplete
                    sx={{ width: "100%" }}
                    label={t("Stores")}
                    options={stores}
                    valueIds={bulkProductStoreIds}
                    onChangeIds={setBulkProductStoreIds}
                    placeholder={t("Use Store ID from Excel column I only", {
                      defaultValue:
                        "Use Store ID from Excel column I only",
                    })}
                    textFieldProps={{ size: "small" }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    {t(
                      "If you select stores here, each data row is created once per store; store type comes from each store. Leave empty to use column I only.",
                      {
                        defaultValue:
                          "If you select stores here, each data row is created once per store; store type comes from each store. Leave empty to use column I only.",
                      },
                    )}
                  </Typography>
                </Grid>
                <Grid xs={12}>
                  <input
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    id="bulk-product-excel-file"
                    type="file"
                    onChange={handleExcelFileChange}
                  />
                  <label htmlFor="bulk-product-excel-file">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<AddIcon />}
                      sx={{ mb: 2 }}
                    >
                      {selectedExcelFile
                        ? selectedExcelFile.name
                        : t("Select Excel File")}
                    </Button>
                  </label>
                </Grid>
                <Grid xs={12}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      // Must match backend parsing order in `routes/product.js` bulk-upload (row[0..])
                      const sheetData = [
                        [
                          "Barcode",
                          "Name",
                          "Category ID",
                          "Category Type ID",
                          "Previous Price",
                          "New Price",
                          "Is Discount",
                          "Brand ID",
                          "Store ID",
                          "Description",
                          "Expire Date",
                          "Weight",
                          "Store Type (optional name)",
                        ],
                        [
                          "123456789",
                          "Sample Product",
                          "",
                          "",
                          "100",
                          "80",
                          "true",
                          "brand_id_here",
                          "store_id_here",
                          "Sample description",
                          "2026-12-31",
                          "500g",
                          "Electronics",
                        ],
                      ];

                      const workbook = XLSX.utils.book_new();
                      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
                      worksheet["!cols"] = sheetData[0].map((h) => ({
                        wch: Math.max(14, String(h || "").length + 2),
                      }));
                      XLSX.utils.book_append_sheet(
                        workbook,
                        worksheet,
                        "Products",
                      );
                      XLSX.writeFile(workbook, "product_template.xlsx");
                    }}
                    fullWidth
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 2 }}
                  >
                    {t("Download Template")}
                  </Button>
                </Grid>
                <Grid xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={bulkUploadLoading || !selectedExcelFile}
                    startIcon={
                      bulkUploadLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <AddIcon />
                      )
                    }
                    fullWidth
                    onClick={(e) => {
                      e.preventDefault();
                      // reuse the existing bulk upload submit handler
                      const fakeEvent = { preventDefault: () => {} };
                      handleBulkUpload(fakeEvent);
                    }}
                  >
                    {bulkUploadLoading
                      ? t("Uploading...")
                      : t("Upload Products")}
                  </Button>
                </Grid>
                <Grid xs={12}>
                  <Typography variant="body2" sx={{ color: "#B08463", mt: 2 }}>
                    <strong>{t("Excel Format:")}</strong>
                    <br />• {t("Column A: Barcode (optional)")}
                    <br />• {t("Column B: Name (required)")}
                    <br />• {t("Column C: Category ID (optional)")}
                    <br />• {t("Column D: Category Type ID (optional)")}
                    <br />• {t("Column E: Previous Price (optional)")}
                    <br />• {t("Column F: New Price (optional)")}
                    <br />• {t("Column G: Is Discount (required)")}
                    <br />• {t("Column H: Brand ID (optional)")}
                    <br />•{" "}
                    {t(
                      "Column I: Store ID (optional — leave blank with no stores above to create products without a store)",
                      {
                        defaultValue:
                          "Column I: Store ID (optional — leave blank with no stores above to create products without a store)",
                      },
                    )}
                    <br />• {t("Column J: Description (optional)")}
                    <br />•{" "}
                    {t("Column K: Expire Date (optional, YYYY-MM-DD format)")}
                    <br />• {t("Column L: Weight (optional)")}
                    <br />• {t("Column M: Store Type (optional, name)")}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialog({ open: false, type: "" })}>
            {t("Close")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, type: "", data: null })}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          {t(
            editDialog.type === "brand"
              ? "Edit Brand"
              : editDialog.type === "company"
                ? "Edit Company"
                : editDialog.type === "store"
                  ? "Edit Store"
                  : editDialog.type === "gift"
                    ? "Edit Gift"
                    : editDialog.type === "storeType"
                      ? "Edit Store Type"
                      : editDialog.type === "brandType"
                        ? "Edit Brand Type"
                        : "Edit Product",
          )}
        </DialogTitle>
        <DialogContent dividers>
          {editDialog.type === "brand" || editDialog.type === "company" ? (
            <Box component="form" sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={
                      editDialog.type === "company"
                        ? t("Company Name")
                        : t("Brand Name")
                    }
                    name="name"
                    value={editForm.name}
                    onChange={handleEditFormChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={
                      editDialog.type === "company"
                        ? t("Company name (translations)")
                        : t("Brand name (translations)")
                    }
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
                    aiType="brand"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel shrink>{t("Brand Type")}</InputLabel>
                    <Select
                      name="brandTypeId"
                      value={editForm.brandTypeId || ""}
                      onChange={handleEditFormChange}
                      label={t("Brand Type")}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>{t("Select Brand Type")}</em>
                      </MenuItem>
                      {brandTypes.map((bt) => (
                        <MenuItem key={bt._id} value={bt._id}>
                          {bt.icon || "🏷️"} {t(bt.name)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  {/* Image Upload */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t("Upload New Logo:")}
                    </Typography>
                    <input
                      accept="image/*"
                      style={{ display: "none" }}
                      id="edit-brand-logo-upload"
                      type="file"
                      onChange={handleEditImageChange}
                    />
                    <label htmlFor="edit-brand-logo-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<CloudUploadIcon />}
                        sx={{ mb: 1 }}
                      >
                        {t("Choose Image")}
                      </Button>
                    </label>
                    {selectedEditImage && (
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
                    )}
                  </Box>
                </Grid>
                {/* legacy type selector removed in favor of brandTypeId */}
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Address")}
                    name="address"
                    value={editForm.address}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Address (translations)")}
                    value={{
                      english: editForm.addressEn || "",
                      arabic: editForm.addressAr || "",
                      kurdish: editForm.addressKu || "",
                    }}
                    onValueChange={(v) =>
                      setEditForm((prev) => ({
                        ...prev,
                        addressEn: v.english,
                        addressAr: v.arabic,
                        addressKu: v.kurdish,
                      }))
                    }
                    sourceText={editForm.address || ""}
                    aiType="brand"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Phone")}
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("WhatsApp")}
                    name="whatsapp"
                    value={editForm.whatsapp || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Facebook")}
                    name="facebook"
                    value={editForm.facebook || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Instagram")}
                    name="instagram"
                    value={editForm.instagram || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("TikTok")}
                    name="tiktok"
                    value={editForm.tiktok || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Snapchat")}
                    name="snapchat"
                    value={editForm.snapchat || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={t("Google Maps")}
                    name="googleMaps"
                    value={editForm.googleMaps || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={t("Apple Maps")}
                    name="appleMaps"
                    value={editForm.appleMaps || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={t("Waze")}
                    name="waze"
                    value={editForm.waze || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t("City")}</InputLabel>
                    <Select
                      name="storecity"
                      value={editForm.storecity || "Erbil"}
                      onChange={handleEditFormChange}
                      label={t("City")}
                    >
                      {editFormCityOptions.map((c) => (
                        <MenuItem key={c.value} value={c.value}>
                          {c.flag} {c.label}
                          {c.inactive
                            ? ` (${t("Inactive", { defaultValue: "Inactive" })})`
                            : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  <Box sx={{ mt: 0 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="isHasDelivery"
                          checked={!!editForm.isHasDelivery}
                          onChange={(e) =>
                            setEditForm((prev) => {
                              const on = e.target.checked;
                              if (!on) {
                                return {
                                  ...prev,
                                  isHasDelivery: false,
                                  deliveryAllCities: false,
                                  deliveryCities: [],
                                };
                              }
                              return mergeDeliveryCitiesWithStoreCityFirst({
                                ...prev,
                                isHasDelivery: true,
                              });
                            })
                          }
                        />
                      }
                      label={t("Has Delivery")}
                    />
                  </Box>
                </Grid>
                {editForm.isHasDelivery && (
                  <Grid xs={12}>
                    <Box sx={{ mt: 0 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="deliveryAllCities"
                            checked={!!editForm.deliveryAllCities}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                deliveryAllCities: e.target.checked,
                                deliveryCities: e.target.checked
                                  ? []
                                  : prev.deliveryCities || [],
                              }))
                            }
                          />
                        }
                        label={t("Delivery for all cities")}
                      />
                    </Box>
                    {!editForm.deliveryAllCities && (
                      <Box sx={{ mt: 1 }}>
                        <Autocomplete
                          multiple
                          disableCloseOnSelect
                          options={deliveryEditCityOptions.map((o) => o.value)}
                          value={editForm.deliveryCities || []}
                          onChange={(_, v) =>
                            setEditForm((prev) => ({
                              ...prev,
                              deliveryCities: v,
                            }))
                          }
                          getOptionLabel={(opt) => {
                            const row = deliveryEditCityOptions.find(
                              (o) => o.value === opt,
                            );
                            return row ? row.label : String(opt);
                          }}
                          isOptionEqualToValue={(a, b) => a === b}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={t("Delivery cities")}
                              placeholder={t("Search...")}
                            />
                          )}
                        />
                      </Box>
                    )}
                  </Grid>
                )}
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Description")}
                    name="description"
                    value={editForm.description}
                    onChange={handleEditFormChange}
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
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Expire date & time")}
                    name="expireDate"
                    type="datetime-local"
                    value={editForm.expireDate || ""}
                    onChange={handleEditFormChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t("Status All")}</InputLabel>
                    <Select
                      name="statusAll"
                      value={editForm.statusAll || "on"}
                      onChange={handleEditFormChange}
                      label={t("Status All")}
                    >
                      <MenuItem value="on">{t("on")}</MenuItem>
                      <MenuItem value="off">{t("off")}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  <Box sx={{ mt: 0 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="isVip"
                          checked={editForm.isVip || false}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              isVip: e.target.checked,
                            })
                          }
                        />
                      }
                      label={
                        editDialog.type === "company"
                          ? t("VIP Company")
                          : t("VIP Brand")
                      }
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          ) : editDialog.type === "store" ? (
            <Box component="form" sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label={t("Store Name")}
                    name="name"
                    value={editForm.name}
                    onChange={handleEditFormChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <StoreIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Store name (translations)")}
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
                    aiType="store"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  {/* Image Upload */}
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t("Upload New Logo:")}
                    </Typography>
                    <input
                      accept="image/*"
                      style={{ display: "none" }}
                      id="edit-store-dialog-logo"
                      type="file"
                      onChange={handleEditImageChange}
                    />
                    <label htmlFor="edit-store-dialog-logo">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<CloudUploadIcon />}
                        sx={{ mb: 1 }}
                      >
                        {t("Choose Image")}
                      </Button>
                    </label>
                    {selectedEditImage && (
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
                    )}
                  </Box>
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel shrink>{t("Store Type")}</InputLabel>
                    <Select
                      name="storeTypeId"
                      value={editForm.storeTypeId || ""}
                      onChange={handleEditFormChange}
                      label={t("Store Type")}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>{t("Select Store Type")}</em>
                      </MenuItem>
                      {storeTypes.map((st) => (
                        <MenuItem key={st._id} value={st._id}>
                          {st.icon || "🏪"} {t(st.name)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t("Store City")}</InputLabel>
                    <Select
                      name="storecity"
                      value={editForm.storecity}
                      onChange={handleEditFormChange}
                      label={t("Store City")}
                    >
                      {editFormCityOptions.map((c) => (
                        <MenuItem key={c.value} value={c.value}>
                          {c.flag} {c.label}
                          {c.inactive
                            ? ` (${t("Inactive", { defaultValue: "Inactive" })})`
                            : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Address")}
                    name="address"
                    value={editForm.address || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Address (translations)")}
                    value={{
                      english: editForm.addressEn || "",
                      arabic: editForm.addressAr || "",
                      kurdish: editForm.addressKu || "",
                    }}
                    onValueChange={(v) =>
                      setEditForm((prev) => ({
                        ...prev,
                        addressEn: v.english,
                        addressAr: v.arabic,
                        addressKu: v.kurdish,
                      }))
                    }
                    sourceText={editForm.address || ""}
                    aiType="store"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Phone")}
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("WhatsApp")}
                    name="whatsapp"
                    value={editForm.whatsapp || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Facebook")}
                    name="facebook"
                    value={editForm.facebook || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Instagram")}
                    name="instagram"
                    value={editForm.instagram || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("TikTok")}
                    name="tiktok"
                    value={editForm.tiktok || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Snapchat")}
                    name="snapchat"
                    value={editForm.snapchat || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label={t("Google Maps")}
                    name="googleMaps"
                    value={editForm.googleMaps || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={t("Apple Maps")}
                    name="appleMaps"
                    value={editForm.appleMaps || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={t("Waze")}
                    name="waze"
                    value={editForm.waze || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label={t("Description")}
                    name="description"
                    value={editForm.description}
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
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Expire date & time")}
                    name="expireDate"
                    type="datetime-local"
                    value={editForm.expireDate || ""}
                    onChange={handleEditFormChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Last Release Discount Date")}
                    name="lastReleaseDiscountDate"
                    type="date"
                    value={editForm.lastReleaseDiscountDate || ""}
                    onChange={handleEditFormChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t("Status All")}</InputLabel>
                    <Select
                      name="statusAll"
                      value={editForm.statusAll || "on"}
                      onChange={handleEditFormChange}
                      label={t("Status All")}
                    >
                      <MenuItem value="on">{t("on")}</MenuItem>
                      <MenuItem value="off">{t("off")}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="isVip"
                        checked={editForm.isVip || false}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            isVip: e.target.checked,
                          })
                        }
                      />
                    }
                    label={t("VIP Store")}
                  />
                </Grid>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="show"
                        checked={
                          editForm.show !== undefined ? editForm.show : true
                        }
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            show: e.target.checked,
                          })
                        }
                      />
                    }
                    label={t("Show in Store List")}
                  />
                </Grid>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="showingOnStoreBranchShowcase"
                        checked={
                          editForm.showingOnStoreBranchShowcase !== false
                        }
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            showingOnStoreBranchShowcase: e.target.checked,
                          })
                        }
                      />
                    }
                    label={t("Show in branch showcase")}
                  />
                </Grid>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="isHasDelivery"
                        checked={!!editForm.isHasDelivery}
                        onChange={(e) =>
                          setEditForm((prev) => {
                            const on = e.target.checked;
                            if (!on) {
                              return {
                                ...prev,
                                isHasDelivery: false,
                                deliveryAllCities: false,
                                deliveryCities: [],
                              };
                            }
                            return mergeDeliveryCitiesWithStoreCityFirst({
                              ...prev,
                              isHasDelivery: true,
                            });
                          })
                        }
                      />
                    }
                    label={t("Has Delivery")}
                  />
                </Grid>
                {editForm.isHasDelivery && (
                  <Grid xs={12}>
                    <Box sx={{ mt: 0 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="deliveryAllCities"
                            checked={!!editForm.deliveryAllCities}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                deliveryAllCities: e.target.checked,
                                deliveryCities: e.target.checked
                                  ? []
                                  : prev.deliveryCities || [],
                              }))
                            }
                          />
                        }
                        label={t("Delivery for all cities")}
                      />
                    </Box>
                    {!editForm.deliveryAllCities && (
                      <Box sx={{ mt: 1 }}>
                        <Autocomplete
                          multiple
                          disableCloseOnSelect
                          options={deliveryEditCityOptions.map((o) => o.value)}
                          value={editForm.deliveryCities || []}
                          onChange={(_, v) =>
                            setEditForm((prev) => ({
                              ...prev,
                              deliveryCities: v,
                            }))
                          }
                          getOptionLabel={(opt) => {
                            const row = deliveryEditCityOptions.find(
                              (o) => o.value === opt,
                            );
                            return row ? row.label : String(opt);
                          }}
                          isOptionEqualToValue={(a, b) => a === b}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={t("Delivery cities")}
                              placeholder={t("Search...")}
                            />
                          )}
                        />
                      </Box>
                    )}
                  </Grid>
                )}
                <Grid xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t("Branches")}
                  </Typography>
                  <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={stores.filter(
                      (s) => String(s._id) !== String(editDialog.data?._id),
                    )}
                    getOptionLabel={(option) => option?.name ?? ""}
                    isOptionEqualToValue={(a, b) =>
                      String(a?._id) === String(b?._id)
                    }
                    value={(editForm.branches || [])
                      .map((id) =>
                        stores.find((s) => String(s._id) === String(id)),
                      )
                      .filter(Boolean)}
                    onChange={(_, newValue) => {
                      setEditForm({
                        ...editForm,
                        branches: newValue.map((s) => String(s._id)),
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("Branch stores")}
                        placeholder={t("Search...")}
                      />
                    )}
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
              </Grid>
            </Box>
          ) : editDialog.type === "category" ? (
            <Box component="form" sx={{ mt: 1 }}>
              <Grid spacing={2}>
                <Grid xs={12} sm={6}>
                  <TextField
                    margin="normal"
                    fullWidth
                    label={t("Category Name")}
                    name="name"
                    value={editForm.name || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Category name (translations)")}
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
                    aiType="category"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>{t("Store Type")}</InputLabel>
                    <Select
                      name="storeTypeId"
                      value={editForm.storeTypeId || ""}
                      onChange={handleEditFormChange}
                      label={t("Store Type")}
                    >
                      <MenuItem value="">
                        <em>{t("Select Store Type")}</em>
                      </MenuItem>
                      {(storeTypes || []).map((st) => (
                        <MenuItem key={st._id} value={String(st._id)}>
                          {st.icon || "🏪"} {t(st.name)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  <TextField
                    margin="normal"
                    fullWidth
                    label={t("Category description (optional)")}
                    name="description"
                    value={editForm.description || ""}
                    onChange={handleEditFormChange}
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid xs={12}>
                  <MultilingualFieldGroup
                    sectionLabel={t("Category description (translations)")}
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
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    {t("Category Types")}
                  </Typography>
                  {(editForm.types || [emptyCategoryTypeRow()]).map(
                    (type, index) => {
                      const row = normalizeCategoryTypeRow(type);
                      return (
                        <Box
                          key={index}
                          sx={{
                            mb: 2,
                            p: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                            bgcolor: "action.hover",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <TextField
                              sx={{ flex: "1 1 240px", minWidth: 0 }}
                              label={`${t("Type name (primary)")} ${index + 1}`}
                              value={row.name}
                              onChange={(e) =>
                                handleEditCategoryTypeChange(
                                  index,
                                  e.target.value,
                                )
                              }
                            />
                            <IconButton
                              onClick={() => removeEditCategoryType(index)}
                              disabled={(editForm.types || []).length <= 1}
                              color="error"
                              sx={{ mt: 0.5 }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          <MultilingualFieldGroup
                            sectionLabel={t(
                              "Category type name (translations)",
                            )}
                            value={{
                              english: row.nameEn,
                              arabic: row.nameAr,
                              kurdish: row.nameKu,
                            }}
                            onValueChange={(v) =>
                              updateEditCategoryTypeField(index, {
                                nameEn: v.english,
                                nameAr: v.arabic,
                                nameKu: v.kurdish,
                              })
                            }
                            sourceText={row.name}
                            aiType="categoryType"
                          />
                          <TextField
                            fullWidth
                            sx={{ mt: 1 }}
                            label={t("Type description (optional)")}
                            value={row.description}
                            onChange={(e) =>
                              updateEditCategoryTypeField(index, {
                                description: e.target.value,
                              })
                            }
                            multiline
                            rows={2}
                          />
                          <MultilingualFieldGroup
                            sectionLabel={t(
                              "Category type description (translations)",
                            )}
                            value={{
                              english: row.descriptionEn,
                              arabic: row.descriptionAr,
                              kurdish: row.descriptionKu,
                            }}
                            onValueChange={(v) =>
                              updateEditCategoryTypeField(index, {
                                descriptionEn: v.english,
                                descriptionAr: v.arabic,
                                descriptionKu: v.kurdish,
                              })
                            }
                            sourceText={row.description}
                            aiType="general"
                            multiline
                            minRows={2}
                          />
                        </Box>
                      );
                    },
                  )}
                  <Button
                    variant="outlined"
                    onClick={addEditCategoryType}
                    startIcon={<AddIcon />}
                  >
                    {t("Add Category Type")}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          ) : editDialog.type === "gift" ? (
            <Box component="form" sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                fullWidth
                label={t("Description")}
                name="description"
                value={editForm.description}
                onChange={handleEditFormChange}
                multiline
                rows={3}
              />
              <MultilingualFieldGroup
                sectionLabel={t("Gift description (translations)")}
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
                aiType="gift"
                multiline
                minRows={2}
              />

              {/* Image Upload */}
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t("Upload New Image:")}
                </Typography>
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="edit-gift-image-upload"
                  type="file"
                  onChange={handleEditGiftImageChange}
                />
                <label htmlFor="edit-gift-image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 1 }}
                  >
                    {t("Choose Image")}
                  </Button>
                </label>
                {selectedEditGiftImage && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" display="block">
                      {t("Selected:")} {selectedEditGiftImage.name}
                    </Typography>
                    <img
                      src={URL.createObjectURL(selectedEditGiftImage)}
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
                )}
              </Box>

              <DataEntryEntityIdsAutocomplete
                sx={{ mt: 2, mb: 1 }}
                label={t("Stores")}
                options={stores}
                valueIds={
                  Array.isArray(editForm.storeId) ? editForm.storeId : []
                }
                onChangeIds={(ids) =>
                  setEditForm((p) => ({ ...p, storeId: ids }))
                }
              />

              <DataEntryEntityAutocomplete
                sx={{ mt: 1, mb: 1 }}
                label={t("Brand")}
                options={brands}
                valueId={editForm.brandId}
                onChangeId={(id) =>
                  setEditForm((p) => ({ ...p, brandId: id }))
                }
                placeholder={t("select brand")}
              />
              <DataEntryEntityAutocomplete
                sx={{ mt: 1, mb: 1 }}
                label={t("Company")}
                options={companies}
                valueId={editForm.companyId || ""}
                onChangeId={(id) =>
                  setEditForm((p) => ({ ...p, companyId: id }))
                }
                placeholder={t("select company")}
              />

              <TextField
                margin="normal"
                fullWidth
                label={t("Product ID (Barcode)")}
                name="productId"
                value={editForm.productId}
                onChange={handleEditFormChange}
              />

              <TextField
                margin="normal"
                fullWidth
                label={t("Expire date & time")}
                name="expireDate"
                type="datetime-local"
                value={editForm.expireDate}
                onChange={handleEditFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          ) : editDialog.type === "ad" ? (
            <Box component="form" sx={{ mt: 1 }}>
              {/* Current Image */}
              {editForm.image && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t("Current Image:")}
                  </Typography>
                  <img
                    src={
                      editForm.image.startsWith("http")
                        ? editForm.image
                        : `${API_URL}${editForm.image}`
                    }
                    alt={t("Current ad")}
                    style={{
                      width: 100,
                      height: 100,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid #ddd",
                    }}
                  />
                </Box>
              )}

              {/* Upload New Image */}
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t("Upload New Image:")}
                </Typography>
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="edit-ad-image-upload"
                  type="file"
                  ref={editAdImageFileRef}
                />
                <label htmlFor="edit-ad-image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 1 }}
                  >
                    {t("Choose Image")}
                  </Button>
                </label>
              </Box>

              <Grid spacing={2}>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t("Pages")}</InputLabel>
                    <Select
                      multiple
                      name="pages"
                      value={editForm.pages || []}
                      onChange={handleEditFormChange}
                      label={t("Pages")}
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={t(
                                value.charAt(0).toUpperCase() + value.slice(1),
                              )}
                              size="small"
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {["all", "home", "brands", "stores", "gifts"].map((p) => (
                        <MenuItem key={p} value={p}>
                          {t(p.charAt(0).toUpperCase() + p.slice(1))}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t("Link URL")}
                    name="linkUrl"
                    value={editForm.linkUrl || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Brand")}
                    options={brands}
                    valueId={editForm.brandId || ""}
                    onChangeId={(id) =>
                      setEditForm((p) => ({ ...p, brandId: id }))
                    }
                    placeholder={t("select brand")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Store")}
                    options={stores}
                    valueId={editForm.storeId || ""}
                    onChangeId={(id) =>
                      setEditForm((p) => ({ ...p, storeId: id }))
                    }
                    placeholder={t("select store")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Select
                      name="giftId"
                      value={editForm.giftId || ""}
                      onChange={handleEditFormChange}
                      label={t("Gift")}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>{t("select gift")}</em>
                      </MenuItem>
                      {gifts.map((g) => (
                        <MenuItem key={g._id} value={g._id}>
                          {g.description?.slice(0, 40) || g._id}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label={t("Start Date")}
                    InputLabelProps={{ shrink: true }}
                    name="startDate"
                    value={editForm.startDate || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label={t("End Date")}
                    InputLabelProps={{ shrink: true }}
                    name="endDate"
                    value={editForm.endDate || ""}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t("Priority")}
                    name="priority"
                    value={editForm.priority ?? 0}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!editForm.active}
                        onChange={(e) =>
                          setEditForm({ ...editForm, active: e.target.checked })
                        }
                      />
                    }
                    label={t("Active")}
                  />
                </Grid>
              </Grid>
            </Box>
          ) : editDialog.type === "storeType" ? (
            <Box
              component="form"
              sx={{ mt: 1 }}
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await fetch(`${API_URL}/api/store-types/${editForm._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: editForm.name,
                      icon: editForm.icon || "",
                      nameEn: editForm.nameEn?.trim() || "",
                      nameAr: editForm.nameAr?.trim() || "",
                      nameKu: editForm.nameKu?.trim() || "",
                    }),
                  });
                  const res = await storeTypeAPI.getAll();
                  setStoreTypes(res.data || []);
                  setEditDialog({ open: false, type: "", data: null });
                } catch (e) {}
              }}
            >
              <TextField
                margin="normal"
                fullWidth
                label={t("Name")}
                name="name"
                value={editForm.name || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
              <MultilingualFieldGroup
                sectionLabel={t("Store type name (translations)")}
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
                aiType="storeType"
              />
              <TextField
                margin="normal"
                fullWidth
                label={t("Icon")}
                name="icon"
                value={editForm.icon || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, icon: e.target.value })
                }
              />
            </Box>
          ) : editDialog.type === "brandType" ? (
            <Box
              component="form"
              sx={{ mt: 1 }}
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await brandTypeAPI.update(editForm._id, {
                    name: (editForm.name || "").trim(),
                    icon: editForm.icon || "",
                    nameEn: editForm.nameEn?.trim() || "",
                    nameAr: editForm.nameAr?.trim() || "",
                    nameKu: editForm.nameKu?.trim() || "",
                  });
                  const res = await brandTypeAPI.getAll();
                  setBrandTypes(res.data || []);
                  setEditDialog({ open: false, type: "", data: null });
                } catch (e) {}
              }}
            >
              <TextField
                margin="normal"
                fullWidth
                label={t("Name")}
                name="name"
                value={editForm.name || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
              <MultilingualFieldGroup
                sectionLabel={t("Brand type name (translations)")}
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
                aiType="storeBrand"
              />
              <TextField
                margin="normal"
                fullWidth
                label={t("Icon")}
                name="icon"
                value={editForm.icon || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, icon: e.target.value })
                }
              />
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
                            setEditForm({
                              ...editForm,
                              isDiscount: e.target.checked,
                            })
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
                    id="edit-product-image-upload"
                    type="file"
                    onChange={handleEditImageChange}
                  />
                  <label htmlFor="edit-product-image-upload">
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
                    onChangeId={(id) =>
                      setEditForm((p) => ({ ...p, storeId: id }))
                    }
                    placeholder={t("Select Store")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Brand")}
                    options={brands}
                    valueId={editForm.brandId}
                    onChangeId={(id) =>
                      setEditForm((p) => ({ ...p, brandId: id }))
                    }
                    placeholder={t("select brand")}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <DataEntryEntityAutocomplete
                    label={t("Company")}
                    options={companies}
                    valueId={editForm.companyId || ""}
                    onChangeId={(id) =>
                      setEditForm((p) => ({ ...p, companyId: id }))
                    }
                    placeholder={t("select company")}
                  />
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
          <Button
            onClick={() => setEditDialog({ open: false, type: "", data: null })}
          >
            {t("Cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            disabled={editLoading}
          >
            {editLoading ? t("Saving...") : t("Save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, type: "", data: null })}
      >
        <DialogTitle>{t("Confirm Delete")}</DialogTitle>
        <DialogContent>
          <Typography>
            {t("Are you sure you want to delete this")} {deleteDialog.type}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDeleteDialog({ open: false, type: "", data: null })
            }
          >
            {t("Cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              const dt = deleteDialog.type;
              if (dt === "category") {
                handleDeleteCategoryConfirm();
                return;
              }
              if (dt === "storeType") {
                handleDeleteStoreTypeConfirm();
                return;
              }
              if (dt === "brandType") {
                (async () => {
                  setDeleteLoading(true);
                  try {
                    await brandTypeAPI.delete(deleteDialog.data._id);
                    const res = await brandTypeAPI.getAll();
                    setBrandTypes(res.data || []);
                    setMessage({
                      type: "success",
                      text: t("Brand Type deleted successfully!"),
                    });
                  } catch (e) {
                    setMessage({
                      type: "error",
                      text: t("Failed to delete brand type."),
                    });
                  } finally {
                    setDeleteLoading(false);
                    setDeleteDialog({ open: false, type: "", data: null });
                  }
                })();
                return;
              }
              if (dt === "store") {
                handleDeleteStoreConfirm();
                return;
              }
              if (
                [
                  "brand",
                  "company",
                  "product",
                  "gift",
                  "ad",
                  "video",
                  "job",
                ].includes(dt)
              ) {
                handleDeleteBrandConfirm();
                return;
              }
              handleDeleteBrandConfirm();
            }}
            disabled={deleteLoading}
          >
            {deleteLoading ? t("Deleting...") : t("Delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataEntryForm;
