import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Collapse, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTranslation } from "react-i18next";
import { APP_VERSION } from "../version";

function getVersionJsonUrl() {
  const base = process.env.PUBLIC_URL || "/";
  const path = base.endsWith("/") ? base : `${base}/`;
  return `${window.location.origin}${path}version.json`;
}

async function fetchRemoteVersion() {
  const url = `${getVersionJsonUrl()}?t=${Date.now()}`;
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!res.ok) return null;
  const data = await res.json();
  const v = data?.version;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

const DISMISS_SESSION_KEY = "appUpdateBannerDismissed";

/**
 * Shows when the live version.json differs from the embedded bundle version.
 */
export default function AppUpdateBanner() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });

  const check = useCallback(async () => {
    if (dismissed) return;
    try {
      const remote = await fetchRemoteVersion();
      if (!remote) return;
      if (remote !== APP_VERSION) {
        setOpen(true);
      }
    } catch {
      /* offline or CORS — ignore */
    }
  }, [dismissed]);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(() => void check(), 5 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, [check]);

  const reload = () => {
    window.location.reload();
  };

  return (
    <Collapse in={open} appear={false}>
      <Alert
        severity="info"
        variant="filled"
        icon={<RefreshIcon />}
        action={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              sx={{ borderColor: "rgba(255,255,255,0.6)", fontWeight: 700 }}
              onClick={reload}
            >
              {t("appUpdateReload")}
            </Button>
            <IconButton
              aria-label={t("Close")}
              color="inherit"
              size="small"
              onClick={() => {
                try {
                  sessionStorage.setItem(DISMISS_SESSION_KEY, "1");
                } catch {
                  /* ignore */
                }
                setOpen(false);
                setDismissed(true);
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        sx={{
          borderRadius: 0,
          fontWeight: 600,
          py: 0.75,
          px: 1.5,
          position: "sticky",
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar + 2,
        }}
      >
        {t("appUpdateAvailable", { current: APP_VERSION })}
      </Alert>
    </Collapse>
  );
}
