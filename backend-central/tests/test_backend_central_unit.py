import os
import sys
from unittest.mock import patch

import httpx
import pytest
from fastapi.testclient import TestClient

# ------------------------------------------------------------
# Ajout du dossier src au chemin de recherche Python
# ------------------------------------------------------------
sys.path.append(os.path.join(os.path.dirname(__file__), "../src"))

from main import app  # noqa: E402
from auth import get_current_user  # noqa: E402


# ------------------------------------------------------------
# Désactivation de l'authentification JWT pendant les tests
# ------------------------------------------------------------
def fake_current_user():
    return {
        "sub": "1",
        "email": "test@futurekawa.com",
        "roles": ["admin", "responsable_pays"],
        "accesses": []
    }


app.dependency_overrides[get_current_user] = fake_current_user

# Client de test FastAPI
client = TestClient(app)


# ============================================================
# TEST 1 : Vérifier que l'API centrale démarre correctement
# ============================================================
def test_1_home_endpoint():
    response = client.get("/")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "online"
    assert "bresil" in data["configured_countries"]


# ============================================================
# TEST 2 : Vérifier l'état des pays configurés
# ============================================================
@pytest.mark.asyncio
@patch("main.fetch_from_country")
async def test_2_list_countries_status(mock_fetch):

    def side_effect(client, country_id, endpoint, *args, **kwargs):
        if country_id == "bresil":
            return {"message": "online"}
        return None

    mock_fetch.side_effect = side_effect

    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test"
    ) as ac:
        response = await ac.get("/api/central/countries")

    assert response.status_code == 200

    countries = response.json()

    bresil = next(c for c in countries if c["id"] == "bresil")
    equateur = next(c for c in countries if c["id"] == "equateur")

    assert bresil["status"] == "online"
    assert equateur["status"] == "offline"


# ============================================================
# TEST 3 : Vérifier la consolidation FIFO des stocks
# ============================================================
@pytest.mark.asyncio
@patch("main.fetch_from_country")
async def test_3_consolidated_stocks_fifo(mock_fetch):

    mock_lots_bresil = [
        {
            "lot_id": "LOT-BR-01",
            "date_stockage": "2026-06-15T10:00:00",
            "statut": "conforme"
        },
        {
            "lot_id": "LOT-BR-02",
            "date_stockage": "2026-06-17T12:00:00",
            "statut": "conforme"
        }
    ]

    mock_lots_equateur = [
        {
            "lot_id": "LOT-EQ-01",
            "date_stockage": "2026-06-14T08:00:00",
            "statut": "alerte"
        }
    ]

    def side_effect(client, country_id, endpoint, *args, **kwargs):
        if country_id == "bresil" and endpoint == "/lots":
            return mock_lots_bresil

        if country_id == "equateur" and endpoint == "/lots":
            return mock_lots_equateur

        if country_id == "colombie" and endpoint == "/lots":
            return []

        return None

    mock_fetch.side_effect = side_effect

    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test"
    ) as ac:
        response = await ac.get("/api/central/stocks")

    assert response.status_code == 200

    stocks = response.json()

    assert len(stocks) == 3
    assert stocks[0]["lot_id"] == "LOT-EQ-01"
    assert stocks[1]["lot_id"] == "LOT-BR-01"
    assert stocks[2]["lot_id"] == "LOT-BR-02"


# ============================================================
# TEST 4 : Vérifier qu'un pays non configuré est refusé
# ============================================================
def test_4_invalid_country_for_stocks():
    response = client.get("/api/central/stocks?country=france")

    assert response.status_code == 400


# ============================================================
# TEST 5 : Vérifier la récupération des mesures d'un pays
# ============================================================
@pytest.mark.asyncio
@patch("main.fetch_from_country")
async def test_5_get_country_measures(mock_fetch):

    mock_measures = [
        {
            "temperature": 29.5,
            "humidite": 55.2
        }
    ]

    def side_effect(client, country_id, endpoint, *args, **kwargs):
        if country_id == "bresil" and endpoint == "/mesures":
            return mock_measures
        return None

    mock_fetch.side_effect = side_effect

    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test"
    ) as ac:
        response = await ac.get("/api/central/bresil/mesures")

    assert response.status_code == 200

    mesures = response.json()

    assert len(mesures) == 1
    assert mesures[0]["temperature"] == 29.5
    assert mesures[0]["humidite"] == 55.2


# ============================================================
# TEST 6 : Vérifier qu'un pays inexistant retourne une erreur
# ============================================================
def test_6_get_measures_invalid_country():
    response = client.get("/api/central/france/mesures")

    assert response.status_code == 400


# ============================================================
# TEST 7 : Vérifier la consolidation des alertes
# ============================================================
@pytest.mark.asyncio
@patch("main.fetch_from_country")
async def test_7_consolidated_alerts(mock_fetch):

    mock_alertes_bresil = {
        "alertes_mesures": [
            {
                "id_alerte_mesure": 1,
                "type_alerte": "temperature",
                "message": "Température hors seuil",
                "date_alerte": "2026-06-20T10:00:00"
            }
        ],
        "alertes_lots": [
            {
                "id_alerte_lot": 1,
                "id_lot": "LOT-BR-OLD",
                "message": "Lot périmé",
                "date_alerte": "2026-06-19T08:00:00"
            }
        ]
    }

    def side_effect(client, country_id, endpoint, *args, **kwargs):
        if country_id == "bresil" and endpoint == "/alertes":
            return mock_alertes_bresil

        if endpoint == "/alertes":
            return {
                "alertes_mesures": [],
                "alertes_lots": []
            }

        return None

    mock_fetch.side_effect = side_effect

    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test"
    ) as ac:
        response = await ac.get("/api/central/alertes")

    assert response.status_code == 200

    data = response.json()

    assert "alertes_mesures" in data
    assert "alertes_lots" in data
    assert len(data["alertes_mesures"]) == 1
    assert len(data["alertes_lots"]) == 1
    assert data["alertes_mesures"][0]["country_id"] == "bresil"
    assert data["alertes_lots"][0]["country_id"] == "bresil"


# ============================================================
# TEST 8 : Vérifier la récupération d'un lot précis
# ============================================================
@pytest.mark.asyncio
@patch("main.fetch_from_country")
async def test_8_get_specific_lot(mock_fetch):

    mock_fetch.return_value = {
        "lot_id": "LOT-BR-01",
        "date_stockage": "2026-06-15T10:00:00",
        "statut": "conforme"
    }

    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test"
    ) as ac:
        response = await ac.get(
            "/api/central/stocks/bresil/LOT-BR-01"
        )

    assert response.status_code == 200

    lot = response.json()

    assert lot["lot_id"] == "LOT-BR-01"
    assert lot["country_id"] == "bresil"
    assert lot["pays_nom"] == "Brésil"


# ============================================================
# TEST 9 : Route non disponible dans le backend central actuel
# ============================================================
@pytest.mark.skip(reason="Route de mise à jour du statut supprimée dans le backend central actuel")
def test_9_update_lot_status():
    pass