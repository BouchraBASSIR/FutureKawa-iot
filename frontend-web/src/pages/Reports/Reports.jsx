// Mock gardé en commentaire pour référence
// import { reportData, kpiData, mockLots } from "../../services/mockData";

import React, { useState, useEffect } from "react";
import { Row, Col, Card, Button, Table, Tag, Statistic, Spin } from "antd";
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { dashboardService } from "../../services/dashboard.service";
import { alertesService } from "../../services/alertes.service";
import "./Reports.scss";

const COUNTRY_IDS = ["bresil", "equateur", "colombie"];
const NAMES  = { bresil: "Brésil", equateur: "Équateur", colombie: "Colombie" };
const FLAG   = { bresil: "🇧🇷", equateur: "🇪🇨", colombie: "🇨🇴" };
const PIE_COLORS   = ["#1677ff", "#52c41a", "#fa8c16"];
const MONTH_NAMES  = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

const statutColumns = [
  { title: "Statut",  dataIndex: "statut", key: "statut",
    render: v => (
      <Tag color={v === "conforme" ? "success" : v === "en_alerte" ? "warning" : "error"}>
        {v}
      </Tag>
    ),
  },
  { title: "Lots",   dataIndex: "count", key: "count", render: v => <strong>{v}</strong> },
  { title: "Part",   dataIndex: "pct",   key: "pct",   render: v => `${v} %` },
];

const Reports = () => {
  const [loading, setLoading]   = useState(true);
  const [dashData, setDashData] = useState(null);
  const [alertes, setAlertes]   = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [dashRes, alRes] = await Promise.allSettled([
          dashboardService.getDashboard(),
          alertesService.getAll(),
        ]);
        if (dashRes.status === "fulfilled") setDashData(dashRes.value);
        if (alRes.status  === "fulfilled") setAlertes(alRes.value || []);
      } catch (err) {
        console.error("Erreur Reports:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 50 }}><Spin /></div>;

  const parPays = dashData?.par_pays || {};

  // Pie : lots par pays
  const inventoryByCountry = COUNTRY_IDS
    .map(id => ({ name: `${FLAG[id]} ${NAMES[id]}`, value: parPays[id]?.total_lots ?? 0 }))
    .filter(d => d.value > 0);

  // Bar : alertes par mois groupées par type
  const alertesByMonth = {};
  alertes.forEach(a => {
    if (!a.date_alerte) return;
    const d   = new Date(a.date_alerte);
    const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    if (!alertesByMonth[key]) alertesByMonth[key] = { month: key, temperature: 0, humidite: 0, perime: 0 };
    const type = a.type_alerte || "humidite";
    alertesByMonth[key][type] = (alertesByMonth[key][type] || 0) + 1;
  });
  const alertesChartData = Object.values(alertesByMonth);

  // Table : répartition lots par statut
  const statutCount = { conforme: 0, en_alerte: 0, perime: 0 };
  COUNTRY_IDS.forEach(id => {
    const p = parPays[id];
    if (!p || p.status === "offline") return;
    statutCount.conforme  += p.conforme_lots ?? 0;
    statutCount.en_alerte += p.alerte_lots   ?? 0;
    statutCount.perime    += p.perime_lots    ?? 0;
  });
  const totalLots = dashData?.total_lots || 1;
  const statutTableData = Object.entries(statutCount).map(([statut, count]) => ({
    statut,
    count,
    pct: Math.round((count / totalLots) * 100),
  }));

  return (
    <div className="reports-page">
      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { title: "Total lots",      value: dashData?.total_lots      ?? 0, color: "#1677ff" },
          { title: "Lots conformes",  value: dashData?.conforme_lots   ?? 0, color: "#52c41a" },
          { title: "Lots périmés",    value: dashData?.perime_lots     ?? 0, color: "#ff4d4f" },
          { title: "Alertes actives", value: dashData?.alertes_actives ?? 0, color: "#fa8c16" },
        ].map(s => (
          <Col xs={12} sm={6} key={s.title}>
            <Card variant="borderless" className="report-stat-card">
              <Statistic title={s.title} value={s.value}
                valueStyle={{ color: s.color, fontSize: 22 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* Pie : inventaire par pays */}
        <Col xs={24} lg={10}>
          <Card title="Inventaire par pays (lots)" variant="borderless">
            {inventoryByCountry.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={inventoryByCountry} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false}
                  >
                    {inventoryByCountry.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "#8c8c8c" }}>
                Aucune donnée
              </div>
            )}
          </Card>
        </Col>

        {/* Bar : alertes par mois */}
        <Col xs={24} lg={14}>
          <Card title="Alertes par mois" variant="borderless">
            {alertesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={alertesChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="temperature" name="Température" stackId="a" fill="#fa8c16" />
                  <Bar dataKey="humidite"    name="Humidité"    stackId="a" fill="#1677ff" />
                  <Bar dataKey="perime"      name="Péremption"  stackId="a" fill="#ff4d4f" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "#8c8c8c" }}>
                Aucune alerte enregistrée
              </div>
            )}
          </Card>
        </Col>

        {/* Table : répartition par statut */}
        <Col xs={24} lg={12}>
          <Card title="Répartition des lots par statut" variant="borderless">
            <Table
              dataSource={statutTableData}
              columns={statutColumns}
              rowKey="statut"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Export */}
        <Col xs={24} lg={12}>
          <Card title="Exporter les rapports" variant="borderless">
            <div className="export-grid">
              {[
                { icon: <FileExcelOutlined />, label: "Inventaire lots (.xlsx)",     color: "#52c41a" },
                { icon: <FileExcelOutlined />, label: "Historique alertes (.xlsx)",  color: "#52c41a" },
                { icon: <FilePdfOutlined />,   label: "Rapport qualité (.pdf)",      color: "#ff4d4f" },
                { icon: <FilePdfOutlined />,   label: "Rapport températures (.pdf)", color: "#ff4d4f" },
                { icon: <DownloadOutlined />,  label: "Données brutes (.csv)",       color: "#1677ff" },
                { icon: <DownloadOutlined />,  label: "Traçabilité complète (.csv)", color: "#1677ff" },
              ].map(e => (
                <Button
                  key={e.label} icon={e.icon}
                  style={{ justifyContent: "flex-start", color: e.color, borderColor: `${e.color}55` }}
                  onClick={() => {}}
                >
                  {e.label}
                </Button>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#8c8c8c" }}>
              * Les exports sont simulés - intégration backend à prévoir.
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reports;
