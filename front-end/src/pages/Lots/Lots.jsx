import React, { useState, useMemo } from "react";
import { Table, Input, Select, Tag, Button, Space, Typography } from "antd";
import { SearchOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { mockLots } from "../../services/mockData";
import "./Lots.scss";

const { Text } = Typography;

const STATUS_CONFIG = {
  conforme:      { color: "success", label: "Conforme"     },
  avertissement: { color: "warning", label: "Avertissement" },
  expiré:        { color: "error",   label: "Expiré"        },
};

const Lots = () => {
  const navigate = useNavigate();
  const [search, setSearch]         = useState("");
  const [countryFilter, setCountry] = useState(null);
  const [statusFilter, setStatus]   = useState(null);

  const filtered = useMemo(() => {
    let data = [...mockLots].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
    if (search)        data = data.filter(l => l.id.toLowerCase().includes(search.toLowerCase()) || l.origin.toLowerCase().includes(search.toLowerCase()));
    if (countryFilter) data = data.filter(l => l.countryCode === countryFilter);
    if (statusFilter)  data = data.filter(l => l.status === statusFilter);
    return data;
  }, [search, countryFilter, statusFilter]);

  const columns = [
    { title: "ID Lot",     dataIndex: "id",          key: "id",
      render: (v) => <Text code style={{ fontSize: 12 }}>{v}</Text>, sorter: (a, b) => a.id.localeCompare(b.id) },
    { title: "Pays",       dataIndex: "country",     key: "country",
      render: (v, r) => <><span>{r.countryCode === "BR" ? "🇧🇷" : r.countryCode === "CO" ? "🇨🇴" : "🇪🇨"}</span> {v}</> },
    { title: "Origine",    dataIndex: "origin",      key: "origin" },
    { title: "Variété",    dataIndex: "variety",     key: "variety" },
    { title: "Qté (kg)",   dataIndex: "quantity",    key: "quantity", sorter: (a, b) => a.quantity - b.quantity,
      render: (v) => <b>{v}</b> },
    { title: "Entrée (FIFO)", dataIndex: "entryDate", key: "entryDate", sorter: (a, b) => new Date(a.entryDate) - new Date(b.entryDate),
      defaultSortOrder: "ascend" },
    { title: "Expiration", dataIndex: "expiryDate",  key: "expiryDate" },
    { title: "T° (°C)",    dataIndex: "temperature", key: "temperature",
      render: (v) => <span style={{ color: v > 22 ? "#ff4d4f" : v > 20 ? "#fa8c16" : "#52c41a" }}>{v}</span> },
    { title: "H (%)",      dataIndex: "humidity",    key: "humidity",
      render: (v) => <span style={{ color: v > 65 ? "#ff4d4f" : v > 62 ? "#fa8c16" : "#52c41a" }}>{v}</span> },
    { title: "Statut",     dataIndex: "status",      key: "status",
      render: (v) => <Tag color={STATUS_CONFIG[v].color}>{STATUS_CONFIG[v].label}</Tag> },
    { title: "",           key: "action",
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/lots/${r.id}`)}>
          Détail
        </Button>
      ) },
  ];

  return (
    <div className="lots-page">
      <div className="lots-toolbar">
        <Input.Search
          placeholder="Rechercher par ID ou origine…"
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
            options={[
              { value: "BR", label: "🇧🇷 Brésil"    },
              { value: "CO", label: "🇨🇴 Colombie"  },
              { value: "EC", label: "🇪🇨 Équateur"  },
            ]}
          />
          <Select
            placeholder="Filtrer par statut"
            allowClear
            style={{ width: 170 }}
            onChange={setStatus}
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </Space>
        <Text type="secondary" style={{ fontSize: 13 }}>{filtered.length} lot{filtered.length > 1 ? "s" : ""} — trié FIFO</Text>
      </div>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        size="middle"
        rowClassName={(r) => `lot-row lot-row--${r.status}`}
        scroll={{ x: 1100 }}
      />
    </div>
  );
};

export default Lots;
