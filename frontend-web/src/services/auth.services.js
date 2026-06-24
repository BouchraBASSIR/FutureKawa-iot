const TOKEN_KEY = "futurekawa_token";

const API_URL = process.env.API_BASE_URL || "";

function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

function buildProfile(payload) {
  const name = `${payload.prenom ?? ""} ${payload.nom ?? ""}`.trim() || payload.email;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return {
    id:        payload.sub,
    name,
    email:     payload.email,
    initials,
    roles:     payload.roles    ?? [],
    accesses:  payload.accesses ?? [],
  };
}

export const authService = {
  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, mot_de_passe: password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail ?? "Identifiants incorrects" };
    }

    const { access_token } = await res.json();
    localStorage.setItem(TOKEN_KEY, access_token);

    const payload = decodeJwt(access_token);
    return { success: true, profile: buildProfile(payload) };
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    const payload = decodeJwt(token);
    if (!payload) return false;
    // Vérifie l'expiration (exp est en secondes)
    return payload.exp * 1000 > Date.now();
  },

  getProfile() {
    const token = this.getToken();
    if (!token) return null;
    const payload = decodeJwt(token);
    if (!payload || payload.exp * 1000 <= Date.now()) return null;
    return buildProfile(payload);
  },
};
