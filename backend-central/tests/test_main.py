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
