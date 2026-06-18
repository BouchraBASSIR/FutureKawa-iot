import React, { useState } from "react";
import { Row, Col, Card, Select, Tag, Progress, Typography } from "antd";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from "recharts";
import { warehouseData, temperatureHistory, humidityHistory } from "../../services/mockData";
import "./Storage.scss";

const { Title, Text } = Typography;

const statusColor = { normal: "#52c41a", warning: "#fa8c16", critical: "#ff4d4f" };
const statusLabel  = { normal: "Normal",  warning: "Attention",  critical: "Critique" };

const GaugeCard = ({ label, value, unit, max, thresholdWarn, thresholdCrit, color }) => {
  const pct = Math.round((value / max) * 100);
  const fill = value >= thresholdCrit ? "#ff4d4f" : value >= thresholdWarn ? "#fa8c16" : "#52c41a";
  const radialData = [{ name: label, value: pct, fill }];

  return (
    <Card className="gauge-card" variant="borderless">
      <div className="gauge-title">{label}</div>
      <RadialBarChart
        width={140} height={140}
        innerRadius={45} outerRadius={65}
        data={radialData}
        startAngle={220} endAngle={-40}
        style={{ margin: "0 auto" }}
      >
        <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#f0f0f0" }} />
      </RadialBarChart>
      <div className="gauge-value" style={{ color: fill }}>
        {value}<span className="gauge-unit">{unit}</span>
      </div>
      <div className="gauge-sub">Seuil critique : {thresholdCrit}{unit}</div>
    </Card>
  );
};

const Storage = () => {
  const warehouses = Object.keys(warehouseData);
  const [selected, setSelected] = useState(warehouses[0]);
  const wh = warehouseData[selected];

  const country = wh.country;
  const tempData = temperatureHistory[country]?.slice(-14).map((d) => ({ date: d.date.slice(5), value: d.value })) ?? [];
  const humData  = humidityHistory[country]?.slice(-14).map((d) => ({ date: d.date.slice(5), value: d.value })) ?? [];

  return (
    <div className="storage-page">
      <div className="storage-toolbar">
        <Title level={5} style={{ margin: 0 }}>Monitoring Entrepôts</Title>
        <Select
          value={selected}
          onChange={setSelected}
          style={{ width: 200 }}
          options={warehouses.map((w) => ({
            value: w,
            label: `${w} (${warehouseData[w].country})`,
          }))}
        />
      </div>

      {/* Warehouse summary */}
      <Card className="wh-summary" variant="borderless" style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col>
            <Text type="secondary">Entrepôt</Text>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{selected}</div>
          </Col>
          <Col>
            <Text type="secondary">Pays</Text>
            <div>{wh.country}</div>
          </Col>
          <Col>
            <Text type="secondary">Lots stockés</Text>
            <div><b>{wh.lots}</b></div>
          </Col>
          <Col>
            <Text type="secondary">Capacité utilisée</Text>
            <div style={{ width: 120 }}>
              <Progress percent={wh.capacity} size="small"
                strokeColor={wh.capacity > 85 ? "#ff4d4f" : wh.capacity > 70 ? "#fa8c16" : "#52c41a"} />
            </div>
          </Col>
          <Col>
            <Tag color={statusColor[wh.status]} style={{ fontSize: 13, padding: "2px 10px" }}>
              {statusLabel[wh.status]}
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* Live gauges */}
      <Title level={5} style={{ marginBottom: 12 }}>Mesures en temps réel</Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <GaugeCard label="Température" value={wh.temperature} unit="°C" max={35}
            thresholdWarn={20} thresholdCrit={22} />
        </Col>
        <Col xs={12} sm={6}>
          <GaugeCard label="Humidité" value={wh.humidity} unit="%" max={90}
            thresholdWarn={62} thresholdCrit={65} />
        </Col>
        <Col xs={12} sm={6}>
          <GaugeCard label="Capacité" value={wh.capacity} unit="%" max={100}
            thresholdWarn={70} thresholdCrit={85} />
        </Col>
        <Col xs={12} sm={6}>
          <GaugeCard label="Lots actifs" value={wh.lots} unit="" max={10}
            thresholdWarn={7} thresholdCrit={9} />
        </Col>
      </Row>

      {/* Historical charts */}
      <Title level={5} style={{ margin: "24px 0 12px" }}>Historique — 14 derniers jours ({country})</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Températures (°C)" variant="borderless">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={tempData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={1} />
                <YAxis domain={[14, 26]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line dataKey="value" stroke="#fa8c16" strokeWidth={2} dot={false} name="T°" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Humidité (%)" variant="borderless">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={humData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={1} />
                <YAxis domain={[50, 72]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line dataKey="value" stroke="#1677ff" strokeWidth={2} dot={false} name="H%" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Storage;
