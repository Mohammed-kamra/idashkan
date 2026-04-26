import { isOwnerDashboardRole, isOwnerDataEntryRole } from "./roles";

function entityToPublicPath(entityType, entityId) {
  const t = String(entityType || "").toLowerCase();
  const id = String(entityId || "").trim();
  if (!id) return null;
  if (t === "store") return `/stores/${id}`;
  if (t === "brand") return `/brands/${id}`;
  if (t === "company") return `/companies/${id}`;
  return null;
}

/**
 * @param {object | null | undefined} user
 * @returns {{ entityType: string, entityId: string }[]}
 */
export function normalizeOwnerEntities(user) {
  if (!user || !isOwnerDashboardRole(user)) return [];
  if (Array.isArray(user.ownerEntities) && user.ownerEntities.length) {
    const out = [];
    const seen = new Set();
    for (const e of user.ownerEntities) {
      if (!e?.entityType || !e?.entityId) continue;
      const t = String(e.entityType).toLowerCase();
      if (!["store", "brand", "company"].includes(t)) continue;
      const id = String(e.entityId);
      const k = `${t}:${id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ entityType: t, entityId: id });
    }
    return out;
  }
  if (user.ownerEntityType && user.ownerEntityId) {
    return [
      {
        entityType: String(user.ownerEntityType),
        entityId: String(user.ownerEntityId),
      },
    ];
  }
  return [];
}

/**
 * All public profile routes for the logged-in owner (dashboard or scoped data entry).
 *
 * @param {object | null | undefined} user
 * @returns {{ entityType: string, entityId: string, path: string }[]}
 */
export function getOwnerPublicProfileChoices(user) {
  if (!user) return [];
  const entities = normalizeOwnerEntities(user);
  if (entities.length) {
    return entities
      .map((e) => {
        const entityType = String(e.entityType || "").toLowerCase();
        const entityId = String(e.entityId || "").trim();
        const path = entityToPublicPath(entityType, entityId);
        return path ? { entityType, entityId, path } : null;
      })
      .filter(Boolean);
  }
  if (!isOwnerDataEntryRole(user)) return [];
  if (
    user.ownerDataEntryAllStores ||
    user.ownerDataEntryAllBrands ||
    user.ownerDataEntryAllCompanies
  ) {
    return [];
  }
  const s = Array.isArray(user.ownerDataEntryStoreIds)
    ? user.ownerDataEntryStoreIds.filter(Boolean)
    : [];
  const b = Array.isArray(user.ownerDataEntryBrandIds)
    ? user.ownerDataEntryBrandIds.filter(Boolean)
    : [];
  const c = Array.isArray(user.ownerDataEntryCompanyIds)
    ? user.ownerDataEntryCompanyIds.filter(Boolean)
    : [];
  const out = [];
  for (const id of s) {
    const path = entityToPublicPath("store", id);
    if (path) out.push({ entityType: "store", entityId: String(id), path });
  }
  for (const id of b) {
    const path = entityToPublicPath("brand", id);
    if (path) out.push({ entityType: "brand", entityId: String(id), path });
  }
  for (const id of c) {
    const path = entityToPublicPath("company", id);
    if (path) out.push({ entityType: "company", entityId: String(id), path });
  }
  return out;
}

/**
 * Public app route when there is exactly one linked place; otherwise null (use picker).
 *
 * @param {object | null | undefined} user
 * @returns {string | null}
 */
export function getOwnerPublicProfilePath(user) {
  const choices = getOwnerPublicProfileChoices(user);
  return choices.length === 1 ? choices[0].path : null;
}

/** Nav target for "My profile": direct public page if exactly one place; else profile settings. */
export function getOwnerMyProfileNavPath(user) {
  const choices = getOwnerPublicProfileChoices(user);
  if (choices.length === 1) return choices[0].path;
  return "/profile";
}
