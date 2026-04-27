import { useCallback } from "react";
import {
  trackOwnerContactClick,
  trackOwnerOrderRequest,
  trackOwnerProfileView,
} from "../utils/ownerAnalyticsTrack";

export default function useStoreAnalytics() {
  const trackProfileView = useCallback((entityId) => {
    if (!entityId) return;
    trackOwnerProfileView("store", entityId);
  }, []);

  const trackContactClick = useCallback((entityId, platform) => {
    if (!entityId || !platform) return;
    trackOwnerContactClick("store", entityId, platform);
  }, []);

  const trackOrderRequest = useCallback((entityId, channel = "whatsapp") => {
    if (!entityId) return;
    trackOwnerOrderRequest("store", entityId, channel);
  }, []);

  return { trackProfileView, trackContactClick, trackOrderRequest };
}

