import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

const LOGO_SRC = `${process.env.PUBLIC_URL}/logo192.png`;

const EASE = [0.25, 0.1, 0.25, 1];
const TOTAL_MS = 2800;

/**
 * First-launch intro — Middle East–inspired palette, app logo, smooth single-layer motion.
 */
const SplashScreen = ({ onComplete, darkMode = false }) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      const t = window.setTimeout(onComplete, 450);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(onComplete, TOTAL_MS);
    return () => window.clearTimeout(t);
  }, [onComplete, prefersReducedMotion]);

  const pageBg = darkMode
    ? "linear-gradient(168deg, #12100e 0%, #1a1814 42%, #0f2320 100%)"
    : "linear-gradient(168deg, #faf6ef 0%, #f3ebe0 40%, #e8f0ec 100%)";

  const orbStyle = darkMode
    ? {
        background:
          "radial-gradient(ellipse 90% 70% at 50% 20%, rgba(201, 162, 39, 0.14) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 80% 85%, rgba(13, 92, 77, 0.18) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 10% 90%, rgba(114, 47, 55, 0.08) 0%, transparent 45%)",
      }
    : {
        background:
          "radial-gradient(ellipse 90% 70% at 50% 15%, rgba(201, 162, 39, 0.12) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 85% 80%, rgba(13, 92, 77, 0.10) 0%, transparent 50%), radial-gradient(ellipse 55% 45% at 12% 88%, rgba(178, 74, 90, 0.06) 0%, transparent 45%)",
      };

  const titleStyle = {
    margin: 0,
    fontSize: "clamp(1.9rem, 7vw, 2.85rem)",
    fontWeight: 700,
    lineHeight: 1.2,
    textAlign: "center",
    fontFamily:
      '"Amiri", "Noto Naskh Arabic", Georgia, "Times New Roman", serif',
    letterSpacing: "0.04em",
    background: darkMode
      ? "linear-gradient(100deg, #e8d48b 0%, #f5e9c8 35%, #7ec4b8 70%, #c9a227 100%)"
      : "linear-gradient(100deg, #7a4a1a 0%, #c9a227 30%, #0d5c4d 65%, #1a4d45 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitFontSmoothing: "antialiased",
  };

  const taglineColor = darkMode
    ? "rgba(232, 212, 163, 0.55)"
    : "rgba(61, 47, 38, 0.55)";

  if (prefersReducedMotion) {
    return (
      <Box
        role="presentation"
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: (t) => t.zIndex.modal + 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: pageBg,
        }}
      >
        <Box
          component="img"
          src={LOGO_SRC}
          alt=""
          sx={{ width: { xs: 88, sm: 100 }, height: "auto", mb: 2 }}
        />
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={titleStyle}
        >
          iDashkan
        </motion.h1>
      </Box>
    );
  }

  /* One orchestrated opacity on the root — avoids nested opacity fights / flicker */
  return (
    <Box
      role="presentation"
      aria-hidden="true"
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (t) => t.zIndex.modal + 10,
        overflow: "hidden",
        background: pageBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      {/* Static decorative layer — no infinite motion (prevents GPU shimmer glitches) */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          ...orbStyle,
          opacity: 0.95,
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: TOTAL_MS / 1000,
          times: [0, 0.14, 0.78, 1],
          ease: "easeInOut",
        }}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.35rem",
          maxWidth: "min(100%, 420px)",
        }}
      >
        <motion.div
          initial={{ scale: 0.94, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          transition={{
            delay: 0.06,
            duration: 0.75,
            ease: EASE,
          }}
          style={{ willChange: "transform" }}
        >
          <Box
            component="img"
            src={LOGO_SRC}
            alt=""
            sx={{
              width: { xs: 100, sm: 112 },
              height: "auto",
              display: "block",
              borderRadius: 2,
              boxShadow: darkMode
                ? "0 8px 32px rgba(0,0,0,0.45)"
                : "0 12px 40px rgba(26, 77, 69, 0.12)",
            }}
          />
        </motion.div>

        <motion.h1
          style={{ ...titleStyle, maxWidth: "100%" }}
          initial={{ y: 10, letterSpacing: "0.22em" }}
          animate={{ y: 0, letterSpacing: "0.04em" }}
          transition={{
            delay: 0.18,
            duration: 0.82,
            ease: EASE,
          }}
        >
          iDashkan
        </motion.h1>

        <motion.p
          initial={{ y: 8 }}
          animate={{ y: 0 }}
          transition={{
            delay: 0.4,
            duration: 0.55,
            ease: EASE,
          }}
          style={{
            margin: 0,
            fontSize: "clamp(0.72rem, 2.8vw, 0.88rem)",
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: taglineColor,
            fontFamily: '"Noto Naskh Arabic", serif',
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {t("Offers · Discounts · Near You")}
        </motion.p>
      </motion.div>
    </Box>
  );
};

export default SplashScreen;
