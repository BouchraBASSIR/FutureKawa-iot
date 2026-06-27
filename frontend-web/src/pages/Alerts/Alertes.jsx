import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Table, Button, Tag, Space, Tooltip, Drawer, Descriptions, Divider, message } from "antd";
import { CheckOutlined, CheckSquareOutlined, ReloadOutlined } from "@ant-design/icons";
import { alertesService } from "../../services/alertes.service";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import "./Alertes.scss";

const TYPE_CONFIG = {
  temperature: { color: "#fa8c16", tagColor: "orange", label: "Température" },
  humidite:    { color: "#1677ff", tagColor: "blue",   label: "Humidité"    },
  perime:      { color: "#ff4d4f", tagColor: "red",    label: "Péremption"  },
};

const FLAG = { bresil: "🇧🇷", equateur: "🇪🇨", colombie: "🇨🇴" };

const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "-";

const Alertes = () => {
  const { hasRole, profile } = useAuth();
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("toutes");
  const [detail, setDetail]   = useState(null);

  // Pays accessibles selon le rôle (null = admin = pas de restriction)
  const allowedPays = useMemo(() => {
    if (hasRole("admin")) return null;
    const unique = [...new Set((profile?.accesses ?? []).map(a => a.pays))];
    return unique.length ? unique : null;
  }, [hasRole, profile]);

  // Seul admin/responsable_pays peut marquer toutes les alertes lues (backend vérifie aussi)
  const peutMarquerToutes = hasRole("admin", "responsable_pays");

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) api.clearCache("/alertes");
    setLoading(true);
    try {
      let data;
      if (!allowedPays) {
        // Admin : toutes les alertes
        data = await alertesService.getAll();
      } else if (allowedPays.length === 1) {
        // 1 seul pays : filtre direct
        data = await alertesService.getAll(allowedPays[0]);
      } else {
        // Plusieurs pays : requêtes parallèles + fusion
        const results = await Promise.allSettled(
          allowedPays.map(p => alertesService.getAll(p))
        );
        data = results
          .filter(r => r.status === "fulfilled")
          .flatMap(r => r.value)
          .sort((a, b) => new Date(b.date_alerte) - new Date(a.date_alerte));
      }
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur chargement alertes:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [allowedPays]);

  useEffect(() => { load(); }, [load]);

  // Marque une alerte comme lue (optimiste) et retourne le résultat
  const doMarquerLue = useCallback(async (alert) => {
    if (alert.statut === "lue") return;
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, statut: "lue" } : a));
    const result = await alertesService.marquerLue(alert);
    if (!result) {
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, statut: "non_lue" } : a));
      message.error("Impossible de marquer l'alerte comme lue.");
    } else {
      window.dispatchEvent(new CustomEvent("alerts-updated", { detail: { delta: -1 } }));
    }
  }, []);

  // Clic sur une ligne : ouvre le détail ET marque comme lue
  const handleRowClick = (alert) => {
    setDetail(alert);
    doMarquerLue(alert);
  };

  const handleMarquerToutesLues = async () => {
    const nonLues = alerts.filter(a => a.statut === "non_lue");
    if (!nonLues.length) return;
    setAlerts(prev => prev.map(a => ({ ...a, statut: "lue" })));
    const result = await alertesService.marquerToutesLues();
    if (!result) {
      message.error("Erreur lors du marquage de toutes les alertes.");
      await load();
    } else {
      message.success("Toutes les alertes ont été marquées comme lues.");
      window.dispatchEvent(new CustomEvent("alerts-updated", { detail: { delta: -nonLues.length } }));
    }
  };

  const nonLueCount = alerts.filter(a => a.statut === "non_lue").length;
  const displayed = useMemo(() => {
    const list = filter === "non_lues"
      ? alerts.filter(a => a.statut === "non_lue")
      : [...alerts].sort((a, b) => {
          if (a.statut !== b.statut) return a.statut === "non_lue" ? -1 : 1;
          return 0;
        });
    return list;
  }, [alerts, filter]);

  // Alerte courante dans le drawer (met à jour le statut en temps réel)
  const detailLive = detail ? (alerts.find(a => a.id === detail.id) || detail) : null;

  const columns = [
    {
      key: "bar",
      width: 4,
      render: (_, r) => (
        <div
          className="alert-status-bar"
          style={{
            background: r.statut === "non_lue"
              ? (TYPE_CONFIG[r.type_alerte]?.color || "#8c8c8c")
              : "transparent",
          }}
        />
      ),
    },
    {
      title: "Type",
      dataIndex: "type_alerte",
      key: "type",
      width: 120,
      render: (v) => {
        const cfg = TYPE_CONFIG[v] || { tagColor: "default", label: v };
        return <Tag color={cfg.tagColor}>{cfg.label}</Tag>;
      },
    },
    {
      title: "Message",
      dataIndex: "message",
      key: "message",
      render: (v, r) => (
        <span className={r.statut === "non_lue" ? "alert-msg--unread" : "alert-msg--read"}>
          {v}
        </span>
      ),
    },
    {
      title: "Pays",
      key: "pays",
      width: 130,
      render: (_, r) => r.country_id
        ? <span>{FLAG[r.country_id] || ""} {r.pays_nom || r.country_id}</span>
        : "-",
    },
    {
      title: "Date",
      dataIndex: "date_alerte",
      key: "date",
      width: 150,
      render: (v) => <span className="alert-date">{fmt(v)}</span>,
    },
    {
      title: "Statut",
      key: "statut_label",
      width: 90,
      render: (_, r) =>
        r.statut === "lue"
          ? <span className="alert-tag-lue"><CheckOutlined /> Lue</span>
          : <span className="alert-tag-nonlue">Non lue</span>,
    },
  ];

  return (
    <div className="alertes-page">
      {/* En-tête */}
      <div className="alertes-header">
        <div className="alertes-header-left">
          <span className="alertes-title">Alertes</span>
          <span className="alertes-count-total">{alerts.length} au total</span>
          {nonLueCount > 0 && (
            <span className="alertes-count-nonlues">
              {nonLueCount} non lue{nonLueCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="alertes-header-right">
          <Space>
            <div className="alertes-filter-group">
              <button
                className={`filter-btn ${filter === "toutes" ? "active" : ""}`}
                onClick={() => setFilter("toutes")}
              >
                Toutes
              </button>
              <button
                className={`filter-btn ${filter === "non_lues" ? "active" : ""}`}
                onClick={() => setFilter("non_lues")}
              >
                Non lues {nonLueCount > 0 && `(${nonLueCount})`}
              </button>
            </div>

            <Tooltip title="Actualiser">
              <Button icon={<ReloadOutlined />} size="small" onClick={() => load(true)} />
            </Tooltip>

            {peutMarquerToutes && nonLueCount > 0 && (
              <Button
                icon={<CheckSquareOutlined />}
                size="small"
                onClick={handleMarquerToutesLues}
              >
                Tout marquer lu
              </Button>
            )}
          </Space>
        </div>
      </div>

      {/* Tableau */}
      <div className="alertes-table-wrap">
        <Table
          dataSource={displayed}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          scroll={{ x: 600 }}
          size="small"
          rowClassName={(r) =>
            `alert-row alert-row--${r.statut === "non_lue" ? "unread" : "read"}${detailLive?.id === r.id ? " alert-row--active" : ""}`
          }
          onRow={(r) => ({ onClick: () => handleRowClick(r), style: { cursor: "pointer" } })}
          locale={{ emptyText: filter === "non_lues" ? "Aucune alerte non lue" : "Aucune alerte" }}
        />
      </div>

      {/* Panneau de détail */}
      <Drawer
        title={
          detailLive ? (
            <div className="drawer-title">
              <Tag color={TYPE_CONFIG[detailLive.type_alerte]?.tagColor || "default"}>
                {TYPE_CONFIG[detailLive.type_alerte]?.label || detailLive.type_alerte}
              </Tag>
              <span
                className={detailLive.statut === "lue" ? "alert-tag-lue" : "alert-tag-nonlue"}
                style={{ fontSize: 13 }}
              >
                {detailLive.statut === "lue" ? <><CheckOutlined /> Lue</> : "Non lue"}
              </span>
            </div>
          ) : "Détail"
        }
        open={!!detail}
        onClose={() => setDetail(null)}
        width={400}
        styles={{ body: { padding: "16px 24px" } }}
      >
        {detailLive && (() => {
          const unit = detailLive.type_alerte === "temperature"
            ? "°C"
            : detailLive.type_alerte === "humidite"
              ? "%" : "";
          const isPerime = detailLive.type_alerte === "perime";
          return (
            <>
              <Descriptions column={1} size="small" labelStyle={{ color: "#8c8c8c", width: 130 }}>
                <Descriptions.Item label="Message">{detailLive.message}</Descriptions.Item>
                <Descriptions.Item label="Pays">
                  {FLAG[detailLive.country_id] || ""} {detailLive.pays_nom || detailLive.country_id || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Date">{fmt(detailLive.date_alerte)}</Descriptions.Item>
                {detailLive.id_lot && (
                  <Descriptions.Item label="Lot concerné">
                    <code>{detailLive.id_lot}</code>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {!isPerime && detailLive.valeur_mesuree !== undefined && (
                <>
                  <Divider style={{ margin: "12px 0" }} />
                  <Descriptions column={1} size="small" labelStyle={{ color: "#8c8c8c", width: 130 }}>
                    <Descriptions.Item label="Valeur mesurée">
                      <strong>{detailLive.valeur_mesuree}{unit}</strong>
                    </Descriptions.Item>
                    {detailLive.seuil_min !== undefined && (
                      <Descriptions.Item label="Plage acceptable">
                        {detailLive.seuil_min}{unit} – {detailLive.seuil_max}{unit}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </>
              )}
            </>
          );
        })()}
      </Drawer>
    </div>
  );
};

export default Alertes;
