import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
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
  LightModeOutlined,
  DarkModeOutlined,
  BrightnessAutoRounded,
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
import { useDarkMode } from "../context/DarkModeContext";
import { isAdminEmail, canAccessDataEntry } from "../utils/adminAccess";

const ProfilePage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, logout, updateProfile, deactivate } = useAuth();
  const { user: guestUser, updateGuestName } = useUserTracking();
  const { selectedCity, changeCity, cities } = useCityFilter();
  const { contactInfo } = useAppSettings();
  const { dataLanguage, setDataLanguage } = useDataLanguage();
  const { colorMode, setColorMode } = useDarkMode();

  const [guestNameDialogOpen, setGuestNameDialogOpen] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState("");
  const [userNameDialogOpen, setUserNameDialogOpen] = useState(false);
  const [userNameInput, setUserNameInput] = useState("");
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const changeNameButtonRef = useRef(null);
  const deactivateButtonRef = useRef(null);
  const deactivateCancelButtonRef = useRef(null);

  const displayName =
    user?.displayName ||
    user?.username ||
    guestUser?.displayName ||
    t("Guest User");
  const email = user?.email || "";
  const isAdmin = !!user && isAdminEmail(user);
  const showDataEntryLink = !!user && canAccessDataEntry(user);

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

  const contactItems = [
    { key: "whatsapp", value: contactInfo?.whatsapp, icon: <WhatsAppIcon /> },
    { key: "facebook", value: contactInfo?.facebook, icon: <FacebookIcon /> },
    {
      key: "instagram",
      value: contactInfo?.instagram,
      icon: <InstagramIcon />,
    },
    { key: "snapchat", value: contactInfo?.snapchat, icon: <SnapchatIcon /> },
    { key: "gmail", value: contactInfo?.gmail, icon: <GmailIcon /> },
    { key: "tiktok", value: contactInfo?.tiktok, icon: <TikTokIcon /> },
    { key: "viber", value: contactInfo?.viber, icon: <ViberIcon /> },
    { key: "telegram", value: contactInfo?.telegram, icon: <TelegramIcon /> },
  ].filter((item) => Boolean(item.value));

  return (
    <Box sx={{ pt: 5, px: { xs: 1, sm: 2 }, pb: 3 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
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
            {/* {!countdown.expired && (
              <Alert
                severity="info"
                sx={{
                  ml: { xs: 0, sm: "auto" },
                  mt: { xs: 1.5, sm: 0 },
                  px: 1.5,
                  py: 0.5,
                  fontSize: "0.75rem",
                }}
              >
                {t("Time until 30/05/2026")}:{" "}
                {countdown.days}d {countdown.hours}h {countdown.minutes}m{" "}
                {countdown.seconds}s
              </Alert>
            )} */}
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

          {/* <ListItemButton component={Link} to="/favourites">
            <ListItemIcon>
              <FavoriteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t("Favourites")} />
          </ListItemButton> */}

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

          {/* <Box sx={{ px: 2, py: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1, display: "block" }}
            >
              {t("Theme")}
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>{t("Theme")}</InputLabel>
              <Select
                label={t("Theme")}
                value={userThemeOverride || "__global__"}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__global__") {
                    clearUserThemeOverride();
                  } else {
                    setUserThemeOverride(v);
                  }
                }}
              >
                <MenuItem value="__global__">
                  {t("Use Global Theme")} ({activeTheme})
                </MenuItem>
                {THEME_OPTIONS.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              {t("This changes theme only for you on this device.")}
            </Typography>
          </Box> */}

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
                startAdornment={<LocationOnIcon sx={{ mr: 1, fontSize: 18 }} />}
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

          <Divider />

          <Box sx={{ px: 2, pb: 2, pt: 0 }}>
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
                🇺🇸 {t("English")}
              </Button>
              <Button
                size="small"
                variant={
                  dataLanguage === DATA_LANG_AR ? "contained" : "outlined"
                }
                onClick={() => setDataLanguage(DATA_LANG_AR)}
              >
                🇸🇦 {t("Arabic")}
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
          <Divider />
          <ListItemButton>
            <ListItemIcon>
              <ListItemText primary={t("Contact Us")} />
            </ListItemIcon>
          </ListItemButton>
          {contactItems.length > 0 && (
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
          )}
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
      </Paper>

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
