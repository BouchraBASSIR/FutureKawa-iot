import React, { useState } from "react";
import { BellOutlined, SettingOutlined, LogoutOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import ProfileModal from "../ProfileModal/ProfileModal";
import SettingsModal from "../SettingsModal/SettingsModal";
import "./Header.scss";

const PAGE_TITLES = {
  "/":          "Dashboard",
  "/lots":      "Gestion des lots",
  "/alerts":    "Centre d'alertes",
  "/storage":   "Monitoring entrepôts",
  "/countries": "Monitoring pays",
  "/reports":   "Rapports & Analyses",
};

const HeaderBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const rawPath = location.pathname.startsWith("/lots/") ? "/lots" : location.pathname;
  const title = PAGE_TITLES[rawPath] ?? "FutureKawa";

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login");
  };

  const openProfile = () => {
    setDropdownOpen(false);
    setProfileOpen(true);
  };

  const userDropdown = (
    <div className="user-dropdown">
      <div className="user-dropdown-header">
        <div className="user-dropdown-avatar">{profile?.initials ?? "?"}</div>
        <div className="user-dropdown-info">
          <span className="user-dropdown-name">{profile?.name ?? "—"}</span>
          <span className="user-dropdown-email">{profile?.email ?? "—"}</span>
          <span className="user-dropdown-role">{profile?.role ?? "—"}</span>
        </div>
      </div>

      <div className="user-dropdown-divider" />

      <button className="user-dropdown-item" onClick={openProfile}>
        Mon profil
      </button>

      <div className="user-dropdown-divider" />

      <button className="user-dropdown-logout" onClick={handleLogout}>
        <LogoutOutlined />
        Se déconnecter
      </button>
    </div>
  );

  return (
    <>
      <header className="header-bar">

        {/* LEFT */}
        <div className="header-left">
          <span className="header-title">{title}</span>
        </div>

        {/* RIGHT */}
        <div className="header-right">

          <div className="icon-wrapper">
            <BellOutlined className="icon" />
            <span className="badge">3</span>
          </div>

          <div className="icon-wrapper" onClick={() => setSettingsOpen(true)}>
            <SettingOutlined className="icon" />
          </div>

          <Dropdown
            open={dropdownOpen}
            onOpenChange={setDropdownOpen}
            trigger={["click"]}
            popupRender={() => userDropdown}
            placement="bottomRight"
          >
            <div className="user">
              <div className="avatar">{profile?.initials ?? "?"}</div>
              <span>{profile?.name?.split(" ")[0] ?? "Utilisateur"}</span>
            </div>
          </Dropdown>

        </div>
      </header>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};

export default HeaderBar;
