import React, { useCallback, useMemo, useRef, useState } from "react";
import {
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
  Home,
  Search,
  RefreshCw,
  LayoutGrid,
  Clapperboard,
  Heart,
  Store,
  Gift,
  ShoppingBag,
  User,
  Building2,
  Landmark,
  Briefcase,
  MapPin,
  Languages,
  Bell,
} from "lucide-react";
import { motion, LayoutGroup, useReducedMotion } from "framer-motion";
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
import {
  MAIN_PAGE_SCROLL_KEY,
  MAIN_PAGE_SCROLL_STATE_KEY,
  resetMainPageScrollPositionInSession,
  scrollWindowToTop,
} from "../utils/mainPageScrollSession";

const NAV_PATH_CITY = "__nav_city__";
const NAV_PATH_LANG = "__nav_language__";
const NAV_PATH_REFRESH = "__nav_refresh__";
const NAV_PATH_NOTIFICATIONS = "__nav_notifications__";

/** Same dark glass as `NavigationBar.js` (`NAV_BAR_GRADIENT_DARK_GLASS`). */
const NAV_BAR_GRADIENT_DARK_GLASS =
  "linear-gradient(118deg, rgba(7,11,20,0.78) 0%, rgba(15,23,42,0.7) 42%, rgba(23,37,84,0.62) 78%, rgba(37,99,235,0.45) 100%)";

/** MUI Box + Framer Motion — keeps layout/animation working without relying on Tailwind. */
const MotionBox = motion(Box);

/** Full-width bottom bar: shared icon + label scale (readable on wide screens). */
const NAV_ICON_SIZE = 26;
const NAV_ICON_STROKE = { idle: 2, active: 2.4 };

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

