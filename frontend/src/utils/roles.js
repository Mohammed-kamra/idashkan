const OWNER_DASHBOARD_ROLES = ["owner", "owner_superadmin"];
const OWNER_DATAENTRY_ROLES = ["owner_dataentry", "owner_superadmin"];

export function isOwnerDashboardRole(user) {
  return !!user?.role && OWNER_DASHBOARD_ROLES.includes(user.role);
}

export function isOwnerDataEntryRole(user) {
  return !!user?.role && OWNER_DATAENTRY_ROLES.includes(user.role);
}
