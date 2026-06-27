import React, { useState, useEffect } from "react";
import {
  Row, Col, Card, Button, Table, Tag, Spin, Select, DatePicker, Divider, Space,
} from "antd";
import {
  FileExcelOutlined, FilePdfOutlined, ArrowRightOutlined, DownloadOutlined,
} from "@ant-design/icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import dayjs from "dayjs";
import { dashboardService } from "../../services/dashboard.service";
import { alertesService } from "../../services/alertes.service";
import { useAuth } from "../../context/AuthContext";
import "./Reports.scss";

const COUNTRY_IDS = ["bresil", "equateur", "colombie"];
const NAMES  = { bresil: "Brésil",   equateur: "Équateur", colombie: "Colombie" };
const FLAG   = { bresil: "🇧🇷",      equateur: "🇪🇨",       colombie: "🇨🇴" };
// Version sans emoji ni accents pour jsPDF (latin-1)
const NAMES_PDF = { bresil: "Bresil", equateur: "Equateur", colombie: "Colombie" };
const PIE_COLORS  = ["#1677ff", "#52c41a", "#fa8c16"];
const MONTH_NAMES = ["Jan","Fev","Mar","Avr","Mai","Jun","Jul","Aou","Sep","Oct","Nov","Dec"];

// ─── Export CSV ───────────────────────────────────────────────────────────────

const downloadCSV = (filename, headers, rows) => {
  const esc  = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob(
    [[headers, ...rows].map(r => r.map(esc).join(",")).join("\n")],
    { type: "text/csv;charset=utf-8;" }
  );
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob), download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
};

// ─── Export Excel ─────────────────────────────────────────────────────────────

const downloadXLSX = async (filename, sheets) => {
  const XLSX = await import("xlsx");
  const wb   = XLSX.utils.book_new();
  sheets.forEach(({ name, headers, rows }) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Largeur colonnes auto
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, filename);
};

// ─── Export PDF ───────────────────────────────────────────────────────────────

const BLUE  = [22, 119, 255];
const LBLUE = [230, 244, 255];
const DARK  = [26, 26, 46];
const GRAY  = [120, 120, 140];

