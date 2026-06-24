import React, { useState, useEffect } from "react";
import { Modal, Input, Form, message } from "antd";
import { useAuth } from "../../../context/AuthContext";
import "./ProfileModal.scss";

const ProfileModal = ({ open, onClose }) => {
  const { profile, updateProfile } = useAuth();
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && profile) {
      form.setFieldsValue({ name: profile.name, email: profile.email });
    }
  }, [open, profile, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      updateProfile(values);
      message.success("Profil mis à jour");
      onClose();
    } catch {
      // validation errors handled by Form
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="Enregistrer"
      cancelText="Annuler"
      title={null}
      width={420}
      className="profile-modal"
    >
      <div className="profile-modal-header">
        <div className="profile-modal-avatar">{profile?.initials ?? "?"}</div>
        <div>
          <div className="profile-modal-title">Mon profil</div>
          <span className="profile-modal-role">{profile?.role}</span>
        </div>
      </div>

      <Form form={form} layout="vertical" className="profile-modal-form">
        <Form.Item
          label="Nom complet"
          name="name"
          rules={[{ required: true, message: "Le nom est requis" }]}
        >
          <Input placeholder="Votre nom" />
        </Form.Item>

        <Form.Item
          label="Adresse email"
          name="email"
          rules={[
            { required: true, message: "L'email est requis" },
            { type: "email", message: "Email invalide" },
          ]}
        >
          <Input placeholder="votre@email.com" />
        </Form.Item>

        <Form.Item label="Rôle">
          <Input value={profile?.role} disabled />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProfileModal;
