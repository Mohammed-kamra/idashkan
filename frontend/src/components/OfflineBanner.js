import React from "react";
import { Alert, Chip, Stack, Typography } from "@mui/material";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import useOnlineStatus from "../hooks/useOnlineStatus";
import useOfflineQueue from "../hooks/useOfflineQueue";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const queue = useOfflineQueue();

  if (isOnline && queue.pending === 0) return null;

  return (
    <Alert
      severity={isOnline ? "info" : "warning"}
      variant="filled"
      icon={<WifiOffRoundedIcon />}
      sx={{
        borderRadius: 0,
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar + 2,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        {!isOnline ? (
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Offline Mode: Browsing cached data
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Back Online: Syncing pending actions
          </Typography>
        )}
        {queue.pending > 0 ? (
          <Chip
            size="small"
            color="default"
            label={`${queue.pending} pending sync`}
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "inherit" }}
          />
        ) : null}
      </Stack>
    </Alert>
  );
}