const downloadPDF = async (filename, title, syntheseRows, alertesRows, dateLabel) => {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W    = 210;
  const now  = dayjs().format("DD/MM/YYYY HH:mm");

  // ── Bandeau haut ──────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 22, "F");

  // Bande décorative fine
  doc.setFillColor(255, 255, 255, 0.15);
  doc.rect(0, 19, W, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("FutureKawa IoT", 10, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(title, 10, 17);
  doc.text("Genere le : " + now, W - 10, 17, { align: "right" });

  // ── Période filtrée ───────────────────────────────────────────────────────
  doc.setFillColor(...LBLUE);
  doc.roundedRect(10, 26, W - 20, 10, 2, 2, "F");
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Periode analysee : " + dateLabel, 14, 32.5);

  // ── KPIs synthèse ─────────────────────────────────────────────────────────
  const totalLots    = syntheseRows.reduce((s, r) => s + (parseInt(r[1]) || 0), 0);
  const totalConf    = syntheseRows.reduce((s, r) => s + (parseInt(r[2]) || 0), 0);
  const totalAlerte  = syntheseRows.reduce((s, r) => s + (parseInt(r[3]) || 0), 0);
  const totalPerime  = syntheseRows.reduce((s, r) => s + (parseInt(r[4]) || 0), 0);
  const tauxGlobal   = totalLots > 0 ? Math.round((totalConf / totalLots) * 100) : 0;

  const kpis = [
    { label: "Total lots",    val: String(totalLots),     color: BLUE },
    { label: "Conformes",     val: String(totalConf),     color: [82, 196, 26] },
    { label: "En alerte",     val: String(totalAlerte),   color: [250, 140, 22] },
    { label: "Perimes",       val: String(totalPerime),   color: [255, 77, 79] },
    { label: "Taux conformite", val: tauxGlobal + " %",  color: tauxGlobal >= 80 ? [82, 196, 26] : [250, 140, 22] },
  ];

  const kw = (W - 20) / kpis.length;
  kpis.forEach((k, i) => {
    const x = 10 + i * kw;
    doc.setFillColor(248, 250, 255);
    doc.roundedRect(x, 40, kw - 2, 18, 2, 2, "F");
    doc.setDrawColor(...k.color);
    doc.setLineWidth(0.5);
    doc.line(x, 40, x, 58);
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(k.label, x + 3, 46);
    doc.setTextColor(...k.color);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(k.val, x + 3, 54);
  });

  // ── Table synthèse ────────────────────────────────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Synthese par pays", 10, 68);

  autoTable(doc, {
    startY: 71,
    head: [["Pays", "Total", "Conformes", "En alerte", "Perimes", "Taux"]],
    body: syntheseRows,
    styles: { fontSize: 9, cellPadding: 3, textColor: DARK },
    headStyles: { fillColor: BLUE, textColor: [255,255,255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: LBLUE },
    columnStyles: {
      2: { textColor: [82, 196, 26], fontStyle: "bold" },
      3: { textColor: [250, 140, 22] },
      4: { textColor: [255, 77, 79] },
    },
    margin: { left: 10, right: 10 },
  });

  // ── Table alertes ─────────────────────────────────────────────────────────
  const y2 = doc.lastAutoTable.finalY + 10;
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Alertes sur la periode (${alertesRows.length})`, 10, y2);

  if (alertesRows.length > 0) {
    autoTable(doc, {
      startY: y2 + 3,
      head: [["Type", "Message", "Pays", "Date", "Statut"]],
      body: alertesRows,
      styles: { fontSize: 8, cellPadding: 2.5, textColor: DARK },
      headStyles: { fillColor: BLUE, textColor: [255,255,255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: LBLUE },
      columnStyles: {
        0: { cellWidth: 22 },
        2: { cellWidth: 22 },
        3: { cellWidth: 30 },
        4: { cellWidth: 22 },
      },
      margin: { left: 10, right: 10 },
    });
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text("Aucune alerte sur cette periode.", 10, y2 + 8);
  }

  // ── Pied de page ──────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(245, 247, 255);
    doc.rect(0, 285, W, 12, "F");
    doc.setTextColor(...GRAY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("FutureKawa IoT — Rapport confidentiel", 10, 292);
    doc.text(`Page ${i} / ${pageCount}`, W - 10, 292, { align: "right" });
  }

  doc.save(filename);
};

// ─── Reports ──────────────────────────────────────────────────────────────────

const Reports = () => {
  const { getAllowedPays } = useAuth();

  const [loading,   setLoading]   = useState(true);
  const [dashData,  setDashData]  = useState(null);
  const [alertes,   setAlertes]   = useState([]);
  const [pays,      setPays]      = useState("all");
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, "day"), dayjs()]);

  const allowedPays = getAllowedPays();
  const availPays   = allowedPays ?? COUNTRY_IDS;
  const paysOptions = [
    ...(allowedPays === null ? [{ label: "Tous les pays", value: "all" }] : []),
    ...availPays.map(id => ({ label: `${FLAG[id]} ${NAMES[id]}`, value: id })),
  ];

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
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 50 }}><Spin size="large" /></div>;

  const parPays   = dashData?.par_pays || {};
  const targetIds = pays === "all" ? availPays : [pays];

  const [fromMs, toMs] = dateRange
    ? [dateRange[0].startOf("day").valueOf(), dateRange[1].endOf("day").valueOf()]
    : [0, Infinity];

  const alertesFiltrees = alertes.filter(a => {
    const t = a.date_alerte ? new Date(a.date_alerte).getTime() : 0;
    return (pays === "all" || a.country_id === pays) && t >= fromMs && t <= toMs;
  });

  // ── Synthèse ──────────────────────────────────────────────────────────────

  const syntheseRows = targetIds.map(id => {
    const p = parPays[id];
    const offline = !p || p.status === "offline";
    return {
      key: id,
      pays:     `${FLAG[id]} ${NAMES[id]}`,
      total:    offline ? "—" : (p.total_lots ?? 0),
      conforme: offline ? "—" : (p.conforme_lots ?? 0),
      alerte:   offline ? "—" : (p.alerte_lots   ?? 0),
      perime:   offline ? "—" : (p.perime_lots    ?? 0),
      taux:     offline ? "—" : `${Math.round(((p.conforme_lots ?? 0) / Math.max(p.total_lots ?? 1, 1)) * 100)} %`,
      statut:   offline ? "offline" : "online",
    };
  });

  const syntheseCols = [
    { title: "Pays",            dataIndex: "pays",     key: "pays" },
    { title: "Total lots",      dataIndex: "total",    key: "total" },
    { title: "Conformes",       dataIndex: "conforme", key: "conforme",
      render: v => <span style={{ color: "#52c41a", fontWeight: 600 }}>{v}</span> },
    { title: "En alerte",       dataIndex: "alerte",   key: "alerte",
      render: v => <span style={{ color: "#fa8c16", fontWeight: v > 0 ? 700 : 400 }}>{v}</span> },
    { title: "Périmés",         dataIndex: "perime",   key: "perime",
      render: v => <span style={{ color: "#ff4d4f", fontWeight: v > 0 ? 700 : 400 }}>{v}</span> },
    { title: "Taux conformité", dataIndex: "taux",     key: "taux",
      render: v => <Tag color={v === "—" ? "default" : parseInt(v) >= 80 ? "success" : "warning"}>{v}</Tag> },
    { title: "Backend",         dataIndex: "statut",   key: "statut",
      render: v => <Tag color={v === "online" ? "success" : "default"}>{v}</Tag> },
  ];

  // ── Pie ───────────────────────────────────────────────────────────────────

  const pieData = targetIds
    .map(id => ({ name: NAMES[id], flag: FLAG[id], value: parPays[id]?.total_lots ?? 0 }))
    .filter(d => d.value > 0);

  // ── Bar alertes par mois ──────────────────────────────────────────────────

  const alertesByMonth = {};
  alertesFiltrees.forEach(a => {
    if (!a.date_alerte) return;
    const d   = new Date(a.date_alerte);
    const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    if (!alertesByMonth[key]) alertesByMonth[key] = { month: key, temperature: 0, humidite: 0, perime: 0 };
    alertesByMonth[key][a.type_alerte || "humidite"]++;
  });
  const barData = Object.values(alertesByMonth);

  // ── Handlers export ───────────────────────────────────────────────────────

  const stamp     = dayjs().format("YYYYMMDD");
  const dateLabel = `${dayjs(dateRange[0]).format("DD/MM/YYYY")} -> ${dayjs(dateRange[1]).format("DD/MM/YYYY")}`;

  // Données PDF sans emoji ni accents
  const synthesePDF = syntheseRows.map(r => [
    NAMES_PDF[r.key] || r.key,
    String(r.total), String(r.conforme), String(r.alerte), String(r.perime), r.taux,
  ]);
  const alertesPDF = alertesFiltrees.map(a => [
    a.type_alerte || "",
    (a.message || "").slice(0, 60),
    a.country_id ? NAMES_PDF[a.country_id] || a.country_id : "",
    a.date_alerte ? new Date(a.date_alerte).toLocaleString("fr-FR") : "",
    a.statut || "",
  ]);

  const exportInventaireCSV = () => downloadCSV(
    `inventaire_lots_${stamp}.csv`,
    ["Pays", "Total lots", "Conformes", "En alerte", "Perimes", "Taux conformite"],
    syntheseRows.map(r => [`${FLAG[r.key]} ${NAMES[r.key]}`, r.total, r.conforme, r.alerte, r.perime, r.taux])
  );

  const exportAlertesCSV = () => downloadCSV(
    `alertes_${stamp}.csv`,
    ["Type", "Message", "Pays", "Date", "Statut"],
    alertesFiltrees.map(a => [
      a.type_alerte, a.message,
      a.country_id ? `${FLAG[a.country_id]} ${NAMES[a.country_id]}` : "",
      a.date_alerte ? new Date(a.date_alerte).toLocaleString("fr-FR") : "",
      a.statut,
    ])
  );

  const exportXLSX = () => downloadXLSX(`rapport_futurekawa_${stamp}.xlsx`, [
    {
      name: "Inventaire lots",
      headers: ["Pays", "Total lots", "Conformes", "En alerte", "Perimes", "Taux conformite"],
      rows: syntheseRows.map(r => [`${FLAG[r.key]} ${NAMES[r.key]}`, r.total, r.conforme, r.alerte, r.perime, r.taux]),
    },
    {
      name: "Alertes",
      headers: ["Type", "Message", "Pays", "Date", "Statut"],
      rows: alertesFiltrees.map(a => [
        a.type_alerte, a.message,
        a.country_id ? `${FLAG[a.country_id]} ${NAMES[a.country_id]}` : "",
        a.date_alerte ? new Date(a.date_alerte).toLocaleString("fr-FR") : "",
        a.statut,
      ]),
    },
  ]);

  const exportPDF = () => downloadPDF(
    `rapport_qualite_futurekawa_${stamp}.pdf`,
    "Rapport qualite",
    synthesePDF,
    alertesPDF,
    dateLabel,
  );

  return (
    <div className="reports-page">

      {/* ── Filtres ── */}
      <div className="reports-filters">
        <span className="reports-title">Rapports &amp; Exports</span>
        <Space wrap>
          <Select
            value={pays}
            onChange={setPays}
            options={paysOptions}
            style={{ minWidth: 180 }}
            size="small"
          />
          <DatePicker.RangePicker
            value={dateRange}
            onChange={v => setDateRange(v)}
            size="small"
            showTime={{ format: "HH:mm" }}
            disabledDate={d => d && d.isAfter(dayjs())}
            separator={<ArrowRightOutlined style={{ color: "#1677ff", fontSize: 12 }} />}
            presets={[
              { label: "7 derniers jours",  value: [dayjs().subtract(7,  "day"), dayjs()] },
              { label: "30 derniers jours", value: [dayjs().subtract(30, "day"), dayjs()] },
              { label: "90 derniers jours", value: [dayjs().subtract(90, "day"), dayjs()] },
            ]}
            allowClear={false}
            format="DD/MM/YYYY HH:mm"
          />
        </Space>
      </div>

      {/* ── Synthèse ── */}
      <Card title="Synthèse inventaire par pays" variant="borderless" className="report-card">
        <Table
          dataSource={syntheseRows}
          columns={syntheseCols}
          rowKey="key"
          pagination={false}
          size="small"
        />
      </Card>

      {/* ── Graphiques ── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={10}>
          <Card title="Lots par pays" variant="borderless" className="report-card">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} lots`, n]} />
                  <Legend
                    formatter={(value, entry) =>
                      `${entry.payload.flag} ${value} — ${entry.payload.value} lots`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="no-data">Aucune donnée</div>}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            title={`Alertes par mois (${alertesFiltrees.length} sur la période)`}
            variant="borderless"
            className="report-card"
          >
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="temperature" name="Température" stackId="a" fill="#fa8c16" />
                  <Bar dataKey="humidite"    name="Humidité"    stackId="a" fill="#1677ff" />
                  <Bar dataKey="perime"      name="Péremption"  stackId="a" fill="#ff4d4f" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="no-data">Aucune alerte sur cette période</div>}
          </Card>
        </Col>
      </Row>

      {/* ── Exports ── */}
      <Card title="Télécharger" variant="borderless" className="report-card" style={{ marginTop: 16 }}>
        <div className="export-section">
          <div className="export-group">
            <div className="export-group-label">CSV</div>
            <Button icon={<DownloadOutlined />} className="export-btn export-btn--csv"
              onClick={exportInventaireCSV}>
              Inventaire lots (.csv)
            </Button>
            <Button icon={<DownloadOutlined />} className="export-btn export-btn--csv"
              onClick={exportAlertesCSV}>
              Alertes (.csv)
            </Button>
          </div>

          <Divider type="vertical" style={{ height: 80 }} />

          <div className="export-group">
            <div className="export-group-label">Excel</div>
            <Button icon={<FileExcelOutlined />} className="export-btn export-btn--excel"
              onClick={exportXLSX}>
              Rapport complet (.xlsx)
            </Button>
          </div>

          <Divider type="vertical" style={{ height: 80 }} />

          <div className="export-group">
            <div className="export-group-label">PDF</div>
            <Button icon={<FilePdfOutlined />} className="export-btn export-btn--pdf"
              onClick={exportPDF}>
              Rapport qualité (.pdf)
            </Button>
          </div>
        </div>
      </Card>

    </div>
  );
};

export default Reports;
