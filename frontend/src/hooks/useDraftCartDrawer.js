import { useContext } from "react";
import { DraftCartDrawerContext } from "../context/DraftCartDrawerContext";

export function useDraftCartDrawer() {
  const ctx = useContext(DraftCartDrawerContext);
  if (!ctx) {
    throw new Error(
      "useDraftCartDrawer must be used within DraftCartDrawerProvider",
    );
  }
  return ctx;
}
