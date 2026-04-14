import "./i18n";
import "./styles/kurdishFonts.css";
import "./styles/themes.css";
import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Alert,
  IconButton,
  Collapse,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";
import CloseIcon from "@mui/icons-material/Close";

// Import pages
import MainPage from "./pages/MainPage";
import ReelsPage from "./pages/reels";
import StoreList from "./pages/StoreList";
import BrandList from "./pages/BrandList";
import CompanyList from "./pages/CompanyList";
import BrandProfile from "./pages/BrandProfile";
import ProductCategory from "./pages/ProductCategory";
import DataEntryForm from "./pages/DataEntryForm";
import ProductDetail from "./pages/ProductDetail";
import StoreProfile from "./pages/StoreProfile";
import SearchPage from "./pages/SearchPage";
import Gifts from "./pages/Gifts";
import FavouritesPage from "./pages/FavouritesPage";
import AdminPage from "./pages/AdminPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminCitiesPage from "./pages/AdminCitiesPage";
import CustomizationPage from "./pages/CustomizationPage";
import TranslationPage from "./pages/TranslationPage";
import NavigationBar from "./NavigationBar";
import BottomNavigationBar from "./components/BottomNavigation";
import { AuthProvider } from "./context/AuthContext";
import { CityFilterProvider } from "./context/CityFilterContext";
import FirstVisitCityDialog from "./components/FirstVisitCityDialog";
import { DataLanguageProvider } from "./context/DataLanguageContext";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import { NotificationProvider } from "./context/NotificationContext";
import LoginPage from "./pages/LoginPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ProfilePage from "./pages/ProfilePage";
import FindJob from "./pages/FindJob";
import ShoppingPage from "./pages/ShoppingPage";
import ProtectedRoute, {
  ProtectedAdminOnlyRoute,
} from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import NotificationEnableBanner from "./components/NotificationEnableBanner";
import SplashScreen from "./components/SplashScreen";
import ConnectionLostBanner from "./components/ConnectionLostBanner";
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
import { DarkModeProvider, useDarkMode } from "./context/DarkModeContext";

// Footer component remains the same
const Footer = () => (
  <Box
    component="footer"
    sx={{
      py: 2,
      px: 2,
      mt: "auto",
      backgroundColor: (theme) =>
        theme.palette.mode === "light"
          ? theme.palette.grey[200]
          : theme.palette.grey[800],
      textAlign: "right",
      borderTop: "1px solid",
      borderColor: (theme) => theme.palette.divider,
    }}
  >
    <Typography variant="body2" color="text.secondary">
      Powered By iDashkan2026
    </Typography>
  </Box>
);

function AppContent() {
  const location = useLocation();
  const { darkMode, setDarkMode } = useDarkMode();
  const { t, i18n } = useTranslation();
  const { refreshKey } = useContentRefresh();
  const [lang, setLang] = useState(i18n.language || "en");
  const isMobile = useIsMobileLayout();
  const isReelsPage = location.pathname === "/reels";
  const isHomePage = location.pathname === "/";
  const { effectiveTheme, activeFontKey } = useActiveTheme();
  const [showTestBanner, setShowTestBanner] = useState(() => {
    try {
      return localStorage.getItem("testBannerClosed.v1") !== "1";
    } catch {
      return true;
    }
  });

  /** Shown on every cold load (browser tab or WebView) — no one-time skip. */
  const [splashFinished, setSplashFinished] = useState(false);

  const handleSplashComplete = useCallback(() => {
    setSplashFinished(true);
  }, []);

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

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {!splashFinished ? (
          <SplashScreen darkMode={darkMode} onComplete={handleSplashComplete} />
        ) : null}
        {splashFinished ? <FirstVisitCityDialog /> : null}
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
          <Collapse in={showTestBanner} appear={false}>
            <Alert
              severity="warning"
              variant="filled"
              action={
                <IconButton
                  aria-label={t("Close")}
                  color="inherit"
                  size="small"
                  onClick={() => {
                    setShowTestBanner(false);
                    try {
                      localStorage.setItem("testBannerClosed.v1", "1");
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
              sx={{
                borderRadius: 0,
                fontWeight: 700,
                textAlign: "center",
                py: 0.75,
                px: 1.5,
                position: "sticky",
                top: 0,
                zIndex: (t) => t.zIndex.appBar + 1,
              }}
            >
              {t("All data is just test, nothing is real yet")}
            </Alert>
          </Collapse>
          <ConnectionLostBanner />
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
              py: isReelsPage ? 0 : 3,
              pb: isMobile ? 10 : 3, // Add bottom padding for mobile to account for bottom navigation
              backgroundColor: (theme) => theme.palette.background.default,
            }}
          >
            <Container
              maxWidth={isReelsPage ? false : "lg"}
              disableGutters={isReelsPage || (isHomePage && isMobile)}
              sx={
                isHomePage && isMobile
                  ? {
                      px: 1,
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                    }
                  : undefined
              }
            >
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
                <Route path="/search" element={<SearchPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/findjob" element={<FindJob />} />
                <Route path="/shopping" element={<ShoppingPage />} />
                <Route path="/products/:id" element={<ProductDetail />} />
              </Routes>
            </Container>
          </Box>
          <Footer />
          <BottomNavigationBar />
          {false && <NotificationEnableBanner />}
        </Box>
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
  </ErrorBoundary>
);

export default Root;
