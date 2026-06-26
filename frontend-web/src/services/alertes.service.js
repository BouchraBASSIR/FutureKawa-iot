import api from "./api";

// Normalise la réponse {alertes_mesures, alertes_lots} du backend en liste plate
const normalizeAlertes = (data) => {
  if (!data || typeof data !== "object") return [];

  const mesures = (data.alertes_mesures || []).map(a => ({
    ...a,
    id: `m-${a.id_alerte_mesure}`,
    kind: "mesure",
  }));
  const lots = (data.alertes_lots || []).map(a => ({
    ...a,
    id: `l-${a.id_alerte_lot}`,
    kind: "lot",
    type_alerte: "perime",
  }));

  return [...mesures, ...lots].sort(
    (a, b) => new Date(b.date_alerte) - new Date(a.date_alerte)
  );
};

export const alertesService = {

  getAll: async (country = null) => {
    const url = country && country !== "all"
      ? `/api/central/alertes?country=${country}`
      : "/api/central/alertes";
    const data = await api.get(url);
    return normalizeAlertes(data);
  },

  getCount: async () => {
    return await api.get("/api/central/alertes/count");
  },

  // Marque une alerte individuelle comme lue via le backend central
  marquerLue: async (alert) => {
    const { country_id, kind, id_alerte_mesure, id_alerte_lot } = alert;
    if (!country_id) return null;
    try {
      if (kind === "mesure") {
        return await api.put(`/api/central/${country_id}/alertes-mesures/${id_alerte_mesure}/lue`);
      } else {
        return await api.put(`/api/central/${country_id}/alertes-lots/${id_alerte_lot}/lue`);
      }
    } catch (e) {
      console.error("Erreur marquerLue:", e);
      return null;
    }
  },

  // Marque toutes les alertes comme lues dans tous les pays
  marquerToutesLues: async () => {
    try {
      return await api.put("/api/central/alertes/toutes/lues");
    } catch (e) {
      console.error("Erreur marquerToutesLues:", e);
      return null;
    }
  },
};
