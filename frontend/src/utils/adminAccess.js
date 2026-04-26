import { normalizeOwnerEntities } from "./ownerEntities";
import { isOwnerDashboardRole, isOwnerDataEntryRole } from "./roles";

/** Must match server `utils/roleAccess.js` admin emails. */
export const ADMIN_EMAILS = ["mshexani45@gmail.com", "admin@gmail.com"];

export const isAdminEmail = (user) =>
  !!user?.email && ADMIN_EMAILS.includes(String(user.email).toLowerCase());

/** Data Entry (/admin) — full admins by email or users with `support` role. */
export const canAccessDataEntry = (user) =>
  isAdminEmail(user) || user?.role === "support";

/** Notifications tab + composer in Data Entry — list admins or `support` role. */
export const canUseDataEntryNotifications = (user) =>
  isAdminEmail(user) || user?.role === "support";

export const normalizeUserRole = (user) => user?.role || "user";

/** Owner dashboard — owner or owner_superadmin with at least one linked entity. */
export const canAccessOwnerDashboard = (user) =>
  isOwnerDashboardRole(user) && normalizeOwnerEntities(user).length > 0;

/** True when user has data-entry role (including owner_superadmin) and at least one scope (all-* or specific ids). */
export function hasOwnerDataEntryScope(user) {
  if (!user || !isOwnerDataEntryRole(user)) return false;
  if (
    user.ownerDataEntryAllStores ||
    user.ownerDataEntryAllBrands ||
    user.ownerDataEntryAllCompanies
  ) {
    return true;
  }
  const s = user.ownerDataEntryStoreIds?.length || 0;
  const b = user.ownerDataEntryBrandIds?.length || 0;
  const c = user.ownerDataEntryCompanyIds?.length || 0;
  return s + b + c > 0;
}

export const canAccessOwnerDataEntryPage = (user) =>
  hasOwnerDataEntryScope(user);

/** Admin/support: can approve pending products (publish). Same rule as Data Entry access. */
export const canApprovePendingProducts = (user) => canAccessDataEntry(user);

/** Pending moderation page: Data Entry users or scoped Owner Data Entry (incl. superadmin). */
export const canAccessPendingPage = (user) =>
  canAccessDataEntry(user) || canAccessOwnerDataEntryPage(user);

/**
 * Desktop Owner nav — only owner-linked roles (`owner`, `owner_dataentry`,
 * `owner_superadmin`). Hidden for guests, normal users, admin/support data entry.
 */
export const canSeeOwnerNavSection = (user) => {
  if (!user) return false;
  if (isOwnerDashboardRole(user)) return true;
  if (isOwnerDataEntryRole(user)) return true;
  return false;
};
