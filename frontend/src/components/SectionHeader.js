import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

const SectionHeader = ({ title, subtitle, seeAllTo, icon: Icon, action }) => {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mb: 1.5,
        px: 0.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {Icon && (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "10px",
              background:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.1)"
                  : "linear-gradient(135deg, var(--color-primary, #1E6FD9), var(--brand-primary-blue, #4A90E2))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 18, color: "white" }} />
          </Box>
        )}
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1rem", sm: "1.1rem" },
              color: "text.primary",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                lineHeight: 1.3,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {seeAllTo && (
        <Button
          component={Link}
          to={seeAllTo}
          size="small"
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.8rem",
            color: "var(--color-primary, #1E6FD9)",
            minWidth: 0,
            px: 1,
            py: 0.5,
            borderRadius: 2,
            "&:hover": {
              background:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(30,111,217,0.06)",
            },
          }}
        >
          {action}
        </Button>
      )}
    </Box>
  );
};

export default SectionHeader;
