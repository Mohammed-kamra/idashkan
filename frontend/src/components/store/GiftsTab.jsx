import React, { memo } from "react";
import { Box } from "@mui/material";

const GiftsTab = memo(function GiftsTab({ gifts = [], renderGiftCard }) {
  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr" },
          gap: 3,
          width: "100%",
        }}
      >
        {gifts.map((gift) => (
          <Box key={gift._id} sx={{ display: "flex" }}>
            {renderGiftCard(gift)}
          </Box>
        ))}
      </Box>
    </Box>
  );
});

export default GiftsTab;

