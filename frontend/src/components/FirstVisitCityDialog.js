import React, { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  useTheme,
  alpha,
  LinearProgress,
} from "@mui/material";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCityFilter,
  CITY_ONBOARDING_KEY,
  LANGUAGE_ONBOARDING_KEY,
} from "../context/CityFilterContext";
import kurdishFlag from "../styles/kurdish_flag.jpg";

const LANGUAGES = [
  { code: "en", native: "English", hint: "English", flag: "🇬🇧" },
  { code: "ar", native: "العربية", hint: "Arabic", flag: "🇸🇦" },
  {
    code: "ku",
    native: "کوردی",
    hint: "Kurdish (Sorani)",
    flagImage: kurdishFlag,
  },
];

function getInitialFlowStep() {
  if (typeof window === "undefined") return "done";
  try {
    if (localStorage.getItem(CITY_ONBOARDING_KEY) === "1") return "done";
    if (localStorage.getItem(LANGUAGE_ONBOARDING_KEY) === "1") return "city";
  } catch {
    return "language";
  }
  return "language";
}

/**
 * First visit: step 1 language → step 2 city (modal, must complete).
 */
const FirstVisitCityDialog = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const {
    cities,
    citiesLoading,
    selectedCity,
    cityOnboardingDone,
    completeCityOnboarding,
  } = useCityFilter();

  const [flowStep, setFlowStep] = useState(getInitialFlowStep);
  const [langChoice, setLangChoice] = useState(() => {
    const lng = i18n.language?.split("-")[0] || "en";
    return LANGUAGES.some((l) => l.code === lng) ? lng : "en";
  });
  const [cityChoice, setCityChoice] = useState(null);

  const pickedCity =
    cityChoice ??
    (selectedCity && cities.some((c) => c.value === selectedCity)
      ? selectedCity
      : cities[0]?.value) ??
    null;

  const handleLanguageContinue = useCallback(async () => {
    await i18n.changeLanguage(langChoice);
    try {
      localStorage.setItem(LANGUAGE_ONBOARDING_KEY, "1");
    } catch {
      // ignore
    }
    setFlowStep("city");
  }, [i18n, langChoice]);

  const handleCityContinue = useCallback(() => {
    if (!pickedCity) return;
    completeCityOnboarding(pickedCity);
    setFlowStep("done");
  }, [pickedCity, completeCityOnboarding]);

  const handleBackToLanguage = useCallback(() => {
    try {
      localStorage.removeItem(LANGUAGE_ONBOARDING_KEY);
    } catch {
      // ignore
    }
    setFlowStep("language");
  }, []);

  const isDark = theme.palette.mode === "dark";

  const paperSx = useMemo(
    () => ({
      borderRadius: 4,
      overflow: "hidden",
      background: isDark
        ? `linear-gradient(155deg, ${alpha("#0c1222", 0.98)} 0%, ${alpha("#151b2e", 0.99)} 45%, ${alpha("#0a0f1a", 0.98)} 100%)`
        : `linear-gradient(180deg, ${alpha("#ffffff", 0.98)} 0%, ${alpha("#f4f7ff", 0.99)} 50%, ${alpha("#eef3ff", 0.97)} 100%)`,
      border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#1e6fd9", 0.12)}`,
      boxShadow: isDark
        ? `0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px ${alpha("#fff", 0.04)} inset`
        : `0 28px 90px ${alpha("#1e6fd9", 0.12)}, 0 12px 40px ${alpha("#000", 0.06)}`,
      backdropFilter: "blur(20px)",
    }),
    [isDark, theme],
  );

  const showDialog =
    flowStep !== "done" &&
    (flowStep === "language" || (flowStep === "city" && !cityOnboardingDone));

  if (flowStep === "done") {
    return null;
  }

  return (
    <Dialog
      open={showDialog}
      disableEscapeKeyDown
      onClose={(_, reason) => {
        if (reason === "backdropClick") return;
      }}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(8px)",
            backgroundColor: isDark
              ? alpha("#020617", 0.75)
              : alpha("#0f172a", 0.35),
          },
        },
      }}
      PaperProps={{
        elevation: 0,
        sx: paperSx,
      }}
    >
      <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 }, pt: { xs: 3, sm: 4 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.75,
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor:
                flowStep === "language"
                  ? "primary.main"
                  : alpha("#1e6fd9", 0.35),
            }}
          />
          <Box
            sx={{
              width: 36,
              height: 2,
              borderRadius: 1,
              bgcolor: alpha("#1e6fd9", 0.25),
            }}
          />
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor:
                flowStep === "city" ? "primary.main" : alpha("#1e6fd9", 0.35),
            }}
          />
        </Box>

        <AnimatePresence mode="wait">
          {flowStep === "language" ? (
            <motion.div
              key="lang"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.22 }}
            >
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                >
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      mx: "auto",
                      mb: 2,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isDark
                        ? `linear-gradient(135deg, ${alpha("#3b82f6", 0.35)} 0%, ${alpha("#8b5cf6", 0.25)} 100%)`
                        : `linear-gradient(135deg, ${alpha("#1e6fd9", 0.2)} 0%, ${alpha("#6366f1", 0.15)} 100%)`,
                      border: `1px solid ${alpha("#1e6fd9", isDark ? 0.35 : 0.25)}`,
                      boxShadow: `0 8px 32px ${alpha("#1e6fd9", isDark ? 0.2 : 0.15)}`,
                    }}
                  >
                    <TranslateRoundedIcon
                      sx={{
                        fontSize: 40,
                        color: isDark ? "#93c5fd" : "#1e6fd9",
                      }}
                    />
                  </Box>
                </motion.div>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                    mb: 1,
                    background: isDark
                      ? `linear-gradient(90deg, #f8fafc 0%, #cbd5e1 100%)`
                      : `linear-gradient(90deg, #0f172a 0%, #334155 100%)`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {t("onboarding.language.title", {
                    defaultValue: "Choose your language",
                  })}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    maxWidth: 360,
                    mx: "auto",
                    lineHeight: 1.6,
                  }}
                >
                  {t("onboarding.language.subtitle", {
                    defaultValue:
                      "You can change this anytime from your profile.",
                  })}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.25,
                  mb: 3,
                }}
              >
                {LANGUAGES.map((lang, index) => {
                  const selected = langChoice === lang.code;
                  return (
                    <motion.div
                      key={lang.code}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.22 }}
                    >
                      <Box
                        component="button"
                        type="button"
                        onClick={() => setLangChoice(lang.code)}
                        sx={{
                          width: "100%",
                          textAlign: "left",
                          cursor: "pointer",
                          border: "none",
                          p: 0,
                          background: "transparent",
                          font: "inherit",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            p: 1.75,
                            borderRadius: 2.5,
                            border: `2px solid ${
                              selected
                                ? alpha("#1e6fd9", isDark ? 0.85 : 0.65)
                                : isDark
                                  ? alpha("#fff", 0.06)
                                  : alpha("#000", 0.06)
                            }`,
                            background: selected
                              ? isDark
                                ? alpha("#1e6fd9", 0.12)
                                : alpha("#1e6fd9", 0.08)
                              : isDark
                                ? alpha("#fff", 0.03)
                                : alpha("#fff", 0.9),
                            boxShadow: selected
                              ? `0 8px 28px ${alpha("#1e6fd9", isDark ? 0.2 : 0.12)}`
                              : "none",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              borderColor: alpha("#1e6fd9", 0.45),
                              transform: "translateY(-2px)",
                            },
                          }}
                        >
                          {lang.flagImage ? (
                            <Box
                              component="img"
                              src={lang.flagImage}
                              alt=""
                              sx={{
                                width: 34,
                                height: 24,
                                objectFit: "cover",
                                borderRadius: 0.75,
                                flexShrink: 0,
                                boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                              }}
                            />
                          ) : (
                            <Typography sx={{ fontSize: "1.5rem" }}>
                              {lang.flag}
                            </Typography>
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontWeight: 800,
                                fontSize: "1.05rem",
                                color: "text.primary",
                                lineHeight: 1.25,
                              }}
                            >
                              {lang.native}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              {lang.hint}
                            </Typography>
                          </Box>
                          {selected && (
                            <CheckRoundedIcon
                              sx={{
                                fontSize: 22,
                                color: "primary.main",
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    </motion.div>
                  );
                })}
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleLanguageContinue}
                sx={{
                  py: 1.5,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontSize: "1rem",
                  background: `linear-gradient(135deg, #1e6fd9 0%, #0d47a1 55%, #1e40af 100%)`,
                  boxShadow: `0 12px 36px ${alpha("#1e6fd9", 0.35)}`,
                  "&:hover": {
                    background: `linear-gradient(135deg, #2563eb 0%, #1e40af 100%)`,
                    boxShadow: `0 14px 40px ${alpha("#1e6fd9", 0.4)}`,
                  },
                }}
              >
                {t("onboarding.language.continue", {
                  defaultValue: "Continue",
                })}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="city"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22 }}
            >
              <Button
                startIcon={<ArrowBackRoundedIcon />}
                onClick={handleBackToLanguage}
                sx={{
                  mb: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  color: "text.secondary",
                }}
              >
                {t("onboarding.back", { defaultValue: "Back" })}
              </Button>

              <Box sx={{ textAlign: "center", mb: 3 }}>
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                >
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      mx: "auto",
                      mb: 2,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isDark
                        ? `linear-gradient(135deg, ${alpha("#3b82f6", 0.35)} 0%, ${alpha("#8b5cf6", 0.25)} 100%)`
                        : `linear-gradient(135deg, ${alpha("#1e6fd9", 0.2)} 0%, ${alpha("#6366f1", 0.15)} 100%)`,
                      border: `1px solid ${alpha("#1e6fd9", isDark ? 0.35 : 0.25)}`,
                      boxShadow: `0 8px 32px ${alpha("#1e6fd9", isDark ? 0.2 : 0.15)}`,
                    }}
                  >
                    <LocationOnRoundedIcon
                      sx={{
                        fontSize: 40,
                        color: isDark ? "#93c5fd" : "#1e6fd9",
                      }}
                    />
                  </Box>
                </motion.div>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                    mb: 1,
                    background: isDark
                      ? `linear-gradient(90deg, #f8fafc 0%, #cbd5e1 100%)`
                      : `linear-gradient(90deg, #0f172a 0%, #334155 100%)`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {t("onboarding.city.title", {
                    defaultValue: "Where are you shopping?",
                  })}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    maxWidth: 360,
                    mx: "auto",
                    lineHeight: 1.6,
                  }}
                >
                  {t("onboarding.city.subtitle", {
                    defaultValue:
                      "Pick your city for tailored offers, stores, and delivery options near you.",
                  })}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(2, 1fr)",
                  },
                  gap: 1.25,
                  mb: 3,
                  minHeight: citiesLoading ? 120 : "auto",
                }}
              >
                {citiesLoading || cities.length === 0 ? (
                  <Box sx={{ gridColumn: "1 / -1" }}>
                    <LinearProgress
                      sx={{ height: 3, borderRadius: 1, mb: 2 }}
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                    >
                      {t("onboarding.city.loading", {
                        defaultValue: "Loading cities…",
                      })}
                    </Typography>
                  </Box>
                ) : (
                  <AnimatePresence>
                    {cities.map((city, index) => {
                      const selected = pickedCity === city.value;
                      return (
                        <motion.div
                          key={city.value}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04, duration: 0.25 }}
                        >
                          <Box
                            component="button"
                            type="button"
                            onClick={() => setCityChoice(city.value)}
                            sx={{
                              width: "100%",
                              textAlign: "left",
                              cursor: "pointer",
                              border: "none",
                              p: 0,
                              background: "transparent",
                              font: "inherit",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.25,
                                p: 1.75,
                                borderRadius: 2.5,
                                border: `2px solid ${
                                  selected
                                    ? alpha("#1e6fd9", isDark ? 0.85 : 0.65)
                                    : isDark
                                      ? alpha("#fff", 0.06)
                                      : alpha("#000", 0.06)
                                }`,
                                background: selected
                                  ? isDark
                                    ? alpha("#1e6fd9", 0.12)
                                    : alpha("#1e6fd9", 0.08)
                                  : isDark
                                    ? alpha("#fff", 0.03)
                                    : alpha("#fff", 0.9),
                                boxShadow: selected
                                  ? `0 8px 28px ${alpha("#1e6fd9", isDark ? 0.2 : 0.12)}`
                                  : "none",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                  borderColor: alpha("#1e6fd9", 0.45),
                                  transform: "translateY(-2px)",
                                },
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  fontSize: "0.95rem",
                                  flex: 1,
                                  color: "text.primary",
                                  lineHeight: 1.25,
                                }}
                              >
                                {city.label}
                              </Typography>
                              {selected && (
                                <CheckRoundedIcon
                                  sx={{
                                    fontSize: 22,
                                    color: "primary.main",
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={!pickedCity || citiesLoading || cities.length === 0}
                onClick={handleCityContinue}
                sx={{
                  py: 1.5,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontSize: "1rem",
                  background: `linear-gradient(135deg, #1e6fd9 0%, #0d47a1 55%, #1e40af 100%)`,
                  boxShadow: `0 12px 36px ${alpha("#1e6fd9", 0.35)}`,
                  "&:hover": {
                    background: `linear-gradient(135deg, #2563eb 0%, #1e40af 100%)`,
                    boxShadow: `0 14px 40px ${alpha("#1e6fd9", 0.4)}`,
                  },
                  "&.Mui-disabled": {
                    background: alpha("#1e6fd9", 0.25),
                  },
                }}
              >
                {t("onboarding.city.continue", { defaultValue: "Continue" })}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default FirstVisitCityDialog;
