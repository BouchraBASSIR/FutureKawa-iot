import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import Alerts from "../pages/Alerts/Alertes";
import Lots from "../pages/Lots/Lots";
import LotDetail from "../pages/Lots/LotDetail";
import Storage from "../pages/Storage/Storage";
import Reports from "../pages/Reports/Reports";
import AppLayout from "../components/layout/AppLayout/AppLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import { AuthProvider } from "../context/AuthContext";
import { CountryProvider } from "../context/country";

const Unauthorized = () => (
  <div style={{ padding: 40, textAlign: "center" }}>
    <h2>Accès refusé</h2>
    <p>Vous ne disposez pas des droits nécessaires pour accéder à cette page.</p>
    <a href="/">Retour au tableau de bord</a>
  </div>
);

const MANAGER_ROLES = ["admin", "responsable_pays"];

const App = () => (
  <AuthProvider>
    <CountryProvider>
      <Routes>
        <Route path="/login"        element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/"         element={<Dashboard />} />
          <Route path="/lots"     element={<Lots />} />
          <Route path="/lots/:id" element={<LotDetail />} />
          <Route path="/alerts"   element={<Alerts />} />
          <Route path="/storage"  element={
            <ProtectedRoute roles={MANAGER_ROLES}><Storage /></ProtectedRoute>
          } />
          <Route path="/reports"  element={
            <ProtectedRoute roles={MANAGER_ROLES}><Reports /></ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </CountryProvider>
  </AuthProvider>
);

export default App;
