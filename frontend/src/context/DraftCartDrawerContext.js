import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { storeAPI } from "../services/api";
import {
  readDraftCartGroupsByStore,
  totalDraftCartQty,
} from "../utils/draftCarts";
import { useLocalizedContent } from "../hooks/useLocalizedContent";

export const DraftCartDrawerContext = createContext(null);

export function DraftCartDrawerProvider({ children }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locName } = useLocalizedContent();
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState([]);
  const [cartRefresh, setCartRefresh] = useState(0);

  const openDraftCart = useCallback(() => {
    setCartRefresh((k) => k + 1);
    setOpen(true);
  }, []);

  const closeDraftCart = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await storeAPI.getVisible({ hasDelivery: true });
        if (!cancelled) {
          setStores(Array.isArray(res?.data) ? res.data : []);
        }
      } catch {
        if (!cancelled) setStores([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, cartRefresh]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key?.startsWith("cart.store.")) setCartRefresh((k) => k + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const draftCartGroups = useMemo(
    () => readDraftCartGroupsByStore(stores),
    [stores, cartRefresh],
  );

  const draftCartTotalQty = useMemo(
    () => totalDraftCartQty(draftCartGroups),
    [draftCartGroups],
  );

  const value = useMemo(
    () => ({ openDraftCart, closeDraftCart, isOpen: open }),
    [openDraftCart, closeDraftCart, open],
  );

  return (
    <DraftCartDrawerContext.Provider value={value}>
      {children}
      <Drawer
        anchor="right"
        open={open}
        onClose={closeDraftCart}
        PaperProps={{
          sx: {
            background: isDark ? "#0f1927" : "#ffffff",
            borderLeft: isDark
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid #eef0f4",
          },
        }}
      >
        <Box
          sx={{
            width: { xs: "100vw", sm: 380 },
            maxWidth: "100%",
            p: 2.5,
            boxSizing: "border-box",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg,#f59e0b,#d97706)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 3px 8px rgba(245,158,11,0.4)",
                }}
              >
                <ShoppingCartIcon sx={{ fontSize: 18, color: "white" }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: isDark ? "rgba(255,255,255,0.95)" : "#111827",
                }}
              >
                {t("Draft cart")}
              </Typography>
              {draftCartTotalQty > 0 && (
                <Chip
                  label={`${draftCartTotalQty}`}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    bgcolor: "#f59e0b",
                    color: "white",
                    "& .MuiChip-label": { px: 0.8 },
                  }}
                />
              )}
            </Box>
            <IconButton
              edge="end"
              onClick={closeDraftCart}
              size="small"
              sx={{
                bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6",
                "&:hover": {
                  bgcolor: isDark ? "rgba(255,255,255,0.1)" : "#e9ecf0",
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {draftCartGroups.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <ShoppingCartIcon
                sx={{
                  fontSize: 56,
                  color: isDark ? "rgba(255,255,255,0.15)" : "#d1d5db",
                  mb: 1.5,
                }}
              />
              <Typography color="text.secondary" sx={{ fontSize: "0.9rem" }}>
                {t("No draft cart items")}
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  closeDraftCart();
                  navigate("/shopping");
                }}
                sx={{ mt: 2, borderRadius: 2, py: 1, fontWeight: 700 }}
              >
                {t("Go shopping")}
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
              {draftCartGroups.map((g) => (
                <Box
                  key={g.storeId}
                  onClick={() => {
                    navigate(`/stores/${g.storeId}?tab=discounts&cart=1`);
                    closeDraftCart();
                  }}
                  sx={{
                    borderRadius: "14px",
                    overflow: "hidden",
                    cursor: "pointer",
                    background: isDark
                      ? "linear-gradient(145deg,#1a2236,#1e2a40)"
                      : "#f9fafb",
                    border: isDark
                      ? "1px solid rgba(255,255,255,0.07)"
                      : "1px solid #eef0f4",
                    p: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      background: isDark
                        ? "linear-gradient(145deg,#1e2a40,#243050)"
                        : "#f0f2f5",
                      transform: "translateX(-2px)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.2,
                      minWidth: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        bgcolor: isDark
                          ? "rgba(245,158,11,0.15)"
                          : "rgba(245,158,11,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <StorefrontIcon sx={{ fontSize: 18, color: "#f59e0b" }} />
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: isDark ? "rgba(255,255,255,0.9)" : "#111827",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {locName(
                        stores.find((s) => String(s._id) === String(g.storeId)),
                      ) || g.storeName}
                    </Typography>
                  </Box>
                  <Chip
                    label={`×${g.totalQty}`}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      bgcolor: "#f59e0b",
                      color: "white",
                      flexShrink: 0,
                      "& .MuiChip-label": { px: 0.8 },
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Drawer>
    </DraftCartDrawerContext.Provider>
  );
}
