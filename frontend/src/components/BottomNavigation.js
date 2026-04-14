import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  useTheme,
  Menu,
  MenuItem,
  Badge,
  Button,
  Typography,
  Divider,
  ListItemButton,
} from "@mui/material";
import {
  Home as HomeIcon,
  Category as CategoryIcon,
  Store as StoreIcon,
  CardGiftcard as CardGiftcardIcon,
  Favorite as FavoriteIcon,
  VideoLibrary as VideoLibraryIcon,
  ShoppingBag as ShoppingBagIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  WorkOutline as WorkOutlineIcon,
  LocationOn as LocationOnIcon,
  Language as LanguageIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useIsMobileLayout from "../hooks/useIsMobileLayout";
import { useActiveTheme } from "../context/ActiveThemeContext";
import { useCityFilter } from "../context/CityFilterContext";
import { useContentRefresh } from "../context/ContentRefreshContext";
import { useNotifications } from "../context/NotificationContext";
import {
  DATA_LANG_AR,
  DATA_LANG_EN,
  DATA_LANG_KU,
  useDataLanguage,
} from "../context/DataLanguageContext";
import kurdishFlag from "../styles/kurdish_flag.jpg";

const NAV_PATH_CITY = "__nav_city__";
const NAV_PATH_LANG = "__nav_language__";
const NAV_PATH_REFRESH = "__nav_refresh__";
const NAV_PATH_NOTIFICATIONS = "__nav_notifications__";
const MAIN_PAGE_SCROLL_KEY = "mainPage.scrollY.v1";
const MAIN_PAGE_SCROLL_STATE_KEY = "mainPage.scrollState.v1";

function persistMainPageScrollState(y) {
  try {
    const rawState = sessionStorage.getItem(MAIN_PAGE_SCROLL_STATE_KEY);
    const parsed = rawState ? JSON.parse(rawState) : {};
    sessionStorage.setItem(MAIN_PAGE_SCROLL_KEY, String(y));
    sessionStorage.setItem(
      MAIN_PAGE_SCROLL_STATE_KEY,
      JSON.stringify({
        y,
        tab: Number.isFinite(Number(parsed?.tab)) ? Number(parsed.tab) : 0,
        displayedCount: Number.isFinite(Number(parsed?.displayedCount))
          ? Number(parsed.displayedCount)
          : 0,
      }),
    );
  } catch {
    // ignore
  }
}

/** Solid brand bar (light). Dark uses translucent glass gradient. */
const BOTTOM_NAV_GRADIENT =
  "linear-gradient(120deg, var(--color-primary) 0%, var(--color-secondary) 56%, var(--color-secondary) 100%)";
const BOTTOM_NAV_GRADIENT_DARK_GLASS =
  "linear-gradient(118deg, rgba(7,11,20,0.82) 0%, rgba(15,23,42,0.74) 42%, rgba(23,37,84,0.66) 78%, rgba(37,99,235,0.48) 100%)";

const BottomNavigationBar = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();
  const { navConfig } = useActiveTheme();
  const { triggerRefresh } = useContentRefresh();
  const { selectedCity, changeCity, cities } = useCityFilter();
  const { dataLanguage } = useDataLanguage();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();
  const [cityMenuAnchor, setCityMenuAnchor] = useState(null);
  const [langMenuAnchor, setLangMenuAnchor] = useState(null);
  const [notifMenuAnchor, setNotifMenuAnchor] = useState(null);
  const lastHomeTapTsRef = useRef(0);
  const lastReelsTapTsRef = useRef(0);

  const pickNotificationText = useMemo(() => {
    const isAr = dataLanguage === DATA_LANG_AR;
    const isKu = dataLanguage === DATA_LANG_KU;
    const isEn = dataLanguage === DATA_LANG_EN;
    return (n, field) => {
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
    };
  }, [dataLanguage]);

  const activeValue = useMemo(() => {
    const pathname = location.pathname;

    if (pathname === "/") return "/";
    if (pathname === "/reels") return "/reels";
    if (pathname === "/favourites") return "/favourites";
    if (pathname === "/categories") return "/categories";
    if (pathname === "/gifts") return "/gifts";
    if (pathname === "/shopping") return "/shopping";
    if (pathname === "/profile") return "/profile";
    if (pathname === "/findjob") return "/findjob";
    if (pathname === "/search") return "/search";

    if (pathname.startsWith("/stores")) return "/stores";
    if (pathname.startsWith("/brands")) return "/brands";

    return false;
  }, [location.pathname]);

  const template = navConfig?.template || "template1";

  const actionMap = useMemo(
    () => ({
      home: { name: t("Home"), path: "/", icon: <HomeIcon /> },
      search: {
        name: t("Search"),
        path: "/search",
        icon: <SearchIcon />,
      },
      refresh: {
        kind: "refresh",
        name: t("Refresh"),
        path: NAV_PATH_REFRESH,
        icon: <RefreshIcon />,
      },
      categories: {
        name: t("Categories"),
        path: "/categories",
        icon: <CategoryIcon />,
      },
      reels: { name: t("Reels"), path: "/reels", icon: <VideoLibraryIcon /> },
      favourites: {
        name: t("Favourites"),
        path: "/favourites",
        icon: <FavoriteIcon />,
      },
      stores: { name: t("Stores"), path: "/stores", icon: <StoreIcon /> },
      gifts: { name: t("Gifts"), path: "/gifts", icon: <CardGiftcardIcon /> },
      shopping: {
        name: t("Shopping"),
        path: "/shopping",
        icon: <ShoppingBagIcon />,
      },
      profile: { name: t("Account"), path: "/profile", icon: <PersonIcon /> },
      brands: { name: t("Brands"), path: "/brands", icon: <BusinessIcon /> },
      jobs: {
        name: t("Find Job"),
        path: "/findjob",
        icon: <WorkOutlineIcon />,
      },
      city: {
        kind: "city",
        name: t("City"),
        path: NAV_PATH_CITY,
        icon: <LocationOnIcon />,
      },
      language: {
        kind: "language",
        name: t("Language"),
        path: NAV_PATH_LANG,
        icon: <LanguageIcon />,
      },
      notifications: {
        kind: "notifications",
        name: t("Notifications"),
        path: NAV_PATH_NOTIFICATIONS,
        icon: (
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        ),
      },
    }),
    [t, unreadCount],
  );

  const navItems =
    template === "template2"
      ? [
          actionMap.home,
          actionMap.categories,
          actionMap.reels,
          actionMap.favourites,
          actionMap.profile,
        ]
      : template === "custom"
        ? [
            actionMap[navConfig?.bottomSlots?.bottomleft1] || null,
            actionMap[navConfig?.bottomSlots?.bottomleft2] || null,
            actionMap[navConfig?.bottomSlots?.center] || null,
            actionMap[navConfig?.bottomSlots?.bottomright1] || null,
            actionMap[navConfig?.bottomSlots?.bottomright2] || null,
          ]
        : [
            actionMap.home,
            actionMap.categories,
            actionMap.reels,
            actionMap.stores,
            actionMap.gifts,
          ];

  const actionSx = useCallback(
    (isActive) => {
      if (!isDark) {
        return {
          color: isActive
            ? "white !important"
            : "rgba(255,255,255,0.8) !important",
          backgroundColor: isActive
            ? "rgba(255,255,255,0.16) !important"
            : "transparent !important",
          borderRadius: isActive ? 1 : 0,
          minWidth: "auto",
          padding: "6px 8px",
          transition: "all 0.3s ease",
          "&.Mui-selected": {
            color: "white !important",
            backgroundColor: "rgba(255,255,255,0.16) !important",
          },
          "&.MuiBottomNavigationAction-root": {
            color: isActive
              ? "white !important"
              : "rgba(255,255,255,0.8) !important",
            backgroundColor: isActive
              ? "rgba(255,255,255,0.16) !important"
              : "transparent !important",
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: isActive ? "0.75rem" : "0.7rem",
            fontWeight: isActive ? 600 : 500,
            marginTop: "4px",
            transition: "all 0.3s ease",
            color: isActive
              ? "white !important"
              : "rgba(255,255,255,0.8) !important",
          },
          "& .MuiSvgIcon-root": {
            fontSize: "1.5rem",
            transform: isActive ? "scale(1.1)" : "scale(1)",
            transition: "all 0.3s ease",
            color: isActive
              ? "white !important"
              : "rgba(255,255,255,0.8) !important",
          },
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.1) !important",
            borderRadius: 1,
          },
        };
      }
      return {
        color: isActive
          ? "#f8fafc !important"
          : "rgba(226,232,240,0.78) !important",
        backgroundColor: isActive
          ? "rgba(255,255,255,0.14) !important"
          : "transparent !important",
        backdropFilter: isActive ? "blur(10px) saturate(150%)" : "none",
        WebkitBackdropFilter: isActive ? "blur(10px) saturate(150%)" : "none",
        borderRadius: isActive ? 2 : 0,
        minWidth: "auto",
        padding: "6px 8px",
        transition: "all 0.25s ease",
        boxShadow: isActive
          ? "inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.12)"
          : "none",
        "&.Mui-selected": {
          color: "#f8fafc !important",
          backgroundColor: "rgba(255,255,255,0.14) !important",
        },
        "&.MuiBottomNavigationAction-root": {
          color: isActive
            ? "#f8fafc !important"
            : "rgba(226,232,240,0.78) !important",
          backgroundColor: isActive
            ? "rgba(255,255,255,0.14) !important"
            : "transparent !important",
        },
        "& .MuiBottomNavigationAction-label": {
          fontSize: isActive ? "0.75rem" : "0.7rem",
          fontWeight: isActive ? 600 : 500,
          marginTop: "4px",
          transition: "all 0.25s ease",
          color: isActive
            ? "#f8fafc !important"
            : "rgba(226,232,240,0.78) !important",
        },
        "& .MuiSvgIcon-root": {
          fontSize: "1.5rem",
          transform: isActive ? "scale(1.08)" : "scale(1)",
          transition: "all 0.25s ease",
          color: isActive
            ? "#f8fafc !important"
            : "rgba(226,232,240,0.78) !important",
          filter: isActive ? "drop-shadow(0 0 10px rgba(59,130,246,0.35))" : "none",
        },
        "&:hover": {
          backgroundColor: "rgba(255,255,255,0.08) !important",
          borderRadius: 1.5,
        },
      };
    },
    [isDark],
  );

  if (!isMobile) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        px: 0,
        pb: "max(0px, env(safe-area-inset-bottom))",
      }}
    >
      <Paper
        elevation={isDark ? 0 : 8}
        style={{
          background: isDark ? BOTTOM_NAV_GRADIENT_DARK_GLASS : BOTTOM_NAV_GRADIENT,
        }}
        sx={{
          ...(isDark
            ? {
                backdropFilter: "blur(22px) saturate(170%)",
                WebkitBackdropFilter: "blur(22px) saturate(170%)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderBottom: "none",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                overflow: "hidden",
                minHeight: "64px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                boxShadow:
                  "0 -12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  borderRadius: "20px 20px 0 0",
                  pointerEvents: "none",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 42%)",
                  zIndex: 0,
                },
              }
            : {
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderBottom: "none",
                overflow: "hidden",
                minHeight: "64px",
                display: "flex",
                flexDirection: "column",
              }),
        }}
      >
        <BottomNavigation
          value={activeValue}
          onChange={() => {}}
          showLabels
          sx={{
            position: "relative",
            zIndex: isDark ? 1 : "auto",
            background: "transparent !important",
            minHeight: "64px",
            "& .MuiBottomNavigationAction-root": {
              color: isDark
                ? "rgba(226,232,240,0.78) !important"
                : "rgba(255,255,255,0.8) !important",
              "&.Mui-selected": {
                color: isDark
                  ? "#f8fafc !important"
                  : "white !important",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.14) !important"
                  : "rgba(255,255,255,0.16) !important",
              },
            },
          }}
        >
          {navItems.map((item, idx) => {
            if (!item) {
              return (
                <BottomNavigationAction
                  key={`empty-${idx}`}
                  label=""
                  value={`empty-${idx}`}
                  disabled
                  sx={{
                    opacity: 0,
                    pointerEvents: "none",
                    minWidth: "auto",
                    padding: "6px 8px",
                  }}
                />
              );
            }

            if (item.kind === "city") {
              const isActive = false;
              return (
                <BottomNavigationAction
                  key={`${item.path}-${idx}`}
                  label={item.name}
                  value={item.path}
                  icon={item.icon}
                  component="button"
                  type="button"
                  onClick={(e) => setCityMenuAnchor(e.currentTarget)}
                  sx={actionSx(isActive)}
                />
              );
            }

            if (item.kind === "language") {
              const isActive = false;
              return (
                <BottomNavigationAction
                  key={`${item.path}-${idx}`}
                  label={item.name}
                  value={item.path}
                  icon={item.icon}
                  component="button"
                  type="button"
                  onClick={(e) => setLangMenuAnchor(e.currentTarget)}
                  sx={actionSx(isActive)}
                />
              );
            }

            if (item.kind === "notifications") {
              const isActive = false;
              return (
                <BottomNavigationAction
                  key={`${item.path}-${idx}`}
                  label={item.name}
                  value={item.path}
                  icon={item.icon}
                  component="button"
                  type="button"
                  onClick={(e) => {
                    setNotifMenuAnchor(e.currentTarget);
                    fetchNotifications?.();
                  }}
                  sx={actionSx(isActive)}
                />
              );
            }

            if (item.kind === "refresh") {
              const isActive = false;
              return (
                <BottomNavigationAction
                  key={`${item.path}-${idx}`}
                  label={item.name}
                  value={item.path}
                  icon={item.icon}
                  component="button"
                  type="button"
                  onClick={() => triggerRefresh?.()}
                  sx={actionSx(isActive)}
                />
              );
            }

            const isActive = activeValue === item.path;

            return (
              <BottomNavigationAction
                key={item.path}
                label={item.name}
                value={item.path}
                icon={item.icon}
                component="button"
                type="button"
                onClick={() => {
                  if (item.path === "/" && location.pathname === "/") {
                    const now = Date.now();
                    const isDoubleTap = now - lastHomeTapTsRef.current <= 450;
                    lastHomeTapTsRef.current = now;
                    const isAtTop =
                      (window.scrollY || window.pageYOffset || 0) <= 8;

                    if (isDoubleTap || isAtTop) {
                      triggerRefresh?.();
                      return;
                    }

                    window.scrollTo({ top: 0, behavior: "smooth" });
                    return;
                  }

                  if (
                    item.path === "/reels" &&
                    location.pathname === "/reels"
                  ) {
                    const now = Date.now();
                    const isDoubleTap = now - lastReelsTapTsRef.current <= 450;
                    lastReelsTapTsRef.current = now;

                    window.dispatchEvent(
                      new CustomEvent("app:reels-nav-tap", {
                        detail: { doubleTap: isDoubleTap },
                      }),
                    );

                    if (isDoubleTap) {
                      triggerRefresh?.();
                      return;
                    }

                    return;
                  }

                  if (location.pathname === "/" && item.path !== "/") {
                    persistMainPageScrollState(
                      window.scrollY || window.pageYOffset || 0,
                    );
                  }
                  navigate(item.path);
                }}
                sx={actionSx(isActive)}
              />
            );
          })}
        </BottomNavigation>
      </Paper>

      <Menu
        anchorEl={cityMenuAnchor}
        open={Boolean(cityMenuAnchor)}
        onClose={() => setCityMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        PaperProps={{
          sx: { mb: 1, minWidth: 200, maxHeight: 320 },
        }}
      >
        {cities.map((city) => (
          <MenuItem
            key={city.value}
            selected={selectedCity === city.value}
            onClick={() => {
              changeCity(city.value);
              setCityMenuAnchor(null);
            }}
          >
            {city.label}
          </MenuItem>
        ))}
      </Menu>
      <Menu
        anchorEl={langMenuAnchor}
        open={Boolean(langMenuAnchor)}
        onClose={() => setLangMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        PaperProps={{
          sx: { mb: 1, minWidth: 200 },
        }}
      >
        <MenuItem
          selected={i18n.language === "en"}
          onClick={() => {
            i18n.changeLanguage("en");
            setLangMenuAnchor(null);
          }}
        >
          🇺🇸 {t("English")}
        </MenuItem>
        <MenuItem
          selected={i18n.language === "ar"}
          onClick={() => {
            i18n.changeLanguage("ar");
            setLangMenuAnchor(null);
          }}
        >
          🇸🇦 {t("Arabic")}
        </MenuItem>
        <MenuItem
          selected={i18n.language === "ku"}
          onClick={() => {
            i18n.changeLanguage("ku");
            setLangMenuAnchor(null);
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

      <Menu
        anchorEl={notifMenuAnchor}
        open={Boolean(notifMenuAnchor)}
        onClose={() => setNotifMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        PaperProps={{ sx: { mb: 1, minWidth: 280, maxWidth: 360 } }}
      >
        <Box sx={{ px: 1.5, py: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Typography fontWeight={800}>{t("Notifications")}</Typography>
            <Badge badgeContent={unreadCount} color="error" />
          </Box>
          <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={() => markAllAsRead?.()}
                sx={{ textTransform: "none" }}
              >
                {t("Mark all read")}
              </Button>
            )}
            {notifications?.length > 0 && (
              <Button
                size="small"
                onClick={() => clearAll?.()}
                sx={{ textTransform: "none", color: "text.secondary" }}
              >
                {t("Clear")}
              </Button>
            )}
          </Box>
        </Box>
        <Divider />
        {Array.isArray(notifications) && notifications.length > 0 ? (
          <Box sx={{ maxHeight: 320, overflow: "auto" }}>
            {notifications.map((n) => (
              <ListItemButton
                key={n._id}
                onClick={() => {
                  markAsRead?.(n._id);
                }}
                sx={{
                  py: 1.25,
                  px: 1.5,
                  backgroundColor: n.read ? "transparent" : "action.hover",
                }}
              >
                <Box sx={{ width: "100%" }}>
                  <Typography
                    variant="body2"
                    fontWeight={n.read ? 500 : 800}
                    sx={{ mb: 0.25 }}
                  >
                    {pickNotificationText(n, "title")}
                  </Typography>
                  {!!pickNotificationText(n, "body") && (
                    <Typography variant="caption" color="text.secondary">
                      {pickNotificationText(n, "body")}
                    </Typography>
                  )}
                </Box>
              </ListItemButton>
            ))}
          </Box>
        ) : (
          <Box sx={{ px: 1.5, py: 2 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              {t("No notifications")}
            </Typography>
          </Box>
        )}
      </Menu>
    </Box>
  );
};

export default BottomNavigationBar;
