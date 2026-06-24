import React, { useState, useEffect, useMemo } from "react";
import { Table, Input, Select, Tag, Button, Space, Typography, Spin } from "antd";
import { SearchOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { lotsService } from "../../services/lots.service";
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

const Lots = () => {
  const navigate = useNavigate();
  const [lots, setLots]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [countryFilter, setCountry] = useState(null);
  const [statusFilter, setStatus]   = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await lotsService.getAll();
        setLots(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erreur chargement lots:", err);
        setLots([]);
      } finally {
        setLoading(false);
      }
    };
    load();
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
      render: (v) => v ? new Date(v).toLocaleDateString("fr-FR") : "—",
    },
    {
      title: "Durée (jours)",
      key: "duree",
      render: (_, r) => {
        if (!r.date_stockage) return "—";
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
        <Space>
          <Select
            placeholder="Filtrer par pays"
            allowClear
            style={{ width: 160 }}
            onChange={setCountry}
            options={COUNTRY_FILTER_OPTIONS}
          />
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
    </div>
  );
};

export default Lots;
