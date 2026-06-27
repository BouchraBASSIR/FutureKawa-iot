import React from "react";
import { Menu, Modal } from "antd";
import { useNavigate, useLocation } from "react-router-dom";

import SidebarLogo from "../SidebarLogo/SidebarLogo";
import { useAuth } from "../../../context/AuthContext";

import logoutIcon    from "../../../styles/icons/deconnexion.svg";
import homeIcon      from "../../../styles/icons/home.svg";
import lotsIcon      from "../../../styles/icons/box_add.svg";
import warningIcon   from "../../../styles/icons/warning.svg";
import warehouseIcon from "../../../styles/icons/warehouse.svg";
import reportsIcon   from "../../../styles/icons/analytics.svg";
import "./Sidebar.scss";

const MenuIcon = ({ src, alt }) => (
  <img src={src} alt={alt} className="menu-icon" />
);

const ROUTE_MAP = {
  "/":          "dashboard",
  "/lots":      "lots",
  "/alerts":    "alerts",
  "/storage":   "storage",
  "/reports":   "reports",
};

const Sidebar = ({ mobileOpen = false, onClose }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { logout, hasRole } = useAuth();

  // Ferme automatiquement la sidebar mobile lors d'une navigation
  React.useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const path = location.pathname.startsWith("/lots/") ? "/lots" : location.pathname;
  const selectedKey = ROUTE_MAP[path] ?? "dashboard";

  const handleLogout = () => {
    Modal.confirm({
      title: "Se déconnecter",
      content: "Voulez-vous vraiment mettre fin à votre session ?",
      okText: "Déconnecter",
      cancelText: "Annuler",
      okButtonProps: { danger: true },
      onOk: () => {
        logout();
        navigate("/login");
      },
    });
  };

  const canSeeReports  = hasRole("admin", "responsable_pays");
  const canSeeStorage  = hasRole("admin", "responsable_pays");

  const baseItems = [
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
  ];

  const managementItems = (canSeeStorage || canSeeReports) ? [
    { type: "divider" },
    ...(canSeeStorage ? [{
      key: "storage",
      icon: <MenuIcon src={warehouseIcon} alt="entrepôts" />,
      label: "Entrepôts",
      onClick: () => navigate("/storage"),
    }] : []),
    ...(canSeeReports ? [{
      key: "reports",
      icon: <MenuIcon src={reportsIcon} alt="rapports" />,
      label: "Rapports",
      onClick: () => navigate("/reports"),
    }] : []),
  ] : [];

  return (
    <div className={`sidebar${mobileOpen ? " sidebar--open" : ""}`}>
      <SidebarLogo />
      <div className="sidebar-divider" />

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={[...baseItems, ...managementItems]}
      />

      <div className="sidebar-bottom" onClick={handleLogout}>
        <img src={logoutIcon} alt="logout" />
        <span>Déconnexion</span>
      </div>
    </div>
  );
};

export default Sidebar;
