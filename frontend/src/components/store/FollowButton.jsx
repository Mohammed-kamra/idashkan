import React, { memo } from "react";
import { Button } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonAddDisabledIcon from "@mui/icons-material/PersonAddDisabled";

const FollowButton = memo(function FollowButton({
  isFollowed,
  loading,
  onClick,
  t,
}) {
  return (
    <Button
      size="small"
      disabled={loading}
      onClick={onClick}
      startIcon={
        isFollowed ? (
          <PersonAddDisabledIcon sx={{ fontSize: "0.9rem !important" }} />
        ) : (
          <PersonAddIcon sx={{ fontSize: "0.9rem !important" }} />
        )
      }
      sx={{
        textTransform: "none",
        fontWeight: 700,
        borderRadius: "999px",
        px: 1.5,
        py: 0.4,
        fontSize: "0.8rem",
        lineHeight: 1.5,
        ...(isFollowed
          ? {
              bgcolor: "rgba(239,68,68,0.8)",
              color: "white",
              "&:hover": { bgcolor: "rgba(239,68,68,1)" },
            }
          : {
              bgcolor: "rgba(34,197,94,0.85)",
              color: "white",
              "&:hover": { bgcolor: "rgba(34,197,94,1)" },
            }),
      }}
    >
      {isFollowed ? t("Unfollow") : t("Follow")}
    </Button>
  );
});

export default FollowButton;

