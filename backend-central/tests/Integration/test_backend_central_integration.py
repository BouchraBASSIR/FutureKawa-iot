import os
import pytest
import httpx

# URL du backend pays utilise pour les tests d'integration.
# En Docker Compose, cette URL peut etre le nom du service.
BACKEND_PAYS_URL = os.getenv(
    "BACKEND_PAYS_URL",
    "http://futurekawa-backend-bresil:8000"
)


# ============================================================
# TEST INTEGRATION 1 : Verifier que le backend pays est joignable
# ============================================================
@pytest.mark.asyncio
async def test_backend_pays_is_reachable():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BACKEND_PAYS_URL}/", timeout=5.0)

    assert response.status_code == 200


# ============================================================
# TEST INTEGRATION 2 : Verifier que la route /lots est disponible
# ============================================================
@pytest.mark.asyncio
async def test_backend_pays_lots_endpoint():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BACKEND_PAYS_URL}/lots", timeout=5.0)

    assert response.status_code == 200
    assert isinstance(response.json(), list)


# ============================================================
# TEST INTEGRATION 3 : Verifier que la route /alertes est disponible
# ============================================================
@pytest.mark.asyncio
async def test_backend_pays_alertes_endpoint():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BACKEND_PAYS_URL}/alertes", timeout=5.0)

    assert response.status_code == 200
    assert isinstance(response.json(), list)