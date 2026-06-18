import React from "react";
import { Row, Col, Card, Button, Table, Tag, Typography, Statistic } from "antd";
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from "recharts";
import { reportData, kpiData, mockLots } from "../../services/mockData";
import "./Reports.scss";

const { Title, Text } = Typography;

const PIE_COLORS = ["#1677ff", "#52c41a", "#fa8c16"];
const ALERT_COLORS = { critique: "#ff4d4f", haute: "#fa8c16", moyenne: "#fadb14" };

const qualityColumns = [
  { title: "Variété",       dataIndex: "variety",      key: "variety" },
  { title: "Conformes",     dataIndex: "conforme",     key: "conforme",     render: (v) => <Tag color="success">{v}</Tag> },
  { title: "Avertissement", dataIndex: "avertissement", key: "avertissement", render: (v) => <Tag color="warning">{v}</Tag> },
  { title: "Expirés",       dataIndex: "expiré",       key: "expiré",       render: (v) => <Tag color="error">{v}</Tag> },
];

const renderCustomLabel = ({ name, value, percent }) =>
  `${name}: ${value} kg (${(percent * 100).toFixed(0)}%)`;

const Reports = () => (
  <div className="reports-page">

    {/* Summary stats */}
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {[
        { title: "Total lots",       value: kpiData.totalLots,       suffix: "lots",  color: "#1677ff" },
        { title: "Lots conformes",   value: kpiData.conformLots,     suffix: "lots",  color: "#52c41a" },
        { title: "Lots expirés",     value: kpiData.expiredLots,     suffix: "lots",  color: "#ff4d4f" },
        { title: "Alertes actives",  value: kpiData.activeAlerts,    suffix: "alerte(s)", color: "#fa8c16" },
      ].map((s) => (
        <Col xs={12} sm={6} key={s.title}>
          <Card variant="borderless" className="report-stat-card">
            <Statistic title={s.title} value={s.value} suffix={s.suffix}
              valueStyle={{ color: s.color, fontSize: 22 }} />
          </Card>
        </Col>
      ))}
    </Row>

    <Row gutter={[16, 16]}>
      {/* Inventory by country - Pie */}
      <Col xs={24} lg={10}>
        <Card title="Inventaire par pays (kg)" variant="borderless">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={reportData.inventoryByCountry}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={renderCustomLabel}
                labelLine={false}
              >
                {reportData.inventoryByCountry.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} kg`]} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* Alerts by month - Stacked Bar */}
      <Col xs={24} lg={14}>
        <Card title="Alertes par mois (2026)" variant="borderless">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={reportData.alertsByMonth} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="critique" name="Critique" stackId="a" fill="#ff4d4f" radius={[0,0,0,0]} />
              <Bar dataKey="haute"    name="Haute"    stackId="a" fill="#fa8c16" />
              <Bar dataKey="moyenne"  name="Moyenne"  stackId="a" fill="#fadb14" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* Quality by variety */}
      <Col xs={24} lg={12}>
        <Card title="Indicateurs qualité par variété" variant="borderless">
          <Table
            dataSource={reportData.qualityByVariety}
            columns={qualityColumns}
            rowKey="variety"
            pagination={false}
            size="small"
          />
          <div style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={reportData.qualityByVariety} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="variety" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="conforme"     name="Conformes"     fill="#52c41a" radius={[4,4,0,0]} />
                <Bar dataKey="avertissement" name="Avertissement" fill="#fa8c16" radius={[4,4,0,0]} />
                <Bar dataKey="expiré"        name="Expirés"       fill="#ff4d4f" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Col>

      {/* Export section */}
      <Col xs={24} lg={12}>
        <Card title="Exporter les rapports" variant="borderless">
          <div className="export-grid">
            {[
              { icon: <FileExcelOutlined />, label: "Inventaire lots (.xlsx)",       color: "#52c41a" },
              { icon: <FileExcelOutlined />, label: "Historique alertes (.xlsx)",    color: "#52c41a" },
              { icon: <FilePdfOutlined />,   label: "Rapport qualité (.pdf)",        color: "#ff4d4f" },
              { icon: <FilePdfOutlined />,   label: "Rapport températures (.pdf)",   color: "#ff4d4f" },
              { icon: <DownloadOutlined />,  label: "Données brutes (.csv)",         color: "#1677ff" },
              { icon: <DownloadOutlined />,  label: "Traçabilité complète (.csv)",   color: "#1677ff" },
            ].map((e) => (
              <Button
                key={e.label}
                icon={e.icon}
                style={{ justifyContent: "flex-start", color: e.color, borderColor: `${e.color}55` }}
                onClick={() => {}}
              >
                {e.label}
              </Button>
            ))}
          </div>

          <div className="export-note">
            <Text type="secondary" style={{ fontSize: 12 }}>
              * Les exports sont simulés — intégration backend à prévoir.
            </Text>
          </div>
        </Card>
      </Col>
    </Row>
  </div>
);

export default Reports;
