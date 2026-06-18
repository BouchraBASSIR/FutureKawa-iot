import React, { createContext, useContext, useState } from "react";
import { authService } from "../services/auth.services";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [profile, setProfile] = useState(() => authService.getProfile());

  const login = (email, password) => {
    const result = authService.login(email, password);
    if (result.success) {
      setProfile(result.profile);
    }
    return result.success;
  };

  const logout = () => {
    authService.logout();
    setProfile(null);
  };

  const updateProfile = (data) => {
    const updated = authService.updateProfile(data);
    setProfile(updated);
  };

  return (
    <AuthContext.Provider value={{ profile, login, logout, updateProfile, isAuthenticated: !!profile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
