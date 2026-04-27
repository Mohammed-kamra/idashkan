import React, { memo } from "react";
import { Box, Button } from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { motion } from "framer-motion";

const FloatingCartButton = memo(function FloatingCartButton({
  visible,
  cartCount,
  cartPulseKey,
  onClick,
  buttonRef,
  label,
}) {
  if (!visible || cartCount <= 0) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: { xs: 76, md: 24 },
        left: 12,
        right: 12,
        zIndex: 1200,
        pointerEvents: "none",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <motion.div
          key={cartPulseKey}
          initial={{ scale: 1 }}
          animate={
            cartPulseKey > 0 ? { scale: [1, 1.14, 0.97, 1.06, 1] } : { scale: 1 }
          }
          transition={{ duration: 0.55, ease: [0.34, 1.3, 0.64, 1] }}
          style={{
            display: "inline-block",
            pointerEvents: "auto",
            borderRadius: 9999,
            overflow: "visible",
          }}
        >
          <Button
            variant="contained"
            startIcon={<ShoppingCartIcon />}
            ref={buttonRef}
            onClick={onClick}
            sx={{
              pointerEvents: "auto",
              borderRadius: 999,
              px: 2.25,
              py: 1,
              my: 1,
              fontWeight: 900,
            }}
          >
            {label} ({cartCount})
          </Button>
        </motion.div>
      </Box>
    </Box>
  );
});

export default FloatingCartButton;

