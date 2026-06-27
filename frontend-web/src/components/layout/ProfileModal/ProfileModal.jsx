import React from "react";
import { Modal, Descriptions, Tag } from "antd";
import { useAuth } from "../../../context/AuthContext";
import "./ProfileModal.scss";

const ROLE_LABELS = {
  admin:            { label: "Administrateur", color: "red"    },
  responsable_pays: { label: "Responsable pays", color: "blue" },
  operateur:        { label: "Opérateur",        color: "green" },
};

const ProfileModal = ({ open, onClose }) => {
  const { profile } = useAuth();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={null}
      width={420}
      className="profile-modal"
    >
      <div className="profile-modal-header">
        <div className="profile-modal-avatar">{profile?.initials ?? "?"}</div>
        <div>
          <div className="profile-modal-title">Mon profil</div>
          <div style={{ marginTop: 4 }}>
            {(profile?.roles ?? []).map(r => {
              const cfg = ROLE_LABELS[r] || { label: r, color: "default" };
              return <Tag key={r} color={cfg.color}>{cfg.label}</Tag>;
            })}
          </div>
        </div>
      </div>

      <Descriptions column={1} size="small" style={{ marginTop: 16 }}
        labelStyle={{ color: "#8c8c8c", width: 120, fontWeight: 500 }}>
        <Descriptions.Item label="Nom complet">{profile?.name ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Email">{profile?.email ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Accès pays">
          {(profile?.accesses ?? []).length > 0
            ? profile.accesses.map(a => a.pays).join(", ")
            : "Accès global"}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default ProfileModal;
