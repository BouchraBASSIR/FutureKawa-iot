import api from "./api";

const COUNTRY_IDS = ["bresil", "equateur", "colombie"];

export const dashboardService = {

  // KPI consolidés depuis /api/central/dashboard
  getDashboard: async () => {
    try {
      return await api.get("/api/central/dashboard");
    } catch (error) {
      console.error("Erreur récupération dashboard:", error);
      return null;
    }
  },

  // Lots depuis /api/central/stocks avec filtre pays optionnel
  getLots: async (country = null) => {
    try {
      const url = country && country !== "all"
        ? `/api/central/stocks?country=${country}`
        : "/api/central/stocks";
      return await api.get(url);
    } catch (error) {
      console.error("Erreur récupération lots:", error);
      return [];
    }
  },

  getAlerts: async (country = null) => {
    try {
      const url = country && country !== "all"
        ? `/api/central/alertes?country=${country}`
        : "/api/central/alertes";
      const data = await api.get(url);

      // Le backend retourne {alertes_mesures: [...], alertes_lots: [...]}
      const mesures = (data?.alertes_mesures || []).map(a => ({
        ...a,
        id: `m-${a.id_alerte_mesure}`,
        kind: "mesure",
      }));
      const lots = (data?.alertes_lots || []).map(a => ({
        ...a,
        id: `l-${a.id_alerte_lot}`,
        kind: "lot",
        type_alerte: "perime",
      }));

      return [...mesures, ...lots].sort(
        (a, b) => new Date(b.date_alerte) - new Date(a.date_alerte)
      );
    } catch (error) {
      console.error("Erreur récupération alertes:", error);
      return [];
    }
  },

  getMesures: async (country = null) => {
    try {
      if (country && country !== "all") {
        return await api.get(`/api/central/${country}/mesures`);
      }
      const results = await Promise.allSettled(
        COUNTRY_IDS.map(id => api.get(`/api/central/${id}/mesures`))
      );
      return results.flatMap((r, i) => {
        if (r.status !== "fulfilled" || !Array.isArray(r.value)) return [];
        return r.value.map(m => ({ ...m, country_id: COUNTRY_IDS[i] }));
      });
    } catch (error) {
      console.error("Erreur récupération mesures:", error);
      return [];
    }
  },

  // Entrepôts d'un pays via le backend central
  getEntrepots: async (country) => {
    try {
      return await api.get(`/api/central/${country}/entrepots`);
    } catch (error) {
      return [];
    }
  },

  // Exploitations d'un pays via le backend central
  getExploitations: async (country) => {
    try {
      return await api.get(`/api/central/${country}/exploitations`);
    } catch (error) {
      return [];
    }
  },

  // Compte d'alertes non lues
  getAlertsCount: async () => {
    try {
      return await api.get("/api/central/alertes/count");
    } catch (error) {
      console.error("Erreur récupération count alertes:", error);
      return { non_lues: 0 };
    }
  },
};
