import React, { memo } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  Button,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

const CartDrawer = memo(function CartDrawer({
  open,
  onClose,
  cartCount,
  cartSyncing,
  cartItems,
  locName,
  formatPrice,
  updateCartQty,
  clearCart,
  requestOrderWhatsApp,
  t,
  closeButtonRef,
  buttonRefOnExit,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      TransitionProps={{
        onEntered: () => {
          closeButtonRef?.current?.focus?.();
        },
        onExited: () => {
          buttonRefOnExit?.current?.focus?.();
        },
      }}
    >
      <Box display="flex" alignItems="center" gap={1} sx={{ pt: 3, pl: 3 }}>
        <ShoppingCartIcon color="primary" />
        <Typography variant="h6" component="span">
          {t("Cart")} ({cartCount})
        </Typography>
      </Box>
      <DialogContent sx={{ overflowX: "hidden" }}>
        {cartSyncing ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            {t("Loading...")}
          </Typography>
        ) : cartCount <= 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            {t("Cart is empty")}
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gap: 1.25, py: 1 }}>
            {Object.values(cartItems || {})
              .filter((i) => (Number(i?.qty) || 0) > 0 && i?.product?._id)
              .map((item) => (
                <Paper key={item.product._id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 1,
                      overflow: "hidden",
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                          whiteSpace: "normal",
                        }}
                      >
                        {locName(item.product)}
                      </Typography>
                      {typeof item.product.newPrice === "number" && (
                        <Typography variant="caption" color="text.secondary">
                          {formatPrice(item.product.newPrice)}
                        </Typography>
                      )}
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexShrink: 0,
                      }}
                    >
                      <IconButton
                        onClick={() =>
                          updateCartQty(
                            item.product._id,
                            (Number(item.qty) || 0) - 1,
                          )
                        }
                        size="small"
                      >
                        <RemoveIcon />
                      </IconButton>
                      <Typography
                        sx={{
                          fontWeight: 900,
                          minWidth: 22,
                          textAlign: "center",
                        }}
                      >
                        {Number(item.qty) || 0}
                      </Typography>
                      <IconButton
                        onClick={() =>
                          updateCartQty(
                            item.product._id,
                            (Number(item.qty) || 0) + 1,
                          )
                        }
                        size="small"
                      >
                        <AddIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={clearCart} disabled={cartCount <= 0}>
          {t("Clear")}
        </Button>
        <Button
          onClick={onClose}
          variant="outlined"
          autoFocus
          ref={closeButtonRef}
        >
          {t("Close")}
        </Button>
        <Button
          onClick={requestOrderWhatsApp}
          variant="contained"
          startIcon={<WhatsAppIcon />}
          disabled={cartCount <= 0}
        >
          {t("Order")}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default CartDrawer;

