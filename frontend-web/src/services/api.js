import request from "superagent";
import { authService } from "./auth.services";

const API_URL = process.env.API_BASE_URL || "";

// Cache en mémoire avec TTL - évite de refaire les appels GET à chaque navigation
const CACHE_TTL = 30_000; // 30 secondes
const _cache = new Map();

const getCached = (url) => {
  const entry = _cache.get(url);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
};

const setCache = (url, data) => {
  _cache.set(url, { data, ts: Date.now() });
};

const invalidate = (...prefixes) => {
  for (const key of _cache.keys()) {
    if (prefixes.some((p) => key.includes(p))) _cache.delete(key);
  }
};

function withAuth(req) {
  const token = authService.getToken();
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req;
}

const api = {
  get: async (url) => {
    const cached = getCached(url);
    if (cached !== null) return cached;
    const response = await withAuth(request.get(`${API_URL}${url}`));
    setCache(url, response.body);
    return response.body;
  },

  post: async (url, body) => {
    const response = await withAuth(request.post(`${API_URL}${url}`)).send(body);
    invalidate("/stocks", "/lots", "/alertes", "/users");
    return response.body;
  },

  put: async (url, body) => {
    const response = await withAuth(request.put(`${API_URL}${url}`)).send(body);
    if (url.includes("alerte")) invalidate("/alertes");
    return response.body;
  },

  delete: async (url) => {
    const response = await withAuth(request.delete(`${API_URL}${url}`));
    invalidate("/stocks", "/lots", "/alertes", "/users");
    return response.body;
  },

  clearCache: (...prefixes) => {
    if (!prefixes.length) { _cache.clear(); return; }
    invalidate(...prefixes);
  },
};

export default api;
