"""
Tests du backend central FutureKawa.

Stratégie :
- Tous les appels HTTP sortants vers les backends pays sont mockés via
  unittest.mock.patch("main.fetch_from_country").
- On teste le comportement du central indépendamment de la disponibilité
  des backends pays (tests unitaires d'intégration interne).
- Les tests asynchrones sont gérés automatiquement par pytest-asyncio
  (asyncio_mode = auto dans pytest.ini).
"""

import sys
import os
import pytest
import httpx
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../src"))

from main import app, COUNTRIES  # noqa: E402

# ── Client de test ASGI ───────────────────────────────────────────────────────

transport = httpx.ASGITransport(app=app)


def make_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=transport, base_url="http://test")


# ── Données de test ───────────────────────────────────────────────────────────

LOT_BR_01 = {
    "id_lot": "LOT-BR-01",
    "id_entrepot": 1,
    "date_stockage": "2026-01-10T08:00:00",
    "statut": "conforme",
}
LOT_BR_02 = {
    "id_lot": "LOT-BR-02",
    "id_entrepot": 1,
    "date_stockage": "2026-03-15T10:00:00",
    "statut": "en_alerte",
}
LOT_EQ_01 = {
    "id_lot": "LOT-EQ-01",
    "id_entrepot": 2,
    "date_stockage": "2025-12-01T06:00:00",
    "statut": "conforme",
}

MESURES_SAMPLE = [
    {"id_mesure": 1, "temperature": 28.5, "humidite": 54.0, "date_mesure": "2026-06-01T10:00:00", "id_capteur": 1},
    {"id_mesure": 2, "temperature": 29.1, "humidite": 55.5, "date_mesure": "2026-06-01T11:00:00", "id_capteur": 1},
]

ALERTES_SAMPLE = {
    "alertes_mesures": [
        {"id_alerte_mesure": 1, "type_alerte": "temperature", "message": "Température anormale", "statut": "non_lue", "date_alerte": "2026-06-10T08:00:00"},
    ],
    "alertes_lots": [
        {"id_alerte_lot": 1, "message": "Lot LOT-BR-OLD périmé", "id_lot": "LOT-BR-OLD", "statut": "non_lue", "date_alerte": "2026-06-09T12:00:00"},
    ],
}

ALERTES_COUNT_SAMPLE = {
    "total_mesures": 5,
    "non_lues_mesures": 2,
    "total_lots": 3,
    "non_lues_lots": 1,
    "total": 8,
    "non_lues": 3,
}

DASHBOARD_SAMPLE = {
    "pays": "bresil",
    "total_lots": 10,
    "conforme_lots": 7,
    "alerte_lots": 2,
    "perime_lots": 1,
    "alertes_actives": 3,
    "temp_moyenne": 29.0,
    "humidite_moyenne": 55.0,
}

EXPLOITATIONS_SAMPLE = [{"id_exploitation": 1, "nom": "Fazenda-A", "id_config": 1}]
ENTREPOTS_SAMPLE     = [{"id_entrepot": 1, "nom": "E1", "localisation": "São Paulo", "id_exploitation": 1}]
CONFIG_SAMPLE        = {"id_config": 1, "pays": "bresil", "temp_ideale": 29.0, "hum_ideale": 55.0, "tolerance_temp": 3.0, "tolerance_hum": 2.0}


# ── Helper de mock ────────────────────────────────────────────────────────────

def make_side_effect(mapping: dict):
    """
    Crée un side_effect pour fetch_from_country basé sur un dict
    {(country_id, endpoint): valeur_retournée}.
    Retourne None pour toute combinaison absente du mapping.
    """
    def side_effect(client, country_id, endpoint, *args, **kwargs):
        return mapping.get((country_id, endpoint))
    return side_effect


# ══════════════════════════════════════════════════════════════════════════════
# 1. Health check
# ══════════════════════════════════════════════════════════════════════════════

async def test_home():
    async with make_client() as ac:
        r = await ac.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "online"
    assert "bresil" in data["configured_countries"]
    assert "equateur" in data["configured_countries"]
    assert "colombie" in data["configured_countries"]


# ══════════════════════════════════════════════════════════════════════════════
# 2. /api/central/countries
# ══════════════════════════════════════════════════════════════════════════════

