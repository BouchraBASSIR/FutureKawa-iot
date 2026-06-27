import React, { useState, useEffect, useMemo } from "react";
import { BellOutlined, SettingOutlined, LogoutOutlined, MenuOutlined } from "@ant-design/icons";
import { Dropdown, Badge } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { dashboardService } from "../../../services/dashboard.service";
import ProfileModal from "../ProfileModal/ProfileModal";
import SettingsModal from "../SettingsModal/SettingsModal";
import "./Header.scss";

const FLAG = { bresil: "🇧🇷", equateur: "🇪🇨", colombie: "🇨🇴" };

const PAGE_TITLES = {
  "/":          "Dashboard",
  "/lots":      "Gestion des lots",
  "/alerts":    "Centre d'alertes",
  "/storage":   "Monitoring entrepôts",
  "/countries": "Monitoring pays",
  "/reports":   "Rapports & Analyses",
};

const HeaderBar = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout, hasRole } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  // Pays accessibles selon le rôle (null = admin = pas de restriction)
  const allowedPays = useMemo(() => {
    if (hasRole("admin")) return null;
    const unique = [...new Set((profile?.accesses ?? []).map(a => a.pays))];
    return unique.length ? unique : null;
  }, [hasRole, profile]);

  useEffect(() => {
    dashboardService.getAlertsCount()
      .then(data => {
        if (!data) return;
        if (!allowedPays) {
          setAlertCount(data.non_lues ?? 0);
        } else {
          const count = allowedPays.reduce(
            (sum, pays) => sum + (data.par_pays?.[pays]?.non_lues ?? 0),
            0
          );
          setAlertCount(count);
        }
      })
      .catch(() => {});
  }, [location.pathname, allowedPays]);

  useEffect(() => {
    const handler = (e) => {
      const delta = e.detail?.delta ?? 0;
      setAlertCount(prev => Math.max(0, prev + delta));
    };
    window.addEventListener("alerts-updated", handler);
    return () => window.removeEventListener("alerts-updated", handler);
  }, []);

  const rawPath = location.pathname.startsWith("/lots/") ? "/lots" : location.pathname;
  const title = PAGE_TITLES[rawPath] ?? "FutureKawa";

  useEffect(() => {
    document.title = `${title} - FutureKawa`;
  }, [title]);

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
          <span className="user-dropdown-name">{profile?.name ?? "-"}</span>
          <span className="user-dropdown-email">{profile?.email ?? "-"}</span>
          <span className="user-dropdown-role">{profile?.roles?.join(", ") ?? "-"}</span>
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
          <button className="hamburger-btn" onClick={onMenuClick} aria-label="Ouvrir le menu">
            <MenuOutlined />
          </button>
          <span className="header-title">{title}</span>
        </div>

        {/* RIGHT */}
        <div className="header-right">

          {allowedPays?.length === 1 && (
            <span className="header-scope-chip">
              <span>{FLAG[allowedPays[0]]}</span>
              <span className="header-scope-name">
                {allowedPays[0].charAt(0).toUpperCase() + allowedPays[0].slice(1)}
              </span>
            </span>
          )}
          
          <div className="icon-wrapper" onClick={() => navigate("/alerts")} style={{ cursor: "pointer" }}>
            <Badge count={alertCount} size="small" offset={[-2, 2]}>
              <BellOutlined className="icon" />
            </Badge>
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
