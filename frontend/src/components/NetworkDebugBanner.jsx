import React, { useEffect, useState } from "react";
import { Alert, Box } from "@mui/material";

/**
 * Dev / QA: shows last classified failure (from axios interceptor).
 */
export default function NetworkDebugBanner() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const onDbg = (e) => {
      const d = e.detail || {};
      const kind = d.kind || d.variant || "generic";
      const status = d.status;
      const code = d.code;
      const bit = [kind, status, code, d.url].filter(Boolean).join(" · ");
      setMsg(
        typeof d.message === "string" && d.message
          ? String(d.message)
          : bit || JSON.stringify(d),
      );
    };
    window.addEventListener("app:network-debug", onDbg);
    return () => window.removeEventListener("app:network-debug", onDbg);
  }, []);

  useEffect(() => {
    if (!msg) return undefined;
    const t = window.setTimeout(() => setMsg(""), 5000);
    return () => window.clearTimeout(t);
  }, [msg]);

  if (!msg) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (t) => t.zIndex.tooltip + 2,
        p: 1,
        pointerEvents: "none",
      }}
    >
      <Alert severity="warning" variant="filled" sx={{ pointerEvents: "auto" }}>
        {msg}
      </Alert>
    </Box>
  );
}
