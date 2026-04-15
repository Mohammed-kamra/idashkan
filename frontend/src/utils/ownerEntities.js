/**
 * @param {object | null | undefined} user
 * @returns {{ entityType: string, entityId: string }[]}
 */
export function normalizeOwnerEntities(user) {
  if (!user || user.role !== "owner") return [];
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
