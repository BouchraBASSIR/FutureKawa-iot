import api from "./api";

export const mesuresService = {

  getAll: async () => {
    return await api.get("/mesures");
  },

  getDernieres: async (nombre = 20) => {
    return await api.get(`/mesures/dernieres/${nombre}`);
  }

};