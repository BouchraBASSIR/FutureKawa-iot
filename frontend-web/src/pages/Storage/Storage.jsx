import React, { useState, useEffect } from "react";
import {
  Row, Col, Card, Select, Tag, Table, Tabs, Spin, Empty, Badge, DatePicker,
} from "antd";
import dayjs from "dayjs";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { WifiOutlined, CheckCircleOutlined, WarningOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { dashboardService } from "../../services/dashboard.service";
import { alertesService } from "../../services/alertes.service";
import { useAuth } from "../../context/AuthContext";
import "./Storage.scss";

const FLAG   = { bresil: "🇧🇷", equateur: "🇪🇨", colombie: "🇨🇴" };
const NAMES  = { bresil: "Brésil", equateur: "Équateur", colombie: "Colombie" };
const ALL_COUNTRIES = ["bresil", "equateur", "colombie"];

const KPICard = ({ label, value, color, sub }) => (
  <div className="kpi-card" style={{ borderLeftColor: color }}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value" style={{ color }}>{value ?? "-"}</div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

// ─── SVG Gauge (arc 270°, zones colorées) ────────────────────────────────────

const SvgGauge = ({ value, max, label, unit, thresholdWarn, thresholdCrit }) => {
  const r = 70, cx = 110, cy = 105;
  const circ   = 2 * Math.PI * r;
  const arcLen = circ * 0.75; // 270° = 75% du cercle

  const pctWarn = thresholdWarn / max;
  const pctCrit = thresholdCrit / max;
  const pctVal  = value != null ? Math.min(Math.max(value / max, 0), 1) : 0;

  // Longueurs des 3 zones sur la piste de fond
  const lenGreen  = (pctWarn              * arcLen).toFixed(2);
  const lenOrange = ((pctCrit - pctWarn)  * arcLen).toFixed(2);
  const lenRed    = ((1       - pctCrit)  * arcLen).toFixed(2);

  // Décalages : chaque zone commence après la précédente
  const offGreen  = 0;
  const offOrange = parseFloat(lenGreen);
  const offRed    = parseFloat(lenGreen) + parseFloat(lenOrange);

  // Couleur de la valeur courante
  const color =
    value == null          ? "#bfbfbf" :
    value >= thresholdCrit ? "#ff4d4f" :
    value >= thresholdWarn ? "#fa8c16" :
    "#52c41a";

  const filled = (pctVal * arcLen).toFixed(2);

  // strokeDasharray pour un segment décalé : segment visible, gap, puis reste
  const zoneArc = (len, offset) =>
    `0 ${offset} ${len} ${(circ - offset - parseFloat(len)).toFixed(2)}`;

  return (
    <div className="svg-gauge">
      <svg viewBox="0 0 220 195" width="100%">
        {/* Zone verte (0 → seuil alerte) */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="#b7eb8f" strokeWidth={16} strokeLinecap="butt"
          strokeDasharray={zoneArc(lenGreen, offGreen)}
          transform={`rotate(135 ${cx} ${cy})`} />
        {/* Zone orange (seuil alerte → seuil critique) */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="#ffd591" strokeWidth={16} strokeLinecap="butt"
          strokeDasharray={zoneArc(lenOrange, offOrange)}
          transform={`rotate(135 ${cx} ${cy})`} />
        {/* Zone rouge (seuil critique → max) */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="#ffccc7" strokeWidth={16} strokeLinecap="butt"
          strokeDasharray={zoneArc(lenRed, offRed)}
          transform={`rotate(135 ${cx} ${cy})`} />
        {/* Aiguille de valeur (arc plein par-dessus) */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          transform={`rotate(135 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray .5s ease, stroke .3s" }} />
        {/* Valeur numérique */}
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={36} fontWeight={800} fill={color}>
          {value != null ? value : "–"}
        </text>
        <text x={cx} y={cy + 30} textAnchor="middle" fontSize={14} fill="#8c8c8c">
          {unit}
        </text>
        {/* Bornes */}
        <text x={24}  y={186} textAnchor="middle" fontSize={10} fill="#aaa">0</text>
        <text x={196} y={186} textAnchor="middle" fontSize={10} fill="#aaa">{max}</text>
      </svg>
      <div className="gauge-label">{label}</div>
      <div className="gauge-thresholds">
        <span className="gauge-th gauge-th--warn">Alerte &gt; {thresholdWarn}{unit}</span>
        <span className="gauge-th gauge-th--crit">Critique &gt; {thresholdCrit}{unit}</span>
      </div>
    </div>
  );
};

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name} : <b>{p.value}{unit}</b>
        </div>
      ))}
    </div>
  );
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const Storage = () => {
  const { getAllowedPays, getEntrepotsForPays } = useAuth();

  const [loading,     setLoading]     = useState(true);
  const [options,     setOptions]     = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [mesures,     setMesures]     = useState([]);
  const [mesLoading,  setMesLoading]  = useState(false);
  const [config,      setConfig]      = useState(null);
  const [dateRange,   setDateRange]   = useState([dayjs().subtract(7, "day"), dayjs()]);

  const allowedPays   = getAllowedPays();
  const targetCountries = allowedPays ?? ALL_COUNTRIES;

  // ── Load entrepôts metadata ────────────────────────────────

  const loadMesures = (countryId, entrepotId) => {
    setMesLoading(true);
    Promise.allSettled([
      dashboardService.getMesuresParEntrepot(countryId, entrepotId),
      dashboardService.getConfig(countryId),
    ]).then(([mesR, cfgR]) => {
      setMesures(mesR.status === "fulfilled" ? (mesR.value || []) : []);
      setConfig(cfgR.status  === "fulfilled" ? cfgR.value         : null);
      setMesLoading(false);
    });
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled(
          targetCountries.map(async (cId) => {
            const [entR, lotsR, capR, alertsR] = await Promise.allSettled([
              dashboardService.getEntrepots(cId),
              dashboardService.getLots(cId),
              dashboardService.getCapteurs(cId),
              alertesService.getAll(cId),
            ]);
            return {
              cId,
              entrepots: entR.status    === "fulfilled" ? (entR.value    || []) : [],
              lots:      lotsR.status   === "fulfilled" ? (lotsR.value   || []) : [],
              capteurs:  capR.status    === "fulfilled" ? (capR.value    || []) : [],
              alertes:   alertsR.status === "fulfilled" ? (alertsR.value || []) : [],
            };
          })
        );

        const opts = [];
        results.forEach(r => {
          if (r.status !== "fulfilled") return;
          const { cId, entrepots, lots, capteurs, alertes } = r.value;
          const allowedEnt = getEntrepotsForPays(cId); // null = all, [] = none

          entrepots.forEach(e => {
            if (allowedEnt !== null && !allowedEnt.includes(e.id_entrepot)) return;
            const entLots    = lots.filter(l => l.id_entrepot === e.id_entrepot);
            const entCaps    = capteurs.filter(c => c.id_entrepot === e.id_entrepot);
            // Alertes lots filtrées par entrepôt ; alertes mesures filtrées par id_entrepot si dispo
            const entAlertes = alertes.filter(a =>
              a.kind === "lot"
                ? entLots.some(l => l.id_lot === a.id_lot)
                : a.id_entrepot == null || a.id_entrepot === e.id_entrepot
            );
            opts.push({
              value:     `${cId}-${e.id_entrepot}`,
              label:     `${FLAG[cId]} ${e.nom} - ${e.localisation}`,
              entrepot:  e,
              countryId: cId,
              lots:      entLots,
              capteurs:  entCaps,
              alertes:   entAlertes,
            });
          });
        });

        setOptions(opts);
        if (opts.length) {
          const first = opts[0];
          setSelected(first.value);
          loadMesures(first.countryId, first.entrepot.id_entrepot);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (val) => {
    setSelected(val);
    const opt = options.find(o => o.value === val);
    if (opt) loadMesures(opt.countryId, opt.entrepot.id_entrepot);
  };

  // ── Derived data ───────────────────────────────────────────

  const cur = options.find(o => o.value === selected);

  const latest = mesures.length
    ? mesures.reduce((a, b) => new Date(a.date_mesure) > new Date(b.date_mesure) ? a : b)
    : null;

  const chartData = (() => {
    const [from, to] = dateRange ?? [];
    if (!from || !to) return [];

    const fromMs = from.startOf("day").valueOf();
    const toMs   = to.endOf("day").valueOf();
    const diffHours = to.diff(from, "hour");

    const filtered = mesures.filter(m => {
      const t = new Date(m.date_mesure).getTime();
      return t >= fromMs && t <= toMs;
    });

    // Moins de 48h → regrouper par heure
    if (diffHours < 48) {
      const byHour = {};
      filtered.forEach(m => {
        const d   = new Date(m.date_mesure);
        const key = `${d.toLocaleDateString("fr-FR")} ${String(d.getHours()).padStart(2, "0")}h`;
        if (!byHour[key]) byHour[key] = { date: `${String(d.getHours()).padStart(2, "0")}h`, temps: [], hums: [] };
        byHour[key].temps.push(m.temperature);
        byHour[key].hums.push(m.humidite);
      });
      return Object.values(byHour).map(d => ({
        date: d.date,
        temp: parseFloat((d.temps.reduce((a, b) => a + b, 0) / d.temps.length).toFixed(1)),
        hum:  parseFloat((d.hums.reduce((a, b)  => a + b, 0) / d.hums.length).toFixed(1)),
      }));
    }

    // Sinon regrouper par jour
    const byDay = {};
    filtered.forEach(m => {
      const key = new Date(m.date_mesure).toLocaleDateString("fr-FR");
      if (!byDay[key]) byDay[key] = { date: key, temps: [], hums: [] };
      byDay[key].temps.push(m.temperature);
      byDay[key].hums.push(m.humidite);
    });
    return Object.values(byDay).map(d => ({
      date: d.date,
      temp: parseFloat((d.temps.reduce((a, b) => a + b, 0) / d.temps.length).toFixed(1)),
      hum:  parseFloat((d.hums.reduce((a, b)  => a + b, 0) / d.hums.length).toFixed(1)),
    }));
  })();

  // Seuils tirés uniquement de la config backend
  const thTemp = config ? {
    warn: parseFloat((config.temp_ideale + config.tolerance_temp * 0.7).toFixed(1)),
    crit: parseFloat((config.temp_ideale + config.tolerance_temp).toFixed(1)),
    max:  Math.ceil(config.temp_ideale + config.tolerance_temp * 2),
  } : null;

  const thHum = config ? {
    warn: parseFloat((config.hum_ideale + config.tolerance_hum * 0.7).toFixed(1)),
    crit: parseFloat((config.hum_ideale + config.tolerance_hum).toFixed(1)),
    max:  100,
  } : null;

  // ── KPIs ──────────────────────────────────────────────────

  const totalLots      = cur?.lots.length ?? 0;
  const conformes      = cur?.lots.filter(l => l.statut === "conforme").length  ?? 0;
  const enAlerte       = cur?.lots.filter(l => l.statut === "en_alerte").length ?? 0;
  const alertesNonLues = cur?.alertes.filter(a => a.statut === "non_lue").length ?? 0;
  const nbCapteurs     = cur?.capteurs.length ?? 0;
  const capActifs      = cur?.capteurs.filter(c => c.statut === "actif").length ?? 0;

  // ── Table columns ─────────────────────────────────────────

  const lotCols = [
    {
      title: "ID Lot", dataIndex: "id_lot", key: "id_lot",
      render: v => <code style={{ fontSize: 11 }}>{v}</code>,
    },
    {
      title: "Statut", dataIndex: "statut", key: "statut",
      render: v => (
        <Tag color={{ conforme: "success", en_alerte: "warning", perime: "error" }[v] || "default"}>
          {v}
        </Tag>
      ),
    },
    {
      title: "Date stockage", dataIndex: "date_stockage", key: "date_stockage",
      render: v => v ? new Date(v).toLocaleDateString("fr-FR") : "-",
      sorter: (a, b) => new Date(a.date_stockage) - new Date(b.date_stockage),
    },
    {
      title: "Durée", key: "duree",
      render: (_, r) => {
        if (!r.date_stockage) return "-";
        const j = Math.floor((Date.now() - new Date(r.date_stockage)) / 86400000);
        return <span style={{ color: j > 330 ? "#ff4d4f" : j > 300 ? "#fa8c16" : undefined }}>{j} j</span>;
      },
      sorter: (a, b) => new Date(a.date_stockage) - new Date(b.date_stockage),
    },
  ];

  const capCols = [
    {
      title: "Référence", dataIndex: "reference", key: "ref",
      render: v => <code style={{ fontSize: 11 }}>{v}</code>,
    },
    {
      title: "Type", dataIndex: "type_capteur", key: "type",
      render: v => <Tag icon={<WifiOutlined />} color="blue">{v}</Tag>,
    },
    {
      title: "Statut", dataIndex: "statut", key: "statut",
      render: v => (
        <Tag
          color={v === "actif" ? "success" : "default"}
          icon={v === "actif" ? <CheckCircleOutlined /> : <WarningOutlined />}
        >
          {v}
        </Tag>
      ),
    },
  ];

  const alertCols = [
    {
      title: "Type", dataIndex: "type_alerte", key: "type", width: 120,
      render: v => (
        <Tag color={{ temperature: "orange", humidite: "blue", perime: "red" }[v] || "default"}>
          {v}
        </Tag>
      ),
    },
    { title: "Message", dataIndex: "message", key: "msg", ellipsis: true },
    {
      title: "Statut", dataIndex: "statut", key: "statut", width: 110,
      render: v => <Tag color={v === "non_lue" ? "orange" : "default"}>{v}</Tag>,
    },
    {
      title: "Date", dataIndex: "date_alerte", key: "date", width: 120,
      render: v => v ? new Date(v).toLocaleDateString("fr-FR") : "-",
      sorter: (a, b) => new Date(b.date_alerte) - new Date(a.date_alerte),
    },
  ];

  // ── Render ────────────────────────────────────────────────

  if (loading) return <div className="storage-loading"><Spin size="large" /></div>;

  if (!options.length) return (
    <div className="storage-empty">
      <Empty description="Aucun entrepôt disponible (backends pays hors-ligne)" />
    </div>
  );

  return (
    <div className="storage-page">

      {/* ── Header ── */}
      <div className="storage-header">
        <div className="storage-title-block">
          <h2 className="storage-title">Monitoring Entrepôts</h2>
          {cur && (
            <Tag color="blue" style={{ marginLeft: 8, fontSize: 13 }}>
              {FLAG[cur.countryId]} {NAMES[cur.countryId]}
            </Tag>
          )}
        </div>
        {options.length > 1 && (
          <Select
            value={selected}
            onChange={handleSelect}
            style={{ minWidth: 300 }}
            options={options.map(o => ({ value: o.value, label: o.label }))}
          />
        )}
      </div>

      {/* ── Identity ── */}
      {cur && (
        <Card className="identity-card" variant="borderless">
          <Row gutter={[32, 8]} wrap>
            <Col>
              <div className="id-label">Entrepôt</div>
              <div className="id-value">{cur.entrepot.nom}</div>
            </Col>
            <Col>
              <div className="id-label">Localisation</div>
              <div className="id-value">{cur.entrepot.localisation}</div>
            </Col>
            <Col>
              <div className="id-label">Capteurs IoT</div>
              <div className="id-value">
                <Badge count={nbCapteurs - capActifs} size="small" color="orange" offset={[6, 0]}>
                  <span>{capActifs} / {nbCapteurs} actifs</span>
                </Badge>
              </div>
            </Col>
            <Col>
              <div className="id-label">Dernière mesure</div>
              <div className="id-value">
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
      )}

      {/* ── KPIs ── */}
      <Row gutter={[12, 12]} className="kpi-row">
        <Col xs={12} sm={6}>
          <KPICard label="Lots stockés"     value={totalLots}      color="#1677ff" />
        </Col>
        <Col xs={12} sm={6}>
          <KPICard label="Conformes"        value={conformes}      color="#52c41a" />
        </Col>
        <Col xs={12} sm={6}>
          <KPICard label="En alerte"        value={enAlerte}       color={enAlerte       > 0 ? "#fa8c16" : "#52c41a"} />
        </Col>
        <Col xs={12} sm={6}>
          <KPICard label="Alertes non lues" value={alertesNonLues} color={alertesNonLues > 0 ? "#ff4d4f" : "#52c41a"} />
        </Col>
      </Row>

      {/* ── Tabs ── */}
      <Card variant="borderless" className="storage-tabs-card">
        <Tabs
          items={[
            {
              key: "conditions",
              label: "Conditions IoT",
              children: mesLoading
                ? <div className="tab-loading"><Spin /></div>
                : (
                  <>
                    {/* Gauges */}
                    {!config ? (
                      <Empty
                        description="Configuration entrepôt introuvable - seuils non disponibles"
                        style={{ margin: "24px 0" }}
                      />
                    ) : (
                      <Row gutter={[16, 16]} className="gauges-row">
                        <Col xs={24} sm={12} md={10} lg={8} xl={6}>
                          <SvgGauge
                            label="Température"
                            value={latest?.temperature != null
                              ? parseFloat(latest.temperature.toFixed(1)) : null}
                            unit="°C" max={thTemp.max}
                            thresholdWarn={thTemp.warn} thresholdCrit={thTemp.crit}
                          />
                        </Col>
                        <Col xs={24} sm={12} md={10} lg={8} xl={6}>
                          <SvgGauge
                            label="Humidité relative"
                            value={latest?.humidite != null
                              ? parseFloat(latest.humidite.toFixed(1)) : null}
                            unit="%" max={thHum.max}
                            thresholdWarn={thHum.warn} thresholdCrit={thHum.crit}
                          />
                        </Col>
                      </Row>
                    )}

                    {/* Charts */}
                    {chartData.length > 0 ? (
                      <>
                        <div className="chart-section-header">
                          <div className="chart-section-title">Tendances</div>
                          <DatePicker.RangePicker
                            value={dateRange}
                            onChange={v => setDateRange(v)}
                            size="small"
                            showTime={{ format: "HH:mm" }}
                            disabledDate={d => d && d.isAfter(dayjs())}
                            presets={[
                              { label: "Dernières 6h",      value: [dayjs().subtract(6,  "hour"), dayjs()] },
                              { label: "Dernières 24h",     value: [dayjs().subtract(24, "hour"), dayjs()] },
                              { label: "7 derniers jours",  value: [dayjs().subtract(7,  "day"),  dayjs()] },
                              { label: "14 derniers jours", value: [dayjs().subtract(14, "day"),  dayjs()] },
                              { label: "30 derniers jours", value: [dayjs().subtract(30, "day"),  dayjs()] },
                            ]}
                            separator={<ArrowRightOutlined style={{ color: "#1677ff", fontSize: 12 }} />}
                            allowClear={false}
                            format="DD/MM/YYYY HH:mm"
                          />
                        </div>
                        <Row gutter={[16, 16]}>
                          <Col xs={24} lg={12}>
                            <Card title="Température (°C)" variant="borderless" className="chart-card">
                              <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={chartData}
                                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="gTemp" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%"  stopColor="#fa8c16" stopOpacity={0.3} />
                                      <stop offset="95%" stopColor="#fa8c16" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                  <YAxis tick={{ fontSize: 10 }} unit="°C" domain={["auto", "auto"]} />
                                  <Tooltip content={<ChartTooltip unit="°C" />} />
                                  <ReferenceLine y={thTemp.crit} stroke="#ff4d4f" strokeDasharray="4 2"
                                    label={{ value: "Critique", position: "insideTopRight",
                                      fill: "#ff4d4f", fontSize: 10 }} />
                                  <ReferenceLine y={thTemp.warn} stroke="#fa8c16" strokeDasharray="4 2"
                                    label={{ value: "Alerte", position: "insideTopRight",
                                      fill: "#fa8c16", fontSize: 10 }} />
                                  <Area dataKey="temp" name="Température" stroke="#fa8c16"
                                    fill="url(#gTemp)" strokeWidth={2} dot={false} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </Card>
                          </Col>
                          <Col xs={24} lg={12}>
                            <Card title="Humidité (%)" variant="borderless" className="chart-card">
                              <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={chartData}
                                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="gHum" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%"  stopColor="#1677ff" stopOpacity={0.2} />
                                      <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                  <YAxis tick={{ fontSize: 10 }} unit="%" domain={["auto", "auto"]} />
                                  <Tooltip content={<ChartTooltip unit="%" />} />
                                  <ReferenceLine y={thHum.crit} stroke="#ff4d4f" strokeDasharray="4 2"
                                    label={{ value: "Critique", position: "insideTopRight",
                                      fill: "#ff4d4f", fontSize: 10 }} />
                                  <ReferenceLine y={thHum.warn} stroke="#fa8c16" strokeDasharray="4 2"
                                    label={{ value: "Alerte", position: "insideTopRight",
                                      fill: "#fa8c16", fontSize: 10 }} />
                                  <Area dataKey="hum" name="Humidité" stroke="#1677ff"
                                    fill="url(#gHum)" strokeWidth={2} dot={false} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </Card>
                          </Col>
                        </Row>
                      </>
                    ) : (
                      <Empty description="Aucun historique de mesures pour cet entrepôt"
                        style={{ marginTop: 32 }} />
                    )}
                  </>
                ),
            },
            {
              key: "lots",
              label: `Lots stockés (${totalLots})`,
              children: (
                <Table
                  dataSource={cur?.lots} columns={lotCols} rowKey="id_lot"
                  size="small"
                  pagination={{ pageSize: 10, hideOnSinglePage: true }}
                  locale={{ emptyText: "Aucun lot dans cet entrepôt" }}
                />
              ),
            },
            {
              key: "capteurs",
              label: `Capteurs IoT (${nbCapteurs})`,
              children: (
                <Table
                  dataSource={cur?.capteurs} columns={capCols} rowKey="id_capteur"
                  size="small"
                  pagination={{ hideOnSinglePage: true }}
                  locale={{ emptyText: "Aucun capteur enregistré pour cet entrepôt" }}
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
                  dataSource={cur?.alertes} columns={alertCols} rowKey="id"
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
