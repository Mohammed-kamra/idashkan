const OWNER_DASHBOARD_ROLES = new Set(["owner", "owner_superadmin"]);
const OWNER_DATAENTRY_ROLES = new Set(["owner_dataentry", "owner_superadmin"]);

function roleOf(userOrRole) {
  if (userOrRole == null) return null;
  if (typeof userOrRole === "string") return userOrRole;
  return userOrRole.role ?? null;
}

function isOwnerDashboardRole(userOrRole) {
  const r = roleOf(userOrRole);
  return r != null && OWNER_DASHBOARD_ROLES.has(r);
}

function isOwnerDataEntryRole(userOrRole) {
  const r = roleOf(userOrRole);
  return r != null && OWNER_DATAENTRY_ROLES.has(r);
}

/** Restricted data-entry account only — cannot update/delete products via admin APIs. */
function isOwnerDataEntryOnlyRole(userOrRole) {
  return roleOf(userOrRole) === "owner_dataentry";
}

module.exports = {
  isOwnerDashboardRole,
  isOwnerDataEntryRole,
  isOwnerDataEntryOnlyRole,
};
