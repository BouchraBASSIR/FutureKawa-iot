import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { authService } from "../services/auth.services";

jest.mock("../services/auth.services", () => ({
  authService: {
    getProfile: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: jest.fn(),
  },
}));

const PROFILE_ADMIN = {
  roles: ["admin"],
  accesses: [],
  email: "admin@futurekawa.com",
};

const PROFILE_RESP_PAYS = {
  roles: ["responsable_pays"],
  accesses: [
    { pays: "equateur", entrepots: [1, 2] },
  ],
  email: "resp@futurekawa.com",
};

const PROFILE_OPERATEUR = {
  roles: ["operateur"],
  accesses: [
    { pays: "bresil", entrepots: [3] },
  ],
  email: "op@futurekawa.com",
};

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe("AuthContext — hasRole", () => {
  it("retourne true pour le rôle exact", () => {
    authService.getProfile.mockReturnValue(PROFILE_ADMIN);
    authService.isAuthenticated.mockReturnValue(true);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.hasRole("admin")).toBe(true);
  });

  it("retourne false pour un rôle absent", () => {
    authService.getProfile.mockReturnValue(PROFILE_ADMIN);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.hasRole("operateur")).toBe(false);
  });

  it("retourne true si l'un des rôles listés correspond", () => {
    authService.getProfile.mockReturnValue(PROFILE_RESP_PAYS);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.hasRole("admin", "responsable_pays")).toBe(true);
  });
});

describe("AuthContext — getEntrepotsForPays", () => {
  it("retourne null pour un admin (accès total)", () => {
    authService.getProfile.mockReturnValue(PROFILE_ADMIN);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.getEntrepotsForPays("bresil")).toBeNull();
  });

  it("retourne null pour responsable_pays (accès total à son pays)", () => {
    authService.getProfile.mockReturnValue(PROFILE_RESP_PAYS);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.getEntrepotsForPays("equateur")).toBeNull();
  });

  it("retourne la liste d'entrepôts pour un opérateur", () => {
    authService.getProfile.mockReturnValue(PROFILE_OPERATEUR);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.getEntrepotsForPays("bresil")).toEqual([3]);
  });

  it("retourne [] si l'opérateur n'a pas accès au pays demandé", () => {
    authService.getProfile.mockReturnValue(PROFILE_OPERATEUR);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.getEntrepotsForPays("colombie")).toEqual([]);
  });
});

describe("AuthContext — getAllowedPays", () => {
  it("retourne null pour un admin", () => {
    authService.getProfile.mockReturnValue(PROFILE_ADMIN);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.getAllowedPays()).toBeNull();
  });

  it("retourne les pays du JWT pour un responsable_pays", () => {
    authService.getProfile.mockReturnValue(PROFILE_RESP_PAYS);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.getAllowedPays()).toEqual(["equateur"]);
  });

  it("retourne les pays du JWT pour un opérateur", () => {
    authService.getProfile.mockReturnValue(PROFILE_OPERATEUR);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.getAllowedPays()).toEqual(["bresil"]);
  });
});

describe("AuthContext — login / logout", () => {
  it("met à jour le profil après login réussi", async () => {
    authService.getProfile.mockReturnValue(null);
    authService.login.mockResolvedValue({ success: true, profile: PROFILE_ADMIN });
    authService.isAuthenticated.mockReturnValue(true);

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);

    await act(async () => {
      await result.current.login("admin@futurekawa.com", "password");
    });

    expect(result.current.profile).toEqual(PROFILE_ADMIN);
  });

  it("vide le profil après logout", async () => {
    authService.getProfile.mockReturnValue(PROFILE_ADMIN);
    authService.isAuthenticated.mockReturnValue(false);

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.logout();
    });

    expect(result.current.profile).toBeNull();
  });
});
