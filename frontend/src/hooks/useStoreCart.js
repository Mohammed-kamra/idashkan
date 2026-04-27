import { useMemo } from "react";

export default function useStoreCart(cartItems = {}) {
  const cartCount = useMemo(
    () =>
      Object.values(cartItems || {}).reduce(
        (sum, item) => sum + (Number(item?.qty) || 0),
        0,
      ),
    [cartItems],
  );

  return { cartCount };
}

