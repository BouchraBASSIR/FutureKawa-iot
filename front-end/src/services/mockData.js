// ─── Helpers ────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, "0");

const dateStr = (daysAgo) => {
  const d = new Date("2026-06-18");
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const futureDate = (daysAhead) => {
  const d = new Date("2026-06-18");
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const rand = (min, max, decimals = 1) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

// ─── Lots ────────────────────────────────────────────────────────────────────

export const mockLots = [
  { id: "LOT-BR-001", country: "Brésil",    countryCode: "BR", origin: "Minas Gerais",   variety: "Arabica",  quantity: 320, entryDate: dateStr(90), expiryDate: futureDate(275), status: "conforme",      warehouse: "Entrepôt A", temperature: 17.2, humidity: 56.4 },
  { id: "LOT-BR-002", country: "Brésil",    countryCode: "BR", origin: "São Paulo",       variety: "Arabica",  quantity: 450, entryDate: dateStr(75), expiryDate: futureDate(290), status: "conforme",      warehouse: "Entrepôt A", temperature: 18.1, humidity: 58.0 },
  { id: "LOT-BR-003", country: "Brésil",    countryCode: "BR", origin: "Minas Gerais",   variety: "Robusta",  quantity: 280, entryDate: dateStr(60), expiryDate: futureDate(305), status: "avertissement", warehouse: "Entrepôt B", temperature: 23.4, humidity: 66.2 },
  { id: "LOT-BR-004", country: "Brésil",    countryCode: "BR", origin: "Bahia",          variety: "Arabica",  quantity: 190, entryDate: dateStr(120), expiryDate: futureDate(245), status: "conforme",     warehouse: "Entrepôt A", temperature: 16.8, humidity: 54.1 },
  { id: "LOT-BR-005", country: "Brésil",    countryCode: "BR", origin: "Espírito Santo", variety: "Robusta",  quantity: 350, entryDate: dateStr(180), expiryDate: futureDate(180), status: "avertissement", warehouse: "Entrepôt B", temperature: 22.0, humidity: 63.5 },
  { id: "LOT-BR-006", country: "Brésil",    countryCode: "BR", origin: "Minas Gerais",   variety: "Arabica",  quantity: 210, entryDate: dateStr(400), expiryDate: futureDate(-35), status: "expiré",       warehouse: "Entrepôt C", temperature: 19.3, humidity: 60.0 },
  { id: "LOT-BR-007", country: "Brésil",    countryCode: "BR", origin: "São Paulo",       variety: "Arabica",  quantity: 260, entryDate: dateStr(45),  expiryDate: futureDate(320), status: "conforme",     warehouse: "Entrepôt A", temperature: 17.9, humidity: 57.3 },
  { id: "LOT-BR-008", country: "Brésil",    countryCode: "BR", origin: "Bahia",           variety: "Robusta",  quantity: 180, entryDate: dateStr(200), expiryDate: futureDate(160), status: "avertissement", warehouse: "Entrepôt B", temperature: 21.5, humidity: 64.8 },
  { id: "LOT-CO-001", country: "Colombie",  countryCode: "CO", origin: "Antioquia",      variety: "Arabica",  quantity: 400, entryDate: dateStr(55),  expiryDate: futureDate(310), status: "conforme",      warehouse: "Entrepôt D", temperature: 16.5, humidity: 55.0 },
  { id: "LOT-CO-002", country: "Colombie",  countryCode: "CO", origin: "Huila",          variety: "Arabica",  quantity: 290, entryDate: dateStr(30),  expiryDate: futureDate(335), status: "conforme",      warehouse: "Entrepôt D", temperature: 17.0, humidity: 56.8 },
  { id: "LOT-CO-003", country: "Colombie",  countryCode: "CO", origin: "Nariño",         variety: "Arabica",  quantity: 340, entryDate: dateStr(95),  expiryDate: futureDate(270), status: "conforme",      warehouse: "Entrepôt D", temperature: 18.3, humidity: 58.5 },
  { id: "LOT-CO-004", country: "Colombie",  countryCode: "CO", origin: "Cauca",          variety: "Robusta",  quantity: 220, entryDate: dateStr(140), expiryDate: futureDate(225), status: "avertissement", warehouse: "Entrepôt E", temperature: 22.8, humidity: 65.1 },
  { id: "LOT-CO-005", country: "Colombie",  countryCode: "CO", origin: "Antioquia",      variety: "Arabica",  quantity: 310, entryDate: dateStr(365), expiryDate: futureDate(-10), status: "expiré",        warehouse: "Entrepôt E", temperature: 20.1, humidity: 62.3 },
  { id: "LOT-CO-006", country: "Colombie",  countryCode: "CO", origin: "Huila",          variety: "Arabica",  quantity: 270, entryDate: dateStr(20),  expiryDate: futureDate(345), status: "conforme",      warehouse: "Entrepôt D", temperature: 16.2, humidity: 54.7 },
  { id: "LOT-CO-007", country: "Colombie",  countryCode: "CO", origin: "Tolima",         variety: "Arabica",  quantity: 230, entryDate: dateStr(70),  expiryDate: futureDate(295), status: "conforme",      warehouse: "Entrepôt D", temperature: 17.6, humidity: 57.1 },
  { id: "LOT-EC-001", country: "Équateur",  countryCode: "EC", origin: "Pichincha",      variety: "Arabica",  quantity: 200, entryDate: dateStr(40),  expiryDate: futureDate(325), status: "conforme",      warehouse: "Entrepôt F", temperature: 16.9, humidity: 55.9 },
  { id: "LOT-EC-002", country: "Équateur",  countryCode: "EC", origin: "Tungurahua",     variety: "Arabica",  quantity: 160, entryDate: dateStr(85),  expiryDate: futureDate(280), status: "conforme",      warehouse: "Entrepôt F", temperature: 17.4, humidity: 56.5 },
  { id: "LOT-EC-003", country: "Équateur",  countryCode: "EC", origin: "Manabí",         variety: "Robusta",  quantity: 240, entryDate: dateStr(160), expiryDate: futureDate(205), status: "avertissement", warehouse: "Entrepôt G", temperature: 23.1, humidity: 67.0 },
  { id: "LOT-EC-004", country: "Équateur",  countryCode: "EC", origin: "Pichincha",      variety: "Arabica",  quantity: 180, entryDate: dateStr(390), expiryDate: futureDate(-5),  status: "expiré",        warehouse: "Entrepôt G", temperature: 19.8, humidity: 61.4 },
  { id: "LOT-EC-005", country: "Équateur",  countryCode: "EC", origin: "Loja",           variety: "Arabica",  quantity: 210, entryDate: dateStr(10),  expiryDate: futureDate(355), status: "conforme",      warehouse: "Entrepôt F", temperature: 16.1, humidity: 54.2 },
];

// ─── Alerts ──────────────────────────────────────────────────────────────────

export const mockAlerts = [
  { id: "ALT-001", lotId: "LOT-BR-003", country: "Brésil",   type: "temperature", level: "critique", message: "Température critique : 23.4°C (seuil : 22°C)",             timestamp: "2026-06-18T08:14:00", acknowledged: false, emailSent: true  },
  { id: "ALT-002", lotId: "LOT-EC-003", country: "Équateur", type: "humidity",    level: "critique", message: "Humidité critique : 67.0% (seuil : 65%)",                  timestamp: "2026-06-18T07:45:00", acknowledged: false, emailSent: true  },
  { id: "ALT-003", lotId: "LOT-BR-006", country: "Brésil",   type: "expiry",      level: "critique", message: "LOT-BR-006 expiré depuis 35 jours",                        timestamp: "2026-06-17T23:59:00", acknowledged: false, emailSent: true  },
  { id: "ALT-004", lotId: "LOT-BR-005", country: "Brésil",   type: "temperature", level: "haute",    message: "Température élevée : 22.0°C — surveiller",                 timestamp: "2026-06-18T06:30:00", acknowledged: false, emailSent: true  },
  { id: "ALT-005", lotId: "LOT-CO-004", country: "Colombie", type: "temperature", level: "haute",    message: "Température élevée : 22.8°C (seuil : 22°C)",               timestamp: "2026-06-17T22:10:00", acknowledged: true,  emailSent: true  },
  { id: "ALT-006", lotId: "LOT-CO-005", country: "Colombie", type: "expiry",      level: "haute",    message: "LOT-CO-005 expiré depuis 10 jours",                        timestamp: "2026-06-17T20:00:00", acknowledged: false, emailSent: true  },
  { id: "ALT-007", lotId: "LOT-EC-004", country: "Équateur", type: "expiry",      level: "haute",    message: "LOT-EC-004 expiré depuis 5 jours",                         timestamp: "2026-06-17T19:30:00", acknowledged: false, emailSent: false },
  { id: "ALT-008", lotId: "LOT-BR-008", country: "Brésil",   type: "humidity",    level: "moyenne",  message: "Humidité à surveiller : 64.8%",                             timestamp: "2026-06-17T16:00:00", acknowledged: true,  emailSent: false },
  { id: "ALT-009", lotId: "LOT-CO-004", country: "Colombie", type: "humidity",    level: "moyenne",  message: "Humidité à 65.1% — proche du seuil critique",              timestamp: "2026-06-17T14:20:00", acknowledged: true,  emailSent: false },
  { id: "ALT-010", lotId: "LOT-BR-005", country: "Brésil",   type: "expiry",      level: "moyenne",  message: "LOT-BR-005 expire dans 180 jours — planifier traitement",  timestamp: "2026-06-16T10:00:00", acknowledged: true,  emailSent: false },
  { id: "ALT-011", lotId: "LOT-EC-003", country: "Équateur", type: "temperature", level: "moyenne",  message: "Température à 23.1°C — vérifier ventilation",               timestamp: "2026-06-16T08:45:00", acknowledged: true,  emailSent: true  },
  { id: "ALT-012", lotId: "LOT-BR-003", country: "Brésil",   type: "humidity",    level: "haute",    message: "Humidité : 66.2% — risque de moisissure",                  timestamp: "2026-06-15T22:30:00", acknowledged: true,  emailSent: true  },
];

// ─── Temperature / Humidity history (last 30 days) ───────────────────────────

const generateHistory = (base, variance) =>
  Array.from({ length: 30 }, (_, i) => ({
    date: dateStr(29 - i),
    value: parseFloat((base + (Math.sin(i * 0.4) * variance) + (Math.random() - 0.5) * 0.8).toFixed(1)),
  }));

export const temperatureHistory = {
  Brésil:   generateHistory(18.5, 2.5),
  Colombie: generateHistory(17.8, 2.0),
  Équateur: generateHistory(19.2, 2.8),
};

export const humidityHistory = {
  Brésil:   generateHistory(59.0, 4.0),
  Colombie: generateHistory(57.5, 3.5),
  Équateur: generateHistory(60.5, 4.5),
};

// ─── Combined chart data (by date) ──────────────────────────────────────────

export const combinedTempData = temperatureHistory["Brésil"].map((item, i) => ({
  date: item.date.slice(5), // MM-DD
  Brésil:   item.value,
  Colombie: temperatureHistory["Colombie"][i].value,
  Équateur: temperatureHistory["Équateur"][i].value,
}));

export const combinedHumidityData = humidityHistory["Brésil"].map((item, i) => ({
  date: item.date.slice(5),
  Brésil:   item.value,
  Colombie: humidityHistory["Colombie"][i].value,
  Équateur: humidityHistory["Équateur"][i].value,
}));

// ─── Warehouse / Storage live data ───────────────────────────────────────────

export const warehouseData = {
  "Entrepôt A": { country: "Brésil",   lots: 3, temperature: 17.4, humidity: 57.1, capacity: 80, status: "normal"   },
  "Entrepôt B": { country: "Brésil",   lots: 2, temperature: 22.6, humidity: 64.9, capacity: 65, status: "warning"  },
  "Entrepôt C": { country: "Brésil",   lots: 1, temperature: 19.3, humidity: 60.0, capacity: 30, status: "normal"   },
  "Entrepôt D": { country: "Colombie", lots: 4, temperature: 17.0, humidity: 56.2, capacity: 90, status: "normal"   },
  "Entrepôt E": { country: "Colombie", lots: 2, temperature: 21.8, humidity: 63.8, capacity: 55, status: "warning"  },
  "Entrepôt F": { country: "Équateur", lots: 3, temperature: 16.8, humidity: 55.6, capacity: 75, status: "normal"   },
  "Entrepôt G": { country: "Équateur", lots: 2, temperature: 22.4, humidity: 66.1, capacity: 45, status: "critical" },
};

// ─── Country stats ────────────────────────────────────────────────────────────

export const countryStats = [
  {
    name: "Brésil",
    code: "BR",
    flag: "🇧🇷",
    lots: mockLots.filter((l) => l.countryCode === "BR").length,
    activeLots: mockLots.filter((l) => l.countryCode === "BR" && l.status === "conforme").length,
    alerts: mockAlerts.filter((a) => a.country === "Brésil").length,
    avgTemp: 19.8,
    avgHumidity: 60.0,
    warehouses: ["Entrepôt A", "Entrepôt B", "Entrepôt C"],
    coordinates: [-46.63, -23.55],
  },
  {
    name: "Colombie",
    code: "CO",
    flag: "🇨🇴",
    lots: mockLots.filter((l) => l.countryCode === "CO").length,
    activeLots: mockLots.filter((l) => l.countryCode === "CO" && l.status === "conforme").length,
    alerts: mockAlerts.filter((a) => a.country === "Colombie").length,
    avgTemp: 18.9,
    avgHumidity: 58.8,
    warehouses: ["Entrepôt D", "Entrepôt E"],
    coordinates: [-74.09, 4.71],
  },
  {
    name: "Équateur",
    code: "EC",
    flag: "🇪🇨",
    lots: mockLots.filter((l) => l.countryCode === "EC").length,
    activeLots: mockLots.filter((l) => l.countryCode === "EC" && l.status === "conforme").length,
    alerts: mockAlerts.filter((a) => a.country === "Équateur").length,
    avgTemp: 19.5,
    avgHumidity: 59.3,
    warehouses: ["Entrepôt F", "Entrepôt G"],
    coordinates: [-78.49, -0.22],
  },
];

// ─── KPI summary ─────────────────────────────────────────────────────────────

export const kpiData = {
  totalLots: mockLots.length,
  activeAlerts: mockAlerts.filter((a) => !a.acknowledged).length,
  avgTemperature: parseFloat(
    (mockLots.reduce((s, l) => s + l.temperature, 0) / mockLots.length).toFixed(1)
  ),
  avgHumidity: parseFloat(
    (mockLots.reduce((s, l) => s + l.humidity, 0) / mockLots.length).toFixed(1)
  ),
  conformLots: mockLots.filter((l) => l.status === "conforme").length,
  expiredLots: mockLots.filter((l) => l.status === "expiré").length,
  warningLots: mockLots.filter((l) => l.status === "avertissement").length,
};

// ─── Lot detail histories ─────────────────────────────────────────────────────

export const getLotHistory = (lotId) => {
  const lot = mockLots.find((l) => l.id === lotId);
  if (!lot) return { temp: [], humidity: [] };
  const base = lot.temperature;
  const humBase = lot.humidity;
  const points = 14;
  return {
    temp: Array.from({ length: points }, (_, i) => ({
      date: dateStr(points - 1 - i),
      value: parseFloat((base + (Math.sin(i * 0.5) * 1.5) + (Math.random() - 0.5) * 0.6).toFixed(1)),
    })),
    humidity: Array.from({ length: points }, (_, i) => ({
      date: dateStr(points - 1 - i),
      value: parseFloat((humBase + (Math.cos(i * 0.4) * 2) + (Math.random() - 0.5) * 0.8).toFixed(1)),
    })),
    traceability: [
      { date: lot.entryDate,     event: "Entrée en stock",           detail: `${lot.quantity} kg reçus — ${lot.origin}` },
      { date: dateStr(60),       event: "Contrôle qualité",          detail: "Inspection visuelle et olfactive — conforme" },
      { date: dateStr(30),       event: "Mesure T° & Humidité",      detail: `T: ${lot.temperature}°C | H: ${lot.humidity}%` },
      { date: dateStr(15),       event: "Réajustement stockage",     detail: "Déplacé vers zone optimisée" },
      { date: dateStr(0),        event: "Dernier contrôle",          detail: `Statut : ${lot.status}` },
    ],
  };
};

// ─── Report data ─────────────────────────────────────────────────────────────

export const reportData = {
  inventoryByCountry: [
    { name: "Brésil",   value: mockLots.filter((l) => l.countryCode === "BR").reduce((s, l) => s + l.quantity, 0) },
    { name: "Colombie", value: mockLots.filter((l) => l.countryCode === "CO").reduce((s, l) => s + l.quantity, 0) },
    { name: "Équateur", value: mockLots.filter((l) => l.countryCode === "EC").reduce((s, l) => s + l.quantity, 0) },
  ],
  alertsByMonth: [
    { month: "Jan", critique: 1, haute: 2, moyenne: 3 },
    { month: "Fév", critique: 2, haute: 1, moyenne: 4 },
    { month: "Mar", critique: 0, haute: 3, moyenne: 5 },
    { month: "Avr", critique: 1, haute: 2, moyenne: 2 },
    { month: "Mai", critique: 3, haute: 4, moyenne: 3 },
    { month: "Jun", critique: 2, haute: 3, moyenne: 4 },
  ],
  qualityByVariety: [
    { variety: "Arabica",  conforme: 11, avertissement: 3, expiré: 2 },
    { variety: "Robusta",  conforme: 2,  avertissement: 3, expiré: 1 },
  ],
};
