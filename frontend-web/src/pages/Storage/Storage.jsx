// Mock gardé en commentaire pour référence
// import { warehouseData, temperatureHistory, humidityHistory } from "../../services/mockData";

import React, { useState, useEffect } from "react";
import { Row, Col, Card, Select, Tag, Table, Tabs, Spin, Statistic } from "antd";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from "recharts";
import { dashboardService } from "../../services/dashboard.service";
import { alertesService } from "../../services/alertes.service";
import "./Storage.scss";

const COUNTRY_IDS = ["bresil", "equateur", "colombie"];
const FLAG  = { bresil: "🇧🇷", equateur: "🇪🇨", colombie: "🇨🇴" };
const NAMES = { bresil: "Brésil", equateur: "Équateur", colombie: "Colombie" };

const STATUT_TAG = { conforme: "success", en_alerte: "warning", perime: "error" };
const TYPE_TAG   = { temperature: "orange", humidite: "blue", perime: "red" };

const lotColumns = [
  { title: "ID Lot",        dataIndex: "id_lot",        key: "id_lot",
    render: v => <code style={{ fontSize: 11 }}>{v}</code> },
  { title: "Statut",        dataIndex: "statut",        key: "statut",
    render: v => <Tag color={STATUT_TAG[v] || "default"}>{v}</Tag> },
  { title: "Date stockage", dataIndex: "date_stockage", key: "date_stockage",
    render: v => v ? new Date(v).toLocaleDateString("fr-FR") : "-" },
];

const alerteColumns = [
  { title: "Type",    dataIndex: "type_alerte", key: "type",
    width: 120, render: v => <Tag color={TYPE_TAG[v] || "default"}>{v}</Tag> },
  { title: "Message", dataIndex: "message",     key: "message", ellipsis: true },
  { title: "Statut",  dataIndex: "statut",      key: "statut",
    width: 90,  render: v => <Tag color={v === "non_lue" ? "orange" : "default"}>{v}</Tag> },
  { title: "Date",    dataIndex: "date_alerte", key: "date",
    width: 130, render: v => v ? new Date(v).toLocaleDateString("fr-FR") : "-" },
];

const GaugeCard = ({ label, value, unit, max, thresholdWarn, thresholdCrit }) => {
  const pct  = value != null ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const fill = value == null  ? "#d9d9d9"
    : value >= thresholdCrit  ? "#ff4d4f"
    : value >= thresholdWarn  ? "#fa8c16"
    : "#52c41a";
  return (
    <Card className="gauge-card" variant="borderless">
      <div className="gauge-title">{label}</div>
      <RadialBarChart
        width={140} height={140} innerRadius={45} outerRadius={65}
        data={[{ value: pct, fill }]} startAngle={220} endAngle={-40}
        style={{ margin: "0 auto" }}
      >
        <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#f0f0f0" }} />
      </RadialBarChart>
      <div className="gauge-value" style={{ color: fill }}>
        {value != null ? value : "-"}<span className="gauge-unit">{unit}</span>
      </div>
      <div className="gauge-sub">Seuil critique : {thresholdCrit}{unit}</div>
    </Card>
  );
};

