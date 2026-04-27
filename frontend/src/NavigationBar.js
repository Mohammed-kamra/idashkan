import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  useTheme,
  MenuItem,
  Avatar,
  Menu,
  ListItemIcon,
  ListItemText,
  Badge,
  Chip,
  ListItemButton,
  Divider,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Home as HomeIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Dashboard as DashboardIcon,
  Store as StoreIcon,
  CardGiftcard as CardGiftcardIcon,
  Person as PersonIcon,
  Language as LanguageIcon,
  Favorite as FavoriteIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  LocationOn as LocationOnIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  VideoLibrary as VideoLibraryIcon,
  ShoppingBag as ShoppingBagIcon,
  ShoppingCart as ShoppingCartIcon,
  WorkOutline as WorkOutlineIcon,
  CorporateFare as CorporateFareIcon,
  BarChart as BarChartIcon,
  Palette as PaletteIcon,
  Storefront as StorefrontNavOwnerIcon,
  Add as AddOwnerDataEntryIcon,
  HourglassTop as HourglassTopIcon,
  LightModeOutlined,
  DarkModeOutlined,
  BrightnessAutoRounded,
  PrivacyTip as PrivacyTipIcon,
  Block as BlockIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  WhatsApp as WhatsAppIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  CameraAlt as SnapchatIcon,
  AlternateEmail as GmailIcon,
  MusicNote as TikTokIcon,
  Call as ViberIcon,
  Telegram as TelegramIcon,
} from "@mui/icons-material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./context/AuthContext";
import { useUserTracking } from "./hooks/useUserTracking";
import kurdishFlag from "./styles/kurdish_flag.jpg";
import { useCityFilter } from "./context/CityFilterContext";
import { useAppSettings } from "./context/AppSettingsContext";
import { useNotifications } from "./context/NotificationContext";
import { useContentRefresh } from "./context/ContentRefreshContext";
import useIsMobileLayout from "./hooks/useIsMobileLayout";
import { useActiveTheme } from "./context/ActiveThemeContext";
import {
  DATA_LANG_AR,
  DATA_LANG_EN,
  DATA_LANG_KU,
  useDataLanguage,
} from "./context/DataLanguageContext";
import { giftAPI, productAPI } from "./services/api";
import { isExpiryStillValid } from "./utils/expiryDate";
import {
  isAdminEmail,
  canAccessDataEntry,
  canAccessPendingPage,
  canSeeOwnerNavSection,
} from "./utils/adminAccess";
import { getOwnerMyProfileNavPath } from "./utils/ownerEntities";
import { prefetchSearchPageChunk } from "./utils/prefetchSearchPage";
import {
  resetMainPageScrollPositionInSession,
  scrollWindowToTop,
} from "./utils/mainPageScrollSession";
import { useDraftCartDrawer } from "./hooks/useDraftCartDrawer";
import { useDarkMode } from "./context/DarkModeContext";
import {
  normalizeWhatsAppUrl,
  openWhatsAppLink,
} from "./utils/openWhatsAppLink";
import { isAndroidPerformanceMode } from "./utils/androidPerformance";

// Enable notification center (bell + menu)
const NOTIFICATIONS_CENTER_ENABLED = true;

/** App bar brand (Latin); same in every locale so Brush Script MT renders consistently. */
const NAV_BRAND_TITLE = "iDashkan";

/** Brand title — @font-face: public/fonts/brush-script-mt.css (BRUSHSCI.TTF) */
const NAV_BRAND_TITLE_FONT_FAMILY =
  '"Brush Script MT", "Brush Script", "Segoe Script", cursive';

/** Original solid brand bar (light mode). RTL-safe via inline style on AppBar. */
const NAV_BAR_GRADIENT =
  "linear-gradient(120deg, var(--color-primary) 0%, var(--color-secondary) 56%, var(--color-secondary) 100%)";
const NAV_BAR_GRADIENT_DARK_GLASS =
  "linear-gradient(118deg, rgba(7,11,20,0.78) 0%, rgba(15,23,42,0.7) 42%, rgba(23,37,84,0.62) 78%, rgba(37,99,235,0.45) 100%)";

const HOME_DOUBLE_TAP_MS = 450;

