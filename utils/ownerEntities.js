const mongoose = require("mongoose");
const Store = require("../models/Store");
const Brand = require("../models/Brand");
const Company = require("../models/Company");

const MAX_OWNER_ENTITIES = 40;

async function entityDocExists(entityType, entityId) {
  if (!entityId || !mongoose.Types.ObjectId.isValid(String(entityId))) return false;
  const id = String(entityId);
  if (entityType === "store") return !!(await Store.findById(id).select("_id").lean());
  if (entityType === "brand") return !!(await Brand.findById(id).select("_id").lean());
  if (entityType === "company") return !!(await Company.findById(id).select("_id").lean());
  return false;
}

/**
 * @param {import("mongoose").Document | object} user
 * @returns {{ entityType: string, entityId: string }[]}
 */
function normalizeOwnerEntitiesList(user) {
  if (!user) return [];
  const raw = user.ownerEntities;
  if (Array.isArray(raw) && raw.length) {
    const out = [];
    const seen = new Set();
    for (const e of raw) {
      if (!e || !e.entityType || !e.entityId) continue;
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
  const t = user.ownerEntityType;
  const id = user.ownerEntityId;
  if (t && id && ["store", "brand", "company"].includes(String(t))) {
    return [{ entityType: String(t), entityId: String(id) }];
  }
  return [];
}

/**
 * Validate body.ownerEntities for profile/admin updates.
 * @returns {Promise<{ ok: true, list: { entityType: string, entityId: mongoose.Types.ObjectId }[] } | { ok: false, message: string }>}
 */
async function validateAndNormalizeOwnerEntitiesInput(bodyEntities) {
  if (!Array.isArray(bodyEntities)) {
    return { ok: false, message: "ownerEntities must be an array" };
  }
  if (bodyEntities.length > MAX_OWNER_ENTITIES) {
    return { ok: false, message: `At most ${MAX_OWNER_ENTITIES} businesses allowed` };
  }
  const seen = new Set();
  const list = [];
  for (const e of bodyEntities) {
    if (!e || typeof e !== "object") continue;
    const entityType = String(e.entityType || "").toLowerCase();
    const entityId = e.entityId;
    if (!["store", "brand", "company"].includes(entityType)) {
      return { ok: false, message: "Invalid owner entity type" };
    }
    if (!entityId || !mongoose.Types.ObjectId.isValid(String(entityId))) {
      return { ok: false, message: "Invalid owner entity id" };
    }
    const k = `${entityType}:${String(entityId)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (!(await entityDocExists(entityType, entityId))) {
      return { ok: false, message: "Invalid owner entity" };
    }
    list.push({
      entityType,
      entityId: new mongoose.Types.ObjectId(String(entityId)),
    });
  }
  if (!list.length) {
    return { ok: false, message: "Owner must have at least one linked business" };
  }
  return { ok: true, list };
}

module.exports = {
  normalizeOwnerEntitiesList,
  validateAndNormalizeOwnerEntitiesInput,
  entityDocExists,
  MAX_OWNER_ENTITIES,
};
