import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  Autocomplete,
  Alert,
  CircularProgress,
  IconButton,
  Stack,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Person as PersonIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  PrivacyTip as PrivacyTipIcon,
  LocationOn as LocationOnIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Block as BlockIcon,
  ArrowBack as ArrowBackIcon,
  Palette as PaletteIcon,
  WhatsApp as WhatsAppIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  CameraAlt as SnapchatIcon,
  AlternateEmail as GmailIcon,
  MusicNote as TikTokIcon,
  Call as ViberIcon,
  Telegram as TelegramIcon,
  Language as LanguageIcon,
  InfoOutlined as InfoOutlinedIcon,
  LightModeOutlined,
  DarkModeOutlined,
  BrightnessAutoRounded,
  Storefront as StorefrontIcon,
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  HomeOutlined,
  Close as CloseIcon,
  Search as SearchNavIcon,
  Category as CategoryNavIcon,
  VideoLibrary as VideoLibraryNavIcon,
  Favorite as FavoriteNavIcon,
  Store as StoreNavIcon,
  CardGiftcard as CardGiftcardNavIcon,
  ShoppingBag as ShoppingBagNavIcon,
  Business as BusinessNavIcon,
  CorporateFare as CorporateFareNavIcon,
  WorkOutline as WorkOutlineNavIcon,
  BarChart as BarChartIcon,
  HourglassTop as HourglassTopIcon,
  Feedback as FeedbackIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useUserTracking } from "../hooks/useUserTracking";
import { useCityFilter } from "../context/CityFilterContext";
import { useAppSettings } from "../context/AppSettingsContext";
import kurdishFlag from "../styles/kurdish_flag.jpg";
import {
  normalizeWhatsAppUrl,
  openWhatsAppLink,
} from "../utils/openWhatsAppLink";
import {
  useDataLanguage,
  DATA_LANG_AR,
  DATA_LANG_EN,
  DATA_LANG_KU,
  DATA_LANG_NORMAL,
} from "../context/DataLanguageContext";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { getLocalizedField } from "../utils/localize";
import { useDarkMode } from "../context/DarkModeContext";
import {
  isAdminEmail,
  canAccessDataEntry,
  canAccessOwnerDashboard,
  canAccessOwnerDataEntryPage,
  canAccessPendingPage,
} from "../utils/adminAccess";
import {
  normalizeOwnerEntities,
  getOwnerPublicProfileChoices,
} from "../utils/ownerEntities";
import { isOwnerDashboardRole } from "../utils/roles";
import { storeAPI, brandAPI, companyAPI, feedbackAPI } from "../services/api";
import { useActiveTheme } from "../context/ActiveThemeContext";
import {
  PROFILE_SHORTCUT_CATALOG,
  normalizeProfileShortcutIds,
} from "../utils/profileShortcutCatalog";

const PROFILE_SHORTCUT_ICONS = {
  home: HomeOutlined,
  search: SearchNavIcon,
  categories: CategoryNavIcon,
  reels: VideoLibraryNavIcon,
  favourites: FavoriteNavIcon,
  stores: StoreNavIcon,
  gifts: CardGiftcardNavIcon,
  shopping: ShoppingBagNavIcon,
  brands: BusinessNavIcon,
  companies: CorporateFareNavIcon,
  findjob: WorkOutlineNavIcon,
};

function ownerEntityIdsEqual(a, b) {
  const sa = String(a ?? "").trim();
  const sb = String(b ?? "").trim();
  if (!sa || !sb) return false;
  if (sa === sb) return true;
  return sa.toLowerCase() === sb.toLowerCase();
}

function ownerProfileChoiceKey(choice) {
  return `${String(choice.entityType || "").toLowerCase()}:${String(
    choice.entityId || "",
  ).trim()}`;
}

function findOwnerEntityRow(choice, entityLists) {
  const idStr = String(choice.entityId || "").trim();
  if (!idStr) return null;
  const typ = String(choice.entityType || "").toLowerCase();
  if (typ === "store") {
    return (
      entityLists.stores.find((s) => ownerEntityIdsEqual(s?._id, idStr)) || null
    );
  }
  if (typ === "brand") {
    return (
      entityLists.brands.find((b) => ownerEntityIdsEqual(b?._id, idStr)) || null
    );
  }
  if (typ === "company") {
    return (
      entityLists.companies.find((c) => ownerEntityIdsEqual(c?._id, idStr)) ||
      null
    );
  }
  return null;
}

function ownerProfileFallbackLabel(choice, t) {
  const typ = String(choice.entityType || "").toLowerCase();
  const idStr = String(choice.entityId || "").trim();
  const tail = idStr.length > 8 ? idStr.slice(-8) : idStr;
  if (typ === "store") {
    return `${t("Store", { defaultValue: "Store" })} (${tail})`;
  }
  if (typ === "brand") {
    return `${t("Brand", { defaultValue: "Brand" })} (${tail})`;
  }
  return `${t("Company", { defaultValue: "Company" })} (${tail})`;
}

