/** Admin accounts (full access) — identified by email. */
const ADMIN_EMAILS = ["mshexani45@gmail.com", "admin@gmail.com"];

const isAdminEmailUser = (user) =>
  !!user?.email && ADMIN_EMAILS.includes(String(user.email).toLowerCase());

/** Support staff: DB role only; cannot access user management / site config APIs. */
const isSupportUser = (user) => user?.role === "support";

/** Data Entry + job CRUD (same as previous "admin-only" job routes, extended for support). */
const canAccessDataEntryApis = (user) =>
  isAdminEmailUser(user) || isSupportUser(user);

module.exports = {
  ADMIN_EMAILS,
  isAdminEmailUser,
  isSupportUser,
  canAccessDataEntryApis,
};
