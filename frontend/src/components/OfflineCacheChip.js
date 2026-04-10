import React from "react";
import { Chip } from "@mui/material";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";

export default function OfflineCacheChip({ sx }) {
  return (
    <Chip
      size="small"
      icon={<CloudDoneRoundedIcon sx={{ fontSize: "0.95rem !important" }} />}
      label="Results from cache"
      color="warning"
      variant="filled"
      sx={{
        fontWeight: 700,
        borderRadius: 999,
        ...sx,
      }}
    />
  );
}
