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
  ListItemButton,
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
  WorkOutline as WorkOutlineIcon,
} from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";
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
import { giftAPI } from "./services/api";
import { isExpiryStillValid } from "./utils/expiryDate";
import { isAdminEmail, canAccessDataEntry } from "./utils/adminAccess";

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
  const { t, i18n } = useTranslation();
  const { user, logout, deactivate } = useAuth();
  const { user: guestUser, updateGuestName } = useUserTracking();
  const { selectedCity, changeCity, cities } = useCityFilter();

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
  const location = useLocation();
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

  // Stores dropdown state
  const [storesAnchorEl, setStoresAnchorEl] = useState(null);

  // City submenu state (desktop profile)
  const [cityAnchorEl, setCityAnchorEl] = useState(null);

  const [mobileNavCityAnchor, setMobileNavCityAnchor] = useState(null);
  const [mobileNavLangAnchor, setMobileNavLangAnchor] = useState(null);
  const lastHomeTapTsRef = useRef(0);

  const [guestNameDialogOpen, setGuestNameDialogOpen] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState("");
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateSnackbar, setDeactivateSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [confirmPushOpen, setConfirmPushOpen] = useState(false);

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

  const handleStoresMenuOpen = (event) => {
    setStoresAnchorEl(event.currentTarget);
  };

  const handleStoresMenuClose = () => {
    setStoresAnchorEl(null);
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

  const handleDeactivateClick = () => {
    handleProfileMenuClose();
    setDeactivateDialogOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    setDeactivating(true);
    const result = await deactivate();
    setDeactivating(false);
    setDeactivateDialogOpen(false);
    setDeactivateSnackbar({
      open: true,
      message: result.success
        ? result.message ||
          t(
            "Account deactivated. You have 30 days to log in again to reactivate.",
          )
        : result.message,
      severity: result.success ? "success" : "error",
    });
  };

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

  const navItems = [
    { name: t("Main Page"), path: "/", icon: <HomeIcon /> },
    { name: t("Search"), path: "/search", icon: <SearchIcon /> },
    { name: t("Products"), path: "/categories", icon: <CategoryIcon /> },
    { name: t("Favourites"), path: "/favourites", icon: <FavoriteIcon /> },
    { name: t("Brands"), path: "/brands", icon: <BusinessIcon /> },
    { name: t("Gifts"), path: "/gifts", icon: giftsIconWithBadge },
    // Data Entry is now admin-only via Admin dropdown; no extra nav item for non-admins
    // Only show Admin link for specific admin email
    // ...(user && user.email === "mshexani45@gmail.com"
    //   ? [
    //       {
    //         name: t("Admin"),
    //         path: "/admin/specific",
    //         icon: <AdminPanelSettingsIcon />,
    //       },
    //     ]
    //   : []),
  ];

  useEffect(() => {
    if (isSmUp) {
      setShowMobileNavbar(true);
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
  }, [isSmUp]);

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
            backdropFilter: "blur(14px) saturate(160%)",
            WebkitBackdropFilter: "blur(14px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)",
            transition: "all 0.25s ease",
            width: 40,
            height: 40,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.2)",
              transform: "scale(1.06)",
              boxShadow:
                "0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
            },
          }
        : {
            color: "white",
            backgroundColor: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.2)",
            transition: "all 0.3s ease",
            width: 40,
            height: 40,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.2)",
              transform: "scale(1.1)",
            },
          },
    [isDarkNav],
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
          backdropFilter: isDarkNav
            ? "blur(22px) saturate(170%)"
            : "blur(20px)",
          WebkitBackdropFilter: isDarkNav
            ? "blur(22px) saturate(170%)"
            : "blur(20px)",
          borderBottom: isDarkNav ? "1px solid rgba(255,255,255,0.12)" : "none",
          boxShadow: isDarkNav
            ? "0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)"
            : "0 8px 32px rgba(0,0,0,0.1)",
          transform: isSmUp
            ? "translateY(0)"
            : showMobileNavbar
              ? "translateY(0)"
              : "translateY(-110%)",
          transition: "transform 260ms ease",
          willChange: "transform",
        }}
      >
        <Toolbar
          sx={{
            justifyContent: isSmUp ? "space-between" : "flex-start",
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
                <IconButton component={Link} to="/search" sx={navIconBtnSx}>
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
                  onClick={() => triggerRefresh?.()}
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
                  onClick={() => triggerRefresh?.()}
                  sx={navIconBtnSx}
                  aria-label={t("Refresh")}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Box>
          )}

          {!isSmUp && (navConfig?.template || "template1") === "custom" && (
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
                        onClick={() => triggerRefresh?.()}
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
                        onClick={(e) => setMobileNavCityAnchor(e.currentTarget)}
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
                        onClick={(e) => setMobileNavLangAnchor(e.currentTarget)}
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
                  const cfg = map[action];
                  if (!cfg)
                    return <Box key={key} sx={{ width: 40, height: 40 }} />;
                  return (
                    <IconButton
                      key={key}
                      component={Link}
                      to={cfg.to}
                      sx={sxBtn}
                      onClick={cfg.to === "/gifts" ? markGiftsSeen : undefined}
                    >
                      {cfg.icon}
                    </IconButton>
                  );
                };

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

          {/* Desktop: Logo and Brand */}
          {isSmUp && (
            <Box display="flex" alignItems="center">
              <Avatar
                sx={{
                  mr: 2,
                  width: 40,
                  height: 40,
                  ...(isDarkNav
                    ? {
                        bgcolor: "rgba(255,255,255,0.1)",
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
              >
                <StoreIcon sx={{ color: "white", fontSize: 24 }} />
              </Avatar>
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
          )}

          {/* Desktop Navigation */}
          {isSmUp && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              {/* First two nav items (Main Page, Products) */}
              {navItems.slice(0, 2).map((item) => (
                <Button
                  key={item.path}
                  component={Link}
                  to={item.path}
                  startIcon={item.icon}
                  sx={{
                    color: "white",
                    textTransform: "none",
                    fontSize: "1.3rem",
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    minWidth: "auto",
                    position: "relative",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    // backgroundColor:
                    //   location.pathname === item.path
                    //     ? "rgba(255,255,255,0.2)"
                    //     : "transparent",
                    backdropFilter:
                      location.pathname === item.path ? "blur(10px)" : "none",
                    border:
                      location.pathname === item.path
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
                      width: location.pathname === item.path ? "80%" : "0%",
                      height: 2,
                      // backgroundColor: "white",
                      borderRadius: 1,
                      transition: "width 0.3s ease",
                    },
                  }}
                >
                  {item.name}
                </Button>
              ))}

              {/* Stores link (no dropdown) */}
              <Button
                component={Link}
                to="/stores"
                startIcon={<StoreIcon />}
                sx={{
                  color: "white",
                  textTransform: "none",
                  fontSize: "1.3rem",
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  minWidth: "auto",
                  position: "relative",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  // backgroundColor: location.pathname.startsWith("/stores")
                  //   ? "rgba(255,255,255,0.2)"
                  //   : "transparent",
                  backdropFilter: location.pathname.startsWith("/stores")
                    ? "blur(10px)"
                    : "none",
                  border: location.pathname.startsWith("/stores")
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
                    width: location.pathname.startsWith("/stores")
                      ? "80%"
                      : "0%",
                    height: 2,
                    // backgroundColor: "white",
                    borderRadius: 1,
                    transition: "width 0.3s ease",
                  },
                }}
              >
                {t("Stores")}
              </Button>

              {/* Remaining nav items (Brands, Gifts, Admin) - exclude Favourites (moved to profile) */}
              {navItems
                .slice(2)
                .filter((item) => item.path !== "/favourites")
                .map((item) => (
                  <Button
                    key={item.path}
                    component={Link}
                    to={item.path}
                    startIcon={item.icon}
                    onClick={item.path === "/gifts" ? markGiftsSeen : undefined}
                    sx={{
                      color: "white",
                      textTransform: "none",
                      fontSize: "1.3rem",
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      minWidth: "auto",
                      position: "relative",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      // backgroundColor:
                      //   location.pathname === item.path
                      //     ? "rgba(255,255,255,0.2)"
                      //     : "transparent",
                      backdropFilter:
                        location.pathname === item.path ? "blur(10px)" : "none",
                      border:
                        location.pathname === item.path
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
                        width: location.pathname === item.path ? "80%" : "0%",
                        height: 2,
                        // backgroundColor: "white",
                        borderRadius: 1,
                        transition: "width 0.3s ease",
                      },
                    }}
                  >
                    {item.name}
                  </Button>
                ))}
              {/* Admin: full menu for admin emails; support role sees Data Entry only */}
              {showAdminNav && (
                <>
                  <Button
                    startIcon={<AdminPanelSettingsIcon />}
                    endIcon={isFullAdmin ? <ExpandMoreIcon /> : undefined}
                    sx={{
                      color: "white",
                      textTransform: "none",
                      fontSize: "1.3rem",
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      minWidth: "auto",
                      backgroundColor: location.pathname.startsWith("/admin")
                        ? "rgba(255,255,255,0.2)"
                        : "transparent",
                      border: location.pathname.startsWith("/admin")
                        ? "1px solid rgba(255,255,255,0.3)"
                        : "1px solid transparent",
                      "&:hover": {
                        backgroundColor: "rgba(255,255,255,0.15)",
                        borderColor: "rgba(255,255,255,0.5)",
                      },
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
                        horizontal: "center",
                      }}
                      transformOrigin={{
                        vertical: "top",
                        horizontal: "center",
                      }}
                      PaperProps={{
                        sx: {
                          mt: 1.5,
                          minWidth: 180,
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
                        selected={location.pathname === "/admin/customization"}
                      >
                        <ListItemIcon>
                          <SettingsIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={t("Customization")} />
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
              {/* Desktop Profile Icon (contains Favourites, Login/Logout, City, Mode) */}
              <IconButton
                component={Link}
                to="/profile"
                sx={{ ...navIconBtnSx, ml: 0.5 }}
              >
                <PersonIcon />
              </IconButton>
            </Box>
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
