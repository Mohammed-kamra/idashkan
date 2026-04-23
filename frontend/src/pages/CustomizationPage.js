import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Snackbar,
  Alert,
  useTheme,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from "@mui/material";
import PaletteIcon from "@mui/icons-material/Palette";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useTranslation } from "react-i18next";
import { useActiveTheme } from "../context/ActiveThemeContext";
import { themeAPI } from "../services/api";
import {
  PROFILE_SHORTCUT_CATALOG,
  DEFAULT_PROFILE_SHORTCUT_IDS,
  normalizeProfileShortcutIds,
} from "../utils/profileShortcutCatalog";

const THEME_OPTIONS = [
  { id: "default", label: "Default Theme" },
  { id: "blackWhite", label: "Black & White Theme" },
  { id: "ramadan", label: "Ramadan Theme" },
  { id: "rain", label: "Rain Theme" },
  { id: "neon1", label: "Neon Theme 1" },
  { id: "neon2", label: "Neon Theme 2" },
  { id: "flash-sale", label: "Flash Sale" },
  { id: "luxury", label: "Luxury" },
  { id: "eco-green", label: "Eco Green" },
  { id: "ice", label: "Ice" },
  { id: "festival", label: "Festival" },
  { id: "tech", label: "Tech" },
  { id: "minimal", label: "Minimal" },
  { id: "sunset", label: "Sunset" },
  { id: "middle-east", label: "Middle East" },
  { id: "marketplace", label: "Marketplace" },
];

const FALLBACK_FONT_OPTIONS = [
  { id: "default", label: "Default" },
  { id: "system", label: "System" },
  { id: "arial", label: "Arial" },
  { id: "roboto", label: "Roboto" },
];

const NAV_TEMPLATES = [
  { id: "template1", label: "Template 1 (Default)" },
  { id: "template2", label: "Template 2 " },
  { id: "custom", label: "Custom (Slots)" },
  {
    id: "custom2",
    label: "Custom 2 (Brand left + 3 top-right)",
  },
];

const DEFAULT_BOTTOM_SLOTS = {
  bottomleft1: "home",
  bottomleft2: "categories",
  center: "reels",
  bottomright1: "favourites",
  bottomright2: "profile",
};

const NAV_ACTIONS = [
  { id: "", label: "Empty" },
  { id: "label", label: "Label (center text)" },
  { id: "home", label: "Home" },
  { id: "search", label: "Search" },
  { id: "refresh", label: "Refresh" },
  { id: "categories", label: "Categories" },
  { id: "reels", label: "Reels" },
  { id: "favourites", label: "Favourites" },
  { id: "stores", label: "Stores" },
  { id: "gifts", label: "Gifts" },
  { id: "shopping", label: "Shopping" },
  { id: "draftCart", label: "Draft cart" },
  { id: "profile", label: "Account/Profile" },
  { id: "brands", label: "Brands" },
  { id: "companies", label: "Companies" },
  { id: "jobs", label: "Jobs" },
  { id: "city", label: "City selector" },
  { id: "language", label: "Language" },
  { id: "notifications", label: "Notifications" },
];

