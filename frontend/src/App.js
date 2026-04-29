import "./i18n";
import "./styles/kurdishFonts.css";
import "./styles/themes.css";
import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  Container,
  Typography,
  Box,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";

const MainPage = lazy(() => import("./pages/MainPage"));
const ReelsPage = lazy(() => import("./pages/reels"));
const StoreList = lazy(() => import("./pages/StoreList"));
const BrandList = lazy(() => import("./pages/BrandList"));
const CompanyList = lazy(() => import("./pages/CompanyList"));
const BrandProfile = lazy(() => import("./pages/BrandProfile"));
const ProductCategory = lazy(() => import("./pages/ProductCategory"));
const DataEntryForm = lazy(() => import("./pages/DataEntryForm"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const StoreProfile = lazy(() => import("./pages/StoreProfile"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Gifts = lazy(() => import("./pages/Gifts"));
const FavouritesPage = lazy(() => import("./pages/FavouritesPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminCitiesPage = lazy(() => import("./pages/AdminCitiesPage"));
const AdminSearchAnalyticsPage = lazy(() => import("./pages/AdminSearchAnalyticsPage"));
const AdminVisitorsReportPage = lazy(() => import("./pages/AdminVisitorsReportPage"));
const AdminFeedbackPage = lazy(() => import("./pages/AdminFeedbackPage"));
const CustomizationPage = lazy(() => import("./pages/CustomizationPage"));
const TranslationPage = lazy(() => import("./pages/TranslationPage"));
import NavigationBar from "./NavigationBar";
import BottomNavigationBar from "./components/BottomNavigation";
import { AuthProvider } from "./context/AuthContext";
import { CityFilterProvider } from "./context/CityFilterContext";
import FirstVisitCityDialog from "./components/FirstVisitCityDialog";
import { DataLanguageProvider } from "./context/DataLanguageContext";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import { NotificationProvider } from "./context/NotificationContext";
const LoginPage = lazy(() => import("./pages/LoginPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const OwnerDashboardPage = lazy(() => import("./pages/OwnerDashboardPage"));
const OwnerDataEntryPage = lazy(() => import("./pages/OwnerDataEntryPage"));
const PendingPage = lazy(() => import("./pages/PendingPage"));
const FindJob = lazy(() => import("./pages/FindJob"));
const ShoppingPage = lazy(() => import("./pages/ShoppingPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
import ProtectedRoute, {
  ProtectedAdminOnlyRoute,
  ProtectedOwnerRoute,
  ProtectedOwnerDataEntryRoute,
  ProtectedPendingRoute,
} from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import NotificationEnableBanner from "./components/NotificationEnableBanner";
import SplashScreen from "./components/SplashScreen";
import ConnectionLostBanner from "./components/ConnectionLostBanner";
import AppUpdateBanner from "./components/AppUpdateBanner";
import Loader from "./components/Loader";
import {
  ContentRefreshProvider,
  useContentRefresh,
} from "./context/ContentRefreshContext";
import { createAppTheme } from "./theme";
import useIsMobileLayout from "./hooks/useIsMobileLayout";
import {
  ActiveThemeProvider,
  useActiveTheme,
} from "./context/ActiveThemeContext";
import { DraftCartDrawerProvider } from "./context/DraftCartDrawerContext";
import { DarkModeProvider, useDarkMode } from "./context/DarkModeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { appVisitAPI } from "./services/api";
import { getDeviceId } from "./utils/deviceId";
import { installGlobalImageLazyLoading } from "./utils/globalImageLazyLoading";
import { schedulePrefetchSearchPageWhenIdle } from "./utils/prefetchSearchPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const APP_VISIT_SESSION_KEY = "appVisitSessionId";

function getOrCreateVisitSessionId() {
  try {
    let id = sessionStorage.getItem(APP_VISIT_SESSION_KEY);
    if (id && id.length >= 8) return id;
    const part =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    id = `vs_${part}`;
    sessionStorage.setItem(APP_VISIT_SESSION_KEY, id);
    return id;
  } catch {
    return `vs_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

function AppContent() {
  const location = useLocation();
  const { darkMode, setDarkMode } = useDarkMode();
  const { t, i18n } = useTranslation();
  const { refreshKey } = useContentRefresh();
  const [lang, setLang] = useState(i18n.language || "en");
  const isMobile = useIsMobileLayout();
  const isReelsPage = location.pathname === "/reels";
  const isDataEntryPage = location.pathname === "/admin";
  const isHomePage = location.pathname === "/";
  const { effectiveTheme, activeFontKey } = useActiveTheme();

  /** Shown on every cold load (browser tab or WebView) — no one-time skip. */
  const [splashFinished, setSplashFinished] = useState(false);
  const [appReadySignal, setAppReadySignal] = useState(false);

  const handleSplashComplete = useCallback(() => {
    setSplashFinished(true);
  }, []);

  useEffect(() => {
    return installGlobalImageLazyLoading();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const waitForWindowLoad = () =>
      new Promise((resolve) => {
        if (document.readyState === "complete") {
          resolve();
          return;
        }
        const handleLoad = () => {
          window.removeEventListener("load", handleLoad);
          resolve();
        };
        window.addEventListener("load", handleLoad, { once: true });
      });

    const waitForFonts = async () => {
      try {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      } catch {
        // ignore font readiness failures
      }
    };

    void (async () => {
      await Promise.all([waitForWindowLoad(), waitForFonts()]);
      if (cancelled) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setAppReadySignal(true);
        });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!splashFinished) return;
    void (async () => {
      try {
        const visitSessionId = getOrCreateVisitSessionId();
        const deviceId = getDeviceId();
        await appVisitAPI.ping({ visitSessionId, deviceId });
      } catch {
        /* ignore */
      }
    })();
  }, [splashFinished]);

  useEffect(() => {
    if (!splashFinished) return undefined;
    schedulePrefetchSearchPageWhenIdle();
    return undefined;
  }, [splashFinished]);

  useEffect(() => {
    setLang(i18n.language || "en");
  }, [i18n.language]);

  // RTL/LTR direction effect and language data attribute
  useEffect(() => {
    document.body.dir =
      i18n.language === "ar" || i18n.language === "ku" ? "rtl" : "ltr";

    // Add language data attribute for Kurdish font styling
    document.documentElement.setAttribute("data-lang", i18n.language);
  }, [i18n.language]);

  // MUI RTL cache
  const isRtl = i18n.language === "ar" || i18n.language === "ku";
  const cacheRtl = useMemo(
    () =>
      createCache({
        key: isRtl ? "muirtl" : "muiltr",
        stylisPlugins: isRtl ? [rtlPlugin] : [],
      }),
    [isRtl],
  );

  const handleLangChange = (event) => {
    const newLang = event.target.value;
    setLang(newLang);
    i18n.changeLanguage(newLang);
  };

  const theme = useMemo(
    () =>
      createAppTheme({
        darkMode,
        language: i18n.language,
        activeTheme: effectiveTheme,
        activeFontKey,
      }),
    [darkMode, i18n.language, effectiveTheme, activeFontKey],
  );

  const routeFallback = (
    <Box sx={{ py: 6 }}>
      <Loader message={t("Loading...", { defaultValue: "Loading..." })} />
    </Box>
  );

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <DraftCartDrawerProvider>
        <CssBaseline />
        {!splashFinished ? (
          <SplashScreen
            darkMode={darkMode}
            appReady={appReadySignal}
            onComplete={handleSplashComplete}
          />
        ) : null}
        {splashFinished ? <FirstVisitCityDialog /> : null}
        <Box
          sx={{
            minHeight: "100vh",
            backgroundColor: (t) => t.palette.background.default,
            transition: "background-color 0.25s ease-out",
          }}
        >
        <Box
          aria-hidden={!splashFinished}
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            opacity: splashFinished ? 1 : 0,
            pointerEvents: splashFinished ? "auto" : "none",
            transition: "opacity 0.35s ease-out",
          }}
        >
          <ConnectionLostBanner />
          <AppUpdateBanner />
          <NavigationBar
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            lang={lang}
            // setLang={setLang} // setLang is not used directly by NavigationBar anymore
            handleLangChange={handleLangChange}
            t={t}
            // i18n={i18n} // i18n is not used directly by NavigationBar anymore
          />
          <Box
            component="main"
            key={refreshKey}
            sx={{
              flexGrow: 1, // Allows this Box to expand and push the footer down
              py: isReelsPage || isDataEntryPage ? 0 : 3,
              pb: isMobile ? 10 : 3, // Add bottom padding for mobile to account for bottom navigation
              backgroundColor: (theme) => theme.palette.background.default,
            }}
          >
            <Container
              maxWidth={
                isReelsPage || isDataEntryPage ? false : "lg"
              }
              disableGutters={
                isReelsPage ||
                (isHomePage && isMobile) ||
                isDataEntryPage
              }
              sx={
                isHomePage && isMobile
                  ? {
                      px: 1,
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                    }
                  : isDataEntryPage
                    ? {
                        width: "100%",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                      }
                    : undefined
              }
            >
              <Suspense fallback={routeFallback}>
                <Routes>
                  <Route path="/" element={<MainPage />} />
                  <Route path="/reels" element={<ReelsPage />} />
                  <Route path="/reels/:videoId" element={<ReelsPage />} />
                  <Route path="/stores" element={<StoreList />} />
                  <Route path="/stores/:id" element={<StoreProfile />} />
                  <Route path="/categories" element={<ProductCategory />} />
                  <Route path="/brands" element={<BrandList />} />
                  <Route path="/brands/:id" element={<BrandProfile />} />
                  <Route path="/companies" element={<CompanyList />} />
                  <Route path="/companies/:id" element={<BrandProfile />} />
                  <Route path="/gifts" element={<Gifts />} />
                  <Route path="/favourites" element={<FavouritesPage />} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute
                        allowedEmails={[
                          "mshexani45@gmail.com",
                          "admin@gmail.com",
                        ]}
                        allowSupportRole
                      >
                        <DataEntryForm />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedAdminOnlyRoute
                        allowedEmails={[
                          "mshexani45@gmail.com",
                          "admin@gmail.com",
                        ]}
                      >
                        <AdminPage />
                      </ProtectedAdminOnlyRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute
                        allowedEmails={[
                          "mshexani45@gmail.com",
                          "admin@gmail.com",
                        ]}
                      >
                        <AdminUsersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/customization"
                    element={
                      <ProtectedRoute
                        allowedEmails={[
                          "mshexani45@gmail.com",
                          "admin@gmail.com",
                        ]}
                      >
                        <CustomizationPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/translations"
                    element={
                      <ProtectedRoute
                        allowedEmails={[
                          "mshexani45@gmail.com",
                          "admin@gmail.com",
                        ]}
                      >
                        <TranslationPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/cities"
                    element={
                      <ProtectedAdminOnlyRoute
                        allowedEmails={[
                          "mshexani45@gmail.com",
                          "admin@gmail.com",
                        ]}
                      >
                        <AdminCitiesPage />
                      </ProtectedAdminOnlyRoute>
                    }
                  />
                  <Route
                    path="/admin/search-analytics"
                    element={
                      <ProtectedRoute
                        allowedEmails={[
                          "mshexani45@gmail.com",
                          "admin@gmail.com",
                        ]}
                        allowSupportRole
                      >
                        <AdminSearchAnalyticsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/visitors"
                    element={
                      <ProtectedRoute
                        allowedEmails={[
                          "mshexani45@gmail.com",
                          "admin@gmail.com",
                        ]}
                        allowSupportRole
                      >
                        <AdminVisitorsReportPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/feedback"
                    element={
                      <ProtectedRoute
                        allowedEmails={[
                          "mshexani45@gmail.com",
                          "admin@gmail.com",
                        ]}
                        allowSupportRole
                      >
                        <AdminFeedbackPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route
                    path="/owner-dashboard"
                    element={
                      <ProtectedOwnerRoute>
                        <OwnerDashboardPage />
                      </ProtectedOwnerRoute>
                    }
                  />
                  <Route
                    path="/owner-data-entry"
                    element={
                      <ProtectedOwnerDataEntryRoute>
                        <OwnerDataEntryPage />
                      </ProtectedOwnerDataEntryRoute>
                    }
                  />
                  <Route
                    path="/pending"
                    element={
                      <ProtectedPendingRoute>
                        <PendingPage />
                      </ProtectedPendingRoute>
                    }
                  />
                  <Route path="/findjob" element={<FindJob />} />
                  <Route path="/shopping" element={<ShoppingPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                </Routes>
              </Suspense>
            </Container>
          </Box>
          <BottomNavigationBar />
          {false && <NotificationEnableBanner />}
        </Box>
        </Box>
        </DraftCartDrawerProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}

const App = () => (
  <ContentRefreshProvider>
    <AppContent />
  </ContentRefreshProvider>
);

// Root component remains the same
const Root = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <DarkModeProvider>
        <AuthProvider>
          <CityFilterProvider>
            <DataLanguageProvider>
              <AppSettingsProvider>
                <ActiveThemeProvider>
                  <NotificationProvider>
                    <Router>
                      <ScrollToTop />
                      <App />
                    </Router>
                  </NotificationProvider>
                </ActiveThemeProvider>
              </AppSettingsProvider>
            </DataLanguageProvider>
          </CityFilterProvider>
        </AuthProvider>
      </DarkModeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default Root;
