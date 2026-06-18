import React, { useState } from "react";
import { Row, Col, Card, Tag, Tabs, Statistic, Table, Typography } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { countryStats, mockLots, temperatureHistory, humidityHistory } from "../../services/mockData";
import "./Countries.scss";

const { Title, Text } = Typography;
const COLORS = { Brésil: "#1677ff", Colombie: "#52c41a", Équateur: "#fa8c16" };
const STATUS_COLOR = { conforme: "success", avertissement: "warning", expiré: "error" };

const lotColumns = [
  { title: "ID",       dataIndex: "id",          key: "id",       render: (v) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
  { title: "Origine",  dataIndex: "origin",      key: "origin" },
  { title: "Variété",  dataIndex: "variety",     key: "variety" },
  { title: "Qté (kg)", dataIndex: "quantity",    key: "quantity",  render: (v) => <b>{v}</b> },
  { title: "Statut",   dataIndex: "status",      key: "status",
    render: (v) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
];

const CountryTab = ({ country }) => {
  const flag = country.code === "BR" ? "🇧🇷" : country.code === "CO" ? "🇨🇴" : "🇪🇨";
  const lots = mockLots.filter((l) => l.countryCode === country.code);
  const tempData = temperatureHistory[country.name]?.slice(-14).map((d) => ({ date: d.date.slice(5), value: d.value })) ?? [];
  const humData  = humidityHistory[country.name]?.slice(-14).map((d) => ({ date: d.date.slice(5), value: d.value })) ?? [];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card variant="borderless" className="stat-card">
            <Statistic title="Total lots" value={country.lots} prefix={flag} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card variant="borderless" className="stat-card">
            <Statistic title="Lots actifs" value={country.activeLots}
              valueStyle={{ color: "#52c41a" }} prefix={<ArrowUpOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card variant="borderless" className="stat-card">
            <Statistic title="Alertes actives" value={country.alerts}
              valueStyle={{ color: country.alerts > 3 ? "#ff4d4f" : "#fa8c16" }}
              prefix={<ArrowDownOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card variant="borderless" className="stat-card">
            <Statistic title="T° moyenne" value={country.avgTemp} suffix="°C"
              valueStyle={{ color: country.avgTemp > 20 ? "#fa8c16" : "#52c41a" }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Températures — 14 jours (°C)" variant="borderless">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={tempData} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
                <YAxis domain={[14, 26]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line dataKey="value" stroke={COLORS[country.name]} strokeWidth={2} dot={false} name="T°" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Humidité — 14 jours (%)" variant="borderless">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={humData} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
                <YAxis domain={[50, 72]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line dataKey="value" stroke={COLORS[country.name]} strokeWidth={2} dot={false} name="H%" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title={`Lots — ${country.name}`} variant="borderless" style={{ marginTop: 16 }}>
        <Table dataSource={lots} columns={lotColumns} rowKey="id" size="small" pagination={false} />
      </Card>
    </div>
  );
};

const Countries = () => {
  const comparisonTemp = countryStats.map((c) => ({
    name: c.name, value: c.avgTemp, fill: COLORS[c.name],
  }));
  const comparisonLots = countryStats.map((c) => ({
    pays: c.name, lots: c.lots, alertes: c.alerts, actifs: c.activeLots,
  }));

  return (
    <div className="countries-page">

      {/* Comparison cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {countryStats.map((c) => {
          const flag = c.code === "BR" ? "🇧🇷" : c.code === "CO" ? "🇨🇴" : "🇪🇨";
          return (
            <Col xs={24} sm={8} key={c.code}>
              <Card
                className="country-comparison-card"
                variant="borderless"
                style={{ borderTop: `4px solid ${COLORS[c.name]}` }}
              >
                <div className="ccc-header">
                  <span style={{ fontSize: 28 }}>{flag}</span>
                  <Title level={5} style={{ margin: 0 }}>{c.name}</Title>
                </div>
                <Row gutter={8}>
                  <Col span={12}>
                    <div className="ccc-stat"><div className="ccc-val">{c.lots}</div><div className="ccc-lbl">Lots</div></div>
                  </Col>
                  <Col span={12}>
                    <div className="ccc-stat"><div className="ccc-val" style={{ color: "#ff4d4f" }}>{c.alerts}</div><div className="ccc-lbl">Alertes</div></div>
                  </Col>
                  <Col span={12}>
                    <div className="ccc-stat"><div className="ccc-val" style={{ color: "#fa8c16" }}>{c.avgTemp}°C</div><div className="ccc-lbl">T° moy.</div></div>
                  </Col>
                  <Col span={12}>
                    <div className="ccc-stat"><div className="ccc-val" style={{ color: "#1677ff" }}>{c.avgHumidity}%</div><div className="ccc-lbl">Humidité moy.</div></div>
                  </Col>
                </Row>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Comparison chart */}
      <Card title="Comparaison pays" variant="borderless" style={{ marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={comparisonLots} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="pays" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="lots"    name="Total lots"   fill="#1677ff" radius={[4,4,0,0]} />
            <Bar dataKey="actifs"  name="Lots actifs"  fill="#52c41a" radius={[4,4,0,0]} />
            <Bar dataKey="alertes" name="Alertes"      fill="#ff4d4f" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Per-country tabs */}
      <Card variant="borderless">
        <Tabs
          items={countryStats.map((c) => ({
            key: c.code,
            label: `${c.code === "BR" ? "🇧🇷" : c.code === "CO" ? "🇨🇴" : "🇪🇨"} ${c.name}`,
            children: <CountryTab country={c} />,
          }))}
        />
      </Card>
    </div>
  );
};

export default Countries;
