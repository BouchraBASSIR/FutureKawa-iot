import React from "react";
import { Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";

import SidebarLogo from "../SidebarLogo/SidebarLogo";
import { useAuth } from "../../../context/AuthContext";

import logoutIcon from "../../../styles/icons/deconnexion.svg";
import homeIcon    from "../../../styles/icons/home.svg";
import lotsIcon    from "../../../styles/icons/box_add.svg";
import warningIcon from "../../../styles/icons/warning.svg";
import "./Sidebar.scss";

const MenuIcon = ({ src, alt }) => (
  <img src={src} alt={alt} className="menu-icon" />
);

const ROUTE_MAP = {
  "/":          "dashboard",
  "/lots":      "lots",
  "/alerts":    "alerts",
  "/storage":   "storage",
  "/countries": "countries",
  "/reports":   "reports",
};

const Sidebar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { logout } = useAuth();

  const path = location.pathname.startsWith("/lots/") ? "/lots" : location.pathname;
  const selectedKey = ROUTE_MAP[path] ?? "dashboard";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <SidebarLogo />
      <div className="sidebar-divider" />

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={[
          {
            key: "dashboard",
            icon: <MenuIcon src={homeIcon} alt="accueil" />,
            label: "Dashboard",
            onClick: () => navigate("/"),
          },
          {
            key: "lots",
            icon: <MenuIcon src={lotsIcon} alt="lots" />,
            label: "Lots",
            onClick: () => navigate("/lots"),
          },
          {
            key: "alerts",
            icon: <MenuIcon src={warningIcon} alt="alertes" />,
            label: "Alertes",
            onClick: () => navigate("/alerts"),
          },
          { type: "divider" },
          {
            key: "storage",
            icon: <span className="menu-icon-text">🏭</span>,
            label: "Entrepôts",
            onClick: () => navigate("/storage"),
          },
          {
            key: "countries",
            icon: <span className="menu-icon-text">🌍</span>,
            label: "Pays",
            onClick: () => navigate("/countries"),
          },
          {
            key: "reports",
            icon: <span className="menu-icon-text">📊</span>,
            label: "Rapports",
            onClick: () => navigate("/reports"),
          },
        ]}
      />

      <div className="sidebar-bottom" onClick={handleLogout}>
        <img src={logoutIcon} alt="logout" />
        <span>Déconnexion</span>
      </div>
    </div>
  );
};

export default Sidebar;
