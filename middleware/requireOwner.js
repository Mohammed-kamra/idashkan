const mongoose = require("mongoose");
const { normalizeOwnerEntitiesList } = require("../utils/ownerEntities");
const { isOwnerDashboardRole } = require("../utils/roleHelpers");

/** Use after `protect`. Sets `req.ownerContext` from query or defaults to first linked entity. */
module.exports = function requireOwner(req, res, next) {
  try {
    const user = req.user;
    if (!user || !isOwnerDashboardRole(user)) {
      return res.status(403).json({
        success: false,
        message: "Owner role required",
      });
    }

    const entities = normalizeOwnerEntitiesList(user);
    if (!entities.length) {
      return res.status(403).json({
        success: false,
        message: "Link at least one store, brand, or company in your profile first",
      });
    }

    let qType = (req.query.entityType || req.query.ownerEntityType || "")
      .toString()
      .toLowerCase();
    let qId = req.query.entityId || req.query.ownerEntityId;

    if (!qType || !qId) {
      req.ownerContext = {
        entityType: entities[0].entityType,
        entityId: String(entities[0].entityId),
      };
      return next();
    }

    if (!["store", "brand", "company"].includes(qType)) {
      return res.status(400).json({ success: false, message: "Invalid entityType" });
    }
    if (!mongoose.Types.ObjectId.isValid(String(qId))) {
      return res.status(400).json({ success: false, message: "Invalid entity" });
    }

    const ok = entities.some(
      (e) =>
        e.entityType === qType && String(e.entityId) === String(qId),
    );
    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "You do not manage this business",
      });
    }

    req.ownerContext = {
      entityType: qType,
      entityId: String(qId),
    };
    next();
  } catch (e) {
    console.error("requireOwner:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