const Storage = () => {
  const [loading, setLoading]   = useState(true);
  const [options, setOptions]   = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const countryResults = await Promise.allSettled(
          COUNTRY_IDS.map(async (countryId) => {
            const [entR, mesR, lotsR, expsR, alertsR] = await Promise.allSettled([
              dashboardService.getEntrepots(countryId),
              dashboardService.getMesures(countryId),
              dashboardService.getLots(countryId),
              dashboardService.getExploitations(countryId),
              alertesService.getAll(countryId),
            ]);
            return {
              countryId,
              entrepots:    entR.status   === "fulfilled" ? (entR.value   || []) : [],
              mesures:      mesR.status   === "fulfilled" ? (mesR.value   || []) : [],
              lots:         lotsR.status  === "fulfilled" ? (lotsR.value  || []) : [],
              exploitations:expsR.status  === "fulfilled" ? (expsR.value  || []) : [],
              alertes:      alertsR.status=== "fulfilled" ? (alertsR.value|| []) : [],
            };
          })
        );

        const opts = [];
        countryResults.forEach(r => {
          if (r.status !== "fulfilled") return;
          const { countryId, entrepots, mesures, lots, exploitations, alertes } = r.value;
          entrepots.forEach(e => {
            const exploitation = exploitations.find(ex => ex.id_exploitation === e.id_exploitation);
            const entrepotLots  = lots.filter(l => l.id_entrepot === e.id_entrepot);
            opts.push({
              label:      `${FLAG[countryId]} ${e.nom} - ${e.localisation}`,
              value:      `${countryId}-${e.id_entrepot}`,
              entrepot:   e,
              exploitation,
              countryId,
              mesures,
              lots:       entrepotLots,
              alertes,
            });
          });
        });

        setOptions(opts);
        if (opts.length) setSelected(opts[0].value);
      } catch (err) {
        console.error("Erreur Storage:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 50 }}><Spin /></div>;

  if (!options.length) {
    return (
      <div style={{ padding: 50, color: "#8c8c8c", textAlign: "center" }}>
        Aucun entrepôt disponible (backends pays hors-ligne).
      </div>
    );
  }

  const cur = options.find(o => o.value === selected);
  if (!cur) return null;

  const mes = cur.mesures || [];
  const latest = mes.length
    ? mes.reduce((a, b) => new Date(a.date_mesure) > new Date(b.date_mesure) ? a : b)
    : null;

  // KPIs lots
  const totalLots    = cur.lots.length;
  const conformes    = cur.lots.filter(l => l.statut === "conforme").length;
  const enAlerte     = cur.lots.filter(l => l.statut === "en_alerte").length;
  const alertesNonLues = cur.alertes.filter(a => a.statut === "non_lue").length;

  // Historique regroupé par jour
  const byDay = {};
  mes.forEach(m => {
    const day = new Date(m.date_mesure).toLocaleDateString("fr-FR");
    if (!byDay[day]) byDay[day] = { date: day, temps: [], hums: [] };
    byDay[day].temps.push(m.temperature);
    byDay[day].hums.push(m.humidite);
  });
  const chartData = Object.values(byDay).slice(-14).map(d => ({
    date: d.date,
    temp: parseFloat(Math.max(...d.temps).toFixed(1)),
    hum:  parseFloat(Math.max(...d.hums).toFixed(1)),
  }));

  return (
    <div className="storage-page">
      {/* Sélecteur */}
      <div className="storage-toolbar">
        <span style={{ fontWeight: 600, fontSize: 16 }}>Monitoring Entrepôts</span>
        {options.length > 1 && (
          <Select
            value={selected}
            onChange={setSelected}
            style={{ width: 320 }}
            options={options.map(o => ({ value: o.value, label: o.label }))}
          />
        )}
      </div>

      {/* Carte identité */}
      <Card variant="borderless" className="wh-identity" style={{ marginBottom: 16 }}>
        <Row gutter={[24, 12]} align="middle">
          <Col>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>Entrepôt</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{cur.entrepot.nom}</div>
          </Col>
          <Col>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>Localisation</div>
            <div>{cur.entrepot.localisation}</div>
          </Col>
          <Col>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>Pays</div>
            <div>{FLAG[cur.countryId]} {NAMES[cur.countryId]}</div>
          </Col>
          {cur.exploitation && (
            <Col>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>Exploitation</div>
              <div>{cur.exploitation.nom}</div>
            </Col>
          )}
          <Col>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>Dernière mesure</div>
            <div>
              {latest
                ? new Date(latest.date_mesure).toLocaleString("fr-FR", {
                    day: "2-digit", month: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })
                : "-"}
            </div>
          </Col>
        </Row>
      </Card>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card variant="borderless" className="stat-card">
            <Statistic title="Lots stockés" value={totalLots} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card variant="borderless" className="stat-card">
            <Statistic title="Lots conformes" value={conformes}
              valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card variant="borderless" className="stat-card">
            <Statistic title="Lots en alerte" value={enAlerte}
              valueStyle={{ color: enAlerte > 0 ? "#fa8c16" : "#52c41a" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card variant="borderless" className="stat-card">
            <Statistic title="Alertes non lues" value={alertesNonLues}
              valueStyle={{ color: alertesNonLues > 0 ? "#ff4d4f" : "#52c41a" }} />
          </Card>
        </Col>
      </Row>

      {/* Onglets Conditions / Lots / Alertes */}
      <Card variant="borderless">
        <Tabs
          items={[
            {
              key: "conditions",
              label: "Conditions",
              children: (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>Mesures actuelles</div>
                  <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}>
                      <GaugeCard label="Température" value={latest?.temperature ?? null} unit="°C"
                        max={50} thresholdWarn={28} thresholdCrit={32} />
                    </Col>
                    <Col xs={12} sm={6}>
                      <GaugeCard label="Humidité" value={latest?.humidite ?? null} unit="%"
                        max={100} thresholdWarn={60} thresholdCrit={70} />
                    </Col>
                  </Row>

                  {chartData.length > 0 ? (
                    <>
                      <div style={{ fontWeight: 600, margin: "24px 0 12px" }}>
                        Pic journalier - 14 derniers jours
                      </div>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} lg={12}>
                          <Card title="Températures (°C)" variant="borderless">
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} unit="°C" />
                                <Tooltip />
                                <Line dataKey="temp" stroke="#fa8c16" strokeWidth={2} dot={false} name="T°" />
                              </LineChart>
                            </ResponsiveContainer>
                          </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                          <Card title="Humidité (%)" variant="borderless">
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} unit="%" />
                                <Tooltip />
                                <Line dataKey="hum" stroke="#1677ff" strokeWidth={2} dot={false} name="H%" />
                              </LineChart>
                            </ResponsiveContainer>
                          </Card>
                        </Col>
                      </Row>
                    </>
                  ) : (
                    <div style={{ padding: "16px 0", color: "#8c8c8c" }}>
                      Aucun historique de mesures disponible.
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "lots",
              label: `Lots stockés (${totalLots})`,
              children: (
                <Table
                  dataSource={cur.lots}
                  columns={lotColumns}
                  rowKey="id_lot"
                  size="small"
                  pagination={{ pageSize: 10, hideOnSinglePage: true }}
                  locale={{ emptyText: "Aucun lot dans cet entrepôt" }}
                />
              ),
            },
            {
              key: "alertes",
              label: (
                <span>
                  Alertes
                  {alertesNonLues > 0 && (
                    <Tag color="red" style={{ marginLeft: 6, fontSize: 11 }}>
                      {alertesNonLues}
                    </Tag>
                  )}
                </span>
              ),
              children: (
                <Table
                  dataSource={cur.alertes}
                  columns={alerteColumns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10, hideOnSinglePage: true }}
                  locale={{ emptyText: "Aucune alerte" }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Storage;
