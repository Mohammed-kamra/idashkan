import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Typography,
  useTheme,
  Skeleton,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { useNavigate } from "react-router-dom";
import { storeAPI, storeTypeAPI } from "../services/api";
import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "../utils/mediaUrl";
import {
  readDraftCartGroupsByStore,
  totalDraftCartQty,
} from "../utils/draftCarts";
import { ShoppingBag as ShoppingBagIcon } from "@mui/icons-material";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { useCityFilter } from "../context/CityFilterContext";
import { storeMatchesSelectedCity } from "../utils/cityMatch";
import { useDraftCartDrawer } from "../hooks/useDraftCartDrawer";

const getStoreTypeId = (store) =>
  String(store?.storeTypeId?._id ?? store?.storeTypeId ?? "");

const ShoppingPage = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { locName } = useLocalizedContent();
  const navigate = useNavigate();
  const { openDraftCart } = useDraftCartDrawer();
  const { selectedCity } = useCityFilter();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeTypes, setStoreTypes] = useState([]);
  const [selectedStoreTypeId, setSelectedStoreTypeId] = useState("all");
  const [cartRefresh, setCartRefresh] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const [storesRes, typesRes] = await Promise.all([
          storeAPI.getVisible({ hasDelivery: true }),
          storeTypeAPI.getAll(),
        ]);
        setStores(Array.isArray(storesRes?.data) ? storesRes.data : []);
        setStoreTypes(Array.isArray(typesRes?.data) ? typesRes.data : []);
      } catch (e) {
        setStores([]);
        setStoreTypes([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const deliveryStores = useMemo(
    () => (stores || []).filter((s) => s?.isHasDelivery === true),
    [stores],
  );

  const cityDeliveryStores = useMemo(
    () =>
      deliveryStores.filter((s) => storeMatchesSelectedCity(s, selectedCity)),
    [deliveryStores, selectedCity],
  );

  /** Only chips for store types that actually have a delivery store in the selected city. */
  const visibleStoreTypes = useMemo(() => {
    const idsInUse = new Set(
      cityDeliveryStores.map((s) => getStoreTypeId(s)).filter(Boolean),
    );
    return (storeTypes || []).filter((st) => idsInUse.has(String(st._id)));
  }, [storeTypes, cityDeliveryStores]);

  const filteredStores = useMemo(() => {
    if (selectedStoreTypeId === "all") return cityDeliveryStores;
    return cityDeliveryStores.filter(
      (s) => getStoreTypeId(s) === String(selectedStoreTypeId),
    );
  }, [cityDeliveryStores, selectedStoreTypeId]);

  useEffect(() => {
    if (selectedStoreTypeId === "all") return;
    const ok = visibleStoreTypes.some(
      (st) => String(st._id) === String(selectedStoreTypeId),
    );
    if (!ok) setSelectedStoreTypeId("all");
  }, [visibleStoreTypes, selectedStoreTypeId]);

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

  const isDark = theme.palette.mode === "dark";

  if (loading) {
    return (
      <Box
        sx={{
          py: { xs: 9, md: 8 },
          px: { xs: 1, sm: 1.5, md: 3 },
          pb: { xs: 12, sm: 4 },
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Header skeleton */}
        <Skeleton
          variant="rounded"
          sx={{ width: "100%", height: 80, borderRadius: "20px", mb: 2 }}
        />
        {/* Chips skeleton — scroll row */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 2.5,
            overflowX: "auto",
            overflowY: "hidden",
            pb: 0.5,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {[60, 90, 80, 100, 70].map((w, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={w}
              height={34}
              sx={{ borderRadius: "999px", flexShrink: 0 }}
            />
          ))}
        </Box>
        {/* Store grid skeleton — full-width two columns like loaded state */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(2, minmax(0, 1fr))",
            },
            gap: 1.5,
            width: "100%",
          }}
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <Box key={idx} sx={{ minWidth: 0, width: "100%" }}>
              <Skeleton
                variant="rounded"
                sx={{
                  width: "100%",
                  height: 130,
                  borderRadius: "16px 16px 0 0",
                }}
              />
              <Skeleton
                variant="rounded"
                sx={{
                  width: "100%",
                  height: 70,
                  borderRadius: "0 0 16px 16px",
                  mt: "1px",
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        py: { xs: 9, md: 8 },
        px: { xs: 1, sm: 1.5, md: 3 },
        pb: { xs: 12, sm: 4 },
      }}
    >
      {/* ── Hero header ────────────────────────────────────────── */}
      <Box
        sx={{
          mb: 2,
          borderRadius: "20px",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.45)"
            : "0 8px 28px rgba(245,158,11,0.32)",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-30%",
            right: "-5%",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
            pointerEvents: "none",
          },
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: { xs: 1.8, sm: 2 },
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "14px",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShoppingBagIcon sx={{ fontSize: 22, color: "white" }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1.05rem", sm: "1.2rem" },
                color: "white",
                textShadow: "0 1px 3px rgba(0,0,0,0.2)",
                lineHeight: 1.2,
              }}
            >
              {t("Shopping")}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.8)",
                fontSize: "0.75rem",
                display: "block",
              }}
            >
              {filteredStores.length} {t("delivery stores")}
            </Typography>
          </Box>

          <Badge
            badgeContent={draftCartTotalQty > 0 ? draftCartTotalQty : 0}
            color="error"
            invisible={draftCartTotalQty <= 0}
            sx={{
              flexShrink: 0,
              "& .MuiBadge-badge": { fontWeight: 800, fontSize: "0.7rem" },
            }}
          >
            <Button
              size="small"
              onClick={() => {
                setCartRefresh((k) => k + 1);
                openDraftCart();
              }}
              startIcon={
                <ShoppingCartIcon sx={{ fontSize: "1rem !important" }} />
              }
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: "999px",
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.3)",
                px: 1.5,
                py: 0.6,
                backdropFilter: "blur(8px)",
                fontSize: "0.8rem",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            >
              {t("Draft cart")}
            </Button>
          </Badge>
        </Box>
      </Box>

      {/* ── Store type filter chips ─────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          gap: 0.8,
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          pb: 0.5,
          mb: 2.5,
          alignItems: "center",
        }}
      >
        <Chip
          clickable
          onClick={() => setSelectedStoreTypeId("all")}
          label={t("All")}
          sx={{
            height: 34,
            fontSize: "0.8rem",
            fontWeight: selectedStoreTypeId === "all" ? 700 : 500,
            flexShrink: 0,
            ...(selectedStoreTypeId === "all"
              ? {
                  background: "linear-gradient(135deg,#f59e0b,#d97706)",
                  color: "white",
                  border: "none",
                  boxShadow: "0 3px 8px rgba(245,158,11,0.4)",
                }
              : {
                  background: isDark ? "rgba(255,255,255,0.07)" : "#f3f4f6",
                  color: isDark ? "rgba(255,255,255,0.7)" : "#374151",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid #e5e7eb",
                  "&:hover": {
                    background: isDark ? "rgba(255,255,255,0.12)" : "#e9ecf0",
                  },
                }),
          }}
        />
        {visibleStoreTypes.map((st) => {
          const isActive = String(selectedStoreTypeId) === String(st._id);
          return (
            <Chip
              key={st._id}
              clickable
              onClick={() => setSelectedStoreTypeId(String(st._id))}
              icon={
                st.icon ? (
                  <Box
                    component="span"
                    sx={{ fontSize: "0.9rem", ml: "4px !important" }}
                  >
                    {st.icon}
                  </Box>
                ) : undefined
              }
              label={locName(st) || t(st.name)}
              sx={{
                height: 34,
                fontSize: "0.8rem",
                fontWeight: isActive ? 700 : 500,
                flexShrink: 0,
                ...(isActive
                  ? {
                      background: "linear-gradient(135deg,#f59e0b,#d97706)",
                      color: "white",
                      border: "none",
                      boxShadow: "0 3px 8px rgba(245,158,11,0.4)",
                    }
                  : {
                      background: isDark ? "rgba(255,255,255,0.07)" : "#f3f4f6",
                      color: isDark ? "rgba(255,255,255,0.7)" : "#374151",
                      border: isDark
                        ? "1px solid rgba(255,255,255,0.1)"
                        : "1px solid #e5e7eb",
                      "&:hover": {
                        background: isDark
                          ? "rgba(255,255,255,0.12)"
                          : "#e9ecf0",
                      },
                    }),
              }}
            />
          );
        })}
      </Box>

      {/* ── Store grid ─────────────────────────────────────────── */}
      {filteredStores.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <LocalShippingIcon
            sx={{
              fontSize: 64,
              color: isDark ? "rgba(255,255,255,0.15)" : "#d1d5db",
              mb: 2,
            }}
          />
          <Typography color="text.secondary" sx={{ fontSize: "0.95rem" }}>
            {t("No delivery stores available")}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(4, 1fr)",
              lg: "repeat(5, 1fr)",
            },
            gap: { xs: 1.2, sm: 1.5, md: 2 },
          }}
        >
          {filteredStores.map((store) => (
            <Card
              key={store._id}
              onClick={() => navigate(`/stores/${store._id}?tab=discounts`)}
              sx={{
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                borderRadius: "16px",
                overflow: "hidden",
                background: isDark
                  ? "linear-gradient(145deg,#1e2a3a,#243040)"
                  : "#ffffff",
                border: isDark
                  ? "1px solid rgba(255,255,255,0.07)"
                  : "1px solid #eef0f4",
                boxShadow: isDark
                  ? "0 4px 16px rgba(0,0,0,0.3)"
                  : "0 2px 12px rgba(0,0,0,0.05)",
                transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: isDark
                    ? "0 8px 28px rgba(0,0,0,0.45)"
                    : "0 8px 24px rgba(245,158,11,0.16)",
                  borderColor: isDark ? "rgba(245,158,11,0.3)" : "#fde68a",
                },
                "&:active": { transform: "translateY(0)" },
              }}
            >
              {/* Logo area */}
              <Box
                sx={{
                  position: "relative",
                  height: { xs: 115, sm: 130, md: 145 },
                  flexShrink: 0,
                  background: isDark ? "rgba(255,255,255,0.04)" : "#f9fafb",
                  overflow: "hidden",
                }}
              >
                {store.logo ? (
                  <CardMedia
                    component="img"
                    image={resolveMediaUrl(store.logo)}
                    alt={locName(store)}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      transition: "transform 0.35s ease",
                      ".MuiCard-root:hover &": { transform: "scale(1.05)" },
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <StorefrontIcon
                      sx={{
                        fontSize: { xs: 40, sm: 48 },
                        color: isDark ? "rgba(255,255,255,0.18)" : "#d1d5db",
                      }}
                    />
                  </Box>
                )}

                {/* Delivery badge */}
                <Chip
                  icon={
                    <LocalShippingIcon
                      sx={{
                        fontSize: "0.75rem !important",
                        color: "white !important",
                      }}
                    />
                  }
                  label={t("Delivery")}
                  size="small"
                  sx={{
                    position: "absolute",
                    bottom: 7,
                    left: 7,
                    height: 22,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    bgcolor: "rgba(239,68,68,0.85)",
                    color: "white",
                    border: "none",
                    backdropFilter: "blur(4px)",
                    "& .MuiChip-label": { px: 0.6 },
                  }}
                />

                {/* VIP badge */}
                {store.isVip && (
                  <Chip
                    label="VIP"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 7,
                      right: 7,
                      height: 20,
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      bgcolor: "#f59e0b",
                      color: "white",
                      border: "none",
                      boxShadow: "0 2px 6px rgba(245,158,11,0.5)",
                      "& .MuiChip-label": { px: 0.6 },
                    }}
                  />
                )}
              </Box>

              {/* Info */}
              <CardContent
                sx={{
                  p: "10px 10px 12px !important",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.4,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: "0.82rem", sm: "0.88rem" },
                    color: isDark ? "rgba(255,255,255,0.92)" : "#111827",
                    textAlign: "center",
                    lineHeight: 1.3,
                    minHeight: "2.6em",
                  }}
                >
                  {locName(store)}
                </Typography>
                {store.storeTypeId?.name && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af",
                      fontSize: "0.7rem",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      textAlign: "center",
                    }}
                  >
                    {locName(store.storeTypeId) || t(store.storeTypeId.name)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ShoppingPage;
