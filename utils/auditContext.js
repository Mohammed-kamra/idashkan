const { AsyncLocalStorage } = require("node:async_hooks");

const auditStorage = new AsyncLocalStorage();

/**
 * Express middleware: each request gets a mutable store so auth can set userId
 * for Mongoose audit hooks (createdBy / updatedBy).
 */
function runWithAuditContext(req, res, next) {
  auditStorage.run({ userId: null }, () => next());
}

function getAuditUserId() {
  const store = auditStorage.getStore();
  if (!store || !store.userId) return null;
  return store.userId;
}

/** Call after req.user / req.userId is set (protect, optionalAuth). */
function syncAuditUserFromRequest(req) {
  const store = auditStorage.getStore();
  if (!store) return;
  const id = req.userId || req.user?._id;
  store.userId = id ?? null;
}

module.exports = {
  runWithAuditContext,
  getAuditUserId,
  syncAuditUserFromRequest,
};
