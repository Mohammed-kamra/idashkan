import React from "react";
import { Modal, Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * Full-screen lightbox for product (or any) images. Close: X, backdrop click, or Escape (Modal default).
 */
function FullScreenImageModal({ open, onClose, imageUrl, alt = "" }) {
  if (!imageUrl) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(0,0,0,0.92)",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          outline: "none",
        }}
        onClick={onClose}
      >
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          sx={{
            position: "fixed",
            top: 8,
            right: 8,
            color: "common.white",
            bgcolor: "rgba(0,0,0,0.45)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
            zIndex: 1,
          }}
          aria-label="close"
          size="large"
        >
          <CloseIcon />
        </IconButton>
        <Box
          component="img"
          src={imageUrl}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          sx={{
            maxWidth: "100vw",
            maxHeight: "100vh",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            p: { xs: 1, sm: 2 },
          }}
        />
      </Box>
    </Modal>
  );
}

export default FullScreenImageModal;
