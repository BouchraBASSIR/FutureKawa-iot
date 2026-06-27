import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import HeaderBar from "../Header/Header";
import "./AppLayout.scss";

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}
      <HeaderBar onMenuClick={() => setMobileOpen(true)} />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
