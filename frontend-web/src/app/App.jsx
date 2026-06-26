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
import { CountryProvider

 } from "../context/country";
const App = () => (
  <AuthProvider>
    <CountryProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/"           element={<Dashboard />} />
          <Route path="/lots"       element={<Lots />} />
          <Route path="/lots/:id"   element={<LotDetail />} />
          <Route path="/alerts"     element={<Alerts />} />
          <Route path="/storage"    element={<Storage />} />
          <Route path="/reports"    element={<Reports />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </CountryProvider>
  </AuthProvider>
);

export default App;
