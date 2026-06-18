import React, { useState } from "react";
import { Row, Col, Card, List, Tag, Badge, Typography, Drawer, Descriptions, Divider } from "antd";
import { WarningOutlined, MailOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { mockAlerts } from "../../services/mockData";
import "./Alertes.scss";

const { Text, Title } = Typography;

const LEVEL_CONFIG = {
  critique: { color: "red",    bg: "#fff1f0", border: "#ffccc7", icon: "🔴" },
  haute:    { color: "orange", bg: "#fff7e6", border: "#ffd591", icon: "🟠" },
  moyenne:  { color: "gold",   bg: "#fffbe6", border: "#ffe58f", icon: "🟡" },
};

const TYPE_LABEL = { temperature: "Température", humidity: "Humidité", expiry: "Expiration" };

const Alerts = () => {
  const [selected, setSelected] = useState(null);

  const critical = mockAlerts.filter((a) => a.level === "critique" && !a.acknowledged);
  const emailHistory = mockAlerts.filter((a) => a.emailSent);

  return (
    <div className="alerts-page">

      {/* Critical warning cards */}
      {critical.length > 0 && (
        <div className="alerts-critical-section">
          <Title level={5} style={{ marginBottom: 12, color: "#ff4d4f" }}>
            <WarningOutlined /> Alertes critiques non acquittées
          </Title>
          <Row gutter={[12, 12]}>
            {critical.map((a) => (
              <Col xs={24} sm={12} lg={8} key={a.id}>
                <Card
                  className="critical-card"
                  bordered
                  style={{ borderColor: "#ffccc7", background: "#fff1f0", cursor: "pointer" }}
                  onClick={() => setSelected(a)}
                >
                  <div className="critical-card-header">
                    <span style={{ fontSize: 20 }}>🔴</span>
                    <Tag color="red">CRITIQUE</Tag>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: "auto" }}>
                      {a.timestamp.slice(11, 16)}
                    </Text>
                  </div>
                  <div className="critical-card-msg">{a.message}</div>
                  <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
                    {a.lotId} · {a.country}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Alert list */}
        <Col xs={24} lg={14}>
          <Card title={`Toutes les alertes (${mockAlerts.length})`} variant="borderless">
            <List
              dataSource={mockAlerts}
              renderItem={(a) => {
                const cfg = LEVEL_CONFIG[a.level];
                return (
                  <List.Item
                    className={`alert-item ${selected?.id === a.id ? "alert-item--active" : ""}`}
                    style={{ cursor: "pointer", padding: "10px 12px", borderRadius: 8, marginBottom: 4,
                      background: a.acknowledged ? "transparent" : cfg.bg }}
                    onClick={() => setSelected(a)}
                  >
                    <div className="alert-item-left">
                      <span style={{ fontSize: 16, marginRight: 8 }}>{cfg.icon}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13, color: a.acknowledged ? "#8c8c8c" : "#1a1a2e" }}>
                          {a.message}
                          {a.acknowledged && <CheckCircleOutlined style={{ color: "#52c41a", marginLeft: 6 }} />}
                        </div>
                        <div style={{ fontSize: 11, color: "#adadad" }}>
                          {a.lotId} · {a.country} · {a.timestamp.slice(0, 10)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <Tag color={LEVEL_CONFIG[a.level].color}>{a.level}</Tag>
                      <Tag color="default">{TYPE_LABEL[a.type]}</Tag>
                    </div>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>

        {/* Email notification history */}
        <Col xs={24} lg={10}>
          <Card
            title={<><MailOutlined /> Historique notifications email ({emailHistory.length})</>}
            variant="borderless"
          >
            <List
              dataSource={emailHistory}
              size="small"
              renderItem={(a) => (
                <List.Item style={{ padding: "8px 0" }}>
                  <div style={{ width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: a.message }}>{a.message}</Text>
                      <Tag color={LEVEL_CONFIG[a.level].color} style={{ marginLeft: 8, flexShrink: 0 }}>
                        {a.level}
                      </Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{a.timestamp.replace("T", " ")} · {a.lotId}</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Alert detail drawer */}
      <Drawer
        title="Détail de l'alerte"
        open={!!selected}
        onClose={() => setSelected(null)}
        width={400}
      >
        {selected && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>{LEVEL_CONFIG[selected.level].icon}</span>
              <div>
                <Tag color={LEVEL_CONFIG[selected.level].color} style={{ fontSize: 13 }}>
                  {selected.level.toUpperCase()}
                </Tag>
                <Tag color="default">{TYPE_LABEL[selected.type]}</Tag>
              </div>
            </div>

            <Descriptions column={1} size="small" labelStyle={{ color: "#8c8c8c", fontWeight: 500 }}>
              <Descriptions.Item label="ID Alerte">{selected.id}</Descriptions.Item>
              <Descriptions.Item label="Lot concerné"><Text code>{selected.lotId}</Text></Descriptions.Item>
              <Descriptions.Item label="Pays">{selected.country}</Descriptions.Item>
              <Descriptions.Item label="Type">{TYPE_LABEL[selected.type]}</Descriptions.Item>
              <Descriptions.Item label="Date">{selected.timestamp.replace("T", " ")}</Descriptions.Item>
              <Descriptions.Item label="Message">{selected.message}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions column={1} size="small" labelStyle={{ color: "#8c8c8c", fontWeight: 500 }}>
              <Descriptions.Item label="Acquittée">
                <Badge status={selected.acknowledged ? "success" : "error"}
                  text={selected.acknowledged ? "Oui" : "Non"} />
              </Descriptions.Item>
              <Descriptions.Item label="Email envoyé">
                <Badge status={selected.emailSent ? "success" : "default"}
                  text={selected.emailSent ? "Envoyé" : "Non envoyé"} />
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default Alerts;
