import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessOwnerDashboard } from "../utils/adminAccess";

/**
 * @param {string[] | null} allowedEmails - If set, user email must be in list OR (if allowSupportRole) role === support.
 * @param {boolean} allowSupportRole - When true with allowedEmails, users with role `support` may access (Data Entry).
 */
const ProtectedRoute = ({
  children,
  allowedEmails = null,
  allowSupportRole = false,
}) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedEmails && allowedEmails.length > 0) {
    const emailAllowed =
      user.email && allowedEmails.includes(user.email);
    const supportAllowed = allowSupportRole && user.role === "support";
    if (emailAllowed || supportAllowed) {
      return children;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

/** Only full admin emails (not support role). */
export const ProtectedAdminOnlyRoute = ({ children, allowedEmails }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedEmails?.length && !allowedEmails.includes(user.email)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/** Logged-in owner with at least one linked store / brand / company. */
export const ProtectedOwnerRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!canAccessOwnerDashboard(user)) {
    return <Navigate to="/profile" replace />;
  }

  return children;
};

export default ProtectedRoute;
