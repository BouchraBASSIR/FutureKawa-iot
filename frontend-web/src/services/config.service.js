import api from "./api";

export const configService = {

  // Lecture de la config d'un pays via le backend central
  getConfig: async (countryId) => {
    return await api.get(`/api/central/${countryId}/config`);
  },

  // Les opérations d'écriture ne sont pas exposées par le backend central.
  // Elles nécessitent un accès direct au backend pays.
  create: async (_config) => {
    console.warn("configService.create non supporté via le backend central");
    return null;
  },

  updateConfig: async (_config) => {
    console.warn("configService.updateConfig non supporté via le backend central");
    return null;
  },
};
