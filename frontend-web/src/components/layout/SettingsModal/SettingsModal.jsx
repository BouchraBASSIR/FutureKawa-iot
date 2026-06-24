import React, { useState } from "react";
import { Modal, Switch, Select, InputNumber, Divider, message } from "antd";
import "./SettingsModal.scss";

const SETTINGS_KEY = "futurekawa_settings";

const defaultSettings = {
  emailAlerts: true,
  stockThreshold: 10,
  language: "fr",
};

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
  } catch {
    return { ...defaultSettings };
  }
};

const SettingsModal = ({ open, onClose }) => {
  const [settings, setSettings] = useState(loadSettings);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    message.success("Paramètres enregistrés");
    onClose();
  };

  const handleCancel = () => {
    setSettings(loadSettings());
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      onOk={handleSave}
      okText="Enregistrer"
      cancelText="Annuler"
      title="Paramètres"
      width={460}
      className="settings-modal"
    >
      <div className="settings-section">
        <div className="settings-section-title">Notifications</div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-label">Alertes par email</span>
            <span className="settings-row-desc">Recevoir un email lors d'une alerte critique</span>
          </div>
          <Switch
            checked={settings.emailAlerts}
            onChange={(val) => handleChange("emailAlerts", val)}
          />
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-label">Seuil d'alerte stock</span>
            <span className="settings-row-desc">Déclencher une alerte en dessous de (unités)</span>
          </div>
          <InputNumber
            min={1}
            max={9999}
            value={settings.stockThreshold}
            onChange={(val) => handleChange("stockThreshold", val)}
            disabled={!settings.emailAlerts}
            className="settings-number"
          />
        </div>
      </div>

      <Divider className="settings-divider" />

      <div className="settings-section">
        <div className="settings-section-title">Interface</div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-label">Langue</span>
            <span className="settings-row-desc">Langue d'affichage de l'application</span>
          </div>
          <Select
            value={settings.language}
            onChange={(val) => handleChange("language", val)}
            className="settings-select"
            options={[
              { value: "fr", label: "Français" },
              { value: "en", label: "English" },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
