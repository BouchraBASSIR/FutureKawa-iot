import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Protège une route.
 * - Sans prop `roles` : accessible à tout utilisateur connecté.
 * - Avec `roles={["admin"]}` : redirige vers /unauthorized si le rôle manque.
 */
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !hasRole(...roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
