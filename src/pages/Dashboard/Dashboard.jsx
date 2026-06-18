import React from "react";
import { Row, Col, Card, Table, Tag, Typography } from "antd";
import {
  ThunderboltOutlined, WarningOutlined, DashboardOutlined, ExperimentOutlined,
} from "@ant-design/icons";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import WorldMap from "../../components/layout/WorldMap/WorldMap";
import {
  kpiData, combinedTempData, combinedHumidityData, mockAlerts, countryStats,
} from "../../services/mockData";
import "./Dashboard.scss";

const { Text } = Typography;
const COUNTRY_COLORS = { Brésil: "#1677ff", Colombie: "#52c41a", Équateur: "#fa8c16" };
const levelColor = { critique: "red", haute: "orange", moyenne: "gold" };

const alertColumns = [
  { title: "ID Lot",  dataIndex: "lotId",     key: "lotId",    render: (v) => <Text code>{v}</Text>, width: 110 },
  { title: "Message", dataIndex: "message",   key: "message",  ellipsis: true },
  { title: "Niveau",  dataIndex: "level",     key: "level",    width: 90,
    render: (v) => <Tag color={levelColor[v]}>{v.toUpperCase()}</Tag> },
];

const KPICard = ({ icon, label, value, unit, color, sub }) => (
  <Card className="kpi-card" variant="borderless">
    <div className="kpi-icon" style={{ background: `${color}18`, color }}>{icon}</div>
    <div className="kpi-body">
      <div className="kpi-value">{value}<span className="kpi-unit">{unit}</span></div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  </Card>
);

const Dashboard = () => (
  <div className="dashboard">

    {/* KPI Cards */}
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <KPICard icon={<ThunderboltOutlined />} label="Total lots" value={kpiData.totalLots}
          color="#1677ff" sub={`${kpiData.conformLots} conformes · ${kpiData.expiredLots} expirés`} />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <KPICard icon={<WarningOutlined />} label="Alertes actives" value={kpiData.activeAlerts}
          color="#ff4d4f" sub={`${mockAlerts.filter(a => a.level === "critique").length} critiques`} />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <KPICard icon={<DashboardOutlined />} label="Température moy." value={kpiData.avgTemperature}
          unit="°C" color="#fa8c16" sub="Seuil critique : 22°C" />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <KPICard icon={<ExperimentOutlined />} label="Humidité moy." value={kpiData.avgHumidity}
          unit="%" color="#52c41a" sub="Seuil critique : 65%" />
      </Col>
    </Row>

    {/* World Map + Alerts table */}
    <Row gutter={[16, 16]} className="dashboard-row">
      <Col xs={24} xl={13}>
        <Card title="Zones d'approvisionnement" variant="borderless" className="map-card">
          <WorldMap />
          <div className="map-legend">
            {countryStats.map((c) => (
              <div key={c.code} className="map-legend-item">
                <span className="map-legend-dot" style={{ background: COUNTRY_COLORS[c.name] }} />
                <span>{c.flag} {c.name}</span>
                <Tag color="blue">{c.lots} lots</Tag>
                <Tag color={c.alerts > 3 ? "red" : "orange"}>{c.alerts} alertes</Tag>
              </div>
            ))}
          </div>
        </Card>
      </Col>

      <Col xs={24} xl={11}>
        <Card title="Alertes récentes" variant="borderless" className="alerts-card">
          <Table
            dataSource={mockAlerts.slice(0, 6)}
            columns={alertColumns}
            rowKey="id"
            pagination={false}
            size="small"
            rowClassName={(r) => r.acknowledged ? "row-ack" : "row-active"}
          />
        </Card>
      </Col>
    </Row>

    {/* Charts */}
    <Row gutter={[16, 16]} className="dashboard-row">
      <Col xs={24} lg={12}>
        <Card title="Températures — 30 derniers jours (°C)" variant="borderless">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={combinedTempData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis domain={[14, 26]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconType="circle" iconSize={8} />
              <Line dataKey="Brésil"   stroke="#1677ff" strokeWidth={2} dot={false} />
              <Line dataKey="Colombie" stroke="#52c41a" strokeWidth={2} dot={false} />
              <Line dataKey="Équateur" stroke="#fa8c16" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="Humidité — 30 derniers jours (%)" variant="borderless">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={combinedHumidityData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis domain={[50, 72]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconType="circle" iconSize={8} />
              <Line dataKey="Brésil"   stroke="#1677ff" strokeWidth={2} dot={false} />
              <Line dataKey="Colombie" stroke="#52c41a" strokeWidth={2} dot={false} />
              <Line dataKey="Équateur" stroke="#fa8c16" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>

  </div>
);

export default Dashboard;