@patch("main.fetch_from_country")
async def test_list_countries_all_online(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("bresil",   "/"): {"status": "online"},
        ("equateur", "/"): {"status": "online"},
        ("colombie", "/"): {"status": "online"},
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/countries")
    assert r.status_code == 200
    pays = {c["id"]: c for c in r.json()}
    assert pays["bresil"]["status"]   == "online"
    assert pays["equateur"]["status"] == "online"
    assert pays["colombie"]["status"] == "online"


@patch("main.fetch_from_country")
async def test_list_countries_one_offline(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("bresil",   "/"): {"status": "online"},
        # equateur et colombie → None (offline)
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/countries")
    assert r.status_code == 200
    pays = {c["id"]: c for c in r.json()}
    assert pays["bresil"]["status"]   == "online"
    assert pays["equateur"]["status"] == "offline"
    assert pays["colombie"]["status"] == "offline"


# ══════════════════════════════════════════════════════════════════════════════
# 3. /api/central/stocks
# ══════════════════════════════════════════════════════════════════════════════

@patch("main.fetch_from_country")
async def test_stocks_fifo_order(mock_fetch):
    """Les lots doivent être triés par date_stockage croissante (FIFO)."""
    mock_fetch.side_effect = make_side_effect({
        ("bresil",   "/lots"): [LOT_BR_01, LOT_BR_02],
        ("equateur", "/lots"): [LOT_EQ_01],
        ("colombie", "/lots"): [],
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/stocks")
    assert r.status_code == 200
    lots = r.json()
    assert len(lots) == 3
    # LOT_EQ_01 (2025-12) doit être en premier
    assert lots[0]["id_lot"] == "LOT-EQ-01"
    assert lots[0]["country_id"] == "equateur"
    assert lots[0]["pays_nom"] == COUNTRIES["equateur"]["name"]
    # Ensuite LOT-BR-01 (2026-01) puis LOT-BR-02 (2026-03)
    assert lots[1]["id_lot"] == "LOT-BR-01"
    assert lots[2]["id_lot"] == "LOT-BR-02"


@patch("main.fetch_from_country")
async def test_stocks_filter_by_country(mock_fetch):
    """Le paramètre country doit limiter la requête à un seul pays."""
    mock_fetch.side_effect = make_side_effect({
        ("bresil", "/lots"): [LOT_BR_01, LOT_BR_02],
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/stocks?country=bresil")
    assert r.status_code == 200
    lots = r.json()
    assert all(l["country_id"] == "bresil" for l in lots)
    assert len(lots) == 2


async def test_stocks_invalid_country():
    async with make_client() as ac:
        r = await ac.get("/api/central/stocks?country=allemagne")
    assert r.status_code == 400


@patch("main.fetch_from_country")
async def test_stocks_country_offline_returns_empty(mock_fetch):
    """Un backend pays hors ligne ne doit pas faire planter le consolidé."""
    mock_fetch.side_effect = make_side_effect({
        ("bresil", "/lots"): [LOT_BR_01],
        # equateur et colombie indisponibles → None
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/stocks")
    assert r.status_code == 200
    lots = r.json()
    assert len(lots) == 1
    assert lots[0]["id_lot"] == "LOT-BR-01"


# ══════════════════════════════════════════════════════════════════════════════
# 4. /api/central/stocks/{country_id}/{lot_id}
# ══════════════════════════════════════════════════════════════════════════════

@patch("main.fetch_from_country")
async def test_get_lot_found(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("bresil", "/lots/LOT-BR-01"): LOT_BR_01,
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/stocks/bresil/LOT-BR-01")
    assert r.status_code == 200
    data = r.json()
    assert data["id_lot"] == "LOT-BR-01"
    assert data["country_id"] == "bresil"


@patch("main.fetch_from_country")
async def test_get_lot_not_found(mock_fetch):
    mock_fetch.side_effect = make_side_effect({})  # backend retourne None
    async with make_client() as ac:
        r = await ac.get("/api/central/stocks/bresil/LOT-INCONNU")
    assert r.status_code == 404


async def test_get_lot_invalid_country():
    async with make_client() as ac:
        r = await ac.get("/api/central/stocks/inexistant/LOT-X")
    assert r.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# 5. /api/central/stocks/{country_id}/{lot_id}/mesures
# ══════════════════════════════════════════════════════════════════════════════

@patch("main.fetch_from_country")
async def test_get_lot_mesures(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("bresil", "/lots/LOT-BR-01/mesures"): MESURES_SAMPLE,
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/stocks/bresil/LOT-BR-01/mesures")
    assert r.status_code == 200
    mesures = r.json()
    assert len(mesures) == 2
    assert mesures[0]["temperature"] == 28.5


@patch("main.fetch_from_country")
async def test_get_lot_mesures_backend_down(mock_fetch):
    mock_fetch.side_effect = make_side_effect({})
    async with make_client() as ac:
        r = await ac.get("/api/central/stocks/bresil/LOT-BR-01/mesures")
    assert r.status_code == 502


# ══════════════════════════════════════════════════════════════════════════════
# 6. POST /api/central/{country_id}/lots
# ══════════════════════════════════════════════════════════════════════════════

@patch("main.fetch_from_country")
async def test_create_lot_success(mock_fetch):
    nouveau_lot = {**LOT_BR_01, "id_lot": "LOT-BR-99"}
    mock_fetch.side_effect = make_side_effect({
        ("bresil", "/lots"): nouveau_lot,  # POST /lots retourne le lot créé
    })
    payload = {"id_lot": "LOT-BR-99", "id_entrepot": 1, "id_utilisateur": 1}
    async with make_client() as ac:
        r = await ac.post("/api/central/bresil/lots", json=payload)
    assert r.status_code == 201
    assert r.json()["id_lot"] == "LOT-BR-99"


@patch("main.fetch_from_country")
async def test_create_lot_backend_down(mock_fetch):
    mock_fetch.side_effect = make_side_effect({})
    async with make_client() as ac:
        r = await ac.post("/api/central/bresil/lots", json={"id_lot": "X"})
    assert r.status_code == 502


async def test_create_lot_invalid_country():
    async with make_client() as ac:
        r = await ac.post("/api/central/australie/lots", json={})
    assert r.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# 7. /api/central/alertes
# ══════════════════════════════════════════════════════════════════════════════

@patch("main.fetch_from_country")
async def test_get_alertes_consolidated(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("bresil",   "/alertes"): ALERTES_SAMPLE,
        ("equateur", "/alertes"): {"alertes_mesures": [], "alertes_lots": []},
        ("colombie", "/alertes"): {"alertes_mesures": [], "alertes_lots": []},
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/alertes")
    assert r.status_code == 200
    data = r.json()
    assert len(data["alertes_mesures"]) == 1
    assert len(data["alertes_lots"]) == 1
    assert data["alertes_mesures"][0]["country_id"] == "bresil"
    assert data["alertes_lots"][0]["country_id"] == "bresil"


@patch("main.fetch_from_country")
async def test_get_alertes_filter_by_country(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("equateur", "/alertes"): ALERTES_SAMPLE,
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/alertes?country=equateur")
    assert r.status_code == 200
    data = r.json()
    assert data["alertes_mesures"][0]["country_id"] == "equateur"


@patch("main.fetch_from_country")
async def test_get_alertes_sorted_newest_first(mock_fetch):
    alertes_multi = {
        "alertes_mesures": [
            {"id_alerte_mesure": 1, "date_alerte": "2026-06-01T08:00:00", "statut": "non_lue"},
            {"id_alerte_mesure": 2, "date_alerte": "2026-06-10T08:00:00", "statut": "non_lue"},
        ],
        "alertes_lots": [],
    }
    mock_fetch.side_effect = make_side_effect({
        ("bresil",   "/alertes"): alertes_multi,
        ("equateur", "/alertes"): {"alertes_mesures": [], "alertes_lots": []},
        ("colombie", "/alertes"): {"alertes_mesures": [], "alertes_lots": []},
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/alertes")
    alertes = r.json()["alertes_mesures"]
    # La plus récente (2026-06-10) doit être en premier
    assert alertes[0]["date_alerte"] > alertes[1]["date_alerte"]


# ══════════════════════════════════════════════════════════════════════════════
# 8. /api/central/alertes/count
# ══════════════════════════════════════════════════════════════════════════════

@patch("main.fetch_from_country")
async def test_get_alertes_count(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("bresil",   "/alertes/count"): ALERTES_COUNT_SAMPLE,
        ("equateur", "/alertes/count"): {"total_mesures": 0, "non_lues_mesures": 0, "total_lots": 0, "non_lues_lots": 0, "total": 0, "non_lues": 0},
        ("colombie", "/alertes/count"): {"total_mesures": 0, "non_lues_mesures": 0, "total_lots": 0, "non_lues_lots": 0, "total": 0, "non_lues": 0},
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/alertes/count")
    assert r.status_code == 200
    data = r.json()
    assert data["total"]    == ALERTES_COUNT_SAMPLE["total"]
    assert data["non_lues"] == ALERTES_COUNT_SAMPLE["non_lues"]
    assert "bresil" in data["par_pays"]


@patch("main.fetch_from_country")
async def test_alertes_count_offline_country(mock_fetch):
    """Un pays offline ne doit pas casser le total — juste signaler offline."""
    mock_fetch.side_effect = make_side_effect({
        ("bresil", "/alertes/count"): ALERTES_COUNT_SAMPLE,
        # equateur et colombie offline → None
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/alertes/count")
    assert r.status_code == 200
    data = r.json()
    assert data["par_pays"]["equateur"] == {"status": "offline"}
    assert data["total"] == ALERTES_COUNT_SAMPLE["total"]


# ══════════════════════════════════════════════════════════════════════════════
# 9. /api/central/dashboard
# ══════════════════════════════════════════════════════════════════════════════

@patch("main.fetch_from_country")
async def test_dashboard_consolidated(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("bresil",   "/stats/dashboard"): DASHBOARD_SAMPLE,
        ("equateur", "/stats/dashboard"): {**DASHBOARD_SAMPLE, "pays": "equateur", "total_lots": 5},
        ("colombie", "/stats/dashboard"): {**DASHBOARD_SAMPLE, "pays": "colombie", "total_lots": 3},
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert data["total_lots"] == 10 + 5 + 3
    assert "bresil"   in data["par_pays"]
    assert "equateur" in data["par_pays"]
    assert "colombie" in data["par_pays"]


@patch("main.fetch_from_country")
async def test_dashboard_offline_country(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("bresil", "/stats/dashboard"): DASHBOARD_SAMPLE,
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert data["total_lots"] == DASHBOARD_SAMPLE["total_lots"]
    assert data["par_pays"]["equateur"] == {"status": "offline"}


# ══════════════════════════════════════════════════════════════════════════════
# 10. Routes proxy par pays
# ══════════════════════════════════════════════════════════════════════════════

@patch("main.fetch_from_country")
async def test_get_exploitations(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("bresil", "/exploitations"): EXPLOITATIONS_SAMPLE,
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/bresil/exploitations")
    assert r.status_code == 200
    assert r.json()[0]["nom"] == "Fazenda-A"


@patch("main.fetch_from_country")
async def test_get_exploitations_backend_down(mock_fetch):
    mock_fetch.side_effect = make_side_effect({})
    async with make_client() as ac:
        r = await ac.get("/api/central/bresil/exploitations")
    assert r.status_code == 502


async def test_get_exploitations_invalid_country():
    async with make_client() as ac:
        r = await ac.get("/api/central/ghana/exploitations")
    assert r.status_code == 400


@patch("main.fetch_from_country")
async def test_get_entrepots(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("equateur", "/entrepots"): ENTREPOTS_SAMPLE,
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/equateur/entrepots")
    assert r.status_code == 200
    assert r.json()[0]["nom"] == "E1"


@patch("main.fetch_from_country")
async def test_get_mesures(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("colombie", "/mesures"): MESURES_SAMPLE,
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/colombie/mesures")
    assert r.status_code == 200
    assert len(r.json()) == 2


@patch("main.fetch_from_country")
async def test_get_config(mock_fetch):
    mock_fetch.side_effect = make_side_effect({
        ("bresil", "/config"): CONFIG_SAMPLE,
    })
    async with make_client() as ac:
        r = await ac.get("/api/central/bresil/config")
    assert r.status_code == 200
    data = r.json()
    assert data["pays"] == "bresil"
    assert data["temp_ideale"] == 29.0
