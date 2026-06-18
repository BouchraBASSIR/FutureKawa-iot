import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import HeaderBar from "../Header/Header";
import "./AppLayout.scss";

const AppLayout = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <HeaderBar />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
