const { isOwnerDataEntryRole } = require("./roleHelpers");
const { hasOwnerDataEntryScope } = require("./ownerDataEntryScope");

const ADMIN_EMAILS = ["mshexani45@gmail.com", "admin@gmail.com"];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/** Full admin / support: can list all pending and publish products. */
function canApprovePendingProducts(user) {
  if (!user) return false;
  if (ADMIN_EMAILS.includes(normalizeEmail(user.email))) return true;
  if (user.role === "support") return true;
  return false;
}

/** Admin, support, or owner data entry / superadmin with configured scope. */
function canListPendingProducts(user) {
  if (!user) return false;
  if (canApprovePendingProducts(user)) return true;
  return isOwnerDataEntryRole(user) && hasOwnerDataEntryScope(user);
}

module.exports = {
  ADMIN_EMAILS,
  canApprovePendingProducts,
  canListPendingProducts,
};
