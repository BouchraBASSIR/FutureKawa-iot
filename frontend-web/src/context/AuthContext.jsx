import React, { createContext, useContext, useState, useCallback } from "react";
import { authService } from "../services/auth.services";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [profile, setProfile] = useState(() => authService.getProfile());

  const login = useCallback(async (email, password) => {
    const result = await authService.login(email, password);
    if (result.success) {
      setProfile(result.profile);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setProfile(null);
  }, []);

  /**
   * Vérifie si l'utilisateur connecté possède au moins un des rôles passés.
   * hasRole("admin") ou hasRole("admin", "responsable_pays")
   */
  const hasRole = useCallback(
    (...roles) => roles.some((r) => profile?.roles?.includes(r)),
    [profile]
  );

  /**
   * Retourne les entrepôts accessibles pour un pays donné (selon le JWT).
   * Pour un admin, retourne [] (signifiant "accès total").
   */
  const getEntrepotsForPays = useCallback(
    (pays) => {
      if (hasRole("admin")) return null; // null = accès total
      const access = profile?.accesses?.find((a) => a.pays === pays);
      return access?.entrepots ?? [];
    },
    [profile, hasRole]
  );

  /**
   * Retourne le pays de l'utilisateur (premier accès défini).
   * null pour les admins (accès multi-pays).
   */
  const getUserPays = useCallback(() => {
    if (hasRole("admin")) return null;
    return profile?.accesses?.[0]?.pays ?? null;
  }, [profile, hasRole]);

  const isAuthenticated = !!profile && authService.isAuthenticated();

  return (
    <AuthContext.Provider
      value={{
        profile,
        login,
        logout,
        isAuthenticated,
        hasRole,
        getEntrepotsForPays,
        getUserPays,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