const BottomNavigationBar = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const reduceMotion = useReducedMotion();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();
  const { navConfig } = useActiveTheme();
  const { triggerRefresh } = useContentRefresh();
  const handleBottomNavRefresh = useCallback(() => {
    if (location.pathname === "/") {
      scrollWindowToTop("auto");
      resetMainPageScrollPositionInSession();
    }
    triggerRefresh?.();
  }, [location.pathname, triggerRefresh]);
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

  /** Same route matching as before — drives “active” tab + pill target. */
  const activeValue = useMemo(() => {
    let pathname = location.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }

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
    if (pathname.startsWith("/companies")) return "/companies";

    return false;
  }, [location.pathname]);

  const template = navConfig?.template || "template1";

  const actionMap = useMemo(
    () => ({
      home: { name: t("Home"), path: "/", Icon: Home },
      search: { name: t("Search"), path: "/search", Icon: Search },
      refresh: {
        kind: "refresh",
        name: t("Refresh"),
        path: NAV_PATH_REFRESH,
        Icon: RefreshCw,
      },
      categories: {
        name: t("Categories"),
        path: "/categories",
        Icon: LayoutGrid,
      },
      reels: { name: t("Reels"), path: "/reels", Icon: Clapperboard },
      favourites: {
        name: t("Favourites"),
        path: "/favourites",
        Icon: Heart,
      },
      stores: { name: t("Stores"), path: "/stores", Icon: Store },
      gifts: { name: t("Gifts"), path: "/gifts", Icon: Gift },
      shopping: {
        name: t("Shopping"),
        path: "/shopping",
        Icon: ShoppingBag,
      },
      profile: { name: t("Account"), path: "/profile", Icon: User },
      brands: { name: t("Brands"), path: "/brands", Icon: Building2 },
      companies: {
        name: t("Companies"),
        path: "/companies",
        Icon: Landmark,
      },
      jobs: {
        name: t("Find Job"),
        path: "/findjob",
        Icon: Briefcase,
      },
      city: {
        kind: "city",
        name: t("City"),
        path: NAV_PATH_CITY,
        Icon: MapPin,
      },
      language: {
        kind: "language",
        name: t("Language"),
        path: NAV_PATH_LANG,
        Icon: Languages,
      },
      notifications: {
        kind: "notifications",
        name: t("Notifications"),
        path: NAV_PATH_NOTIFICATIONS,
        Icon: Bell,
      },
    }),
    [t],
  );

  const navItems = useMemo(
    () =>
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
            ],
    [template, actionMap, navConfig],
  );

  /** Snappier spring so the active pill tracks tab switches quickly. */
  const pillTransition = useMemo(
    () =>
      reduceMotion
        ? { duration: 0.08 }
        : { type: "spring", stiffness: 820, damping: 42, mass: 0.55 },
    [reduceMotion],
  );

  const handleRouteNavigate = useCallback(
    (item) => {
      if (item.path === "/" && location.pathname === "/") {
        const now = Date.now();
        const isDoubleTap = now - lastHomeTapTsRef.current <= 450;
        lastHomeTapTsRef.current = now;
        const isAtTop = (window.scrollY || window.pageYOffset || 0) <= 8;

        if (isDoubleTap || isAtTop) {
          scrollWindowToTop("auto");
          resetMainPageScrollPositionInSession();
          triggerRefresh?.();
          return;
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (item.path === "/reels" && location.pathname === "/reels") {
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
        persistMainPageScrollState(window.scrollY || window.pageYOffset || 0);
      }
      navigate(item.path);
    },
    [location.pathname, navigate, triggerRefresh],
  );

  /**
   * Shell chrome in `sx` only — surface colors live on inline `style` so RTL (ar/ku) does not
   * transform gradients (same pattern as `NavigationBar` AppBar + theme MuiAppBar note).
   */
  const glassNavSx = useMemo(
    () => ({
      display: "flex",
      width: "100%",
      maxWidth: "100%",
      minHeight: 64,
      maxHeight: "none",
      borderRadius: "25px 25px 25px 25px",
      alignItems: "stretch",
      overflow: "hidden",
      position: "relative",
      boxSizing: "border-box",
      ...(isDark
        ? {
            backdropFilter: "blur(22px) saturate(170%)",
            WebkitBackdropFilter: "blur(22px) saturate(170%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderBottom: "none",
            boxShadow:
              "0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
          }
        : {
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid",
            borderColor: "rgba(229,231,235,0.6)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          }),
    }),
    [isDark],
  );

  const bottomNavSurfaceStyle = useMemo(
    () =>
      isDark
        ? { background: NAV_BAR_GRADIENT_DARK_GLASS }
        : { backgroundColor: "rgba(255,255,255,0.85)" },
    [isDark],
  );

  const inactiveIconColor = isDark ? "#a1a1aa" : "#71717a";

  /** Equal columns + clip: stops active label/pill painting over neighbor icons. */
  const tabBtnBaseSx = {
    flex: "1 1 0",
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    bgcolor: "transparent",
    cursor: "pointer",
    p: 0,
    borderRadius: 9999,
    position: "relative",
    zIndex: 1,
    "&:focus-visible": {
      outline: "2px solid rgba(251, 146, 60, 0.95)",
      outlineOffset: 2,
    },
  };

  if (!isMobile) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        zIndex: 1000,
        pointerEvents: "none",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        <LayoutGroup id="floating-bottom-nav">
          <Box
            component="nav"
            sx={glassNavSx}
            style={bottomNavSurfaceStyle}
          >
            {isDark ? (
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "inherit",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 42%)",
                }}
              />
            ) : null}
            <Box
              sx={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                width: "100%",
                minWidth: 0,
                alignItems: "stretch",
                gap: { xs: 1.5, sm: 2 },
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.125 },
                boxSizing: "border-box",
              }}
            >
              {navItems.map((item, idx) => {
                if (!item) {
                  return (
                    <Box
                      key={`empty-${idx}`}
                      aria-hidden
                      sx={{ flex: 1, minWidth: 0, opacity: 0 }}
                    />
                  );
                }

                const Icon = item.Icon;
                const isRouteTab = !item.kind;
                const routeActive =
                  isRouteTab && activeValue !== false && activeValue === item.path;

                if (item.kind === "city") {
                  return (
                    <MotionBox
                      key={`${item.path}-${idx}`}
                      component="button"
                      type="button"
                      aria-label={item.name}
                      onClick={(e) => setCityMenuAnchor(e.currentTarget)}
                      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                      whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                      sx={{
                        ...tabBtnBaseSx,
                        color: inactiveIconColor,
                      }}
                    >
                      <Icon
                        size={NAV_ICON_SIZE}
                        color="currentColor"
                        strokeWidth={NAV_ICON_STROKE.idle}
                      />
                    </MotionBox>
                  );
                }

                if (item.kind === "language") {
                  return (
                    <MotionBox
                      key={`${item.path}-${idx}`}
                      component="button"
                      type="button"
                      aria-label={item.name}
                      onClick={(e) => setLangMenuAnchor(e.currentTarget)}
                      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                      whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                      sx={{
                        ...tabBtnBaseSx,
                        color: inactiveIconColor,
                      }}
                    >
                      <Icon
                        size={NAV_ICON_SIZE}
                        color="currentColor"
                        strokeWidth={NAV_ICON_STROKE.idle}
                      />
                    </MotionBox>
                  );
                }

                if (item.kind === "notifications") {
                  return (
                    <MotionBox
                      key={`${item.path}-${idx}`}
                      component="button"
                      type="button"
                      aria-label={item.name}
                      onClick={(e) => {
                        setNotifMenuAnchor(e.currentTarget);
                        fetchNotifications?.();
                      }}
                      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                      whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                      sx={{
                        ...tabBtnBaseSx,
                        color: inactiveIconColor,
                      }}
                    >
                      <Badge badgeContent={unreadCount} color="error">
                        <Icon
                          size={NAV_ICON_SIZE}
                          color="currentColor"
                          strokeWidth={NAV_ICON_STROKE.idle}
                        />
                      </Badge>
                    </MotionBox>
                  );
                }

                if (item.kind === "refresh") {
                  return (
                    <MotionBox
                      key={`${item.path}-${idx}`}
                      component="button"
                      type="button"
                      aria-label={item.name}
                      onClick={handleBottomNavRefresh}
                      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                      whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                      sx={{
                        ...tabBtnBaseSx,
                        color: inactiveIconColor,
                      }}
                    >
                      <Icon
                        size={NAV_ICON_SIZE}
                        color="currentColor"
                        strokeWidth={NAV_ICON_STROKE.idle}
                      />
                    </MotionBox>
                  );
                }

                return (
                  <MotionBox
                    key={item.path}
                    component="button"
                    type="button"
                    aria-current={routeActive ? "page" : undefined}
                    aria-label={item.name}
                    onClick={() => handleRouteNavigate(item)}
                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    whileHover={
                      reduceMotion
                        ? undefined
                        : routeActive
                          ? { scale: 1.02 }
                          : { scale: 1.06 }
                    }
                    sx={{
                      ...tabBtnBaseSx,
                      // Active tab gets extra horizontal space for the label.
                      flex: routeActive ? "2.75 1 0%" : "1 1 0%",
                      zIndex: routeActive ? 2 : 1,
                    }}
                  >
                    {/* Framer `layoutId` morphs this pill between route tabs. */}
                    <Box
                      sx={{
                        position: "relative",
                        display: "flex",
                        width: "100%",
                        maxWidth: "100%",
                        minWidth: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 9999,
                        py: 0.75,
                        px: routeActive ? 1.5 : 0.5,
                        boxSizing: "border-box",
                        overflow: "hidden",
                        isolation: "isolate",
                      }}
                    >
                      {routeActive && (
                        <motion.div
                          layoutId="bottom-nav-active-pill"
                          transition={pillTransition}
                          style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 0,
                            borderRadius: 9999,
                            background:
                              "linear-gradient(90deg, #f97316 0%, #ef4444 100%)",
                            boxShadow: "0 10px 28px rgba(249,115,22,0.45)",
                            willChange: "transform",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      <Box
                        component="span"
                        sx={{
                          position: "relative",
                          zIndex: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "row",
                          flexWrap: "nowrap",
                          gap: routeActive ? 1.125 : 0.5,
                          minWidth: 0,
                          width: "100%",
                          maxWidth: "100%",
                          px: routeActive ? 0 : 0,
                        }}
                      >
                        <Icon
                          size={NAV_ICON_SIZE}
                          color={routeActive ? "#ffffff" : inactiveIconColor}
                          strokeWidth={
                            routeActive
                              ? NAV_ICON_STROKE.active
                              : NAV_ICON_STROKE.idle
                          }
                          style={{ flexShrink: 0 }}
                        />
                        {routeActive && (
                          <Typography
                            component="span"
                            sx={{
                              flex: "1 1 auto",
                              minWidth: 0,
                              fontSize: { xs: "0.75rem", sm: "0.8125rem" },
                              fontWeight: 650,
                              lineHeight: 1.35,
                              letterSpacing: "0.02em",
                              color: "#ffffff !important",
                              textAlign: "start",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                              hyphens: "auto",
                              whiteSpace: "normal",
                            }}
                          >
                            {item.name || item.path}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </MotionBox>
                );
              })}
            </Box>
          </Box>
        </LayoutGroup>
      </Box>

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