const NavigationBar = ({ darkMode, setDarkMode }) => {
  const theme = useTheme();
  const isDarkNav = theme.palette.mode === "dark";
  const isAndroidPerfMode = useMemo(() => isAndroidPerformanceMode(), []);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, deactivate, updateProfile } = useAuth();
  const { user: guestUser, updateGuestName } = useUserTracking();
  const { selectedCity, changeCity, cities } = useCityFilter();
  const { contactInfo } = useAppSettings();
  const { colorMode, setColorMode } = useDarkMode();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    fetchNotifications,
    pushSupported,
    pushPermission,
    pushSubscribing,
    requestPushPermission,
    pushEnabled,
    setPushEnabled,
    pushEnableError,
    setPushEnableError,
  } = useNotifications();
  const isSmUp = !useIsMobileLayout();
  const { triggerRefresh } = useContentRefresh();
  const { navConfig } = useActiveTheme();
  const { dataLanguage } = useDataLanguage();
  const { openDraftCart } = useDraftCartDrawer();
  const location = useLocation();
  /** Full-screen reels on mobile: keep top bar off (also /reels/:videoId). */
  const hideMobileNavOnReels =
    !isSmUp && /^\/reels(\/|$)/.test(location.pathname);
  /** Toolbar refresh: scroll home to top + clear saved scroll, then bump refreshKey (all routes). */
  const handleNavRefresh = useCallback(() => {
    if (location.pathname === "/") {
      scrollWindowToTop("auto");
      resetMainPageScrollPositionInSession();
    }
    triggerRefresh?.();
  }, [location.pathname, triggerRefresh]);
  const isAuthenticated = !!user;
  const isFullAdmin = isAdminEmail(user);
  const showAdminNav = !!user && canAccessDataEntry(user);
  const [showMobileNavbar, setShowMobileNavbar] = useState(true);
  const lastScrollYRef = useRef(0);
  // Profile menu state
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);

  // Notification menu state
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);

  // Admin dropdown state
  const [adminAnchorEl, setAdminAnchorEl] = useState(null);

  const [placesAnchorEl, setPlacesAnchorEl] = useState(null);
  const [servicesAnchorEl, setServicesAnchorEl] = useState(null);
  const [ownerNavAnchorEl, setOwnerNavAnchorEl] = useState(null);

  const [mobileNavCityAnchor, setMobileNavCityAnchor] = useState(null);
  const [mobileNavLangAnchor, setMobileNavLangAnchor] = useState(null);
  const lastHomeTapTsRef = useRef(0);

  const [guestNameDialogOpen, setGuestNameDialogOpen] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState("");
  const [userNameDialogOpen, setUserNameDialogOpen] = useState(false);
  const [userNameInput, setUserNameInput] = useState("");
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const pickNotificationText = useCallback(
    (n, field) => {
      const isAr = dataLanguage === DATA_LANG_AR;
      const isKu = dataLanguage === DATA_LANG_KU;
      const isEn = dataLanguage === DATA_LANG_EN;
      if (field === "title") {
        return (
          (isAr ? n?.titleAr : isKu ? n?.titleKu : isEn ? n?.titleEn : "") ||
          n?.title ||
          ""
        );
      }
      return (
        (isAr ? n?.bodyAr : isKu ? n?.bodyKu : isEn ? n?.bodyEn : "") ||
        n?.body ||
        ""
      );
    },
    [dataLanguage],
  );

  // Gifts "new" badge (per account / guest device)
  const GIFTS_LAST_SEEN_KEY_PREFIX = "giftsLastSeenAt.v1";
  /** null until identity is ready and first fetch completes — avoids bogus badge during hydration */
  const [newGiftsCount, setNewGiftsCount] = useState(null);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const latestGiftTsRef = useRef(0);

  const getGiftSeenStorageKey = useCallback(() => {
    const userKey = user?._id || user?.id || user?.email;
    if (userKey) return `${GIFTS_LAST_SEEN_KEY_PREFIX}:user:${userKey}`;
    const guestKey = guestUser?.deviceId || guestUser?._id || guestUser?.id;
    if (guestKey) return `${GIFTS_LAST_SEEN_KEY_PREFIX}:guest:${guestKey}`;
    return `${GIFTS_LAST_SEEN_KEY_PREFIX}:anonymous`;
  }, [
    guestUser?._id,
    guestUser?.deviceId,
    guestUser?.id,
    user?._id,
    user?.email,
    user?.id,
  ]);

  const giftsBadgeIdentityReady = useMemo(
    () =>
      Boolean(
        user?._id ||
        user?.id ||
        user?.email ||
        guestUser?.deviceId ||
        guestUser?._id ||
        guestUser?.id,
      ),
    [
      guestUser?._id,
      guestUser?.deviceId,
      guestUser?.id,
      user?._id,
      user?.email,
      user?.id,
    ],
  );

  const getLastSeenGiftTs = () => {
    try {
      const raw = localStorage.getItem(getGiftSeenStorageKey());
      const ts = raw ? Number(raw) : 0;
      return Number.isFinite(ts) ? ts : 0;
    } catch {
      return 0;
    }
  };

  const setLastSeenGiftTs = (ts) => {
    try {
      localStorage.setItem(getGiftSeenStorageKey(), String(Number(ts) || 0));
    } catch {
      // ignore
    }
  };

  const markGiftsSeen = useCallback(() => {
    const ts = latestGiftTsRef.current || Date.now();
    setLastSeenGiftTs(ts);
    setNewGiftsCount(0);
  }, [setLastSeenGiftTs]);

  const fetchNewGiftsCount = useCallback(async () => {
    try {
      const res = await giftAPI.getAll();
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
          ? res.data
          : [];
      const visible = list.filter((g) => {
        if (!g?.expireDate) return true;
        return isExpiryStillValid(g.expireDate);
      });

      let lastSeen = 0;
      try {
        const raw = localStorage.getItem(getGiftSeenStorageKey());
        const ts = raw ? Number(raw) : 0;
        lastSeen = Number.isFinite(ts) ? ts : 0;
      } catch {
        lastSeen = 0;
      }
      let newest = 0;
      let count = 0;
      visible.forEach((g) => {
        const createdTs = g?.createdAt ? new Date(g.createdAt).getTime() : 0;
        if (Number.isFinite(createdTs)) {
          if (createdTs > newest) newest = createdTs;
          if (createdTs > lastSeen) count += 1;
        }
      });
      latestGiftTsRef.current = newest || latestGiftTsRef.current || 0;
      setNewGiftsCount(count);
    } catch {
      setNewGiftsCount(0);
    }
  }, [getGiftSeenStorageKey]);

  useEffect(() => {
    if (!giftsBadgeIdentityReady) {
      setNewGiftsCount(null);
      return undefined;
    }
    fetchNewGiftsCount();
    const id = window.setInterval(fetchNewGiftsCount, 60000);
    return () => window.clearInterval(id);
  }, [giftsBadgeIdentityReady, fetchNewGiftsCount]);

  useEffect(() => {
    if (!giftsBadgeIdentityReady) return undefined;
    const onVis = () => {
      if (document.hidden) return;
      fetchNewGiftsCount();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [giftsBadgeIdentityReady, fetchNewGiftsCount]);

  const fetchPendingReviewsCount = useCallback(async () => {
    if (!user || !canAccessDataEntry(user)) {
      setPendingReviewsCount(0);
      return;
    }
    try {
      const res = await productAPI.getPendingList();
      const list = Array.isArray(res?.data) ? res.data : [];
      setPendingReviewsCount(list.length);
    } catch {
      setPendingReviewsCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !canAccessDataEntry(user)) {
      setPendingReviewsCount(0);
      return undefined;
    }
    fetchPendingReviewsCount();
    const id = window.setInterval(fetchPendingReviewsCount, 60000);
    return () => window.clearInterval(id);
  }, [user, fetchPendingReviewsCount]);

  const handleLangChange = (event) => {
    i18n.changeLanguage(event.target.value);
  };

  const handleHomeTopAction = useCallback(() => {
    if (location.pathname !== "/") return;

    const now = Date.now();
    const isDoubleTap = now - lastHomeTapTsRef.current <= HOME_DOUBLE_TAP_MS;
    lastHomeTapTsRef.current = now;

    if (isDoubleTap) {
      triggerRefresh?.();
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname, triggerRefresh]);

  const handleProfileMenuOpen = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const handleAdminMenuOpen = (event) => {
    setAdminAnchorEl(event.currentTarget);
  };

  const handleAdminMenuClose = () => {
    setAdminAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event) => {
    setNotificationAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
  };

  const handlePlacesMenuOpen = (event) => {
    setPlacesAnchorEl(event.currentTarget);
  };

  const handlePlacesMenuClose = () => {
    setPlacesAnchorEl(null);
  };

  const handleServicesMenuOpen = (event) => {
    setServicesAnchorEl(event.currentTarget);
  };

  const handleServicesMenuClose = () => {
    setServicesAnchorEl(null);
  };

  const handleOwnerNavMenuOpen = (event) => {
    setOwnerNavAnchorEl(event.currentTarget);
  };

  const handleOwnerNavMenuClose = () => {
    setOwnerNavAnchorEl(null);
  };

  const displayName =
    user?.displayName ||
    user?.username ||
    guestUser?.displayName ||
    t("Guest User");
  const profileEmail = user?.email || "";

  const contactStr = (v) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
  };

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

  const contactItems = useMemo(
    () =>
      [
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
      ].filter((item) => Boolean(item.value)),
    [contactInfo],
  );

  const placesMenuActive =
    ["/stores", "/brands", "/companies"].some((p) =>
      location.pathname.startsWith(p),
    ) || false;

  const servicesMenuActive =
    ["/findjob", "/shopping", "/gifts"].some((p) =>
      location.pathname.startsWith(p),
    ) || false;

  const ownerNavMenuActive =
    Boolean(ownerNavAnchorEl) ||
    location.pathname.startsWith("/owner-dashboard") ||
    location.pathname.startsWith("/owner-data-entry");

  const ownerMyProfileNavPath = useMemo(
    () => (user ? getOwnerMyProfileNavPath(user) : "/profile"),
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

  const desktopNavButtonSx = (active) => ({
    color: "white",
    textTransform: "none",
    fontSize: { md: "1rem", lg: "1.15rem" },
    px: { md: 1, lg: 1.5 },
    py: 1,
    borderRadius: 2,
    minWidth: "auto",
    flexShrink: 0,
    position: "relative",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backdropFilter: active ? "blur(10px)" : "none",
    border: active
      ? "1px solid rgba(255,255,255,0.3)"
      : "1px solid transparent",
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.15)",
      backdropFilter: "blur(10px)",
      transform: "translateY(-2px)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      bottom: -2,
      left: "50%",
      transform: "translateX(-50%)",
      width: active ? "80%" : "0%",
      height: 2,
      borderRadius: 1,
      transition: "width 0.3s ease",
    },
  });

  const giftsIconWithBadge = (
    <Badge
      badgeContent={newGiftsCount ?? 0}
      color="error"
      overlap="circular"
      invisible={newGiftsCount == null || newGiftsCount < 1}
    >
      <CardGiftcardIcon />
    </Badge>
  );

  useEffect(() => {
    if (isSmUp) return;
    if (!/^\/reels(\/|$)/.test(location.pathname)) {
      setShowMobileNavbar(true);
    }
  }, [isSmUp, location.pathname]);

  useEffect(() => {
    if (isSmUp) {
      setShowMobileNavbar(true);
      return undefined;
    }

    if (/^\/reels(\/|$)/.test(location.pathname)) {
      return undefined;
    }

    lastScrollYRef.current = window.scrollY || 0;

    const handleScroll = () => {
      const currentY = window.scrollY || 0;
      const prevY = lastScrollYRef.current;

      // Always show when at top.
      if (currentY <= 0) {
        setShowMobileNavbar(true);
        lastScrollYRef.current = 0;
        return;
      }

      // Ignore tiny movement to avoid flicker.
      if (Math.abs(currentY - prevY) < 4) return;

      if (currentY > prevY) {
        // Scrolling down -> hide
        setShowMobileNavbar(false);
      } else {
        // Scrolling up -> show
        setShowMobileNavbar(true);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isSmUp, location.pathname]);

  const navAppBarStyle = useMemo(
    () => ({
      background: isDarkNav ? NAV_BAR_GRADIENT_DARK_GLASS : NAV_BAR_GRADIENT,
    }),
    [isDarkNav],
  );

  const navIconBtnSx = useMemo(
    () =>
      isDarkNav
        ? {
            color: "#f8fafc",
            backgroundColor: "rgba(255,255,255,0.1)",
            backdropFilter: isAndroidPerfMode ? "none" : "blur(14px) saturate(160%)",
            WebkitBackdropFilter: isAndroidPerfMode
              ? "none"
              : "blur(14px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: isAndroidPerfMode
              ? "none"
              : "inset 0 1px 0 rgba(255,255,255,0.28)",
            transition: "all 0.25s ease",
            width: 40,
            height: 40,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.2)",
              transform: isAndroidPerfMode ? "none" : "scale(1.06)",
              boxShadow:
                isAndroidPerfMode
                  ? "none"
                  : "0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
            },
          }
        : {
            color: "white",
            backgroundColor: "rgba(255,255,255,0.1)",
            backdropFilter: isAndroidPerfMode ? "none" : "blur(10px)",
            border: "1px solid rgba(255,255,255,0.2)",
            transition: "all 0.3s ease",
            width: 40,
            height: 40,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.2)",
              transform: isAndroidPerfMode ? "none" : "scale(1.1)",
            },
          },
    [isDarkNav, isAndroidPerfMode],
  );

  const navBrandTitleSx = useMemo(
    () => ({
      fontFamily: NAV_BRAND_TITLE_FONT_FAMILY,
      color: "white",
      fontWeight: 400,
      fontSize: "2.8rem",
      backgroundColor: "white",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      transition: "all 0.3s ease",
    }),
    [],
  );

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        style={navAppBarStyle}
        sx={{
          backdropFilter: isAndroidPerfMode
            ? "none"
            : isDarkNav
              ? "blur(22px) saturate(170%)"
              : "blur(20px)",
          WebkitBackdropFilter: isAndroidPerfMode
            ? "none"
            : isDarkNav
              ? "blur(22px) saturate(170%)"
              : "blur(20px)",
          borderBottom: isDarkNav ? "1px solid rgba(255,255,255,0.12)" : "none",
          boxShadow: isDarkNav
            ? isAndroidPerfMode
              ? "0 2px 10px rgba(0,0,0,0.35)"
              : "0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)"
            : isAndroidPerfMode
              ? "0 2px 10px rgba(0,0,0,0.08)"
              : "0 8px 32px rgba(0,0,0,0.1)",
          transform: isSmUp
            ? "translateY(0)"
            : hideMobileNavOnReels
              ? "translateY(-110%)"
              : showMobileNavbar
                ? "translateY(0)"
                : "translateY(-110%)",
          transition: isAndroidPerfMode ? "none" : "transform 260ms ease",
          willChange: "transform",
        }}
      >
        <Toolbar
          sx={{
            justifyContent: isSmUp ? "flex-start" : "flex-start",
            flexWrap: isSmUp ? "wrap" : "nowrap",
            gap: isSmUp ? 1 : 0,
            rowGap: isSmUp ? 1 : 0,
            px: { xs: 1, sm: 2, md: 4 },
            borderBottomLeftRadius: isDarkNav ? 22 : "50%",
            borderBottomRightRadius: isDarkNav ? 22 : "50%",
            ...(isSmUp ? {} : { minHeight: 56 }),
            position: "relative",
            ...(isDarkNav
              ? {
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    pointerEvents: "none",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 42%)",
                  },
                }
              : {}),
          }}
        >
          {/* Mobile navbar templates */}
          {!isSmUp && (navConfig?.template || "template1") === "template1" && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                justifyContent: "space-between",
                gap: 0.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.9 }}>
                {NOTIFICATIONS_CENTER_ENABLED && (
                  <IconButton
                    onClick={handleNotificationMenuOpen}
                    sx={navIconBtnSx}
                  >
                    <Badge badgeContent={unreadCount} color="error">
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                )}
                <IconButton
                  component={Link}
                  to="/search"
                  onPointerEnter={() => prefetchSearchPageChunk()}
                  sx={navIconBtnSx}
                  aria-label={t("Search")}
                >
                  <SearchIcon />
                </IconButton>
                <IconButton
                  component={Link}
                  to="/"
                  onClick={handleHomeTopAction}
                  sx={navIconBtnSx}
                  aria-label={t("Home")}
                >
                  <HomeIcon />
                </IconButton>
                <IconButton
                  onClick={handleNavRefresh}
                  sx={navIconBtnSx}
                  aria-label={t("Refresh")}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
              <Typography
                className="nav-brand-title"
                component={Link}
                to="/"
                sx={{
                  flex: 1,
                  textAlign: "center",
                  textDecoration: "none",
                  ...navBrandTitleSx,
                  "&:hover": { transform: "scale(1.05)" },
                }}
              >
                {NAV_BRAND_TITLE}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.9 }}>
                <IconButton component={Link} to="/favourites" sx={navIconBtnSx}>
                  <FavoriteIcon />
                </IconButton>
                <IconButton component={Link} to="/profile" sx={navIconBtnSx}>
                  <PersonIcon />
                </IconButton>
              </Box>
            </Box>
          )}

          {!isSmUp && (navConfig?.template || "template1") === "template2" && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                justifyContent: "space-between",
                gap: 0.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.9 }}>
                <IconButton
                  component={Link}
                  to="/search"
                  onPointerEnter={() => prefetchSearchPageChunk()}
                  sx={navIconBtnSx}
                  aria-label={t("Search")}
                >
                  <SearchIcon />
                </IconButton>
              </Box>

              <Typography
                className="nav-brand-title"
                sx={{
                  flex: 1,
                  textAlign: "center",
                  ...navBrandTitleSx,
                }}
              >
                {NAV_BRAND_TITLE}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.9 }}>
                <IconButton
                  component={Link}
                  to="/"
                  onClick={handleHomeTopAction}
                  sx={navIconBtnSx}
                  aria-label={t("Home")}
                >
                  <HomeIcon />
                </IconButton>
                <IconButton
                  onClick={handleNavRefresh}
                  sx={navIconBtnSx}
                  aria-label={t("Refresh")}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Box>
          )}

          {!isSmUp &&
            ((navConfig?.template || "template1") === "custom" ||
              (navConfig?.template || "template1") === "custom2") && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  justifyContent: "space-between",
                  gap: 0.5,
                }}
              >
                {(() => {
                  const top = navConfig?.topSlots || {};
                  const sxBtn = navIconBtnSx;
                  const tpl = navConfig?.template || "template1";

                  const map = {
                    home: { to: "/", icon: <HomeIcon /> },
                    search: { to: "/search", icon: <SearchIcon /> },
                    categories: { to: "/categories", icon: <CategoryIcon /> },
                    reels: { to: "/reels", icon: <VideoLibraryIcon /> },
                    favourites: { to: "/favourites", icon: <FavoriteIcon /> },
                    stores: { to: "/stores", icon: <StoreIcon /> },
                    gifts: { to: "/gifts", icon: giftsIconWithBadge },
                    shopping: { to: "/shopping", icon: <ShoppingBagIcon /> },
                    profile: { to: "/profile", icon: <PersonIcon /> },
                    brands: { to: "/brands", icon: <BusinessIcon /> },
                    companies: {
                      to: "/companies",
                      icon: <CorporateFareIcon />,
                    },
                    jobs: { to: "/findjob", icon: <WorkOutlineIcon /> },
                  };

                  const renderAction = (action, key) => {
                    if (!action || action === "none") {
                      return <Box key={key} sx={{ width: 40, height: 40 }} />;
                    }
                    if (action === "label")
                      return <Box key={key} sx={{ width: 40, height: 40 }} />;
                    if (action === "refresh") {
                      return (
                        <IconButton
                          key={key}
                          onClick={handleNavRefresh}
                          sx={sxBtn}
                        >
                          <RefreshIcon />
                        </IconButton>
                      );
                    }
                    if (action === "city") {
                      return (
                        <IconButton
                          key={key}
                          onClick={(e) =>
                            setMobileNavCityAnchor(e.currentTarget)
                          }
                          sx={sxBtn}
                          aria-label={t("City")}
                        >
                          <LocationOnIcon />
                        </IconButton>
                      );
                    }
                    if (action === "language") {
                      return (
                        <IconButton
                          key={key}
                          onClick={(e) =>
                            setMobileNavLangAnchor(e.currentTarget)
                          }
                          sx={sxBtn}
                          aria-label={t("Language")}
                        >
                          <LanguageIcon />
                        </IconButton>
                      );
                    }
                    if (action === "notifications") {
                      return (
                        <IconButton
                          key={key}
                          onClick={handleNotificationMenuOpen}
                          sx={sxBtn}
                          aria-label={t("Notifications")}
                        >
                          <Badge badgeContent={unreadCount} color="error">
                            <NotificationsIcon />
                          </Badge>
                        </IconButton>
                      );
                    }
                    if (action === "draftCart") {
                      return (
                        <IconButton
                          key={key}
                          onClick={() => openDraftCart()}
                          sx={sxBtn}
                          aria-label={t("Draft cart")}
                        >
                          <ShoppingCartIcon />
                        </IconButton>
                      );
                    }
                    const cfg = map[action];
                    if (!cfg)
                      return <Box key={key} sx={{ width: 40, height: 40 }} />;
                    return (
                      <IconButton
                        key={key}
                        component={Link}
                        to={cfg.to}
                        sx={sxBtn}
                        onClick={
                          cfg.to === "/gifts" ? markGiftsSeen : undefined
                        }
                      >
                        {cfg.icon}
                      </IconButton>
                    );
                  };

                  if (tpl === "custom2") {
                    return (
                      <>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            minWidth: 0,
                            flex: "1 1 auto",
                            overflow: "hidden",
                          }}
                        >
                          <Avatar
                            src={`${import.meta.env.BASE_URL}logo512.png`}
                            alt={NAV_BRAND_TITLE}
                            variant="rounded"
                            sx={{
                              width: 44,
                              height: 44,
                              flexShrink: 0,
                              bgcolor: "rgba(255,255,255,0.12)",
                              "& img": {
                                objectFit: "cover",
                              },
                              ...(isDarkNav
                                ? {
                                    border: "2px solid rgba(255,255,255,0.28)",
                                  }
                                : {
                                    border: "2px solid rgba(255,255,255,0.3)",
                                  }),
                            }}
                          />
                          <Typography
                            className="nav-brand-title"
                            component={Link}
                            to="/"
                            noWrap
                            sx={{
                              textDecoration: "none",
                              fontSize: "1.35rem",
                              ...navBrandTitleSx,
                              minWidth: 0,
                              "&:hover": { transform: "scale(1.03)" },
                            }}
                          >
                            {NAV_BRAND_TITLE}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                            flexShrink: 0,
                          }}
                        >
                          {renderAction(top.topright1, "custom2-tr1")}
                          {renderAction(top.topright2, "custom2-tr2")}
                          {renderAction(top.topright3, "custom2-tr3")}
                        </Box>
                      </>
                    );
                  }

                  const centerIsLabel = (top.center || "label") === "label";
                  return (
                    <>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.9 }}
                      >
                        {renderAction(top.topleft1, "topleft1")}
                        {renderAction(top.topleft2, "topleft2")}
                      </Box>

                      <Typography
                        className="nav-brand-title"
                        component={centerIsLabel ? Link : "div"}
                        to={centerIsLabel ? "/" : undefined}
                        sx={{
                          flex: 1,
                          textAlign: "center",
                          textDecoration: "none",
                          ...navBrandTitleSx,
                          pointerEvents: centerIsLabel ? "auto" : "none",
                        }}
                      >
                        {NAV_BRAND_TITLE}
                      </Typography>

                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.9 }}
                      >
                        {renderAction(top.topright1, "topright1")}
                        {renderAction(top.topright2, "topright2")}
                      </Box>
                    </>
                  );
                })()}
                <Menu
                  anchorEl={mobileNavCityAnchor}
                  open={Boolean(mobileNavCityAnchor)}
                  onClose={() => setMobileNavCityAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                  transformOrigin={{ vertical: "top", horizontal: "center" }}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 200,
                      maxHeight: 320,
                    },
                  }}
                >
                  {cities.map((city) => (
                    <MenuItem
                      key={city.value}
                      selected={selectedCity === city.value}
                      onClick={() => {
                        changeCity(city.value);
                        setMobileNavCityAnchor(null);
                      }}
                    >
                      {city.label}
                    </MenuItem>
                  ))}
                </Menu>
                <Menu
                  anchorEl={mobileNavLangAnchor}
                  open={Boolean(mobileNavLangAnchor)}
                  onClose={() => setMobileNavLangAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                  transformOrigin={{ vertical: "top", horizontal: "center" }}
                  PaperProps={{ sx: { mt: 1, minWidth: 200 } }}
                >
                  <MenuItem
                    selected={i18n.language === "en"}
                    onClick={() => {
                      i18n.changeLanguage("en");
                      setMobileNavLangAnchor(null);
                    }}
                  >
                    🇺🇸 {t("English")}
                  </MenuItem>
                  <MenuItem
                    selected={i18n.language === "ar"}
                    onClick={() => {
                      i18n.changeLanguage("ar");
                      setMobileNavLangAnchor(null);
                    }}
                  >
                    🇸🇦 {t("Arabic")}
                  </MenuItem>
                  <MenuItem
                    selected={i18n.language === "ku"}
                    onClick={() => {
                      i18n.changeLanguage("ku");
                      setMobileNavLangAnchor(null);
                    }}
                  >
                    <Box
                      component="span"
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Box
                        component="img"
                        src={kurdishFlag}
                        alt="Kurdish"
                        sx={{
                          width: 16,
                          height: 12,
                          objectFit: "cover",
                          borderRadius: 0.5,
                        }}
                      />
                      {t("Kurdish")}
                    </Box>
                  </MenuItem>
                </Menu>
              </Box>
            )}

          {/* Desktop: logo + main nav (LTR) + notifications + profile menu (not /profile) */}
          {isSmUp && (
            <>
              <Box display="flex" alignItems="center" flexShrink={0}>
                <Avatar
                  src={`${import.meta.env.BASE_URL}logo512.png`}
                  alt={NAV_BRAND_TITLE}
                  variant="rounded"
                  sx={{
                    mr: 2,
                    width: 44,
                    height: 44,
                    bgcolor: "rgba(255,255,255,0.12)",
                    "& img": {
                      objectFit: "cover",
                    },
                    ...(isDarkNav
                      ? {
                          backdropFilter: "blur(12px) saturate(150%)",
                          WebkitBackdropFilter: "blur(12px) saturate(150%)",
                          border: "2px solid rgba(255,255,255,0.28)",
                          boxShadow:
                            "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
                        }
                      : {
                          backdropFilter: "blur(10px)",
                          border: "2px solid rgba(255,255,255,0.3)",
                        }),
                  }}
                />
                <Typography
                  className="nav-brand-title"
                  variant="h5"
                  component={Link}
                  to="/"
                  sx={{
                    textDecoration: "none",
                    fontSize: { xs: "1.75rem", sm: "1.75rem", md: "1.75rem" },
                    ...navBrandTitleSx,
                    "&:hover": {
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  {NAV_BRAND_TITLE}
                </Typography>
              </Box>

              <Box
                sx={{
                  flex: "1 1 auto",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 0.5,
                  minWidth: 0,
                  pl: { md: 2 },
                }}
              >
                <Button
                  component={Link}
                  to="/"
                  onClick={handleHomeTopAction}
                  startIcon={<HomeIcon />}
                  sx={desktopNavButtonSx(location.pathname === "/")}
                >
                  {t("Main Page")}
                </Button>
                <Button
                  component={Link}
                  to="/reels"
                  startIcon={<VideoLibraryIcon />}
                  sx={desktopNavButtonSx(
                    location.pathname.startsWith("/reels"),
                  )}
                >
                  {t("Reels")}
                </Button>
                <Button
                  component={Link}
                  to="/search"
                  onPointerEnter={() => prefetchSearchPageChunk()}
                  startIcon={<SearchIcon />}
                  sx={desktopNavButtonSx(
                    location.pathname.startsWith("/search"),
                  )}
                >
                  {t("Search")}
                </Button>
                <Button
                  component={Link}
                  to="/categories"
                  startIcon={<CategoryIcon />}
                  sx={desktopNavButtonSx(
                    location.pathname.startsWith("/categories"),
                  )}
                >
                  {t("Categories")}
                </Button>

                <Button
                  startIcon={<StoreIcon />}
                  endIcon={<ExpandMoreIcon />}
                  onClick={handlePlacesMenuOpen}
                  sx={desktopNavButtonSx(placesMenuActive)}
                >
                  {t("Places", { defaultValue: "Places" })}
                </Button>
                <Menu
                  anchorEl={placesAnchorEl}
                  open={Boolean(placesAnchorEl)}
                  onClose={handlePlacesMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  PaperProps={{
                    sx: {
                      mt: 1.5,
                      minWidth: 200,
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? "var(--brand-primary-blue)"
                          : "#fff",
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                    },
                  }}
                >
                  <MenuItem
                    component={Link}
                    to="/stores"
                    onClick={handlePlacesMenuClose}
                    selected={location.pathname.startsWith("/stores")}
                  >
                    <ListItemIcon>
                      <StoreIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={t("Stores")} />
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    to="/brands"
                    onClick={handlePlacesMenuClose}
                    selected={location.pathname.startsWith("/brands")}
                  >
                    <ListItemIcon>
                      <BusinessIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={t("Brands")} />
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    to="/companies"
                    onClick={handlePlacesMenuClose}
                    selected={location.pathname.startsWith("/companies")}
                  >
                    <ListItemIcon>
                      <CorporateFareIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t("Companies", { defaultValue: "Companies" })}
                    />
                  </MenuItem>
                </Menu>

                <Button
                  startIcon={<ShoppingBagIcon />}
                  endIcon={<ExpandMoreIcon />}
                  onClick={handleServicesMenuOpen}
                  sx={desktopNavButtonSx(servicesMenuActive)}
                >
                  {t("Services", { defaultValue: "Services" })}
                </Button>
                <Menu
                  anchorEl={servicesAnchorEl}
                  open={Boolean(servicesAnchorEl)}
                  onClose={handleServicesMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  PaperProps={{
                    sx: {
                      mt: 1.5,
                      minWidth: 200,
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? "var(--brand-primary-blue)"
                          : "#fff",
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                    },
                  }}
                >
                  <MenuItem
                    component={Link}
                    to="/findjob"
                    onClick={handleServicesMenuClose}
                    selected={location.pathname.startsWith("/findjob")}
                  >
                    <ListItemIcon>
                      <WorkOutlineIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={t("Find Job")} />
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    to="/shopping"
                    onClick={handleServicesMenuClose}
                    selected={location.pathname.startsWith("/shopping")}
                  >
                    <ListItemIcon>
                      <ShoppingBagIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t("Shopping", { defaultValue: "Shopping" })}
                    />
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    to="/gifts"
                    onClick={() => {
                      markGiftsSeen();
                      handleServicesMenuClose();
                    }}
                    selected={location.pathname.startsWith("/gifts")}
                  >
                    <ListItemIcon>{giftsIconWithBadge}</ListItemIcon>
                    <ListItemText primary={t("Gifts")} />
                  </MenuItem>
                </Menu>

                {isAuthenticated && canAccessPendingPage(user) && (
                  <Button
                    component={Link}
                    to="/pending"
                    startIcon={<HourglassTopIcon />}
                    sx={desktopNavButtonSx(
                      location.pathname.startsWith("/pending"),
                    )}
                  >
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                      }}
                    >
                      <span>
                        {t("Pending", {
                          defaultValue: "Pending",
                        })}
                      </span>
                      {canAccessDataEntry(user) && pendingReviewsCount > 0 && (
                        <Chip
                          label={pendingReviewsCount}
                          size="small"
                          color="warning"
                          sx={{
                            height: 18,
                            minWidth: 18,
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            "& .MuiChip-label": { px: 0.6 },
                          }}
                        />
                      )}
                    </Box>
                  </Button>
                )}

                {isAuthenticated && canSeeOwnerNavSection(user) && (
                  <>
                    <Button
                      startIcon={<StorefrontNavOwnerIcon />}
                      endIcon={<ExpandMoreIcon />}
                      onClick={handleOwnerNavMenuOpen}
                      sx={desktopNavButtonSx(ownerNavMenuActive)}
                    >
                      {t("navOwnerSection", { defaultValue: "Owner" })}
                    </Button>
                    <Menu
                      anchorEl={ownerNavAnchorEl}
                      open={Boolean(ownerNavAnchorEl)}
                      onClose={handleOwnerNavMenuClose}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                      transformOrigin={{
                        vertical: "top",
                        horizontal: "right",
                      }}
                      PaperProps={{
                        sx: {
                          mt: 1.5,
                          minWidth: 220,
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "var(--brand-primary-blue)"
                              : "#fff",
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 2,
                        },
                      }}
                    >
                      <MenuItem
                        component={Link}
                        to={ownerMyProfileNavPath}
                        onClick={handleOwnerNavMenuClose}
                        selected={
                          ownerMyProfileNavPath === "/profile"
                            ? location.pathname === "/profile"
                            : location.pathname === ownerMyProfileNavPath
                        }
                      >
                        <ListItemIcon>
                          <PersonIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={t("ownerMyProfile", {
                            defaultValue: "My profile",
                          })}
                        />
                      </MenuItem>
                      <MenuItem
                        component={Link}
                        to="/owner-dashboard"
                        onClick={handleOwnerNavMenuClose}
                        selected={location.pathname.startsWith(
                          "/owner-dashboard",
                        )}
                      >
                        <ListItemIcon>
                          <DashboardIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={t("Owner dashboard", {
                            defaultValue: "Owner dashboard",
                          })}
                        />
                      </MenuItem>
                      <MenuItem
                        component={Link}
                        to="/owner-data-entry"
                        onClick={handleOwnerNavMenuClose}
                        selected={location.pathname.startsWith(
                          "/owner-data-entry",
                        )}
                      >
                        <ListItemIcon>
                          <AddOwnerDataEntryIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={t("Owner Data Entry", {
                            defaultValue: "Owner Data Entry",
                          })}
                        />
                      </MenuItem>
                    </Menu>
                  </>
                )}

                {showAdminNav && (
                  <>
                    <Button
                      startIcon={<AdminPanelSettingsIcon />}
                      endIcon={isFullAdmin ? <ExpandMoreIcon /> : undefined}
                      sx={{
                        ...desktopNavButtonSx(
                          location.pathname.startsWith("/admin"),
                        ),
                        backgroundColor: location.pathname.startsWith("/admin")
                          ? "rgba(255,255,255,0.12)"
                          : undefined,
                      }}
                      {...(isFullAdmin
                        ? { onClick: handleAdminMenuOpen }
                        : { component: Link, to: "/admin" })}
                    >
                      {t("Admin")}
                    </Button>
                    {isFullAdmin && (
                      <Menu
                        anchorEl={adminAnchorEl}
                        open={Boolean(adminAnchorEl)}
                        onClose={handleAdminMenuClose}
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "right",
                        }}
                        transformOrigin={{
                          vertical: "top",
                          horizontal: "right",
                        }}
                        PaperProps={{
                          sx: {
                            mt: 1.5,
                            minWidth: 220,
                            backgroundColor:
                              theme.palette.mode === "dark"
                                ? "var(--brand-primary-blue)"
                                : "#fff",
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 2,
                          },
                        }}
                      >
                        <MenuItem
                          component={Link}
                          to="/admin"
                          onClick={handleAdminMenuClose}
                          selected={location.pathname === "/admin"}
                        >
                          <ListItemIcon>
                            <AdminPanelSettingsIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={t("Data Entry")} />
                        </MenuItem>
                        <MenuItem
                          component={Link}
                          to="/admin/users"
                          onClick={handleAdminMenuClose}
                          selected={location.pathname === "/admin/users"}
                        >
                          <ListItemIcon>
                            <PeopleIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={t("Users")} />
                        </MenuItem>
                        <MenuItem
                          component={Link}
                          to="/admin/translations"
                          onClick={handleAdminMenuClose}
                          selected={location.pathname === "/admin/translations"}
                        >
                          <ListItemIcon>
                            <LanguageIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={t("translationPage.title")} />
                        </MenuItem>
                        <MenuItem
                          component={Link}
                          to="/admin/dashboard"
                          onClick={handleAdminMenuClose}
                          selected={location.pathname === "/admin/dashboard"}
                        >
                          <ListItemIcon>
                            <DashboardIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={t("Admin Dashboard")} />
                        </MenuItem>
                        <MenuItem
                          component={Link}
                          to="/admin/customization"
                          onClick={handleAdminMenuClose}
                          selected={
                            location.pathname === "/admin/customization"
                          }
                        >
                          <ListItemIcon>
                            <SettingsIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={t("Customization")} />
                        </MenuItem>
                        <MenuItem
                          component={Link}
                          to="/admin/visitors"
                          onClick={handleAdminMenuClose}
                          selected={location.pathname === "/admin/visitors"}
                        >
                          <ListItemIcon>
                            <BarChartIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={t("Visitors report")} />
                        </MenuItem>
                        <MenuItem
                          component={Link}
                          to="/admin/cities"
                          onClick={handleAdminMenuClose}
                          selected={location.pathname === "/admin/cities"}
                        >
                          <ListItemIcon>
                            <LocationOnIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={t("City management", {
                              defaultValue: "City management",
                            })}
                          />
                        </MenuItem>
                      </Menu>
                    )}
                  </>
                )}

                {NOTIFICATIONS_CENTER_ENABLED && (
                  <IconButton
                    onClick={handleNotificationMenuOpen}
                    sx={{ ...navIconBtnSx, ml: 0.5 }}
                  >
                    <Badge badgeContent={unreadCount} color="error">
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                )}
                <IconButton
                  onClick={handleProfileMenuOpen}
                  sx={{ ...navIconBtnSx, ml: 0.5 }}
                  aria-label={t("Profile", { defaultValue: "Profile" })}
                >
                  <PersonIcon />
                </IconButton>
              </Box>
            </>
          )}

          {/* Controls - desktop only (mobile has its own navbar above) */}
        </Toolbar>
      </AppBar>

      {NOTIFICATIONS_CENTER_ENABLED && (
        <Menu
          anchorEl={notificationAnchorEl}
          open={Boolean(notificationAnchorEl)}
          onClose={handleNotificationMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 320,
              maxWidth: 380,
              maxHeight: 400,
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(15, 23, 42, 0.98)"
                  : "#fff",
              backdropFilter:
                theme.palette.mode === "dark" ? "blur(14px)" : "none",
              WebkitBackdropFilter:
                theme.palette.mode === "dark" ? "blur(14px)" : "none",
              border:
                theme.palette.mode === "dark"
                  ? "1px solid rgba(148,163,184,0.18)"
                  : `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 18px 48px rgba(0,0,0,0.55)"
                  : undefined,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {t("Notifications")}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {unreadCount > 0 && (
                  <Button
                    size="small"
                    onClick={() => markAllAsRead()}
                    sx={{ textTransform: "none" }}
                  >
                    {t("Mark all read")}
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    size="small"
                    onClick={() => clearAll()}
                    sx={{ textTransform: "none", color: "text.secondary" }}
                  >
                    {t("Clear notifications")}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
          {pushSupported && pushPermission === "default" && (
            <Box
              sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}
            >
              <Button
                fullWidth
                variant="outlined"
                size="small"
                disabled={pushSubscribing}
                onClick={() => requestPushPermission()}
                sx={{ textTransform: "none" }}
              >
                {pushSubscribing
                  ? t("Enabling...")
                  : t("Enable system notifications")}
              </Button>
            </Box>
          )}
          <Box sx={{ maxHeight: 280, overflow: "auto" }}>
            {notifications.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ p: 2, textAlign: "center" }}
              >
                {t("No notifications")}
              </Typography>
            ) : (
              notifications.map((n) => (
                <ListItemButton
                  key={n._id}
                  onClick={() => {
                    markAsRead(n._id);
                  }}
                  sx={{
                    py: 1.5,
                    px: 2,
                    backgroundColor: n.read ? "transparent" : "action.hover",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ width: "100%" }}>
                    <Typography
                      variant="body2"
                      fontWeight={n.read ? 400 : 600}
                      sx={{ mb: 0.25 }}
                    >
                      {pickNotificationText(n, "title")}
                    </Typography>
                    {pickNotificationText(n, "body") && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {pickNotificationText(n, "body").length > 120
                          ? `${pickNotificationText(n, "body").slice(0, 120)}...`
                          : pickNotificationText(n, "body")}
                      </Typography>
                    )}
                    {n.link && (
                      <Typography
                        component={Link}
                        to={n.link}
                        variant="caption"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n._id);
                          handleNotificationMenuClose();
                        }}
                        sx={{
                          display: "inline-block",
                          mt: 0.5,
                          color: "primary.main",
                          textDecoration: "underline",
                          fontSize: "0.7rem",
                          "&:hover": { color: "primary.dark" },
                        }}
                      >
                        {t("View")} →
                      </Typography>
                    )}
                  </Box>
                </ListItemButton>
              ))
            )}
          </Box>
        </Menu>
      )}

      <Menu
        anchorEl={profileAnchorEl}
        open={Boolean(profileAnchorEl)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          onMouseDown: (e) => e.stopPropagation(),
          sx: {
            mt: 1.5,
            minWidth: 300,
            maxWidth: 360,
            maxHeight: "min(90dvh, 620px)",
            overflow: "auto",
            backgroundColor:
              theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.98)" : "#fff",
            border:
              theme.palette.mode === "dark"
                ? "1px solid rgba(148,163,184,0.18)"
                : `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
          },
        }}
        disableAutoFocus
        MenuListProps={{ autoFocus: false }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Box display="flex" alignItems="center" gap={1.25}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: "primary.main",
                fontWeight: 700,
              }}
            >
              {(displayName || "U").charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {displayName}
              </Typography>
              {!!profileEmail && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  display="block"
                >
                  {profileEmail}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <MenuItem
          onClick={() => {
            handleProfileMenuClose();
            if (user) {
              setUserNameInput(user?.displayName || user?.username || "");
              setUserNameDialogOpen(true);
            } else {
              setGuestNameInput(guestUser?.displayName || "");
              setGuestNameDialogOpen(true);
            }
          }}
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t("Change Your Account Name")} />
        </MenuItem>

        <Divider />

        <Box sx={{ px: 2, py: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1,
            }}
          >
            <PaletteIcon sx={{ fontSize: 20, color: "primary.main" }} />
            <Typography variant="subtitle2" fontWeight={700}>
              {t("Appearance", { defaultValue: "Appearance" })}
            </Typography>
          </Box>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={colorMode}
            onChange={(_, v) => v != null && setColorMode(v)}
            sx={{
              "& .MuiToggleButton-root": {
                textTransform: "none",
                py: 0.75,
              },
            }}
          >
            <ToggleButton value="light" aria-label={t("Light")}>
              <LightModeOutlined sx={{ fontSize: 22, mr: 0.5 }} />
              {t("Light")}
            </ToggleButton>
            <ToggleButton value="dark" aria-label={t("Dark")}>
              <DarkModeOutlined sx={{ fontSize: 22, mr: 0.5 }} />
              {t("Dark")}
            </ToggleButton>
            <ToggleButton
              value="system"
              aria-label={t("System", { defaultValue: "System" })}
            >
              <BrightnessAutoRounded sx={{ fontSize: 22, mr: 0.5 }} />
              {t("System", { defaultValue: "System" })}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ px: 2, pb: 1.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.75, display: "block" }}
          >
            {t("City")}
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={selectedCity}
              onChange={(e) => changeCity(e.target.value)}
              startAdornment={
                <LocationOnIcon sx={{ ml: 0.5, mr: 0.5, fontSize: 18 }} />
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

        <Box sx={{ px: 2, pb: 1.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.75, display: "block" }}
          >
            {t("Language")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
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
                <Box
                  component="img"
                  src={kurdishFlag}
                  alt="Kurdish"
                  sx={{
                    width: 16,
                    height: 12,
                    objectFit: "cover",
                    borderRadius: 0.5,
                  }}
                />
                {t("Kurdish")}
              </Box>
            </Button>
          </Box>
        </Box>

        {contactItems.length > 0 && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 0.75, display: "block" }}
            >
              {t("Contact Us")}
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 0.75,
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
                      size="small"
                      variant="outlined"
                      onClick={(e) => {
                        e.preventDefault();
                        openWhatsAppLink(href);
                      }}
                      sx={{ minWidth: 40, px: 1, flexShrink: 0 }}
                    >
                      {item.icon}
                    </Button>
                  );
                }
                return (
                  <Button
                    key={item.key}
                    component="a"
                    href={href || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    variant="outlined"
                    sx={{ minWidth: 40, px: 1, flexShrink: 0 }}
                  >
                    {item.icon}
                  </Button>
                );
              })}
            </Box>
          </Box>
        )}

        <Divider />

        <MenuItem
          component={Link}
          to="/privacy-policy"
          onClick={handleProfileMenuClose}
        >
          <ListItemIcon>
            <PrivacyTipIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t("Privacy Policy")} />
        </MenuItem>

        {user ? (
          <>
            <MenuItem
              onClick={() => {
                handleProfileMenuClose();
                setDeactivateDialogOpen(true);
              }}
              sx={{ color: "secondary.main" }}
            >
              <ListItemIcon>
                <BlockIcon fontSize="small" color="secondary" />
              </ListItemIcon>
              <ListItemText primary={t("Deactivate Account")} />
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleLogout();
              }}
              sx={{ color: "error.main" }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText primary={t("Logout")} />
            </MenuItem>
          </>
        ) : (
          <MenuItem
            component={Link}
            to="/login"
            onClick={handleProfileMenuClose}
            sx={{ color: "primary.main" }}
          >
            <ListItemIcon>
              <LoginIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary={t("Login")} />
          </MenuItem>
        )}
      </Menu>

      <Dialog
        open={guestNameDialogOpen}
        onClose={() => setGuestNameDialogOpen(false)}
        maxWidth="xs"
        fullWidth
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
                window.alert(result?.message || t("Deactivation failed"));
              }
            }}
          >
            {deactivating ? t("Deactivating...") : t("Deactivate Account")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* {NOTIFICATIONS_CENTER_ENABLED && (
        <Snackbar
          open={!!pushEnableError}
          autoHideDuration={5000}
          onClose={() => setPushEnableError(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setPushEnableError(null)}
            severity="warning"
            sx={{ width: "100%" }}
          >
            {pushEnableError === "denied"
              ? t(
                  "Notifications blocked. Enable them in your browser settings.",
                )
              : t("Could not enable notifications. Try again.")}
          </Alert>
        </Snackbar>
      )} */}

      {/* Stores Dropdown removed */}
    </>
  );
};

export default NavigationBar;
