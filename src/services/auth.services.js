const TOKEN_KEY = "futurekawa_token";
const USER_KEY = "futurekawa_user";

const buildProfile = (email) => {
  const namePart = email.split("@")[0];
  const name = namePart
    .split(/[._\-+]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return { name, email, role: "Administrateur", initials };
};

export const authService = {
  login(email, password) {
    if (email && password) {
      const token = `fk_token_${Date.now()}`;
      const profile = buildProfile(email);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(profile));
      return { success: true, profile };
    }
    return { success: false };
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  getProfile() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  updateProfile(data) {
    const current = this.getProfile() ?? {};
    const name = data.name?.trim() || current.name;
    const email = data.email?.trim() || current.email;
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const updated = { ...current, name, email, initials };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    return updated;
  },
};
