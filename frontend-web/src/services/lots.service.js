import api from "./api";

export const lotsService = {

  // Tous les lots (triés FIFO par date_stockage)
  getAll: async (country = null) => {
    const url = country && country !== "all"
      ? `/api/central/stocks?country=${country}`
      : "/api/central/stocks";
    return await api.get(url);
  },

  // Détail d'un lot (country_id requis car central proxifie vers le backend pays)
  getById: async (countryId, lotId) => {
    return await api.get(`/api/central/stocks/${countryId}/${lotId}`);
  },

  // Historique température/humidité d'un lot depuis sa date de stockage
  getMesures: async (countryId, lotId) => {
    return await api.get(`/api/central/stocks/${countryId}/${lotId}/mesures`);
  },

  // Créer un lot dans un backend pays via le central
  create: async (countryId, lot) => {
    return await api.post(`/api/central/${countryId}/lots`, lot);
  },
};
