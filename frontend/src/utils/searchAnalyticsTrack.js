import { searchAnalyticsAPI } from "../services/api";
import { getDeviceType, getSearchSessionId } from "./searchAnalyticsClient";

/**
 * @param {object} params
 * @param {string} params.searchText
 * @param {number} params.resultCount
 * @param {"mainpage"|"searchpage"} params.source
 * @param {object} [params.filters]
 * @returns {Promise<string|null>} log id or null on failure
 */
export async function logSearchEvent({
  searchText,
  resultCount,
  source,
  filters = {},
}) {
  const trimmed = (searchText || "").trim();
  if (trimmed.length < 2) return null;
  try {
    const res = await searchAnalyticsAPI.logSearch({
      searchText: trimmed,
      resultCount: Math.max(0, Number(resultCount) || 0),
      source,
      deviceType: getDeviceType(),
      sessionId: getSearchSessionId(),
      filters: {
        category: filters.category ?? null,
        city: filters.city ?? null,
        store: filters.store ?? null,
        sortBy: filters.sortBy ?? null,
        priceMin: filters.priceMin ?? null,
        priceMax: filters.priceMax ?? null,
      },
    });
    const id = res?.data?.data?.id || res?.data?.id;
    return id ? String(id) : null;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[search-analytics] logSearch failed", e?.message || e);
    }
    return null;
  }
}

/**
 * @param {string} logId
 * @param {string} clickedResultId
 * @param {"product"|"store"|"brand"|"company"|"category"|"categoryType"|"job"|"gift"} clickedResultType
 */
export async function recordSearchClick(logId, clickedResultId, clickedResultType) {
  if (!logId) return;
  try {
    await searchAnalyticsAPI.recordClick(logId, {
      clickedResultId:
        clickedResultId != null ? String(clickedResultId) : null,
      clickedResultType,
    });
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[search-analytics] recordClick failed", e?.message || e);
    }
  }
}
