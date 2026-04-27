import React, { memo } from "react";
import { Box, Card, Typography } from "@mui/material";
import { resolveMediaUrl } from "../../utils/mediaUrl";

const ReelsTab = memo(function ReelsTab({ reels = [], theme, onOpenReel }) {
  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
          width: "100%",
        }}
      >
        {reels.map((reel) => {
          const src = resolveMediaUrl(reel?.videoUrl || "");
          return (
            <Card
              key={reel._id}
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                cursor: "pointer",
                border: `1px solid ${theme.palette.divider}`,
                "&:hover": { boxShadow: 6 },
              }}
              onClick={() => onOpenReel(reel)}
            >
              <Box sx={{ position: "relative", backgroundColor: "black" }}>
                <video
                  src={src}
                  muted
                  playsInline
                  preload="metadata"
                  style={{
                    width: "100%",
                    height: 220,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                {reel?.title ? (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      p: 1,
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))",
                    }}
                  >
                    <Typography sx={{ color: "white", fontWeight: 700 }} noWrap>
                      {reel.title}
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
});

export default ReelsTab;

