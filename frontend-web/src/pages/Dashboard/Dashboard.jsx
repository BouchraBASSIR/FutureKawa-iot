import React, { useEffect, useState, useContext, useMemo } from "react";
import { Row, Col, Card, Table, Tag, Typography, Select, Spin, Alert } from "antd";
// Tag gardé pour les colonnes du tableau des alertes
import {
  ThunderboltOutlined, WarningOutlined, DashboardOutlined, ExperimentOutlined,
} from "@ant-design/icons";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import WorldMap from "../../components/layout/WorldMap/WorldMap";
import { dashboardService } from "../../services/dashboard.service";
import { CountryContext } from "../../context/country";
import { useAuth } from "../../context/AuthContext";
import ScopeBadge from "../../components/common/ScopeBadge";
import "./Dashboard.scss";

const { Text } = Typography;

const COUNTRY_COLORS = {
  bresil:   "#1677ff",
  colombie: "#52c41a",
  equateur: "#fa8c16",
};

const FLAG = { bresil: "🇧🇷", equateur: "🇪🇨", colombie: "🇨🇴" };

const ALERT_TYPE_TAG = {
  temperature: { color: "orange", label: "Température" },
  humidite:    { color: "blue",   label: "Humidité"    },
  perime:      { color: "red",    label: "Péremption"  },
};

const alertColumns = [
  {
    title: "Type",
    dataIndex: "type_alerte",
    key: "type_alerte",
    width: 110,
    render: (v) => {
      const cfg = ALERT_TYPE_TAG[v] || { color: "default", label: v };
      return <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>;
    },
  },
  {
    title: "Message",
    dataIndex: "message",
    key: "message",
    ellipsis: true,
  },
  {
    title: "Pays",
    key: "pays",
    width: 90,
    render: (_, r) => r.country_id ? `${FLAG[r.country_id] || ""} ${r.pays_nom || r.country_id}` : "_",
  },
  {
    title: "Date",
    dataIndex: "date_alerte",
    key: "date_alerte",
    width: 100,
    render: (v) => v
      ? new Date(v).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "_",
  },
];

// ── Composant KPI Card ───────────────────────────────────────────────────────
const KPICard = ({ icon, label, value, unit, color, sub }) => (
  <Card className="kpi-card" variant="borderless">
    <div className="kpi-icon" style={{ background: `${color}18`, color }}>{icon}</div>
    <div className="kpi-body">
      <div className="kpi-value">{value ?? "_"}<span className="kpi-unit">{unit}</span></div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  </Card>
);

// ── Helpers graphiques ───────────────────────────────────────────────────────
const buildChartData = (mesures, countryId) => {
  const byDay = {};
  mesures.forEach(m => {
    const day = new Date(m.date_mesure).toLocaleDateString("fr-FR");
    if (!byDay[day]) byDay[day] = { date: day, temps: [], hums: [] };
    byDay[day].temps.push(m.temperature);
    byDay[day].hums.push(m.humidite);
  });
  return Object.values(byDay).slice(-30).map(d => ({
    date: d.date,
    [countryId + "_temp"]: parseFloat((d.temps.reduce((s, v) => s + v, 0) / d.temps.length).toFixed(1)),
    [countryId + "_hum"]:  parseFloat((d.hums.reduce((s, v)  => s + v, 0) / d.hums.length).toFixed(1)),
  }));
};

const mergeChartData = (datasets) => {
  const merged = {};
  datasets.forEach(rows =>
    rows.forEach(row => {
      if (!merged[row.date]) merged[row.date] = { date: row.date };
      Object.assign(merged[row.date], row);
    })
  );
  return Object.values(merged).sort((a, b) => {
    const [da, ma, ya] = a.date.split("/").map(Number);
    const [db, mb, yb] = b.date.split("/").map(Number);
    return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
  });
};

const COUNTRY_OPTIONS = [
  { label: "🇧🇷 Brésil",   value: "bresil"   },
  { label: "🇪🇨 Équateur", value: "equateur" },
  { label: "🇨🇴 Colombie", value: "colombie" },
];

// ── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { selectedCountry, setSelectedCountry } = useContext(CountryContext);
  const { hasRole, profile } = useAuth();
  const [loading, setLoading]  = useState(true);
  const [kpi, setKpi]          = useState(null);
  const [alerts, setAlerts]    = useState([]);
  const [chartData, setChart]  = useState([]);
  const [activeCountries, setActiveCountries] = useState([]);

  // Liste des pays accessibles selon le rôle.
  // null = pas de restriction (admin), sinon tableau des pays du JWT.
  const allowedPays = useMemo(() => {
    if (hasRole("admin")) return null;
    const unique = [...new Set((profile?.accesses ?? []).map(a => a.pays))];
    return unique.length ? unique : null;
  }, [hasRole, profile]);

  // Entrepôt assigné (pour l'affichage du ScopeBadge)
  const scopeAccess = allowedPays?.length === 1
    ? profile?.accesses?.find(a => a.pays === allowedPays[0])
    : null;

  // Verrouille le pays sélectionné dès qu'on connaît les accès
  useEffect(() => {
    if (allowedPays?.length === 1 && selectedCountry !== allowedPays[0]) {
      setSelectedCountry(allowedPays[0]);
    }
  }, [allowedPays]); // eslint-disable-line react-hooks/exhaustive-deps

  // Options du sélecteur filtrées selon les accès
  const selectOptions = useMemo(() => {
    if (allowedPays === null) {
      return [{ label: "Tous les pays", value: "all" }, ...COUNTRY_OPTIONS];
    }
    return COUNTRY_OPTIONS.filter(o => allowedPays.includes(o.value));
  }, [allowedPays]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const dashData = await dashboardService.getDashboard();
        setKpi(dashData);

        const onlinePays = dashData?.par_pays
          ? Object.entries(dashData.par_pays)
              .filter(([, v]) => v?.status !== "offline")
              .map(([k]) => k)
          : [];
        setActiveCountries(onlinePays);

        // Pays hors-ligne : pas la peine d'attendre le timeout côté backend
        const isOfflineSelected =
          selectedCountry && selectedCountry !== "all" && !onlinePays.includes(selectedCountry);
        if (isOfflineSelected) {
          setAlerts([]);
          setChart([]);
          return;
        }

        const targetCountries =
          selectedCountry && selectedCountry !== "all" ? [selectedCountry] : onlinePays;

        const [alertsData, ...mesuresData] = await Promise.all([
          dashboardService.getAlerts(selectedCountry),
          ...targetCountries.map(id => dashboardService.getMesures(id)),
        ]);
        setAlerts(alertsData);

        const datasets = mesuresData.map((mesures, i) => {
          if (!Array.isArray(mesures)) return [];
          return buildChartData(mesures, targetCountries[i]);
        });
        setChart(mergeChartData(datasets));
      } catch (err) {
        console.error("Erreur dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedCountry]);

  const isFiltered = !!(selectedCountry && selectedCountry !== "all");

  // KPI : pays sélectionné ou globaux ; pour "tous les pays" on calcule les moyennes T°/humidité
  const kpiSource = useMemo(() => {
    if (!kpi) return null;
    if (isFiltered) {
      const cd = kpi.par_pays?.[selectedCountry];
      if (!cd || cd.status === "offline") {
        return { total_lots: 0, conforme_lots: 0, alerte_lots: 0, perime_lots: 0, alertes_actives: 0, status: "offline" };
      }
      return cd;
    }
    const online = Object.values(kpi.par_pays || {}).filter(p => p?.status !== "offline");
    const temps = online.map(p => p?.temp_moyenne).filter(v => v != null);
    const hums  = online.map(p => p?.humidite_moyenne).filter(v => v != null);
    return {
      ...kpi,
      temp_moyenne:     temps.length ? parseFloat((temps.reduce((s, v) => s + v, 0) / temps.length).toFixed(1)) : null,
      humidite_moyenne: hums.length  ? parseFloat((hums.reduce((s, v)  => s + v, 0) / hums.length).toFixed(1))  : null,
    };
  }, [kpi, isFiltered, selectedCountry]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: "50px" }}><Spin /></div>;
  }

  // Légende carte : uniquement le pays sélectionné, ou tous les pays
  const legendEntries = isFiltered
    ? [[selectedCountry, kpi?.par_pays?.[selectedCountry] || {}]]
    : Object.entries(kpi?.par_pays || {});

  // N'affiche pas la ligne de graphique pour un pays hors-ligne
  const displayCountries = isFiltered
    ? (activeCountries.includes(selectedCountry) ? [selectedCountry] : [])
    : activeCountries;

  const nonLues = alerts.filter(a => a.statut === "non_lue").length;

  return (
    <div className="dashboard">
      {/* Alerte visuelle quand le pays sélectionné est hors-ligne */}
      {isFiltered && kpiSource?.status === "offline" && (
        <Alert
          type="warning"
          showIcon
          message={`Le backend ${selectedCountry} est hors-ligne - les données affichées ne sont pas à jour.`}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Sélecteur pays ou badge de périmètre */}
      <Row style={{ marginBottom: 20 }} align="middle">
        <Col xs={24} sm={8}>
          {allowedPays?.length === 1 ? (
            <ScopeBadge
              pays={allowedPays[0]}
              entrepotId={scopeAccess?.entrepot_id}
            />
          ) : (
            <Select
              value={selectedCountry}
              onChange={(value) => setSelectedCountry(value)}
              style={{ width: "100%" }}
              options={selectOptions}
            />
          )}
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="kpi-row">
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            icon={<ThunderboltOutlined />}
            label="Total lots"
            value={kpiSource?.total_lots ?? 0}
            color="#1677ff"
            sub={`${kpiSource?.conforme_lots ?? 0} conformes · ${kpiSource?.perime_lots ?? 0} périmés`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            icon={<WarningOutlined />}
            label="Alertes actives"
            value={kpiSource?.alertes_actives ?? nonLues}
            color="#ff4d4f"
            sub={`${nonLues} non lue${nonLues > 1 ? "s" : ""}`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            icon={<DashboardOutlined />}
            label="Température moy."
            value={kpiSource?.temp_moyenne ?? "_"}
            unit="°C"
            color="#fa8c16"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            icon={<ExperimentOutlined />}
            label="Humidité moy."
            value={kpiSource?.humidite_moyenne ?? "_"}
            unit="%"
            color="#52c41a"
          />
        </Col>
      </Row>

      {/* Carte + alertes */}
      <Row gutter={[16, 16]} className="dashboard-row" style={{ marginTop: 20 }}>
        <Col xs={24} xl={13}>
          <Card title="Zones d'approvisionnement" variant="borderless" className="map-card">
            <WorldMap allowedPays={allowedPays} />
            <div className="map-legend" style={{ marginTop: 12 }}>
              {legendEntries.map(([id, data]) => (
                <div key={id} className="map-legend-item">
                  <span className="map-legend-dot" style={{ background: COUNTRY_COLORS[id] }} />
                  <span style={{ fontWeight: 500 }}>{FLAG[id]} {data?.pays?.charAt(0).toUpperCase() + data?.pays?.slice(1) || id}</span>
                  <Tag color="blue" style={{ marginLeft: 4 }}>{data?.total_lots ?? 0} lots</Tag>
                  <Tag color={data?.alertes_actives > 0 ? "orange" : "green"}>
                    {data?.alertes_actives ?? 0} alerte{data?.alertes_actives > 1 ? "s" : ""}
                  </Tag>
                  {data?.status === "offline" && <Tag color="default">hors-ligne</Tag>}
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={11}>
          <Card
            title={`Alertes récentes (${alerts.length})`}
            extra={nonLues > 0 && <Tag color="red">{nonLues} non lue{nonLues > 1 ? "s" : ""}</Tag>}
            variant="borderless"
            className="alerts-card"
          >
            <Table
              dataSource={alerts.slice(0, 6)}
              columns={alertColumns}
              rowKey={(r) => r.id || `${r.country_id}-${r.date_alerte}`}
              pagination={false}
              size="small"
              rowClassName={(r) => r.statut === "lue" ? "row-ack" : "row-active"}
              locale={{ emptyText: "Aucune alerte" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Graphiques */}
      <Row gutter={[16, 16]} className="dashboard-row" style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <Card title="Températures - 30 derniers jours (°C)" variant="borderless">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(chartData.length / 6) - 1)} />
                <YAxis tick={{ fontSize: 11 }} unit="°C" />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
                {displayCountries.map(id => (
                  <Line key={id} dataKey={`${id}_temp`} stroke={COUNTRY_COLORS[id]}
                    strokeWidth={2} dot={false} name={`${FLAG[id] || ""} ${id}`} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Humidité - 30 derniers jours (%)" variant="borderless">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(chartData.length / 6) - 1)} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
                {displayCountries.map(id => (
                  <Line key={id} dataKey={`${id}_hum`} stroke={COUNTRY_COLORS[id]}
                    strokeWidth={2} dot={false} name={`${FLAG[id] || ""} ${id}`} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
