import React, { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";

export const LOGO192_SRC = `${import.meta.env.BASE_URL}logo192.png`;

const EASE = [0.25, 0.1, 0.25, 1];
const EXIT_MS = 520;
const MIN_VISIBLE_MS = 1700;

const PARTICLES = [
  { left: "8%", top: "20%", size: 7, delay: 0.1, duration: 3.2 },
  { left: "18%", top: "65%", size: 5, delay: 0.6, duration: 3.8 },
  { left: "30%", top: "30%", size: 6, delay: 1.2, duration: 3.1 },
  { left: "42%", top: "78%", size: 4, delay: 0.9, duration: 4.1 },
  { left: "58%", top: "22%", size: 8, delay: 0.3, duration: 3.6 },
  { left: "66%", top: "58%", size: 6, delay: 1.4, duration: 3.5 },
  { left: "74%", top: "36%", size: 5, delay: 0.5, duration: 3.4 },
  { left: "85%", top: "72%", size: 7, delay: 1.1, duration: 3.9 },
  { left: "90%", top: "18%", size: 4, delay: 1.6, duration: 4.2 },
  { left: "12%", top: "84%", size: 6, delay: 0.8, duration: 3.3 },
];

/**
 * Premium launch splash.
 */
const SplashScreen = ({ onComplete, darkMode = false, appReady = false }) => {
  const prefersReducedMotion = useReducedMotion();
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0.06);
  const particles = useMemo(() => PARTICLES, []);
  const bgGradient = darkMode
    ? "linear-gradient(135deg, #0B1120 0%, #1E3A8A 36%, #C2410C 74%, #F59E0B 100%)"
    : "linear-gradient(135deg, #1E3A8A 0%, #2563EB 35%, #F97316 72%, #FBBF24 100%)";
  const glowOverlay = darkMode
    ? "radial-gradient(circle at 12% 24%, rgba(255,255,255,0.12), transparent 28%), radial-gradient(circle at 82% 72%, rgba(251,191,36,0.14), transparent 32%)"
    : "radial-gradient(circle at 12% 24%, rgba(255,255,255,0.2), transparent 28%), radial-gradient(circle at 82% 72%, rgba(251,191,36,0.18), transparent 32%)";

  useEffect(() => {
    const startAt = Date.now();
    let done = false;
    let progressTimer;
    let holdTimer;
    let completeTimer;

    const beginExit = () => {
      if (done) return;
      done = true;
      setProgress(1);
      setIsExiting(true);
      completeTimer = window.setTimeout(
        () => onComplete(),
        prefersReducedMotion ? 180 : EXIT_MS,
      );
    };

    const maybeExit = () => {
      if (!appReady) return;
      const elapsed = Date.now() - startAt;
      if (elapsed >= MIN_VISIBLE_MS) {
        beginExit();
      } else {
        holdTimer = window.setTimeout(beginExit, MIN_VISIBLE_MS - elapsed);
      }
    };

    if (prefersReducedMotion) {
      progressTimer = window.setTimeout(() => setProgress(1), 260);
      maybeExit();
      return () => {
        window.clearTimeout(progressTimer);
        window.clearTimeout(holdTimer);
        window.clearTimeout(completeTimer);
      };
    }

    progressTimer = window.setInterval(() => {
      setProgress((prev) => {
        if (done) return 1;
        const target = appReady ? 0.985 : 0.92;
        const step = appReady ? 0.14 : 0.05;
        return Math.min(target, prev + (target - prev) * step);
      });
    }, 110);

    maybeExit();

    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(holdTimer);
      window.clearTimeout(completeTimer);
    };
  }, [appReady, onComplete, prefersReducedMotion]);

  return (
    <motion.div
      role="presentation"
      aria-hidden="true"
      initial={false}
      animate={
        isExiting
          ? { opacity: 0, scale: 1.035, filter: "blur(8px)" }
          : { opacity: 1, scale: 1, filter: "blur(0px)" }
      }
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.52, ease: EASE }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1400,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 1rem",
      }}
    >
      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : { backgroundPosition: ["0% 30%", "100% 60%", "0% 30%"] }
        }
        transition={
          prefersReducedMotion
            ? undefined
            : { duration: 12, ease: "linear", repeat: Infinity }
        }
        style={{
          position: "absolute",
          inset: 0,
          background: bgGradient,
          backgroundSize: "180% 180%",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: glowOverlay,
        }}
      />

      {!prefersReducedMotion &&
        particles.map((p, idx) => (
          <motion.span
            key={`particle-${idx}`}
            animate={{
              y: [-4, -16, -4],
              opacity: [0.18, 0.62, 0.18],
              scale: [0.9, 1.2, 0.9],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.9)",
              boxShadow: darkMode
                ? "0 0 12px rgba(255,255,255,0.75), 0 0 24px rgba(249,115,22,0.42)"
                : "0 0 12px rgba(255,255,255,0.85), 0 0 24px rgba(37,99,235,0.45)",
              willChange: "transform, opacity",
            }}
          />
        ))}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.95rem",
        }}
      >
        <motion.div
          initial={{ scale: 0.84, opacity: 0 }}
          animate={
            prefersReducedMotion
              ? { scale: 1, opacity: 1 }
              : {
                  scale: [0.84, 1.04, 1],
                  opacity: [0, 1, 1],
                  boxShadow: [
                    "0 0 0 rgba(251,191,36,0)",
                    "0 0 48px rgba(251,191,36,0.45)",
                    "0 0 22px rgba(37,99,235,0.45)",
                  ],
                }
          }
          transition={{
            delay: 0.12,
            duration: prefersReducedMotion ? 0.35 : 1.1,
            ease: EASE,
          }}
          style={{
            borderRadius: 18,
            padding: 4,
            background: darkMode
              ? "linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))"
              : "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.06))",
            backdropFilter: "blur(6px)",
          }}
        >
          <Box
            component="img"
            src={LOGO192_SRC}
            alt="iDashkan logo"
            fetchpriority="high"
            decoding="async"
            sx={{
              width: { xs: 88, sm: 96 },
              height: "auto",
              display: "block",
              borderRadius: "14px",
            }}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8, letterSpacing: "0.14em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.045em" }}
          transition={{ delay: 0.2, duration: 0.8, ease: EASE }}
          style={{
            margin: 0,
            fontSize: "clamp(2rem, 10vw, 2.65rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            textAlign: "center",
            fontFamily: '"Inter", "SF Pro Display", "Segoe UI", sans-serif',
            background:
              "linear-gradient(100deg, #FFFFFF 0%, #DBEAFE 35%, #FBBF24 80%, #FFFFFF 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            textShadow: "0 10px 30px rgba(15,23,42,0.25)",
          }}
        >
          iDashkan
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.96, y: 0 }}
          transition={{ delay: 0.34, duration: 0.7, ease: EASE }}
          style={{
            margin: 0,
            fontSize: "clamp(0.82rem, 3.2vw, 0.92rem)",
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.93)",
            fontWeight: 500,
            textTransform: "uppercase",
            fontFamily: '"Inter", "Segoe UI", sans-serif',
          }}
        >
          Discover Real Discounts
        </motion.p>

      </motion.div>
      <Box
        sx={{
          position: "absolute",
          zIndex: 3,
          left: 22,
          right: 22,
          bottom: { xs: 36, sm: 44 },
          height: 4,
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(255,255,255,0.22)",
          backdropFilter: "blur(4px)",
        }}
      >
        <motion.div
          initial={false}
          animate={{ scaleX: progress }}
          transition={{
            duration: prefersReducedMotion ? 0.18 : 0.28,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 999,
            transformOrigin: "left center",
            background:
              "linear-gradient(90deg, #2563EB 0%, #FFFFFF 45%, #F97316 100%)",
            boxShadow: "0 0 18px rgba(251,191,36,0.45)",
            willChange: "transform, opacity",
          }}
        />
      </Box>
    </motion.div>
  );
};

export default SplashScreen;
