import { dashboardService } from "../services/dashboard.service";

// Mock axios/api
jest.mock("../services/api", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

const api = require("../services/api");

const ENTREPOTS = [
  { id_entrepot: 1, nom: "Entrepôt A", localisation: "Quito" },
  { id_entrepot: 2, nom: "Entrepôt B", localisation: "Guayaquil" },
];

const MESURES = [
  { id_mesure: 1, temperature: 28.5, humidite: 62.0, date_mesure: "2026-06-01T10:00:00" },
  { id_mesure: 2, temperature: 29.1, humidite: 63.5, date_mesure: "2026-06-01T11:00:00" },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("dashboardService.getEntrepots", () => {
  it("retourne la liste des entrepôts", async () => {
    api.get.mockResolvedValue(ENTREPOTS);
    const result = await dashboardService.getEntrepots("equateur");
    expect(api.get).toHaveBeenCalledWith("/api/central/equateur/entrepots");
    expect(result).toEqual(ENTREPOTS);
  });

  it("retourne [] si l'API échoue", async () => {
    api.get.mockRejectedValue(new Error("Network error"));
    const result = await dashboardService.getEntrepots("equateur");
    expect(result).toEqual([]);
  });
});

describe("dashboardService.getMesures", () => {
  it("retourne les mesures", async () => {
    api.get.mockResolvedValue(MESURES);
    const result = await dashboardService.getMesures("bresil");
    expect(api.get).toHaveBeenCalledWith("/api/central/bresil/mesures");
    expect(result).toHaveLength(2);
  });

  it("retourne [] si l'API échoue", async () => {
    api.get.mockRejectedValue(new Error("Timeout"));
    const result = await dashboardService.getMesures("bresil");
    expect(result).toEqual([]);
  });
});

describe("dashboardService.getMesuresParEntrepot", () => {
  it("construit la bonne URL", async () => {
    api.get.mockResolvedValue(MESURES);
    await dashboardService.getMesuresParEntrepot("colombie", 3);
    expect(api.get).toHaveBeenCalledWith("/api/central/colombie/entrepots/3/mesures");
  });

  it("retourne [] si l'API échoue", async () => {
    api.get.mockRejectedValue(new Error("error"));
    const result = await dashboardService.getMesuresParEntrepot("colombie", 99);
    expect(result).toEqual([]);
  });
});

describe("dashboardService.getCapteurs", () => {
  it("retourne les capteurs", async () => {
    const capteurs = [{ id_capteur: 1, reference: "CAP-001", statut: "actif" }];
    api.get.mockResolvedValue(capteurs);
    const result = await dashboardService.getCapteurs("equateur");
    expect(api.get).toHaveBeenCalledWith("/api/central/equateur/capteurs");
    expect(result).toEqual(capteurs);
  });
});

describe("dashboardService.getConfig", () => {
  it("retourne la config", async () => {
    const config = { temp_ideale: 29, tolerance_temp: 3, hum_ideale: 60, tolerance_hum: 2 };
    api.get.mockResolvedValue(config);
    const result = await dashboardService.getConfig("bresil");
    expect(result.temp_ideale).toBe(29);
  });

  it("retourne null si 403 ou API échoue", async () => {
    api.get.mockRejectedValue({ response: { status: 403 } });
    const result = await dashboardService.getConfig("bresil");
    expect(result).toBeNull();
  });
});
