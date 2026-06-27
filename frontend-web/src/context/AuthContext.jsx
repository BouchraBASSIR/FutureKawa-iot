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
      if (hasRole("admin", "responsable_pays")) return null; // null = accès total
      const access = profile?.accesses?.find((a) => a.pays === pays);
      return access?.entrepots ?? [];
    },
    [profile, hasRole]
  );

  /**
   * Retourne l'ensemble des pays autorisés pour l'utilisateur.
   * null pour les admins (pas de restriction).
   */
  const getAllowedPays = useCallback(() => {
    if (hasRole("admin")) return null;
    const pays = [...new Set((profile?.accesses ?? []).map(a => a.pays))];
    return pays.length ? pays : null;
  }, [profile, hasRole]);

  /**
   * Retourne le pays unique si l'utilisateur n'en a qu'un seul, null sinon.
   * null = admin OU responsable multi-pays (le sélecteur pays doit apparaître).
   */
  const getUserPays = useCallback(() => {
    if (hasRole("admin")) return null;
    const pays = [...new Set((profile?.accesses ?? []).map(a => a.pays))];
    return pays.length === 1 ? pays[0] : null;
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
        getAllowedPays,
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
