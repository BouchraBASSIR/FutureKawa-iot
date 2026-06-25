import pytest
from fastapi.testclient import TestClient
import httpx
from unittest.mock import patch

import sys
import os

# ------------------------------------------------------------
# Ajout du dossier src au chemin de recherche Python
# pour accéder aux fichiers du backend central pendant les tests.
# ------------------------------------------------------------
sys.path.append(os.path.join(os.path.dirname(__file__), "../../src"))

from main import app

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

    # Vérifie qu'au moins le Brésil est configuré
    assert "bresil" in data["configured_countries"]


# ============================================================
# TEST 2 : Vérifier l'état des pays configurés
#
# Objectif :
# Simuler un pays en ligne (Brésil)
# et les autres hors ligne
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
#
# Objectif :
# Les lots doivent être triés du plus ancien au plus récent
# ============================================================
@pytest.mark.asyncio
@patch("main.fetch_from_country")
async def test_3_consolidated_stocks_fifo(mock_fetch):

    # Lots simulés du Brésil
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

    # Lot simulé de l'Équateur
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

    # Vérifie qu'on a bien 3 lots consolidés
    assert len(stocks) == 3

    # Vérification du tri FIFO
    assert stocks[0]["lot_id"] == "LOT-EQ-01"
    assert stocks[1]["lot_id"] == "LOT-BR-01"
    assert stocks[2]["lot_id"] == "LOT-BR-02"


# ============================================================
# TEST 4 : Vérifier qu'un pays non configuré est refusé
# ============================================================
def test_4_invalid_country_for_stocks():

    response = client.get(
        "/api/central/stocks?country=france"
    )

    assert response.status_code == 400


# ============================================================
# TEST 5 : Vérifier la récupération des mesures
#
# Température / humidité d'un pays
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

        if country_id == "bresil":
            return mock_measures

        return None

    mock_fetch.side_effect = side_effect

    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test"
    ) as ac:

        response = await ac.get(
            "/api/central/mesures/bresil"
        )

    assert response.status_code == 200


# ============================================================
# TEST 6 : Vérifier qu'un pays inexistant retourne une erreur
# ============================================================
def test_6_get_measures_invalid_country():

    response = client.get(
        "/api/central/mesures/france"
    )

    assert response.status_code == 404


# ============================================================
# TEST 7 : Vérifier la consolidation des alertes
#
# Les alertes provenant de plusieurs pays doivent être
# fusionnées dans une seule liste
# ============================================================
@pytest.mark.asyncio
@patch("main.fetch_from_country")
async def test_7_consolidated_alerts(mock_fetch):

    mock_fetch.side_effect = lambda *args, **kwargs: []

    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test"
    ) as ac:

        response = await ac.get(
            "/api/central/alertes"
        )

    assert response.status_code == 200


# ============================================================
# TEST 8 : Vérifier la récupération d'un lot précis
# ============================================================
@pytest.mark.asyncio
@patch("main.fetch_from_country")
async def test_8_get_specific_lot(mock_fetch):

    mock_fetch.return_value = {
        "lot_id": "LOT-BR-01"
    }

    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test"
    ) as ac:

        response = await ac.get(
            "/api/central/lots/bresil/LOT-BR-01"
        )

    assert response.status_code == 200

# ============================================================
# TEST 9 : Vérifier la mise à jour du statut d'un lot
#
# Objectif :
# Simuler la modification du statut d'un lot depuis le siège
# vers un backend pays.
# ============================================================
@pytest.mark.asyncio
@patch("main.fetch_from_country")
async def test_9_update_lot_status(mock_fetch):

    # Réponse simulée du backend pays
    updated_lot = {
        "lot_id": "LOT-BR-01",
        "statut": "perime"
    }

    def side_effect(client, country_id, endpoint, *args, **kwargs):

        if (
            country_id == "bresil"
            and endpoint == "/lots/LOT-BR-01/statut?statut=perime"
        ):
            return updated_lot

        return None

    mock_fetch.side_effect = side_effect

    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test"
    ) as ac:

        response = await ac.put(
            "/api/central/lots/bresil/LOT-BR-01/statut?statut=perime"
        )

    assert response.status_code == 200

    lot = response.json()

    assert lot["lot_id"] == "LOT-BR-01"
    assert lot["statut"] == "perime"