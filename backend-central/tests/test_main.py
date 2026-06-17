import pytest
from fastapi.testclient import TestClient
import httpx
from unittest.mock import AsyncMock, patch

import sys
import os

# Add src to python path to import app and config
sys.path.append(os.path.join(os.path.dirname(__file__), "../src"))

from main import app, COUNTRIES

client = TestClient(app)

def test_home_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "bresil" in data["configured_countries"]

@pytest.mark.asyncio
@patch("main.fetch_from_country")
async def test_list_countries_status(mock_fetch):
    # Mocking fetch_from_country to simulate one country online, others offline
    def side_effect(client, country_id, endpoint, *args, **kwargs):
        if country_id == "bresil":
            return {"message": "online"}
        return None
        
    mock_fetch.side_effect = side_effect
    
    # In modern httpx (0.28+), we use ASGITransport to wrap the FastAPI app
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/central/countries")
        
    assert response.status_code == 200
    countries_data = response.json()
    
    # Find bresil in response
    bresil = next(c for c in countries_data if c["id"] == "bresil")
    assert bresil["status"] == "online"
    
    # Other countries should be offline (mock returned None)
    equateur = next(c for c in countries_data if c["id"] == "equateur")
    assert equateur["status"] == "offline"

    
@pytest.mark.asyncio
@patch("main.fetch_from_country")
async def test_consolidated_stocks_fifo(mock_fetch):
    # Mock response for /lots
    mock_lots_bresil = [
        {"lot_id": "LOT-BR-01", "exploitation": "Fazenda-A", "entrepot": "E1", "date_stockage": "2026-06-15T10:00:00", "statut": "conforme"},
        {"lot_id": "LOT-BR-02", "exploitation": "Fazenda-A", "entrepot": "E2", "date_stockage": "2026-06-17T12:00:00", "statut": "conforme"}
    ]
    mock_lots_equateur = [
        {"lot_id": "LOT-EQ-01", "exploitation": "Chanchamayo", "entrepot": "E1", "date_stockage": "2026-06-14T08:00:00", "statut": "alerte"}
    ]
    
    def side_effect(client, country_id, endpoint, *args, **kwargs):
        if country_id == "bresil" and endpoint == "/lots":
            return mock_lots_bresil
        if country_id == "equateur" and endpoint == "/lots":
            return mock_lots_equateur
        return None
        
    mock_fetch.side_effect = side_effect
    
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/central/stocks")
        
    assert response.status_code == 200
    stocks = response.json()
    
    assert len(stocks) == 3
    
    # FIFO Check: Oldest first
    # 2026-06-14T08:00:00 (LOT-EQ-01) should be first
    assert stocks[0]["lot_id"] == "LOT-EQ-01"
    assert stocks[0]["country_id"] == "equateur"
    assert stocks[0]["pays_nom"] == "Équateur"
    
    # 2026-06-15T10:00:00 (LOT-BR-01) should be second
    assert stocks[1]["lot_id"] == "LOT-BR-01"
    assert stocks[1]["country_id"] == "bresil"
    
    # 2026-06-17T12:00:00 (LOT-BR-02) should be third
    assert stocks[2]["lot_id"] == "LOT-BR-02"

