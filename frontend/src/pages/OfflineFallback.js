import React from "react";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import useOnlineStatus from "../hooks/useOnlineStatus";

export default function OfflineFallback() {
  const isOnline = useOnlineStatus();

  return (
    <Box sx={{ p: 3, textAlign: "center" }}>
      <Stack spacing={2} alignItems="center">
        <WifiOffRoundedIcon color="warning" sx={{ fontSize: 56 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {isOnline ? "Reconnecting..." : "You are offline"}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You can still browse previously loaded products, stores, banners, reels, jobs, and profile data.
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Stack>

      {/* Lightweight loading skeletons to avoid empty states while cache hydrates */}
      <Stack spacing={1.2} sx={{ mt: 4, maxWidth: 680, mx: "auto" }}>
        <Skeleton variant="rounded" height={100} />
        <Skeleton variant="rounded" height={100} />
        <Skeleton variant="rounded" height={100} />
      </Stack>
    </Box>
  );
}
