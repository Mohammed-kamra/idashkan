import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Container,
  Divider,
  Alert,
  Avatar,
  InputAdornment,
  IconButton,
  useTheme,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { getApiBaseURL } from "../utils/getApiBaseURL";
import { isEmbeddedWebView } from "../utils/isEmbeddedWebView";

const BRAND = "var(--brand-primary-blue, #1E6FD9)";

/** GSI `initialize()` may only run once per page load; remounting <LoginPage> must not call it again. */
let googleIdentityInitialized = false;

function GoogleGLogo({ size = 20 }) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48">
        <path
          fill="#FFC107"
          d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.641-.142-3.225-.406-4.771z"
        />
        <path
          fill="#FF3D00"
          d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.574l.002-.001 6.19 5.238C37.83 39.411 44 34.956 44 24c0-1.641-.142-3.225-.406-4.771z"
        />
      </svg>
    </Box>
  );
}

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      const done = () => resolve();
      existing.addEventListener("load", done);
      existing.addEventListener("error", () =>
        reject(new Error("Google script failed to load")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google script failed to load"));
    document.body.appendChild(script);
  });
}

const LoginPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register, loginWithGoogle, completeSessionWithToken } =
    useAuth();
  const googleHandlerRef = useRef(async () => {});
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [activeTab, setActiveTab] = useState("login");
  const googleRenderRef = useRef(null);

  const useGoogleOAuthRedirect = useMemo(() => {
    if (import.meta.env.VITE_GOOGLE_OAUTH_REDIRECT === "true") return true;
    return isEmbeddedWebView();
  }, []);

  const fieldSx = useMemo(
    () => ({
      "& .MuiOutlinedInput-root": {
        borderRadius: "14px",
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)",
        transition: "background-color 0.2s ease, box-shadow 0.2s ease",
        "& fieldset": {
          borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
        },
        "&:hover fieldset": {
          borderColor: isDark
            ? "rgba(255,255,255,0.2)"
            : "rgba(30,111,217,0.35)",
        },
        "&.Mui-focused fieldset": {
          borderColor: BRAND,
          borderWidth: "1.5px",
        },
      },
      "& .MuiInputLabel-root.Mui-focused": { color: BRAND },
      "& .MuiInputBase-input": { py: 1.35 },
    }),
    [isDark],
  );

  const handleInputChange = (field, value) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegisterInputChange = (field, value) => {
    setRegisterForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!loginForm.email?.trim()) {
      setError("Email or username is required");
      return;
    }
    if (!loginForm.password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    try {
      const result = await login(
        loginForm.email.trim(),
        loginForm.password?.trim() || loginForm.password,
      );
      if (result.success) {
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      } else {
        setError(result.message || "Login failed");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const username = registerForm.username.trim();
    const email = registerForm.email.trim();
    const password = registerForm.password;
    const confirmPassword = registerForm.confirmPassword;

    if (!username) {
      setError("Username is required");
      return;
    }

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        username,
        email,
        password,
      });
      if (result.success) {
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      } else {
        setError(result.message || "Registration failed");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    navigate(location.state?.from?.pathname || "/", { replace: true });
  };

  const handleGoogleCredential = useCallback(
    async (credential) => {
      if (!credential) return;
      setError("");
      setLoading(true);
      try {
        const result = await loginWithGoogle(credential);
        if (result.success) {
          const from = location.state?.from?.pathname || "/";
          navigate(from, { replace: true });
        } else {
          setError(
            result.message ||
              t("Google sign-in failed", {
                defaultValue: "Google sign-in failed",
              }),
          );
        }
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            t("Google sign-in failed", {
              defaultValue: "Google sign-in failed",
            }),
        );
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, navigate, location.state, t],
  );

  googleHandlerRef.current = handleGoogleCredential;

  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

  /** Full-page OAuth return: #google_oauth_token= (preferred) or ?google_oauth_token=; ?google_error= */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(
      (window.location.hash || "").replace(/^#/, ""),
    );
    const oauthErr = params.get("google_error");
    const oauthTok =
      params.get("google_oauth_token") || hashParams.get("google_oauth_token");

    const stripOAuthFromUrl = () => {
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    if (oauthErr) {
      try {
        setError(decodeURIComponent(oauthErr));
      } catch {
        setError(oauthErr);
      }
      stripOAuthFromUrl();
      return undefined;
    }

    if (!oauthTok) return undefined;

    const tokenSnapshot = oauthTok;
    stripOAuthFromUrl();

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      const result = await completeSessionWithToken(tokenSnapshot);
      if (cancelled) return;
      if (result.success) {
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      } else {
        setError(
          result.message ||
            t("Google sign-in failed", {
              defaultValue: "Google sign-in failed",
            }),
        );
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [completeSessionWithToken, navigate, location.state, t]);

  const startGoogleOAuthRedirect = useCallback(() => {
    const returnTo = location.state?.from?.pathname || "/";
    const base = getApiBaseURL();
    const url = `${base}/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
    window.location.assign(url);
  }, [location.state]);

  /**
   * Use Google's `renderButton` (iframe) instead of One Tap `prompt()` — One Tap is
   * often blocked or empty on mobile Safari / in-app browsers; the rendered button works.
   * In embedded WebViews, use full-page OAuth (`/auth/google/start`) instead.
   */
  useEffect(() => {
    if (!googleClientId || useGoogleOAuthRedirect) return undefined;

    let cancelled = false;

    const renderGoogleButton = async () => {
      await loadGsiScript();
      if (cancelled) return;
      const el = googleRenderRef.current;
      if (!el || !window.google?.accounts?.id) return;

      el.innerHTML = "";
      try {
        if (!googleIdentityInitialized) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response) => {
              const c = response?.credential;
              if (c) void googleHandlerRef.current?.(c);
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          googleIdentityInitialized = true;
        }

        const rectW = el.getBoundingClientRect().width || el.offsetWidth || 0;
        const vw =
          typeof window !== "undefined"
            ? Math.min(window.innerWidth - 64, 480)
            : 320;
        const w = Math.max(rectW || vw, 280);
        window.google.accounts.id.renderButton(el, {
          theme: "outline",
          size: "large",
          width: w,
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          locale: typeof navigator !== "undefined" ? navigator.language : "en",
        });
      } catch (e) {
        console.warn("Google Sign-In renderButton:", e);
      }
    };

    let frames = 0;
    const maxFrames = 45;
    const tick = () => {
      if (cancelled) return;
      if (googleRenderRef.current && window.google?.accounts?.id) {
        void renderGoogleButton();
        return;
      }
      frames += 1;
      if (frames < maxFrames) {
        requestAnimationFrame(tick);
        return;
      }
      void renderGoogleButton();
    };

    void loadGsiScript().then(() => {
      requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      if (googleRenderRef.current) googleRenderRef.current.innerHTML = "";
    };
  }, [googleClientId, useGoogleOAuthRedirect]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: isDark
          ? "linear-gradient(165deg, #0c1220 0%, #0a0e18 40%, #111827 100%)"
          : "linear-gradient(165deg, #eef4ff 0%, #f8fafc 45%, #ffffff 100%)",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: isDark
            ? "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(30,111,217,0.22), transparent 55%)"
            : "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(30,111,217,0.18), transparent 50%)",
          pointerEvents: "none",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: "-20%",
          right: "-15%",
          width: "55%",
          height: "55%",
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, rgba(74,144,226,0.12) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(30,111,217,0.08) 0%, transparent 65%)",
          pointerEvents: "none",
        },
      }}
    >
      <Container
        maxWidth="sm"
        sx={{ position: "relative", zIndex: 1, py: { xs: 2, sm: 4 } }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mt: 3,

            mb: 2,
          }}
        >
          {/* <IconButton
            onClick={goBack}
            aria-label={t("Back")}
            sx={{
              color: isDark ? "rgba(255,255,255,0.85)" : "text.primary",
              bgcolor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.7)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`,
              "&:hover": {
                bgcolor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(255,255,255,0.95)",
              },
            }}
          >
          </IconButton>
          <Typography
            variant="body2"
            to="/"
            sx={{
              color: isDark ? "rgba(255,255,255,0.65)" : "text.secondary",
              textDecoration: "none",
              fontWeight: 500,
              "&:hover": { color: BRAND },
            }}
          >
            {t("Home")}
          </Typography> */}
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 4 },
            width: "100%",
            borderRadius: { xs: 3, sm: 4 },
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`,
            background: isDark
              ? "linear-gradient(145deg, rgba(30,41,59,0.85) 0%, rgba(15,23,42,0.92) 100%)"
              : "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset"
              : "0 20px 48px rgba(15,23,42,0.08), 0 0 0 1px rgba(255,255,255,0.8) inset",
            backdropFilter: "blur(12px)",
          }}
        >
          <Box textAlign="center" mb={3}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                mx: "auto",
                mb: 2,
                background: `linear-gradient(135deg, ${BRAND} 0%, #4A90E2 100%)`,
                boxShadow: "0 8px 24px rgba(30,111,217,0.35)",
              }}
            >
              <Person sx={{ fontSize: 36 }} />
            </Avatar>
            <Typography
              variant="h5"
              component="h1"
              fontWeight={800}
              letterSpacing="-0.02em"
              sx={{ color: isDark ? "rgba(255,255,255,0.95)" : "text.primary" }}
            >
              {activeTab === "login" ? t("Welcome Back") : t("Create Account")}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: 0.75,
                color: isDark ? "rgba(255,255,255,0.55)" : "text.secondary",
                maxWidth: 320,
                mx: "auto",
                lineHeight: 1.5,
              }}
            >
              {activeTab === "login"
                ? t("Sign in to sync across devices")
                : t("Create an account to save your favourites")}
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2.5,
                borderRadius: 2,
                "& .MuiAlert-message": { width: "100%" },
              }}
            >
              {error}
            </Alert>
          )}

          <Box
            sx={{
              display: "flex",
              p: 0.5,
              mb: 2.5,
              borderRadius: "14px",
              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
            }}
          >
            {["login", "register"].map((tab) => (
              <Button
                key={tab}
                fullWidth
                disableElevation
                onClick={() => {
                  setActiveTab(tab);
                  setError("");
                }}
                sx={{
                  py: 1.1,
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  color:
                    activeTab === tab
                      ? "#fff"
                      : isDark
                        ? "rgba(255,255,255,0.55)"
                        : "text.secondary",
                  background:
                    activeTab === tab
                      ? `linear-gradient(135deg, ${BRAND} 0%, #4A90E2 100%)`
                      : "transparent",
                  boxShadow:
                    activeTab === tab
                      ? "0 4px 14px rgba(30,111,217,0.35)"
                      : "none",
                  "&:hover": {
                    background:
                      activeTab === tab
                        ? `linear-gradient(135deg, #1660c2 0%, #3a7fd2 100%)`
                        : isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.03)",
                  },
                }}
              >
                {tab === "login" ? t("Sign In") : t("Register")}
              </Button>
            ))}
          </Box>

          {activeTab === "login" ? (
            <Box component="form" onSubmit={handleLoginSubmit}>
              <TextField
                fullWidth
                margin="dense"
                label={t("Email")}
                type="email"
                autoComplete="email"
                value={loginForm.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                sx={{ ...fieldSx, mb: 1.5 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email
                        sx={{
                          color: isDark
                            ? "rgba(255,255,255,0.45)"
                            : "action.active",
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                margin="dense"
                label={t("Password")}
                type={showPassword ? "text" : "password"}
                value={loginForm.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock
                        sx={{
                          color: isDark
                            ? "rgba(255,255,255,0.45)"
                            : "action.active",
                        }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{
                          color: isDark ? "rgba(255,255,255,0.5)" : undefined,
                        }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 3,
                  py: 1.5,
                  borderRadius: "14px",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "1rem",
                  background: `linear-gradient(135deg, ${BRAND} 0%, #4A90E2 100%)`,
                  boxShadow: "0 8px 24px rgba(30,111,217,0.35)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #1660c2 0%, #3a7fd2 100%)",
                    boxShadow: "0 10px 28px rgba(30,111,217,0.4)",
                  },
                  "&.Mui-disabled": {
                    background: isDark
                      ? "rgba(255,255,255,0.12)"
                      : "action.disabledBackground",
                  },
                }}
              >
                {loading ? t("Signing In...") : t("Sign In")}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleRegisterSubmit}>
              <TextField
                fullWidth
                margin="dense"
                label={t("Username")}
                type="text"
                value={registerForm.username}
                onChange={(e) =>
                  handleRegisterInputChange("username", e.target.value)
                }
                required
                sx={{ ...fieldSx, mb: 1.5 }}
              />
              <TextField
                fullWidth
                margin="dense"
                label={t("Email")}
                type="email"
                autoComplete="email"
                value={registerForm.email}
                onChange={(e) =>
                  handleRegisterInputChange("email", e.target.value)
                }
                required
                sx={{ ...fieldSx, mb: 1.5 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email
                        sx={{
                          color: isDark
                            ? "rgba(255,255,255,0.45)"
                            : "action.active",
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                margin="dense"
                label={t("Password")}
                type={showPassword ? "text" : "password"}
                value={registerForm.password}
                onChange={(e) =>
                  handleRegisterInputChange("password", e.target.value)
                }
                required
                sx={{ ...fieldSx, mb: 1.5 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock
                        sx={{
                          color: isDark
                            ? "rgba(255,255,255,0.45)"
                            : "action.active",
                        }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{
                          color: isDark ? "rgba(255,255,255,0.5)" : undefined,
                        }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                margin="dense"
                label={t("Confirm Password")}
                type={showPassword ? "text" : "password"}
                value={registerForm.confirmPassword}
                onChange={(e) =>
                  handleRegisterInputChange("confirmPassword", e.target.value)
                }
                required
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock
                        sx={{
                          color: isDark
                            ? "rgba(255,255,255,0.45)"
                            : "action.active",
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 3,
                  py: 1.5,
                  borderRadius: "14px",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "1rem",
                  background: `linear-gradient(135deg, ${BRAND} 0%, #4A90E2 100%)`,
                  boxShadow: "0 8px 24px rgba(30,111,217,0.35)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #1660c2 0%, #3a7fd2 100%)",
                    boxShadow: "0 10px 28px rgba(30,111,217,0.4)",
                  },
                  "&.Mui-disabled": {
                    background: isDark
                      ? "rgba(255,255,255,0.12)"
                      : "action.disabledBackground",
                  },
                }}
              >
                {loading ? t("Creating Account...") : t("Create Account")}
              </Button>
            </Box>
          )}

          <Box
            sx={{
              mt: 2.5,
              pt: 2.5,
              borderTop: `1px solid ${
                isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"
              }`,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {/* {!googleClientId ? (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                {t("googleEnvMissing")}
              </Alert>
            ) : (
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: 1,
                }}
              >
                {useGoogleOAuthRedirect && isEmbeddedWebView() && (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    {t("googleWebViewRedirectHint", {
                      defaultValue:
                        "Google sign-in will continue in this window (full page), then bring you back here.",
                    })}
                  </Alert>
                )}
                {useGoogleOAuthRedirect ? (
                  <Button
                    type="button"
                    fullWidth
                    variant="outlined"
                    size="large"
                    disabled={loading}
                    onClick={startGoogleOAuthRedirect}
                    sx={{
                      py: 1.25,
                      borderRadius: "14px",
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "1rem",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.22)"
                        : "rgba(0,0,0,0.14)",
                      color: isDark ? "rgba(255,255,255,0.95)" : "text.primary",
                      bgcolor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(255,255,255,0.9)",
                      gap: 1.25,
                      "&:hover": {
                        borderColor: isDark
                          ? "rgba(255,255,255,0.35)"
                          : "rgba(0,0,0,0.2)",
                        bgcolor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    }}
                  >
                    <GoogleGLogo size={22} />
                    {t("Continue with Google")}
                  </Button>
                ) : (
                  <Box
                    ref={googleRenderRef}
                    className="gsi-google-button-mount"
                    sx={{
                      width: "100%",
                      minHeight: 48,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      "& > div": { width: "100% !important" },
                      "& iframe": {
                        width: "100% !important",
                        maxWidth: "100% !important",
                      },
                    }}
                  />
                )}
              </Box>
            )} */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Divider sx={{ flex: 1 }} />
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? "rgba(255,255,255,0.45)" : "text.secondary",
                  fontWeight: 600,
                }}
              >
                {t("or")}
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={goBack}
              sx={{
                py: 1.35,
                borderRadius: "14px",
                textTransform: "none",
                fontWeight: 600,
                borderColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.12)",
                color: isDark ? "rgba(255,255,255,0.9)" : "text.primary",
                "&:hover": {
                  borderColor: BRAND,
                  bgcolor: isDark
                    ? "rgba(30,111,217,0.12)"
                    : "rgba(30,111,217,0.06)",
                },
              }}
            >
              {t("Continue as Guest")}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
