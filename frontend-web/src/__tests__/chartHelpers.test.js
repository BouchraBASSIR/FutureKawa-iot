/**
 * Teste la logique de filtrage/regroupement des mesures pour les graphiques
 * (extraite de Dashboard.jsx et Storage.jsx).
 */

// ── Helpers copiés depuis Dashboard.jsx ──────────────────────────────────────

const buildChartData = (mesures, countryId) => {
  const byDay = {};
  mesures.forEach(m => {
    const day = new Date(m.date_mesure).toLocaleDateString("fr-FR");
    if (!byDay[day]) byDay[day] = { date: day, temps: [], hums: [] };
    byDay[day].temps.push(m.temperature);
    byDay[day].hums.push(m.humidite);
  });
  return Object.values(byDay).slice(-30).map(d => ({
    date: d.date,
    [countryId + "_temp"]: parseFloat((d.temps.reduce((s, v) => s + v, 0) / d.temps.length).toFixed(1)),
    [countryId + "_hum"]:  parseFloat((d.hums.reduce((s, v)  => s + v, 0) / d.hums.length).toFixed(1)),
  }));
};

const mergeChartData = (datasets) => {
  const merged = {};
  datasets.forEach(rows =>
    rows.forEach(row => {
      if (!merged[row.date]) merged[row.date] = { date: row.date };
      Object.assign(merged[row.date], row);
    })
  );
  return Object.values(merged).sort((a, b) => {
    const [da, ma, ya] = a.date.split("/").map(Number);
    const [db, mb, yb] = b.date.split("/").map(Number);
    return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
  });
};

// ── Tests ─────────────────────────────────────────────────────────────────────

const MESURES_BRESIL = [
  { temperature: 28.0, humidite: 60.0, date_mesure: "2026-06-01T08:00:00" },
  { temperature: 30.0, humidite: 64.0, date_mesure: "2026-06-01T20:00:00" },
  { temperature: 27.5, humidite: 61.0, date_mesure: "2026-06-02T08:00:00" },
];

describe("buildChartData", () => {
  it("regroupe les mesures par jour", () => {
    const data = buildChartData(MESURES_BRESIL, "bresil");
    expect(data).toHaveLength(2); // 2 jours distincts
  });

  it("calcule la moyenne de température par jour", () => {
    const data = buildChartData(MESURES_BRESIL, "bresil");
    // Jour 01/06 : (28 + 30) / 2 = 29
    const jour1 = data.find(d => d.date.startsWith("01/06"));
    expect(jour1["bresil_temp"]).toBe(29.0);
  });

  it("calcule la moyenne d'humidité par jour", () => {
    const data = buildChartData(MESURES_BRESIL, "bresil");
    const jour1 = data.find(d => d.date.startsWith("01/06"));
    expect(jour1["bresil_hum"]).toBe(62.0);
  });

  it("préfixe les clés avec le countryId", () => {
    const data = buildChartData(MESURES_BRESIL, "equateur");
    expect(data[0]).toHaveProperty("equateur_temp");
    expect(data[0]).toHaveProperty("equateur_hum");
  });

  it("retourne [] pour une liste de mesures vide", () => {
    expect(buildChartData([], "bresil")).toEqual([]);
  });
});

describe("mergeChartData", () => {
  it("fusionne les données de plusieurs pays", () => {
    const br = buildChartData(MESURES_BRESIL, "bresil");
    const eq = buildChartData(
      [{ temperature: 22.0, humidite: 55.0, date_mesure: "2026-06-01T10:00:00" }],
      "equateur"
    );
    const merged = mergeChartData([br, eq]);
    const jour1 = merged.find(d => d.date.startsWith("01/06"));
    expect(jour1).toHaveProperty("bresil_temp");
    expect(jour1).toHaveProperty("equateur_temp");
  });

  it("trie les entrées par date croissante", () => {
    const data = buildChartData(MESURES_BRESIL, "bresil");
    const merged = mergeChartData([data]);
    // Le jour le plus ancien doit être en premier
    expect(merged[0].date.startsWith("01/06")).toBe(true);
    expect(merged[1].date.startsWith("02/06")).toBe(true);
  });

  it("retourne [] pour des datasets vides", () => {
    expect(mergeChartData([[], []])).toEqual([]);
  });
});

// ── Logique seuils jauges ─────────────────────────────────────────────────────

describe("Calcul des seuils depuis la config", () => {
  const config = { temp_ideale: 29, tolerance_temp: 3, hum_ideale: 60, tolerance_hum: 2 };

  it("calcule le seuil d'alerte température à 70% de la tolérance", () => {
    const warn = parseFloat((config.temp_ideale + config.tolerance_temp * 0.7).toFixed(1));
    expect(warn).toBe(31.1);
  });

  it("calcule le seuil critique température à 100% de la tolérance", () => {
    const crit = parseFloat((config.temp_ideale + config.tolerance_temp).toFixed(1));
    expect(crit).toBe(32.0);
  });

  it("calcule le seuil d'alerte humidité", () => {
    const warn = parseFloat((config.hum_ideale + config.tolerance_hum * 0.7).toFixed(1));
    expect(warn).toBe(61.4);
  });
});
