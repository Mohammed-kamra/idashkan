import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, Typography, Avatar } from "@mui/material";
import { Link } from "react-router-dom";
import BusinessIcon from "@mui/icons-material/Business";
import HubIcon from "@mui/icons-material/Hub";
import SwipeIcon from "@mui/icons-material/Swipe";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { storeAPI } from "../services/api";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { useLocalizedContent } from "../hooks/useLocalizedContent";

/** Resolve branch.storeId from API (ObjectId string, $oid, or populated ref). */
function getBranchStoreId(branch) {
  const raw = branch?.storeId;
  if (raw == null || raw === "") return null;
  if (typeof raw === "object" && raw !== null) {
    if (raw.$oid) return String(raw.$oid);
    if (raw._id != null) {
      const id = raw._id;
      return typeof id === "object" && id?.$oid
        ? String(id.$oid)
        : String(id);
    }
    return null;
  }
  return String(raw);
}

/** Logo may exist on populated `branches[].storeId` even when catalog lookup misses. */
function getLogoHintFromBranch(branch) {
  const raw = branch?.storeId;
  if (!raw || typeof raw !== "object") return null;
  const logo = raw.logo;
  if (logo == null || String(logo).trim() === "") return null;
  return String(logo).trim();
}

/** Case- and whitespace-insensitive name match (same visible list as admin). */
function normalizeBranchNameKey(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const scrollTrackSx = (isDark) => ({
  overflowX: "auto",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",
  scrollBehavior: "smooth",
  display: "flex",
  gap: { xs: 1.25, sm: 1.5 },
  pb: 1,
  pt: 0.5,
  px: 0.5,
  scrollbarWidth: "thin",
  scrollbarColor: isDark
    ? "rgba(74,144,226,0.55) rgba(30,111,217,0.12)"
    : "#94b8ea #e8f0fe",
  "&::-webkit-scrollbar": {
    height: 10,
  },
  "&::-webkit-scrollbar-track": {
    borderRadius: 5,
    background: isDark ? "rgba(30,111,217,0.12)" : "#e8f0fe",
  },
  "&::-webkit-scrollbar-thumb": {
    borderRadius: 5,
    background: isDark
      ? "linear-gradient(90deg, rgba(74,144,226,0.85), rgba(30,111,217,0.65))"
      : "linear-gradient(90deg, #4A90E2, #1E6FD9)",
    border: "2px solid transparent",
    backgroundClip: "padding-box",
  },
});

/**
 * Horizontal scroll showcase of linked branch stores on a store profile (before tabs).
 * Resolves `store.branches[].name` against visible stores for logo + link.
 */
const StoreBranchesShowcase = ({ store }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { locName } = useLocalizedContent();
  const isDark = theme.palette.mode === "dark";
  const [catalog, setCatalog] = useState([]);
  const scrollRef = useRef(null);
  const [showScrollCue, setShowScrollCue] = useState(false);

  const rawBranches = store?.branches;
  const hasBranches =
    Array.isArray(rawBranches) &&
    rawBranches.some(
      (b) =>
        (typeof b?.name === "string" && b.name.trim()) || getBranchStoreId(b),
    );

  useEffect(() => {
    if (!hasBranches) return;
    let cancelled = false;
    (async () => {
      try {
        // Use GET /stores (not /visible): branch stores may have `show: false` and still
        // need logos; /visible only returns `show: true` and was hiding logos for those.
        const res = await storeAPI.getAll();
        const list = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled) setCatalog(list);
      } catch {
        if (!cancelled) setCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasBranches]);

  const rows = useMemo(() => {
    if (!hasBranches) return [];
    const byId = new Map();
    const byNameNorm = new Map();
    for (const s of catalog) {
      if (!s?._id) continue;
      const idStr = String(s._id);
      byId.set(idStr, s);
      const nk = normalizeBranchNameKey(s.name);
      if (nk && !byNameNorm.has(nk)) byNameNorm.set(nk, s);
    }
    const sid = store?._id ? String(store._id) : "";
    const out = [];
    for (const b of rawBranches) {
      const name = typeof b?.name === "string" ? b.name.trim() : "";
      const branchStoreId = getBranchStoreId(b);
      if (!name && !branchStoreId) continue;

      let match =
        branchStoreId != null ? byId.get(String(branchStoreId)) ?? null : null;
      if (!match && name) {
        match = byNameNorm.get(normalizeBranchNameKey(name)) ?? null;
      }
      if (match && String(match._id) === sid) continue;

      if (match && match.showingOnStoreBranchShowcase === false) continue;

      const logoHint = getLogoHintFromBranch(b);
      if (match && logoHint && !match.logo) {
        match = { ...match, logo: logoHint };
      }

      if (!match && branchStoreId) {
        match = {
          _id: branchStoreId,
          name: name || "",
          logo: logoHint || undefined,
        };
      }

      out.push({
        name,
        storeDoc: match,
      });
    }
    return out;
  }, [rawBranches, catalog, hasBranches, store?._id]);

  const updateScrollCue = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollCue(el.scrollWidth > el.clientWidth + 2);
  }, []);

  useLayoutEffect(() => {
    updateScrollCue();
  }, [rows, updateScrollCue]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateScrollCue());
    ro.observe(el);
    window.addEventListener("resize", updateScrollCue);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateScrollCue);
    };
  }, [updateScrollCue]);

  if (!hasBranches || rows.length === 0) return null;

  const cardMinWidth = { xs: 92, sm: 100, md: 108 };

  const renderCard = ({ name, storeDoc }, index) => {
    const logoRaw =
      storeDoc?.logo != null ? String(storeDoc.logo).trim() : "";
    const avatarSrc = logoRaw ? resolveMediaUrl(logoRaw) : undefined;

    const inner = (
      <>
        <Avatar
          src={avatarSrc}
          alt={name}
          className="branch-avatar"
          sx={{
            width: { xs: 64, sm: 72, md: 80 },
            height: { xs: 64, sm: 72, md: 80 },
            m: "0 auto 6px",
            bgcolor: isDark ? "rgba(30,111,217,0.15)" : "#eff6ff",
            border: isDark
              ? "2px solid rgba(30,111,217,0.3)"
              : "2px solid #bfdbfe",
            boxShadow: "0 2px 8px rgba(30,111,217,0.1)",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            borderRadius: "16px",
          }}
        >
          {!logoRaw && (
            <BusinessIcon
              sx={{
                fontSize: { xs: 28, sm: 32 },
                color: isDark ? "rgba(30,111,217,0.7)" : "#3b82f6",
              }}
            />
          )}
        </Avatar>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            fontWeight: 600,
            fontSize: "0.68rem",
            color: isDark ? "rgba(255,255,255,0.6)" : "#6b7280",
            whiteSpace: "normal",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            hyphens: "auto",
            px: 0.5,
            lineHeight: 1.35,
            maxWidth: 120,
            textAlign: "center",
          }}
        >
          {storeDoc ? locName(storeDoc) : name}
        </Typography>
      </>
    );

    if (storeDoc?._id) {
      return (
        <Box
          key={`branch-${index}-${String(storeDoc._id)}`}
          component={Link}
          to={`/stores/${storeDoc._id}`}
          sx={{
            flex: "0 0 auto",
            minWidth: cardMinWidth,
            maxWidth: 120,
            textAlign: "center",
            textDecoration: "none",
            outline: "none",
            color: "inherit",
            "&:hover .branch-avatar": {
              transform: "scale(1.1)",
              boxShadow: `0 0 16px ${theme.palette.primary.main}40`,
            },
          }}
        >
          {inner}
        </Box>
      );
    }

    return (
      <Box
        key={`branch-${index}-${name}`}
        sx={{
          flex: "0 0 auto",
          minWidth: cardMinWidth,
          maxWidth: 120,
          textAlign: "center",
          opacity: 0.85,
        }}
      >
        {inner}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        borderRadius: "20px",
        overflow: "hidden",
        background: isDark
          ? "linear-gradient(145deg, #0f1f3d 0%, #162035 100%)"
          : "linear-gradient(145deg, #f0f7ff 0%, #ffffff 100%)",
        border: isDark
          ? "1px solid rgba(30,111,217,0.25)"
          : "1px solid #dbeafe",
        boxShadow: isDark
          ? "0 4px 20px rgba(0,0,0,0.4)"
          : "0 4px 20px rgba(30,111,217,0.08)",
        mb: { xs: 2, sm: 2.5 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
          px: { xs: 2, sm: 2.5 },
          py: { xs: 1.2, sm: 1.4 },
          borderBottom: isDark
            ? "1px solid rgba(30,111,217,0.2)"
            : "1px solid #dbeafe",
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #1E6FD9 0%, #4A90E2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 3px 8px rgba(30,111,217,0.4)",
              flexShrink: 0,
            }}
          >
            <HubIcon sx={{ fontSize: 17, color: "white" }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "0.95rem", sm: "1.05rem" },
                color: isDark ? "rgba(255,255,255,0.95)" : "#111827",
                lineHeight: 1.2,
              }}
            >
              {t("Branches")}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isDark ? "rgba(255,255,255,0.55)" : "#6b7280",
                display: "block",
                lineHeight: 1,
                fontSize: "0.68rem",
              }}
            >
              {t("Linked store locations")}
            </Typography>
          </Box>
        </Box>

        {showScrollCue && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flexShrink: 0,
              py: 0.25,
              px: 1,
              borderRadius: 2,
              background: isDark
                ? "rgba(30,111,217,0.2)"
                : "rgba(30,111,217,0.08)",
              border: isDark
                ? "1px solid rgba(74,144,226,0.35)"
                : "1px solid rgba(30,111,217,0.2)",
            }}
            aria-live="polite"
          >
            <SwipeIcon
              sx={{
                fontSize: 17,
                color: isDark ? "#7ab3f0" : theme.palette.primary.main,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: { xs: "0.65rem", sm: "0.7rem" },
                fontWeight: 600,
                color: isDark ? "rgba(255,255,255,0.85)" : "#1e40af",
                whiteSpace: "nowrap",
              }}
            >
              {t("Scroll sideways")}
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ px: { xs: 1, sm: 1.5 }, py: { xs: 1.25, sm: 1.5 } }}>
        {/* {showScrollCue && (
          <Typography
            component="div"
            variant="caption"
            sx={{
              display: "block",
              mb: 0.75,
              px: 0.5,
              fontSize: "0.68rem",
              color: isDark ? "rgba(255,255,255,0.5)" : "#64748b",
            }}
          >
            {t("Drag the bar below or swipe the row to see all branches")}
          </Typography>
        )} */}
        <Box
          ref={scrollRef}
          onScroll={updateScrollCue}
          sx={scrollTrackSx(isDark)}
        >
          {rows.map((row, index) => renderCard(row, index))}
        </Box>
      </Box>
    </Box>
  );
};

export default StoreBranchesShowcase;
