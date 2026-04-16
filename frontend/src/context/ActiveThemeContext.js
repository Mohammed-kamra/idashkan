import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { themeAPI } from "../services/api";
import { normalizeProfileShortcutIds } from "../utils/profileShortcutCatalog";

const ActiveThemeContext = createContext(null);

const DEFAULT_THEME = "default";
const USER_THEME_OVERRIDE_KEY = "userThemeOverride.v1";
const DEFAULT_FONT_KEY = "default";
const THEME_CACHE_KEY = "activeThemeCache.v1";
const DEFAULT_NAV_CONFIG = {
  template: "template1",
  topSlots: {
    topleft1: "",
    topleft2: "",
    center: "label",
    topright1: "",
    topright2: "",
  },
  bottomSlots: {
    bottomleft1: "home",
    bottomleft2: "categories",
    center: "reels",
    bottomright1: "favourites",
    bottomright2: "profile",
  },
};

export const ActiveThemeProvider = ({ children }) => {
  const getCached = () => {
    try {
      const raw = localStorage.getItem(THEME_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const cached = getCached();

  const [activeTheme, setActiveTheme] = useState(
    typeof cached?.activeTheme === "string" ? cached.activeTheme : DEFAULT_THEME,
  );
  const [activeFontKey, setActiveFontKey] = useState(
    typeof cached?.activeFontKey === "string" ? cached.activeFontKey : DEFAULT_FONT_KEY,
  );
  const [navConfig, setNavConfig] = useState(
    cached?.navConfig && typeof cached.navConfig === "object" ? cached.navConfig : DEFAULT_NAV_CONFIG,
  );
  const [profileShortcuts, setProfileShortcuts] = useState(() =>
    normalizeProfileShortcutIds(cached?.profileShortcuts),
  );
  const [userThemeOverride, setUserThemeOverride] = useState("");
  const [loadingTheme, setLoadingTheme] = useState(true);
  const lastFetchAtRef = useRef(0);

  const applyToHtml = useCallback((themeName) => {
    try {
      document.documentElement.setAttribute("data-theme", themeName || DEFAULT_THEME);
    } catch {
      // ignore
    }
  }, []);

  const getEffectiveTheme = useCallback(
    (serverTheme, overrideTheme) => overrideTheme || serverTheme || DEFAULT_THEME,
    [],
  );

  // Load user override on boot
  useEffect(() => {
    try {
      const saved = localStorage.getItem(USER_THEME_OVERRIDE_KEY);
      if (saved && typeof saved === "string") {
        setUserThemeOverride(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchTheme = useCallback(async () => {
    try {
      const res = await themeAPI.get();
      const next = res?.data?.activeTheme || DEFAULT_THEME;
      const nextFontKey = res?.data?.activeFontKey || DEFAULT_FONT_KEY;
      const nextNavConfig = res?.data?.navConfig || DEFAULT_NAV_CONFIG;
      const nextProfileShortcuts = normalizeProfileShortcutIds(
        res?.data?.profileShortcuts,
      );
      setActiveTheme(next);
      setActiveFontKey(nextFontKey);
      setNavConfig(nextNavConfig);
      setProfileShortcuts(nextProfileShortcuts);
      try {
        localStorage.setItem(
          THEME_CACHE_KEY,
          JSON.stringify({
            activeTheme: next,
            activeFontKey: nextFontKey,
            navConfig: nextNavConfig,
            profileShortcuts: nextProfileShortcuts,
            cachedAt: Date.now(),
          }),
        );
      } catch {
        // ignore
      }
      applyToHtml(getEffectiveTheme(next, userThemeOverride));
      lastFetchAtRef.current = Date.now();
    } catch {
      // keep current
    } finally {
      setLoadingTheme(false);
    }
  }, [applyToHtml, getEffectiveTheme, userThemeOverride]);

  // initial load
  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  // If user override changes, apply immediately
  useEffect(() => {
    applyToHtml(getEffectiveTheme(activeTheme, userThemeOverride));
  }, [activeTheme, applyToHtml, getEffectiveTheme, userThemeOverride]);

  // Poll lightly so all users update automatically.
  useEffect(() => {
    const id = window.setInterval(() => {
      // don't spam if tab is hidden; fetch when visible again
      if (document.hidden) return;
      fetchTheme();
    }, 30000);
    return () => window.clearInterval(id);
  }, [fetchTheme]);

  // When returning to app, refresh quickly.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) return;
      const age = Date.now() - lastFetchAtRef.current;
      if (age > 5000) fetchTheme();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchTheme]);

  const value = useMemo(
    () => ({
      activeTheme,
      activeFontKey,
      navConfig,
      profileShortcuts,
      userThemeOverride,
      effectiveTheme: getEffectiveTheme(activeTheme, userThemeOverride),
      setUserThemeOverride: (t) => {
        const next = String(t || "").trim();
        setUserThemeOverride(next);
        try {
          if (next) localStorage.setItem(USER_THEME_OVERRIDE_KEY, next);
          else localStorage.removeItem(USER_THEME_OVERRIDE_KEY);
        } catch {
          // ignore
        }
        applyToHtml(getEffectiveTheme(activeTheme, next));
      },
      clearUserThemeOverride: () => {
        setUserThemeOverride("");
        try {
          localStorage.removeItem(USER_THEME_OVERRIDE_KEY);
        } catch {
          // ignore
        }
        applyToHtml(getEffectiveTheme(activeTheme, ""));
      },
      fetchTheme,
      loadingTheme,
    }),
    [
      activeTheme,
      activeFontKey,
      navConfig,
      profileShortcuts,
      applyToHtml,
      fetchTheme,
      getEffectiveTheme,
      loadingTheme,
      userThemeOverride,
    ],
  );

  return <ActiveThemeContext.Provider value={value}>{children}</ActiveThemeContext.Provider>;
};

export const useActiveTheme = () => {
  const ctx = useContext(ActiveThemeContext);
  if (!ctx) throw new Error("useActiveTheme must be used within ActiveThemeProvider");
  return ctx;
};

