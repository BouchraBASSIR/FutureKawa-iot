import api from "./api";

export const configService = {

  getConfig: async () => {
    return await api.get("/config");
  },

  updateConfig: async (config) => {
    return await api.put("/config", config);
  }

};