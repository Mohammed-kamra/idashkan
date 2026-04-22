import { normalizeOwnerEntities } from "./ownerEntities";

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

/** Owner dashboard — role must be owner and profile must link at least one entity. */
export const canAccessOwnerDashboard = (user) =>
  user?.role === "owner" && normalizeOwnerEntities(user).length > 0;

/** True when user has role owner_dataentry and at least one scope (all-* or specific ids). */
export function hasOwnerDataEntryScope(user) {
  if (!user || user.role !== "owner_dataentry") return false;
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
