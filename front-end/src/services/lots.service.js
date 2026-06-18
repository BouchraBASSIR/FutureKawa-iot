import api from "./api";

export const lotsService = {

  getAll: async () => {
    return await api.get("/lots");
  },

  getById: async (lotId) => {
    return await api.get(`/lots/${lotId}`);
  },

  create: async (lot) => {
    return await api.post("/lots", lot);
  }

};