const CustomizationPage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { activeTheme, activeFontKey, navConfig, profileShortcuts, fetchTheme } =
    useActiveTheme();
  const [selectedTheme, setSelectedTheme] = useState(activeTheme);
  const [selectedFont, setSelectedFont] = useState(activeFontKey || "default");
  const [selectedNav, setSelectedNav] = useState(navConfig || {});
  const [selectedProfileShortcuts, setSelectedProfileShortcuts] = useState(() =>
    normalizeProfileShortcutIds(profileShortcuts),
  );
  const [isDirty, setIsDirty] = useState(false);
  const lastServerSnapshotRef = useRef({
    activeTheme,
    activeFontKey: activeFontKey || "default",
    navConfig: navConfig || {},
    profileShortcuts: normalizeProfileShortcutIds(profileShortcuts),
  });
  const [fontOptions, setFontOptions] = useState(FALLBACK_FONT_OPTIONS);
  const [saveToastOpen, setSaveToastOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(true);

  // keep UI selection in sync with server theme changes
  useEffect(() => {
    const nextSnapshot = {
      activeTheme,
      activeFontKey: activeFontKey || "default",
      navConfig: navConfig || {},
      profileShortcuts: normalizeProfileShortcutIds(profileShortcuts),
    };

    // If user is actively editing, don't overwrite their changes due to polling.
    if (isDirty) return;

    lastServerSnapshotRef.current = nextSnapshot;
    setSelectedTheme(nextSnapshot.activeTheme);
    setSelectedFont(nextSnapshot.activeFontKey);
    setSelectedNav(nextSnapshot.navConfig);
    setSelectedProfileShortcuts(nextSnapshot.profileShortcuts);
  }, [activeTheme, activeFontKey, navConfig, profileShortcuts, isDirty]);

  useEffect(() => {
    let mounted = true;
    fetch("/fonts/fonts.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted) return;
        const families = Array.isArray(data?.families) ? data.families : [];
        const dynamic = families.map((f) => ({ id: f, label: f }));
        setFontOptions([...FALLBACK_FONT_OPTIONS, ...dynamic]);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const fontPreview = useMemo(() => {
    const picked = THEME_OPTIONS.find((f) => f.id === selectedTheme);
    return picked?.label || selectedTheme;
  }, [selectedTheme]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: isDark ? "rgba(13,17,28,1)" : "rgba(248,249,252,1)",
        pt: { xs: 8, md: 4 },
        pb: 6,
      }}
    >
    <Container maxWidth="md">
      <Card
        sx={{
          borderRadius: 4,
          background: isDark
            ? "linear-gradient(145deg,#1a2235,#1e2a42)"
            : "#ffffff",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          boxShadow: isDark
            ? "0 4px 32px rgba(0,0,0,0.4)"
            : "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                background: isDark
                  ? "linear-gradient(135deg,#1e6fd9,#4a90e2)"
                  : "linear-gradient(135deg,#1E6FD9,#0d47a1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PaletteIcon sx={{ color: "#fff", fontSize: "1.3rem" }} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: isDark ? "#fff" : "#111827",
              }}
            >
              {t("Customization")}
            </Typography>
          </Box>
          <Typography
            sx={{
              mb: 2,
              color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
              fontSize: "0.92rem",
            }}
          >
            {t("Admin selects active theme. All users see it automatically.")}
          </Typography>

          <Divider
            sx={{
              my: 2,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.08)",
            }}
          />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr" },
              gap: 2,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontWeight: 800,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  color: isDark ? "rgba(255,255,255,0.85)" : "#111827",
                }}
              >
                <PaletteIcon fontSize="small" color="primary" />
                {t("Active Theme")}
              </Typography>
              <FormControl
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.025)",
                    "& fieldset": {
                      borderColor: isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.12)",
                    },
                  },
                }}
              >
                <InputLabel>{t("Theme")}</InputLabel>
                <Select
                  value={selectedTheme}
                  label={t("Theme")}
                  onChange={(e) => {
                    setIsDirty(true);
                    setSelectedTheme(e.target.value);
                  }}
                >
                  {THEME_OPTIONS.map((opt) => (
                    <MenuItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ height: 14 }} />

              <Typography
                sx={{
                  fontWeight: 800,
                  mb: 1,
                  color: isDark ? "rgba(255,255,255,0.85)" : "#111827",
                }}
              >
                {t("Default Font")}
              </Typography>
              <FormControl
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.025)",
                    "& fieldset": {
                      borderColor: isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.12)",
                    },
                  },
                }}
              >
                <InputLabel>{t("Font")}</InputLabel>
                <Select
                  value={selectedFont}
                  label={t("Font")}
                  onChange={(e) => {
                    setIsDirty(true);
                    setSelectedFont(e.target.value);
                  }}
                >
                  {fontOptions.map((opt) => (
                    <MenuItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider
                sx={{
                  my: 2.5,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
                }}
              />

              <Typography
                sx={{
                  fontWeight: 800,
                  mb: 1,
                  color: isDark ? "rgba(255,255,255,0.85)" : "#111827",
                }}
              >
                {t("Mobile Navigation Template")}
              </Typography>
              <FormControl
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.025)",
                    "& fieldset": {
                      borderColor: isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.12)",
                    },
                  },
                }}
              >
                <InputLabel>{t("Template")}</InputLabel>
                <Select
                  value={selectedNav?.template || "template1"}
                  label={t("Template")}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedNav((prev) => {
                      setIsDirty(true);
                      const p = prev || {};
                      if (v === "custom2") {
                        return {
                          ...p,
                          template: "custom2",
                          topSlots: {
                            ...(p.topSlots || {}),
                            topright1: p.topSlots?.topright1 || "search",
                            topright2: p.topSlots?.topright2 || "notifications",
                            topright3: p.topSlots?.topright3 || "profile",
                          },
                          bottomSlots:
                            p.template === "custom" || p.template === "custom2"
                              ? p.bottomSlots || { ...DEFAULT_BOTTOM_SLOTS }
                              : { ...DEFAULT_BOTTOM_SLOTS },
                        };
                      }
                      return { ...p, template: v };
                    });
                  }}
                >
                  {NAV_TEMPLATES.map((opt) => (
                    <MenuItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {(selectedNav?.template === "custom" ||
                selectedNav?.template === "custom2") && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 3,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(0,0,0,0.02)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
                  }}
                >
                  {selectedNav?.template === "custom" && (
                    <>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          mb: 1.5,
                          color: isDark ? "rgba(255,255,255,0.8)" : "#111827",
                        }}
                      >
                        {t("Top Navigation Slots")}
                      </Typography>
                      {[
                        "topleft1",
                        "topleft2",
                        "center",
                        "topright1",
                        "topright2",
                      ].map((slot) => (
                        <FormControl
                          key={slot}
                          fullWidth
                          sx={{
                            mb: 1,
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2.5,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.025)",
                              "& fieldset": {
                                borderColor: isDark
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.1)",
                              },
                            },
                          }}
                        >
                          <InputLabel>{slot}</InputLabel>
                          <Select
                            value={selectedNav?.topSlots?.[slot] ?? ""}
                            label={slot}
                            onChange={(e) =>
                              setSelectedNav((prev) => {
                                setIsDirty(true);
                                return {
                                  ...(prev || {}),
                                  topSlots: {
                                    ...(prev?.topSlots || {}),
                                    [slot]: e.target.value,
                                  },
                                };
                              })
                            }
                          >
                            {NAV_ACTIONS.map((a) => (
                              <MenuItem key={a.id || "empty"} value={a.id}>
                                {a.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ))}
                    </>
                  )}

                  {selectedNav?.template === "custom2" && (
                    <>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          mb: 0.75,
                          color: isDark ? "rgba(255,255,255,0.8)" : "#111827",
                        }}
                      >
                        {t("Top bar (mobile)")}
                      </Typography>
                      <Typography
                        sx={{
                          mb: 1.5,
                          fontSize: "0.88rem",
                          color: isDark
                            ? "rgba(255,255,255,0.55)"
                            : "rgba(0,0,0,0.55)",
                        }}
                      >
                        {t(
                          "Logo and app name stay on the left. Assign up to three actions on the right.",
                          {
                            defaultValue:
                              "Logo and app name stay on the left. Assign up to three actions on the right.",
                          },
                        )}
                      </Typography>
                      {["topright1", "topright2", "topright3"].map((slot) => (
                        <FormControl
                          key={slot}
                          fullWidth
                          sx={{
                            mb: 1,
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2.5,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.025)",
                              "& fieldset": {
                                borderColor: isDark
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.1)",
                              },
                            },
                          }}
                        >
                          <InputLabel>{slot}</InputLabel>
                          <Select
                            value={selectedNav?.topSlots?.[slot] ?? ""}
                            label={slot}
                            onChange={(e) =>
                              setSelectedNav((prev) => {
                                setIsDirty(true);
                                return {
                                  ...(prev || {}),
                                  topSlots: {
                                    ...(prev?.topSlots || {}),
                                    [slot]: e.target.value,
                                  },
                                };
                              })
                            }
                          >
                            {NAV_ACTIONS.filter((a) => a.id !== "label").map(
                              (a) => (
                                <MenuItem key={a.id || "empty"} value={a.id}>
                                  {a.label}
                                </MenuItem>
                              ),
                            )}
                          </Select>
                        </FormControl>
                      ))}
                    </>
                  )}

                  <Typography
                    sx={{
                      fontWeight: 800,
                      mb: 1.5,
                      mt: 2,
                      color: isDark ? "rgba(255,255,255,0.8)" : "#111827",
                    }}
                  >
                    {t("Bottom Navigation Slots")}
                  </Typography>
                  {[
                    "bottomleft1",
                    "bottomleft2",
                    "center",
                    "bottomright1",
                    "bottomright2",
                  ].map((slot) => (
                    <FormControl
                      key={slot}
                      fullWidth
                      sx={{
                        mb: 1,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2.5,
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.025)",
                          "& fieldset": {
                            borderColor: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.1)",
                          },
                        },
                      }}
                    >
                      <InputLabel>{slot}</InputLabel>
                      <Select
                        value={selectedNav?.bottomSlots?.[slot] ?? ""}
                        label={slot}
                        onChange={(e) =>
                          setSelectedNav((prev) => {
                            setIsDirty(true);
                            return {
                              ...(prev || {}),
                              bottomSlots: {
                                ...(prev?.bottomSlots || {}),
                                [slot]: e.target.value,
                              },
                            };
                          })
                        }
                      >
                        {NAV_ACTIONS.filter((a) => a.id !== "label").map(
                          (a) => (
                            <MenuItem key={a.id || "empty"} value={a.id}>
                              {a.label}
                            </MenuItem>
                          ),
                        )}
                      </Select>
                    </FormControl>
                  ))}
                </Box>
              )}

              <Divider
                sx={{
                  my: 2,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
                }}
              />

              <Typography
                sx={{
                  fontWeight: 800,
                  mb: 0.5,
                  color: isDark ? "rgba(255,255,255,0.85)" : "#111827",
                }}
              >
                {t("Profile page shortcuts", {
                  defaultValue: "Profile page shortcuts",
                })}
              </Typography>
              <Typography
                sx={{
                  mb: 1.5,
                  color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
                  fontSize: "0.88rem",
                }}
              >
                {t(
                  "Choose which app pages appear as a horizontal row on the profile screen.",
                  {
                    defaultValue:
                      "Choose which app pages appear as a horizontal row on the profile screen.",
                  },
                )}
              </Typography>
              <FormGroup
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
                  gap: 0.25,
                }}
              >
                {PROFILE_SHORTCUT_CATALOG.map((item) => (
                  <FormControlLabel
                    key={item.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedProfileShortcuts.includes(item.id)}
                        onChange={() => {
                          setIsDirty(true);
                          setSelectedProfileShortcuts((prev) => {
                            if (prev.includes(item.id)) {
                              return prev.filter((x) => x !== item.id);
                            }
                            return [...prev, item.id];
                          });
                        }}
                      />
                    }
                    label={t(item.labelKey)}
                    sx={{
                      mr: 1,
                      "& .MuiFormControlLabel-label": {
                        fontSize: "0.875rem",
                      },
                    }}
                  />
                ))}
              </FormGroup>

              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 3,
                  border: `1px dashed ${isDark ? "rgba(74,144,226,0.3)" : "rgba(30,111,217,0.25)"}`,
                  backgroundColor: isDark
                    ? "rgba(74,144,226,0.06)"
                    : "rgba(30,111,217,0.03)",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 800,
                    mb: 0.5,
                    color: isDark ? "rgba(255,255,255,0.85)" : "#111827",
                  }}
                >
                  {t("Preview")}
                </Typography>
                <Typography
                  sx={{
                    color: isDark ? "rgba(255,255,255,0.75)" : "#374151",
                  }}
                >
                  {t("Selected")}: {fontPreview}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    color: isDark
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(0,0,0,0.45)",
                    fontSize: "0.82rem",
                  }}
                >
                  {t("Tip: theme effects auto-disable on low motion devices.")}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider
            sx={{
              my: 2.5,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.08)",
            }}
          />

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button
              variant="contained"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await themeAPI.update({
                    activeTheme: selectedTheme,
                    activeFontKey: selectedFont,
                    navConfig: selectedNav,
                    profileShortcuts: normalizeProfileShortcutIds(
                      selectedProfileShortcuts,
                    ),
                  });
                  await fetchTheme();
                  setSaveOk(true);
                  setIsDirty(false);
                } catch {
                  setSaveOk(false);
                } finally {
                  setSaving(false);
                  setSaveToastOpen(true);
                }
              }}
              sx={{
                textTransform: "none",
                minWidth: 110,
                borderRadius: 3,
                fontWeight: 700,
              }}
            >
              {saving ? t("Saving...") : t("Save")}
            </Button>
            <Button
              startIcon={<RestartAltIcon />}
              color="inherit"
              variant="outlined"
              onClick={async () => {
                setIsDirty(true);
                setSelectedTheme("default");
                setSelectedFont("default");
                setSelectedProfileShortcuts([...DEFAULT_PROFILE_SHORTCUT_IDS]);
              }}
              sx={{
                textTransform: "none",
                borderRadius: 3,
                fontWeight: 700,
                borderColor: isDark
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(0,0,0,0.18)",
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)",
              }}
            >
              {t("Reset")}
            </Button>
          </Box>
        </CardContent>
      </Card>
      <Snackbar
        open={saveToastOpen}
        autoHideDuration={2500}
        onClose={() => setSaveToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSaveToastOpen(false)}
          severity={saveOk ? "success" : "error"}
          sx={{ width: "100%" }}
        >
          {saveOk ? t("Saved") : t("Failed to save (admin only).")}
        </Alert>
      </Snackbar>
    </Container>
    </Box>
  );
};

export default CustomizationPage;
