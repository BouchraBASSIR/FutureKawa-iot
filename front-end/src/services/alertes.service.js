import api from "./api";

export const alertesService = {

  getAll: async () => {
    return await api.get("/alertes");
  },

  getNonLues: async () => {
    return await api.get("/alertes/non-lues");
  },

  getCount: async () => {
    return await api.get("/alertes/count");
  }

};