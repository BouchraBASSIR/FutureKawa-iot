import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Descriptions, Tag, Timeline, Button, Typography } from "antd";
import { ArrowLeftOutlined, EnvironmentOutlined } from "@ant-design/icons";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { mockLots, getLotHistory } from "../../services/mockData";
import "./LotDetail.scss";

const { Title, Text } = Typography;

const STATUS_CONFIG = {
  conforme:      { color: "success", label: "Conforme"      },
  avertissement: { color: "warning", label: "Avertissement"  },
  expiré:        { color: "error",   label: "Expiré"         },
};

const MiniChart = ({ data, dataKey, color, refLine, unit }) => (
  <ResponsiveContainer width="100%" height={180}>
    <LineChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
      <YAxis tick={{ fontSize: 10 }} unit={unit} />
      <Tooltip formatter={(v) => [`${v}${unit}`, dataKey]} />
      <ReferenceLine y={refLine} stroke="#ff4d4f" strokeDasharray="4 4" label={{ value: `Seuil ${refLine}${unit}`, fontSize: 10, fill: "#ff4d4f" }} />
      <Line dataKey="value" stroke={color} strokeWidth={2} dot={false} name={dataKey} />
    </LineChart>
  </ResponsiveContainer>
);

const LotDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const lot = mockLots.find((l) => l.id === id);
  const history = getLotHistory(id);

  if (!lot) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/lots")}>Retour</Button>
        <Title level={4} style={{ marginTop: 16 }}>Lot introuvable : {id}</Title>
      </div>
    );
  }

  const flag = lot.countryCode === "BR" ? "🇧🇷" : lot.countryCode === "CO" ? "🇨🇴" : "🇪🇨";

  return (
    <div className="lot-detail">
      <div className="lot-detail-header">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/lots")} style={{ marginRight: 16 }}>
          Retour
        </Button>
        <Title level={4} style={{ margin: 0 }}>{flag} {lot.id}</Title>
        <Tag color={STATUS_CONFIG[lot.status].color} style={{ marginLeft: 12, fontSize: 13 }}>
          {STATUS_CONFIG[lot.status].label}
        </Tag>
      </div>

      <Row gutter={[16, 16]}>
        {/* Lot info */}
        <Col xs={24} lg={12}>
          <Card title="Informations lot" variant="borderless">
            <Descriptions column={2} size="small" labelStyle={{ color: "#8c8c8c", fontWeight: 500 }}>
              <Descriptions.Item label="ID">{lot.id}</Descriptions.Item>
              <Descriptions.Item label="Variété">{lot.variety}</Descriptions.Item>
              <Descriptions.Item label="Pays">{flag} {lot.country}</Descriptions.Item>
              <Descriptions.Item label="Origine">{lot.origin}</Descriptions.Item>
              <Descriptions.Item label="Quantité">{lot.quantity} kg</Descriptions.Item>
              <Descriptions.Item label="Entrepôt">{lot.warehouse}</Descriptions.Item>
              <Descriptions.Item label="Entrée">{lot.entryDate}</Descriptions.Item>
              <Descriptions.Item label="Expiration">{lot.expiryDate}</Descriptions.Item>
              <Descriptions.Item label="T° actuelle">
                <span style={{ color: lot.temperature > 22 ? "#ff4d4f" : "#52c41a", fontWeight: 600 }}>
                  {lot.temperature}°C
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Humidité actuelle">
                <span style={{ color: lot.humidity > 65 ? "#ff4d4f" : "#52c41a", fontWeight: 600 }}>
                  {lot.humidity}%
                </span>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Storage info */}
        <Col xs={24} lg={12}>
          <Card title={<><EnvironmentOutlined /> Informations de stockage</>} variant="borderless">
            <Descriptions column={1} size="small" labelStyle={{ color: "#8c8c8c", fontWeight: 500 }}>
              <Descriptions.Item label="Entrepôt">{lot.warehouse}</Descriptions.Item>
              <Descriptions.Item label="Pays d'origine">{lot.country}</Descriptions.Item>
              <Descriptions.Item label="Zone de production">{lot.origin}</Descriptions.Item>
              <Descriptions.Item label="Durée en stock">
                {Math.floor((new Date("2026-06-18") - new Date(lot.entryDate)) / 86400000)} jours
              </Descriptions.Item>
              <Descriptions.Item label="Jours restants avant expiration">
                {Math.max(0, Math.floor((new Date(lot.expiryDate) - new Date("2026-06-18")) / 86400000))} jours
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Temperature chart */}
        <Col xs={24} lg={12}>
          <Card title="Historique températures — 14 jours (°C)" variant="borderless">
            <MiniChart data={history.temp} dataKey="Température" color="#fa8c16" refLine={22} unit="°C" />
          </Card>
        </Col>

        {/* Humidity chart */}
        <Col xs={24} lg={12}>
          <Card title="Historique humidité — 14 jours (%)" variant="borderless">
            <MiniChart data={history.humidity} dataKey="Humidité" color="#1677ff" refLine={65} unit="%" />
          </Card>
        </Col>

        {/* Traceability timeline */}
        <Col xs={24}>
          <Card title="Traçabilité" variant="borderless">
            <Timeline
              mode="left"
              items={history.traceability.map((t, i) => ({
                label: <Text type="secondary" style={{ fontSize: 12 }}>{t.date}</Text>,
                color: i === history.traceability.length - 1 ? "blue" : "gray",
                children: (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.event}</div>
                    <div style={{ color: "#8c8c8c", fontSize: 12 }}>{t.detail}</div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LotDetail;
