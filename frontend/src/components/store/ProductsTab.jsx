import React, { memo } from "react";
import { Box } from "@mui/material";

const ProductsTab = memo(function ProductsTab({ children }) {
  return <Box>{children}</Box>;
});

export default ProductsTab;

