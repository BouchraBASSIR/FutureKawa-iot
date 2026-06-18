import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../../styles/icons/logo-removebg-preview.png"; 
import "./SidebarLogo.scss";

const SidebarLogo = () => {
  const navigate = useNavigate();

  return (
    <div className="logo" onClick={() => navigate("/")}>
      <img src={logo} alt="FutureKawa" />
    </div>
  );
};

export default SidebarLogo;