import { ownerAnalyticsAPI } from "../services/api";

let sessionIdCache = null;

function getSessionId() {
  if (sessionIdCache) return sessionIdCache;
  try {
    sessionIdCache = sessionStorage.getItem("ownerAnalyticsSession");
    if (!sessionIdCache) {
      sessionIdCache = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem("ownerAnalyticsSession", sessionIdCache);
    }
  } catch {
    sessionIdCache = `sess_${Date.now()}`;
  }
  return sessionIdCache;
}

/**
 * @param {"store"|"brand"|"company"} entityType
 * @param {string} entityId
 */
export function trackOwnerProfileView(entityType, entityId) {
  if (!entityType || !entityId) return;
  ownerAnalyticsAPI
    .track({
      eventType: "profile_view",
      entityType,
      entityId,
      sessionId: getSessionId(),
    })
    .catch(() => {});
}

/**
 * @param {"store"|"brand"|"company"} entityType
 * @param {string} entityId
 * @param {string} channel — whatsapp | phone | website | facebook | instagram | tiktok | ...
 */
export function trackOwnerContactClick(entityType, entityId, channel) {
  if (!entityType || !entityId || !channel) return;
  ownerAnalyticsAPI
    .track({
      eventType: "contact_click",
      entityType,
      entityId,
      channel: String(channel).toLowerCase(),
      sessionId: getSessionId(),
    })
    .catch(() => {});
}
