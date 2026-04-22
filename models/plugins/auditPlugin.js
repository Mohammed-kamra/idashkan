const mongoose = require("mongoose");
const { getAuditUserId } = require("../../utils/auditContext");

/**
 * Adds optional audit user refs. Pair with `{ timestamps: true }` on the schema
 * (or equivalent) so documents also get `createdAt` / `updatedAt`.
 *
 * Fills createdBy / updatedBy from AsyncLocalStorage when set by auth middleware
 * (see utils/auditContext.js and server.js + middleware/auth.js).
 */
function auditPlugin(schema) {
  schema.add({
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  });

  schema.pre("save", function auditSave(next) {
    const uid = getAuditUserId();
    if (!uid) return next();
    try {
      if (this.isNew && (this.createdBy == null || this.createdBy === undefined)) {
        this.createdBy = uid;
      }
      this.updatedBy = uid;
    } catch (err) {
      return next(err);
    }
    next();
  });

  const queryOps = [
    "findOneAndUpdate",
    "findByIdAndUpdate",
    "updateOne",
    "updateMany",
    "replaceOne",
  ];

  schema.pre(queryOps, function auditQuery(next) {
    const uid = getAuditUserId();
    if (!uid) return next();
    const raw = this.getUpdate();
    if (raw != null && Array.isArray(raw)) {
      return next();
    }
    try {
      this.set({ updatedBy: uid });
    } catch (err) {
      return next(err);
    }
    next();
  });
}

module.exports = auditPlugin;