const ProfilePage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, logout, updateProfile, deactivate } = useAuth();
  const { user: guestUser, updateGuestName } = useUserTracking();
  const { selectedCity, changeCity, cities } = useCityFilter();
  const { contactInfo } = useAppSettings();
  const { profileShortcuts } = useActiveTheme();
  const { dataLanguage, setDataLanguage } = useDataLanguage();
  const { locName } = useLocalizedContent();
  const { colorMode, setColorMode } = useDarkMode();

  const [guestNameDialogOpen, setGuestNameDialogOpen] = useState(false);
  const [ownerProfilePickerOpen, setOwnerProfilePickerOpen] = useState(false);
  const [pageEnterActive, setPageEnterActive] = useState(false);
  const [pageClosing, setPageClosing] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState("");
  const [userNameDialogOpen, setUserNameDialogOpen] = useState(false);
  const [userNameInput, setUserNameInput] = useState("");
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState("suggestion");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const changeNameButtonRef = useRef(null);
  const deactivateButtonRef = useRef(null);
  const deactivateCancelButtonRef = useRef(null);

  const [draftOwnerEntities, setDraftOwnerEntities] = useState(() =>
    normalizeOwnerEntities(user),
  );
  const [entityLists, setEntityLists] = useState({
    stores: [],
    brands: [],
    companies: [],
  });
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [ownerSaveError, setOwnerSaveError] = useState("");
  const [savingOwnerEntity, setSavingOwnerEntity] = useState(false);
  const [ownerProfileFetchedNames, setOwnerProfileFetchedNames] = useState({});
  const ownerProfileFetchedKeysRef = useRef(new Set());

  const ownerEntitiesServerSig = useMemo(
    () =>
      isOwnerDashboardRole(user)
        ? JSON.stringify(normalizeOwnerEntities(user))
        : "",
    [
      user?.role,
      user?.ownerEntities,
      user?.ownerEntityType,
      user?.ownerEntityId,
    ],
  );

  useEffect(() => {
    if (!isOwnerDashboardRole(user)) return;
    setDraftOwnerEntities(normalizeOwnerEntities(user));
  }, [ownerEntitiesServerSig, user?.role]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setPageEnterActive(true);
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const loadEntityLists = useCallback(async () => {
    if (!user) return;
    const profileChoices = getOwnerPublicProfileChoices(user);
    const needsLists = isOwnerDashboardRole(user) || profileChoices.length > 0;
    if (!needsLists) return;
    setLoadingEntities(true);
    setOwnerSaveError("");
    try {
      const [storesRes, brandsRes, companiesRes] = await Promise.all([
        storeAPI.getVisible(),
        brandAPI.getAll(),
        companyAPI.getAll(),
      ]);
      setEntityLists({
        stores: Array.isArray(storesRes.data) ? storesRes.data : [],
        brands: Array.isArray(brandsRes.data) ? brandsRes.data : [],
        companies: Array.isArray(companiesRes.data) ? companiesRes.data : [],
      });
    } catch (e) {
      console.error(e);
      setEntityLists({ stores: [], brands: [], companies: [] });
      setOwnerSaveError(
        e?.response?.data?.message ||
          e?.message ||
          t("Could not load list", { defaultValue: "Could not load list" }),
      );
    } finally {
      setLoadingEntities(false);
    }
  }, [
    user?._id,
    user?.role,
    user?.ownerEntities,
    user?.ownerEntityType,
    user?.ownerEntityId,
    user?.ownerDataEntryStoreIds,
    user?.ownerDataEntryBrandIds,
    user?.ownerDataEntryCompanyIds,
    user?.ownerDataEntryAllStores,
    user?.ownerDataEntryAllBrands,
    user?.ownerDataEntryAllCompanies,
    t,
  ]);

  useEffect(() => {
    loadEntityLists();
  }, [loadEntityLists]);

  const getOptionsForOwnerType = (typ) => {
    if (typ === "store") return entityLists.stores;
    if (typ === "brand") return entityLists.brands;
    return entityLists.companies;
  };

  const handleSaveOwnerEntities = async () => {
    const valid = draftOwnerEntities.filter(
      (e) => e.entityType && e.entityId && String(e.entityId).trim() !== "",
    );
    if (valid.length === 0) {
      setOwnerSaveError(
        t("Select at least one store, brand, or company.", {
          defaultValue: "Select at least one store, brand, or company.",
        }),
      );
      return;
    }
    setSavingOwnerEntity(true);
    setOwnerSaveError("");
    try {
      await updateProfile({
        ownerEntities: valid.map((e) => ({
          entityType: e.entityType,
          entityId: String(e.entityId).trim(),
        })),
      });
    } catch (e) {
      console.error(e);
      setOwnerSaveError(
        e?.response?.data?.message ||
          e?.message ||
          t("Could not save", { defaultValue: "Could not save" }),
      );
    } finally {
      setSavingOwnerEntity(false);
    }
  };

  const displayName =
    user?.displayName ||
    user?.username ||
    guestUser?.displayName ||
    t("Guest User");
  const email = user?.email || "";
  const isAdmin = !!user && isAdminEmail(user);
  const showDataEntryLink = !!user && canAccessDataEntry(user);

  const ownerProfileChoices = useMemo(
    () => getOwnerPublicProfileChoices(user),
    [
      user?._id,
      user?.role,
      user?.ownerEntities,
      user?.ownerEntityType,
      user?.ownerEntityId,
      user?.ownerDataEntryStoreIds,
      user?.ownerDataEntryBrandIds,
      user?.ownerDataEntryCompanyIds,
      user?.ownerDataEntryAllStores,
      user?.ownerDataEntryAllBrands,
      user?.ownerDataEntryAllCompanies,
    ],
  );

  const ownerProfileChoicesSig = useMemo(
    () =>
      ownerProfileChoices
        .map((c) => ownerProfileChoiceKey(c))
        .sort()
        .join("|"),
    [ownerProfileChoices],
  );

  useEffect(() => {
    ownerProfileFetchedKeysRef.current = new Set();
    setOwnerProfileFetchedNames({});
  }, [ownerProfileChoicesSig, user?._id, dataLanguage]);

  useEffect(() => {
    if (!ownerProfileChoices.length) return undefined;
    let cancelled = false;

    (async () => {
      for (const choice of ownerProfileChoices) {
        if (cancelled) break;
        const key = ownerProfileChoiceKey(choice);
        const row = findOwnerEntityRow(choice, entityLists);
        const fromList = row
          ? getLocalizedField(row, "name", dataLanguage)
          : "";
        if (fromList) continue;
        if (ownerProfileFetchedKeysRef.current.has(key)) continue;

        try {
          let res;
          if (choice.entityType === "store") {
            res = await storeAPI.getById(choice.entityId);
          } else if (choice.entityType === "brand") {
            res = await brandAPI.getById(choice.entityId);
          } else {
            res = await companyAPI.getById(choice.entityId);
          }
          const data = res?.data;
          const name = data
            ? getLocalizedField(data, "name", dataLanguage)
            : "";
          if (!cancelled && name) {
            ownerProfileFetchedKeysRef.current.add(key);
            setOwnerProfileFetchedNames((prev) => {
              if (prev[key]) return prev;
              return { ...prev, [key]: name };
            });
          }
        } catch {
          /* ignore */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ownerProfileChoices, entityLists, dataLanguage, ownerProfileChoicesSig]);

  const OwnerProfileListIcon = useMemo(() => {
    if (ownerProfileChoices.length !== 1) return StorefrontIcon;
    const p = ownerProfileChoices[0].path || "";
    if (p.startsWith("/stores/")) return StoreNavIcon;
    if (p.startsWith("/brands/")) return BusinessNavIcon;
    if (p.startsWith("/companies/")) return CorporateFareNavIcon;
    return StorefrontIcon;
  }, [ownerProfileChoices]);

  const ownerProfileChoiceLabel = useCallback(
    (choice) => {
      const row = findOwnerEntityRow(choice, entityLists);
      const fromList = row ? locName(row) : "";
      if (fromList) return fromList;
      const key = ownerProfileChoiceKey(choice);
      if (ownerProfileFetchedNames[key]) return ownerProfileFetchedNames[key];
      return ownerProfileFallbackLabel(choice, t);
    },
    [entityLists, locName, ownerProfileFetchedNames, t],
  );

  const normalizeUrl = (url, type) => {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();
    if (type === "whatsapp" || type === "viber" || type === "telegram") {
      if (
        /^(https?:\/\/)?(wa\.me|api\.whatsapp\.com|viber\.com|t\.me|telegram\.me)\//i.test(
          trimmed,
        )
      ) {
        const withProto = /^https?:\/\//i.test(trimmed)
          ? trimmed
          : `https://${trimmed}`;
        if (type === "whatsapp") {
          return normalizeWhatsAppUrl(withProto);
        }
        return withProto;
      }
      const digits = trimmed.replace(/[^\d]/g, "");
      if (type === "whatsapp") {
        return digits ? `https://api.whatsapp.com/send?phone=${digits}` : null;
      }
      if (type === "viber")
        return digits ? `viber://chat?number=${digits}` : null;
      if (type === "telegram") return digits ? `https://t.me/+${digits}` : null;
    }
    if (type === "gmail") {
      return `mailto:${trimmed}`;
    }
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const contactStr = (v) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
  };

  const profileShortcutItems = useMemo(() => {
    const byId = Object.fromEntries(
      PROFILE_SHORTCUT_CATALOG.map((x) => [x.id, x]),
    );
    return normalizeProfileShortcutIds(profileShortcuts)
      .map((id) => byId[id])
      .filter(Boolean);
  }, [profileShortcuts]);

  const contactItems = [
    {
      key: "whatsapp",
      value: contactStr(contactInfo?.whatsapp),
      icon: <WhatsAppIcon />,
    },
    {
      key: "facebook",
      value: contactStr(contactInfo?.facebook),
      icon: <FacebookIcon />,
    },
    {
      key: "instagram",
      value: contactStr(contactInfo?.instagram),
      icon: <InstagramIcon />,
    },
    {
      key: "snapchat",
      value: contactStr(contactInfo?.snapchat),
      icon: <SnapchatIcon />,
    },
    {
      key: "gmail",
      value: contactStr(contactInfo?.gmail),
      icon: <GmailIcon />,
    },
    {
      key: "tiktok",
      value: contactStr(contactInfo?.tiktok),
      icon: <TikTokIcon />,
    },
    {
      key: "viber",
      value: contactStr(contactInfo?.viber),
      icon: <ViberIcon />,
    },
    {
      key: "telegram",
      value: contactStr(contactInfo?.telegram),
      icon: <TelegramIcon />,
    },
  ].filter((item) => Boolean(item.value));

  const openFeedbackDialog = () => {
    setFeedbackError("");
    setFeedbackSuccess("");
    setFeedbackType("suggestion");
    setFeedbackNote("");
    setFeedbackDialogOpen(true);
  };

  const submitFeedback = async () => {
    const note = feedbackNote.trim();
    if (!note) {
      setFeedbackError(
        t("Please enter your note.", {
          defaultValue: "Please enter your note.",
        }),
      );
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackError("");
    setFeedbackSuccess("");
    try {
      await feedbackAPI.create({
        type: feedbackType,
        note,
        guestDeviceId: user
          ? null
          : guestUser?.deviceId || guestUser?._id || null,
        guestName: user ? null : guestUser?.displayName || null,
        email: user ? user?.email || null : null,
      });
      setFeedbackSuccess(
        t("Thanks! Your note was sent.", {
          defaultValue: "Thanks! Your note was sent.",
        }),
      );
      setFeedbackNote("");
      window.setTimeout(() => setFeedbackDialogOpen(false), 700);
    } catch (error) {
      setFeedbackError(
        error?.response?.data?.message ||
          t("Failed to send note.", { defaultValue: "Failed to send note." }),
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleBack = useCallback(() => {
    if (pageClosing) return;
    setPageClosing(true);
    window.setTimeout(() => {
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
      navigate("/");
    }, 170);
  }, [navigate, pageClosing]);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100dvh",
        zIndex: 1200,
        display: "flex",
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.28)",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 0,
          overflow: "auto",
          border: "none",
          width: { xs: "100vw", sm: 380 },
          maxWidth: "100%",
          height: "100dvh",
          background: theme.palette.mode === "dark" ? "#0f1927" : "#ffffff",
          borderLeft:
            theme.palette.mode === "dark"
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid #eef0f4",
        }}
      >
        <Box
          sx={{
            minHeight: "100%",
            transform: pageClosing
              ? "translateX(28px)"
              : pageEnterActive
                ? "translateX(0)"
                : "translateX(24px)",
            opacity: pageClosing ? 0.78 : pageEnterActive ? 1 : 0.82,
            transition:
              "transform 180ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease",
            willChange: "transform, opacity",
          }}
        >
          <Box
            sx={{
              p: 2.5,
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg,#1e6fd9,#1558b0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 3px 8px rgba(30,111,217,0.35)",
                }}
              >
                <PersonIcon sx={{ fontSize: 18, color: "white" }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.95)"
                      : "#111827",
                }}
              >
                {t("Account", { defaultValue: "Account" })}
              </Typography>
            </Box>
            <IconButton
              edge="end"
              onClick={handleBack}
              size="small"
              disabled={pageClosing}
              sx={{
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "#f3f4f6",
                "&:hover": {
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "#e9ecf0",
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Box
            sx={{
              px: 2,
              py: 2.5,
              borderBottom: `1px solid ${theme.palette.divider}`,
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.02)",
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
              <Avatar
                sx={{
                  width: 46,
                  height: 46,
                  backgroundColor: theme.palette.primary.main,
                  fontWeight: 700,
                }}
              >
                {(displayName || "U").charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={700} noWrap>
                  {displayName}
                </Typography>
                {!!email && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    sx={{ maxWidth: 260 }}
                  >
                    {email}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <List disablePadding>
            <ListItemButton
              ref={changeNameButtonRef}
              onClick={(e) => {
                // Avoid keeping focus on a background element while a modal sets aria-hidden.
                e?.currentTarget?.blur?.();
                if (user) {
                  setUserNameInput(user?.displayName || user?.username || "");
                  setUserNameDialogOpen(true);
                  return;
                }
                setGuestNameInput(guestUser?.displayName || "");
                setGuestNameDialogOpen(true);
              }}
            >
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t("Change Your Account Name")} />
            </ListItemButton>

            {user &&
              (ownerProfileChoices.length > 0 ||
                canAccessOwnerDashboard(user)) && <Divider />}
            {user && ownerProfileChoices.length > 0 && (
              <ListItemButton
                component={ownerProfileChoices.length === 1 ? Link : undefined}
                to={
                  ownerProfileChoices.length === 1
                    ? ownerProfileChoices[0].path
                    : undefined
                }
                onClick={
                  ownerProfileChoices.length > 1
                    ? (e) => {
                        e.preventDefault();
                        e.currentTarget?.blur?.();
                        setOwnerProfilePickerOpen(true);
                      }
                    : undefined
                }
              >
                <ListItemIcon>
                  <OwnerProfileListIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={t("ownerMyProfile", {
                    defaultValue: "My profile",
                  })}
                  secondary={t("ownerMyProfileHint", {
                    defaultValue: "Open your public Profile",
                  })}
                />
              </ListItemButton>
            )}
            {user && canAccessOwnerDashboard(user) && (
              <ListItemButton component={Link} to="/owner-dashboard">
                <ListItemIcon>
                  <StorefrontIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={t("Owner dashboard", {
                    defaultValue: "Owner dashboard",
                  })}
                />
              </ListItemButton>
            )}

            {user && canAccessOwnerDataEntryPage(user) && (
              <>
                <Divider />
                <ListItemButton component={Link} to="/owner-data-entry">
                  <ListItemIcon>
                    <AddIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t("Owner Data Entry", {
                      defaultValue: "Owner Data Entry",
                    })}
                  />
                </ListItemButton>
              </>
            )}

            {user && canAccessPendingPage(user) && (
              <>
                <Divider />
                <ListItemButton component={Link} to="/pending">
                  <ListItemIcon>
                    <HourglassTopIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t("Pending reviews", {
                      defaultValue: "Pending reviews",
                    })}
                  />
                </ListItemButton>
              </>
            )}

            {showDataEntryLink && (
              <>
                <Divider />
                <ListItemButton component={Link} to="/admin">
                  <ListItemIcon>
                    <AdminPanelSettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={t("Data Entry")} />
                </ListItemButton>
                {isAdmin && (
                  <>
                    <ListItemButton component={Link} to="/admin/customization">
                      <ListItemIcon>
                        <PaletteIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={t("Customization")} />
                    </ListItemButton>
                    <ListItemButton component={Link} to="/admin/users">
                      <ListItemIcon>
                        <PeopleIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={t("Users")} />
                    </ListItemButton>
                    <ListItemButton component={Link} to="/admin/visitors">
                      <ListItemIcon>
                        <BarChartIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={t("Visitors report")} />
                    </ListItemButton>
                    <ListItemButton component={Link} to="/admin/feedback">
                      <ListItemIcon>
                        <FeedbackIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={t("User feedback", {
                          defaultValue: "User feedback",
                        })}
                      />
                    </ListItemButton>
                    <ListItemButton component={Link} to="/admin/translations">
                      <ListItemIcon>
                        <LanguageIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={t("translationPage.title")} />
                    </ListItemButton>
                    <ListItemButton component={Link} to="/admin/dashboard">
                      <ListItemIcon>
                        <DashboardIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={t("Admin Dashboard")} />
                    </ListItemButton>
                    <ListItemButton component={Link} to="/admin/cities">
                      <ListItemIcon>
                        <LocationOnIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={t("City management", {
                          defaultValue: "City management",
                        })}
                      />
                    </ListItemButton>
                  </>
                )}
              </>
            )}

            <Divider />

            {profileShortcutItems.length > 0 && (
              <Box
                sx={{
                  px: { xs: 2, sm: 2.5 },
                  py: { xs: 2, sm: 2.25 },
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  fontWeight={700}
                  display="block"
                  sx={{ mb: 1.25, fontSize: { xs: "0.95rem", sm: "1rem" } }}
                >
                  {t("Shortcuts", { defaultValue: "Shortcuts" })}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "nowrap",
                    gap: { xs: 1.25, sm: 1.5 },
                    overflowX: "auto",
                    py: 0.5,
                    mx: -0.5,
                    px: 0.5,
                    scrollbarWidth: "thin",
                    WebkitOverflowScrolling: "touch",
                    "&::-webkit-scrollbar": { height: 8 },
                  }}
                >
                  {profileShortcutItems.map((item) => {
                    const IconComp = PROFILE_SHORTCUT_ICONS[item.id];
                    return (
                      <Chip
                        key={item.id}
                        component={Link}
                        to={item.path}
                        clickable
                        variant="outlined"
                        label={t(item.labelKey)}
                        icon={
                          IconComp ? (
                            <IconComp sx={{ fontSize: 22 }} />
                          ) : undefined
                        }
                        sx={{
                          flexShrink: 0,
                          borderRadius: 2.5,
                          fontWeight: 650,
                          fontSize: { xs: "0.9rem", sm: "0.95rem" },
                          minHeight: 44,
                          height: "auto",
                          py: 0.75,
                          px: 0.5,
                          "& .MuiChip-label": {
                            px: 0.75,
                            py: 0.25,
                          },
                          "& .MuiChip-icon": {
                            ml: 1,
                            mr: -0.25,
                          },
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            )}

            <Divider />
            <Box sx={{ px: 2, py: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1.25,
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      theme.palette.mode === "dark"
                        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)}, ${alpha(theme.palette.secondary.main, 0.15)})`
                        : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                    border: "1px solid",
                    borderColor: alpha(theme.palette.divider, 0.9),
                  }}
                >
                  <PaletteIcon sx={{ fontSize: 20, color: "primary.main" }} />
                </Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}
                >
                  {t("Appearance", { defaultValue: "Appearance" })}
                </Typography>
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: 0.25,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: alpha(theme.palette.divider, 0.85),
                  background:
                    theme.palette.mode === "dark"
                      ? `linear-gradient(160deg, ${alpha("#fff", 0.05)} 0%, ${alpha("#fff", 0.02)} 100%)`
                      : "linear-gradient(180deg, #ffffff 0%, #f4f6f9 100%)",
                  boxShadow:
                    theme.palette.mode === "dark"
                      ? "0 4px 24px rgba(0,0,0,0.25)"
                      : "0 2px 12px rgba(15,23,42,0.06)",
                }}
              >
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={colorMode}
                  onChange={(_, v) => v != null && setColorMode(v)}
                  sx={{
                    display: "flex",
                    gap: 0.75,
                    "& .MuiToggleButtonGroup-grouped": {
                      margin: 0,
                      border: 0,
                      "&:not(:first-of-type)": { borderLeft: 0 },
                    },
                    "& .MuiToggleButton-root": {
                      flex: 1,
                      flexDirection: "column",
                      py: 1,
                      px: 0.5,
                      borderRadius: "14px !important",
                      textTransform: "none",
                      gap: 0.65,
                      border: "none",
                      color: "text.secondary",
                      transition:
                        "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease",
                      "&:hover": {
                        bgcolor: alpha(theme.palette.primary.main, 0.06),
                      },
                      "&.Mui-selected": {
                        color: "primary.main",
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        boxShadow: `0 2px 10px ${alpha(theme.palette.primary.main, 0.22)}`,
                        "&:hover": {
                          bgcolor: alpha(theme.palette.primary.main, 0.18),
                        },
                      },
                    },
                  }}
                >
                  <ToggleButton value="light" aria-label={t("Light")}>
                    <LightModeOutlined
                      sx={{
                        fontSize: 28,
                        opacity: colorMode === "light" ? 1 : 0.85,
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      sx={{ lineHeight: 1.2, fontSize: "0.72rem" }}
                    >
                      {t("Light")}
                    </Typography>
                  </ToggleButton>
                  <ToggleButton value="dark" aria-label={t("Dark")}>
                    <DarkModeOutlined
                      sx={{
                        fontSize: 28,
                        opacity: colorMode === "dark" ? 1 : 0.85,
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      sx={{ lineHeight: 1.2, fontSize: "0.72rem" }}
                    >
                      {t("Dark")}
                    </Typography>
                  </ToggleButton>
                  <ToggleButton
                    value="system"
                    aria-label={t("System", { defaultValue: "System" })}
                  >
                    <BrightnessAutoRounded
                      sx={{
                        fontSize: 28,
                        opacity: colorMode === "system" ? 1 : 0.85,
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      sx={{ lineHeight: 1.2, fontSize: "0.72rem" }}
                    >
                      {t("System", { defaultValue: "System" })}
                    </Typography>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Paper>
            </Box>
            <Box sx={{ px: 2, py: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: "block" }}
              >
                {t("City")}
              </Typography>
              <FormControl fullWidth size="small">
                {/* <InputLabel>{t("City")}</InputLabel> */}
                <Select
                  value={selectedCity}
                  label={t("City")}
                  onChange={(e) => changeCity(e.target.value)}
                  startAdornment={
                    <LocationOnIcon sx={{ mr: 1, fontSize: 18 }} />
                  }
                >
                  {cities.map((city) => (
                    <MenuItem key={city.value} value={city.value}>
                      {city.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ px: 2, pb: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: "block" }}
              >
                {t("Language")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant={i18n.language === "en" ? "contained" : "outlined"}
                  onClick={() => i18n.changeLanguage("en")}
                >
                  🇺🇸 {t("English")}
                </Button>
                <Button
                  size="small"
                  variant={i18n.language === "ar" ? "contained" : "outlined"}
                  onClick={() => i18n.changeLanguage("ar")}
                >
                  🇸🇦 {t("Arabic")}
                </Button>
                <Button
                  size="small"
                  variant={i18n.language === "ku" ? "contained" : "outlined"}
                  onClick={() => i18n.changeLanguage("ku")}
                >
                  <Box
                    component="span"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <img
                      src={kurdishFlag}
                      alt="Kurdish"
                      style={{
                        width: 16,
                        height: 12,
                        objectFit: "cover",
                        borderRadius: 2,
                      }}
                    />
                    {t("Kurdish")}
                  </Box>
                </Button>
              </Box>
            </Box>

            <Box sx={{ px: 2, pb: 2 }}>
              <ListItemButton
                onClick={openFeedbackDialog}
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <ListItemIcon>
                  <FeedbackIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={t("Suggestion / Report a problem", {
                    defaultValue: "Suggestion / Report a problem",
                  })}
                />
              </ListItemButton>
            </Box>

            <Divider />

            {/* <Box sx={{ px: 2, pb: 2, pt: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1, display: "block" }}
            >
              {t("System Data Language")}
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.5,
              }}
            >
              <Button
                size="small"
                variant={
                  dataLanguage === DATA_LANG_NORMAL ? "contained" : "outlined"
                }
                onClick={() => setDataLanguage(DATA_LANG_NORMAL)}
              >
                {t("Normal")}
              </Button>

              <Button
                size="small"
                variant={
                  dataLanguage === DATA_LANG_EN ? "contained" : "outlined"
                }
                onClick={() => setDataLanguage(DATA_LANG_EN)}
              >
                {t("English")}
              </Button>
              <Button
                size="small"
                variant={
                  dataLanguage === DATA_LANG_AR ? "contained" : "outlined"
                }
                onClick={() => setDataLanguage(DATA_LANG_AR)}
              >
                {t("Arabic")}
              </Button>
              <Button
                size="small"
                variant={
                  dataLanguage === DATA_LANG_KU ? "contained" : "outlined"
                }
                onClick={() => setDataLanguage(DATA_LANG_KU)}
              >
                <Box
                  component="span"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  {t("Kurdish")}
                </Box>
              </Button>
            </Box>
          </Box>
          <Divider /> */}
            <ListItem sx={{ py: 1 }}>
              <ListItemText primary={t("Contact Us")} />
            </ListItem>
            <Box
              sx={{
                px: 2,
                pb: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "nowrap",
                overflowX: "auto",
              }}
            >
              {contactItems.map((item) => {
                const href = normalizeUrl(item.value, item.key);
                if (item.key === "whatsapp" && href) {
                  return (
                    <Button
                      key={item.key}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        openWhatsAppLink(href);
                      }}
                      size="small"
                      variant="outlined"
                      sx={{
                        minWidth: 36,
                        px: 1,
                        color: "text.primary",
                        borderColor: "divider",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </Button>
                  );
                }
                return (
                  <Button
                    key={item.key}
                    component="a"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    variant="outlined"
                    sx={{
                      minWidth: 36,
                      px: 1,
                      color: "text.primary",
                      borderColor: "divider",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </Button>
                );
              })}
            </Box>
            <Divider />
            <ListItemButton
              onClick={() => navigate("/about")}
              sx={{ px: 2, py: 1 }}
            >
              <ListItemIcon>
                <InfoOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={t("About the app", { defaultValue: "About the app" })}
              />
            </ListItemButton>
            <ListItemButton component={Link} to="/privacy-policy">
              <ListItemIcon>
                <PrivacyTipIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t("Privacy Policy")} />
            </ListItemButton>
            <Divider />
            {user ? (
              <>
                <ListItemButton
                  ref={deactivateButtonRef}
                  onClick={(e) => {
                    // Avoid keeping focus on a background element while a modal sets aria-hidden.
                    e?.currentTarget?.blur?.();
                    setDeactivateDialogOpen(true);
                  }}
                  sx={{ color: theme.palette.secondary.main }}
                >
                  <ListItemIcon>
                    <BlockIcon
                      sx={{ color: theme.palette.secondary.main }}
                      fontSize="small"
                    />
                  </ListItemIcon>
                  <ListItemText primary={t("Deactivate Account")} />
                </ListItemButton>
                <ListItemButton
                  onClick={() => {
                    logout();
                  }}
                  sx={{ color: "#e53e3e" }}
                >
                  <ListItemIcon>
                    <LogoutIcon sx={{ color: "#e53e3e" }} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={t("Logout")} />
                </ListItemButton>
              </>
            ) : (
              <ListItemButton
                component={Link}
                to="/login"
                sx={{ color: theme.palette.primary.main }}
              >
                <ListItemIcon>
                  <LoginIcon
                    sx={{ color: theme.palette.primary.main }}
                    fontSize="small"
                  />
                </ListItemIcon>
                <ListItemText primary={t("Login")} />
              </ListItemButton>
            )}
          </List>
        </Box>
      </Paper>

      <Dialog
        open={feedbackDialogOpen}
        onClose={() => !feedbackSubmitting && setFeedbackDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t("Suggestion / Report a problem", {
            defaultValue: "Suggestion / Report a problem",
          })}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>{t("Type", { defaultValue: "Type" })}</InputLabel>
            <Select
              label={t("Type", { defaultValue: "Type" })}
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
              MenuProps={{
                PaperProps: {
                  sx: {
                    "& .MuiMenuItem-root": {
                      whiteSpace: "normal",
                      lineHeight: 1.35,
                    },
                  },
                },
              }}
              sx={{
                "& .MuiSelect-select": {
                  whiteSpace: "normal",
                  lineHeight: 1.35,
                  py: 1.2,
                },
              }}
            >
              <MenuItem value="suggestion" sx={{ whiteSpace: "normal" }}>
                {t("Suggestion", { defaultValue: "Suggestion" })}
              </MenuItem>
              <MenuItem value="problem" sx={{ whiteSpace: "normal" }}>
                {t("Report a problem", { defaultValue: "Report a problem" })}
              </MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            minRows={4}
            maxRows={8}
            value={feedbackNote}
            onChange={(e) => setFeedbackNote(e.target.value)}
            placeholder={t("Write your note here...", {
              defaultValue: "Write your note here...",
            })}
          />
          {feedbackError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {feedbackError}
            </Alert>
          ) : null}
          {feedbackSuccess ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              {feedbackSuccess}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setFeedbackDialogOpen(false)}
            disabled={feedbackSubmitting}
          >
            {t("Cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={submitFeedback}
            disabled={feedbackSubmitting}
          >
            {feedbackSubmitting
              ? t("Sending...", { defaultValue: "Sending..." })
              : t("Send", { defaultValue: "Send" })}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={ownerProfilePickerOpen}
        onClose={() => setOwnerProfilePickerOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {t("ownerMyProfilePickTitle", {
            defaultValue: "Which page do you want to open?",
          })}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <List disablePadding>
            {ownerProfileChoices.map((choice) => {
              const RowIcon = choice.path.startsWith("/stores/")
                ? StoreNavIcon
                : choice.path.startsWith("/brands/")
                  ? BusinessNavIcon
                  : CorporateFareNavIcon;
              return (
                <ListItem
                  key={`${choice.entityType}:${choice.entityId}`}
                  disablePadding
                  sx={{ mb: 0.5 }}
                >
                  <ListItemButton
                    onClick={() => {
                      setOwnerProfilePickerOpen(false);
                      navigate(choice.path);
                    }}
                  >
                    <ListItemIcon>
                      <RowIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={ownerProfileChoiceLabel(choice)}
                      secondary={
                        choice.entityType === "store"
                          ? t("Store", { defaultValue: "Store" })
                          : choice.entityType === "brand"
                            ? t("Brand", { defaultValue: "Brand" })
                            : t("Company", { defaultValue: "Company" })
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOwnerProfilePickerOpen(false)}>
            {t("Cancel")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={guestNameDialogOpen}
        onClose={() => setGuestNameDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        TransitionProps={{
          onExited: () => {
            changeNameButtonRef.current?.focus?.();
          },
        }}
      >
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="normal"
            label={t("Name")}
            value={guestNameInput}
            onChange={(e) => setGuestNameInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuestNameDialogOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={async () => {
              const name = guestNameInput.trim();
              if (!name) return;
              const res = await updateGuestName(name);
              if (res?.success) setGuestNameDialogOpen(false);
            }}
          >
            {t("Save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={userNameDialogOpen}
        onClose={() => setUserNameDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        TransitionProps={{
          onExited: () => {
            changeNameButtonRef.current?.focus?.();
          },
        }}
      >
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="normal"
            label={t("Name")}
            value={userNameInput}
            onChange={(e) => setUserNameInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserNameDialogOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={async () => {
              const name = userNameInput.trim();
              if (!name) return;
              const res = await updateProfile({ displayName: name });
              if (res?.success) setUserNameDialogOpen(false);
            }}
          >
            {t("Save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deactivateDialogOpen}
        onClose={() => !deactivating && setDeactivateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        TransitionProps={{
          onEntered: () => {
            deactivateCancelButtonRef.current?.focus?.();
          },
          onExited: () => {
            deactivateButtonRef.current?.focus?.();
          },
        }}
      >
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t(
              "Your account will be inactive immediately and you will be logged out.",
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t(
              "You have 30 days to log in again to reactivate your account and cancel deletion.",
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t(
              "If you do not log in within 30 days, your account and all data will be permanently deleted.",
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeactivateDialogOpen(false)}
            disabled={deactivating}
            autoFocus
            ref={deactivateCancelButtonRef}
          >
            {t("Cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deactivating}
            onClick={async () => {
              setDeactivating(true);
              const result = await deactivate();
              setDeactivating(false);
              if (result?.success) {
                setDeactivateDialogOpen(false);
                navigate("/");
              } else {
                alert(result?.message || t("Deactivation failed"));
              }
            }}
          >
            {deactivating ? t("Deactivating...") : t("Deactivate Account")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
