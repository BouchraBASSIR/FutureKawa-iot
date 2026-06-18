import request from "superagent";

const API_URL = process.env.API_BASE_URL;

const api = {
  get: async (url) => {
    const response = await request.get(`${API_URL}${url}`);
    return response.body;
  },

  post: async (url, body) => {
    const response = await request
      .post(`${API_URL}${url}`)
      .send(body);

    return response.body;
  },

  put: async (url, body) => {
    const response = await request
      .put(`${API_URL}${url}`)
      .send(body);

    return response.body;
  }
};

export default api;