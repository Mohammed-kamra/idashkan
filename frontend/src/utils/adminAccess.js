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
