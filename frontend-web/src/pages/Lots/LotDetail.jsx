// Mock gardé en commentaire pour référence / fallback hors-ligne
// import { mockLots, getLotHistory } from "../../services/mockData";

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Descriptions, Tag, Button, Typography, Spin } from "antd";
import { ArrowLeftOutlined, EnvironmentOutlined } from "@ant-design/icons";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { lotsService } from "../../services/lots.service";
import "./LotDetail.scss";

const { Title, Text } = Typography;

const STATUS_CONFIG = {
  conforme:  { color: "success", label: "Conforme"  },
  en_alerte: { color: "warning", label: "En alerte" },
  perime:    { color: "error",   label: "Périmé"    },
};

const FLAG = { bresil: "🇧🇷", equateur: "🇪🇨", colombie: "🇨🇴" };

// Seuils idéaux par pays (cf. cahier des charges)
const THRESHOLDS = {
  bresil:   { temp: 29, hum: 55 },
  equateur: { temp: 31, hum: 60 },
  colombie: { temp: 26, hum: 80 },
};

const MiniChart = ({ data, dataKey, color, refLine, unit, label }) => (
  <ResponsiveContainer width="100%" height={180}>
    <LineChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(data.length / 10) - 1)} />
      <YAxis tick={{ fontSize: 10 }} unit={unit} />
      <Tooltip formatter={(v) => [`${v}${unit}`, label]} />
      {refLine && (
        <ReferenceLine
          y={refLine}
          stroke="#1677ff"
          strokeDasharray="4 4"
          label={{ value: `Idéal ${refLine}${unit}`, fontSize: 10, fill: "#1677ff" }}
        />
      )}
      <Line dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} name={label} />
    </LineChart>
  </ResponsiveContainer>
);

const LotDetail = () => {
  // Le param contient "country_id__lot_id" (ex: bresil__LOT-BR-001)
  const { id } = useParams();
  const navigate = useNavigate();

  const [countryId, lotId] = id?.includes("__") ? id.split("__") : [null, id];

  const [lot, setLot]       = useState(null);
  const [mesures, setMesures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!countryId || !lotId) {
      setError("Identifiant de lot invalide.");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [lotData, mesuresData] = await Promise.all([
          lotsService.getById(countryId, lotId),
          lotsService.getMesures(countryId, lotId),
        ]);
        setLot(lotData);
        setMesures(Array.isArray(mesuresData) ? mesuresData : []);
      } catch (err) {
        console.error("Erreur chargement détail lot:", err);
        setError("Lot introuvable ou backend indisponible.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [countryId, lotId]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 50 }}><Spin /></div>;
  }

  if (error || !lot) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/lots")}>Retour</Button>
        <Title level={4} style={{ marginTop: 16, color: "#ff4d4f" }}>
          {error || `Lot introuvable : ${id}`}
        </Title>
      </div>
    );
  }

  // Préparer les données pour les graphiques (groupées par jour)
  const buildChartData = () => {
    const byDay = {};
    mesures.forEach(m => {
      const day = new Date(m.date_mesure).toLocaleDateString("fr-FR");
      if (!byDay[day]) byDay[day] = { date: day, temps: [], hums: [] };
      byDay[day].temps.push(m.temperature);
      byDay[day].hums.push(m.humidite);
    });
    return Object.values(byDay).map(d => ({
      date: d.date,
      temperature: parseFloat(Math.max(...d.temps).toFixed(1)),
      humidite:    parseFloat(Math.max(...d.hums).toFixed(1)),
    }));
  };

  const chartData  = buildChartData();
  const thresholds = THRESHOLDS[countryId] || {};
  const joursStock = lot.date_stockage
    ? Math.floor((Date.now() - new Date(lot.date_stockage)) / 86400000)
    : null;
  const joursAvantPeremption = joursStock !== null ? Math.max(0, 365 - joursStock) : null;
  const flag = FLAG[countryId] || "";
  const statusCfg = STATUS_CONFIG[lot.statut] || { color: "default", label: lot.statut };

  return (
    <div className="lot-detail">
      <div className="lot-detail-header">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/lots")} style={{ marginRight: 16 }}>
          Retour
        </Button>
        <Title level={4} style={{ margin: 0 }}>{flag} {lot.id_lot}</Title>
        <Tag color={statusCfg.color} style={{ marginLeft: 12, fontSize: 13 }}>
          {statusCfg.label}
        </Tag>
      </div>

      <Row gutter={[16, 16]}>
        {/* Infos lot */}
        <Col xs={24} lg={12}>
          <Card title="Informations lot" variant="borderless">
            <Descriptions column={{ xs: 1, sm: 2 }} size="small" labelStyle={{ color: "#8c8c8c", fontWeight: 500 }}>
              <Descriptions.Item label="ID"><code>{lot.id_lot}</code></Descriptions.Item>
              <Descriptions.Item label="Pays">{flag} {lot.pays_nom || countryId}</Descriptions.Item>
              <Descriptions.Item label="Entrepôt">Entrepôt n°{lot.id_entrepot}</Descriptions.Item>
              <Descriptions.Item label="Responsable">Opérateur n°{lot.id_utilisateur}</Descriptions.Item>
              <Descriptions.Item label="Date entrée">
                {lot.date_stockage ? new Date(lot.date_stockage).toLocaleDateString("fr-FR") : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Infos stockage */}
        <Col xs={24} lg={12}>
          <Card title={<><EnvironmentOutlined /> Informations de stockage</>} variant="borderless">
            <Descriptions column={{ xs: 1, sm: 1 }} size="small" labelStyle={{ color: "#8c8c8c", fontWeight: 500 }}>
              <Descriptions.Item label="Pays">{flag} {lot.pays_nom || countryId}</Descriptions.Item>
              <Descriptions.Item label="Durée en stock">
                {joursStock !== null ? (
                  <span style={{ color: joursStock > 330 ? "#ff4d4f" : undefined, fontWeight: 600 }}>
                    {joursStock} jours
                  </span>
                ) : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Jours avant péremption">
                {joursAvantPeremption !== null ? (
                  <span style={{ color: joursAvantPeremption < 30 ? "#ff4d4f" : joursAvantPeremption < 60 ? "#fa8c16" : "#52c41a", fontWeight: 600 }}>
                    {joursAvantPeremption} jours
                  </span>
                ) : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Mesures disponibles">
                {mesures.length}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Graphique température */}
        <Col xs={24} lg={12}>
          <Card
            title={`Pic températures (°C) - ${chartData.length} jour${chartData.length > 1 ? "s" : ""}`}
            variant="borderless"
          >
            {chartData.length === 0 ? (
              <Text type="secondary">Aucune mesure disponible.</Text>
            ) : (
              <MiniChart
                data={chartData}
                dataKey="temperature"
                color="#fa8c16"
                refLine={thresholds.temp}
                unit="°C"
                label="Température"
              />
            )}
          </Card>
        </Col>

        {/* Graphique humidité */}
        <Col xs={24} lg={12}>
          <Card
            title={`Pic humidité (%) - ${chartData.length} jour${chartData.length > 1 ? "s" : ""}`}
            variant="borderless"
          >
            {chartData.length === 0 ? (
              <Text type="secondary">Aucune mesure disponible.</Text>
            ) : (
              <MiniChart
                data={chartData}
                dataKey="humidite"
                color="#1677ff"
                refLine={thresholds.hum}
                unit="%"
                label="Humidité"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LotDetail;
