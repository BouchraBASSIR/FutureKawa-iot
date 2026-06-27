import React, { useState, useEffect, useMemo } from "react";
import { Table, Input, Select, Tag, Button, Space, Typography, Spin, Modal, Form, message } from "antd";
import { SearchOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { lotsService } from "../../services/lots.service";
import { useAuth } from "../../context/AuthContext";
import ScopeBadge from "../../components/common/ScopeBadge";
import api from "../../services/api";
import "./Lots.scss";

// Mock gardé en commentaire pour référence / fallback hors-ligne
// import { mockLots } from "../../services/mockData";

const { Text } = Typography;

const STATUS_CONFIG = {
  conforme:   { color: "success", label: "Conforme"     },
  en_alerte:  { color: "warning", label: "En alerte"    },
  perime:     { color: "error",   label: "Périmé"       },
};

const FLAG = { bresil: "🇧🇷", equateur: "🇪🇨", colombie: "🇨🇴" };
const COUNTRY_FILTER_OPTIONS = [
  { value: "bresil",   label: "🇧🇷 Brésil"   },
  { value: "equateur", label: "🇪🇨 Équateur" },
  { value: "colombie", label: "🇨🇴 Colombie" },
];

const COUNTRY_OPTIONS = [
  { value: "bresil",   label: "🇧🇷 Brésil"   },
  { value: "equateur", label: "🇪🇨 Équateur" },
  { value: "colombie", label: "🇨🇴 Colombie" },
];

const Lots = () => {
  const navigate = useNavigate();
  const { profile, hasRole, getUserPays } = useAuth();

  const [lots, setLots]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [countryFilter, setCountry] = useState(null);
  const [statusFilter, setStatus]   = useState(null);

  // ── Modal ajout lot ──────────────────────────────────────────
  const [modalOpen, setModalOpen]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [entrepots, setEntrepots]     = useState([]);
  const [selectedPays, setSelectedPays] = useState(null);
  const [form] = Form.useForm();

  // Qui peut créer un lot ?
  const peutCreerLot = hasRole("operateur", "responsable_pays");

  // Pays fixé pour responsable_pays et opérateur (ils ne choisissent pas)
  const paysFixe = getUserPays(); // null si admin

  // Entrepôt assigné pour le ScopeBadge
  const scopeAccess = paysFixe
    ? profile?.accesses?.find(a => a.pays === paysFixe)
    : null;

  const chargerEntrepots = async (pays) => {
    if (!pays) return;
    try {
      const data = await api.get(`/api/central/${pays}/entrepots`);
      setEntrepots(Array.isArray(data) ? data : []);
    } catch {
      setEntrepots([]);
    }
  };

  const ouvrirModal = async () => {
    form.resetFields();
    const pays = paysFixe;
    setSelectedPays(pays);
    if (pays) {
      await chargerEntrepots(pays);
      form.setFieldsValue({ pays });
    }
    setModalOpen(true);
  };

  const soumettreCreation = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // Pour opérateur : entrepôt déjà dans ses accès
      // Récupère l'id_utilisateur dans le backend-pays via l'email du connecté
      let id_utilisateur = 1;
      try {
        const users = await api.get(`/api/central/${values.pays}/utilisateurs`);
        const match = Array.isArray(users)
          ? users.find((u) => u.email === profile.email)
          : null;
        if (match) id_utilisateur = match.id_utilisateur;
      } catch { /* utilise 1 par défaut */ }

      const payload = {
        id_lot:         values.id_lot.trim(),
        id_entrepot:    values.id_entrepot,
        id_utilisateur,
      };

      await lotsService.create(values.pays, payload);
      message.success(`Lot ${payload.id_lot} créé avec succès`);
      setModalOpen(false);

      // Recharger la liste
      const data = await lotsService.getAll();
      setLots(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.errorFields) return; // validation antd
      const detail = err?.response?.body?.detail ?? err?.message ?? "Erreur inconnue";
      message.error(`Échec : ${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  const loadLots = async () => {
    setLoading(true);
    try {
      // Responsable pays / opérateur : on filtre sur leur pays
      const data = paysFixe
        ? await lotsService.getAll(paysFixe)
        : await lotsService.getAll();
      setLots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur chargement lots:", err);
      setLots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLots();
  }, []);

  const filtered = useMemo(() => {
    let data = [...lots];
    if (search)
      data = data.filter(l =>
        l.id_lot?.toLowerCase().includes(search.toLowerCase())
      );
    if (countryFilter)
      data = data.filter(l => l.country_id === countryFilter);
    if (statusFilter)
      data = data.filter(l => l.statut === statusFilter);
    return data;
  }, [lots, search, countryFilter, statusFilter]);

  const columns = [
    {
      title: "ID Lot",
      dataIndex: "id_lot",
      key: "id_lot",
      render: (v) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
      sorter: (a, b) => a.id_lot?.localeCompare(b.id_lot),
    },
    {
      title: "Pays",
      dataIndex: "country_id",
      key: "country_id",
      render: (v, r) => <>{FLAG[v] || ""} {r.pays_nom || v}</>,
    },
    {
      title: "Entrepôt",
      dataIndex: "id_entrepot",
      key: "id_entrepot",
      render: (v) => <Text type="secondary">#{v}</Text>,
    },
    {
      title: "Entrée (FIFO)",
      dataIndex: "date_stockage",
      key: "date_stockage",
      sorter: (a, b) => new Date(a.date_stockage) - new Date(b.date_stockage),
      defaultSortOrder: "ascend",
      render: (v) => v ? new Date(v).toLocaleDateString("fr-FR") : "-",
    },
    {
      title: "Durée (jours)",
      key: "duree",
      render: (_, r) => {
        if (!r.date_stockage) return "-";
        const jours = Math.floor((Date.now() - new Date(r.date_stockage)) / 86400000);
        return (
          <span style={{ color: jours > 330 ? "#ff4d4f" : jours > 300 ? "#fa8c16" : undefined }}>
            {jours}j
          </span>
        );
      },
      sorter: (a, b) =>
        new Date(a.date_stockage) - new Date(b.date_stockage),
    },
    {
      title: "Statut",
      dataIndex: "statut",
      key: "statut",
      render: (v) => {
        const cfg = STATUS_CONFIG[v] || { color: "default", label: v };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: "",
      key: "action",
      render: (_, r) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/lots/${r.country_id}__${r.id_lot}`)}
        >
          Détail
        </Button>
      ),
    },
  ];

  return (
    <div className="lots-page">
      <div className="lots-toolbar">
        <Input.Search
          placeholder="Rechercher par ID lot…"
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
          prefix={<SearchOutlined />}
        />
        {paysFixe && (
          <ScopeBadge pays={paysFixe} entrepotId={scopeAccess?.entrepot_id} />
        )}
        <Space>
          {/* Filtre pays inutile si l'utilisateur est verrouillé sur un seul pays */}
          {!paysFixe && (
            <Select
              placeholder="Filtrer par pays"
              allowClear
              style={{ width: 160 }}
              onChange={setCountry}
              options={COUNTRY_FILTER_OPTIONS}
            />
          )}
          <Select
            placeholder="Filtrer par statut"
            allowClear
            style={{ width: 170 }}
            onChange={setStatus}
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </Space>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {filtered.length} lot{filtered.length > 1 ? "s" : ""} - trié FIFO
        </Text>

        {/* Bouton visible uniquement pour opérateur et responsable_pays */}
        {peutCreerLot && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={ouvrirModal}
          >
            Nouveau lot
          </Button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 50 }}><Spin /></div>
      ) : (
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey={(r) => `${r.country_id}__${r.id_lot}`}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="middle"
          rowClassName={(r) => `lot-row lot-row--${r.statut}`}
          scroll={{ x: 800 }}
        />
      )}

      {/* ── Modal : Créer un lot ── */}
      <Modal
        title="Créer un nouveau lot"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={soumettreCreation}
        okText="Créer"
        cancelText="Annuler"
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>

          <Form.Item
            name="id_lot"
            label="Identifiant du lot"
            rules={[{ required: true, message: "L'ID du lot est obligatoire" }]}
          >
            <Input placeholder="ex: LOT-BR-2024-001" />
          </Form.Item>

          <Form.Item
            name="pays"
            label="Pays"
            rules={[{ required: true, message: "Sélectionnez un pays" }]}
          >
            <Select
              placeholder="Choisir un pays"
              disabled={!!paysFixe}
              options={COUNTRY_OPTIONS}
              onChange={async (val) => {
                setSelectedPays(val);
                form.setFieldValue("id_entrepot", undefined);
                await chargerEntrepots(val);
              }}
            />
          </Form.Item>

          <Form.Item
            name="id_entrepot"
            label="Entrepôt"
            rules={[{ required: true, message: "Sélectionnez un entrepôt" }]}
          >
            <Select
              placeholder={selectedPays ? "Choisir un entrepôt" : "Sélectionnez d'abord un pays"}
              disabled={!selectedPays}
              options={entrepots.map((e) => ({
                value: e.id_entrepot,
                label: `${e.nom} - ${e.localisation}`,
              }))}
            />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
};

export default Lots;
