import asyncio
import logging
import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional

from config import get_configured_countries

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend-central-main")

app = FastAPI(
    title="FutureKawa - Backend Central (Siège)",
    description="API centrale consolidant les données des différents backends pays (Brésil, Équateur, Colombie)."
)

# Enable CORS for the Frontend web application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize countries config
COUNTRIES = get_configured_countries()

async def fetch_from_country(client: httpx.AsyncClient, country_id: str, endpoint: str, method: str = "GET", json_data: Any = None) -> Optional[Any]:
    """
    Safely executes an HTTP request to a country API.
    Returns the JSON parsed response or None on error/timeout.
    """
    if country_id not in COUNTRIES:
        logger.warning(f"Country ID '{country_id}' not found in configuration.")
        return None
    
    url = f"{COUNTRIES[country_id]['url'].rstrip('/')}{endpoint}"
    try:
        if method == "GET":
            response = await client.get(url, timeout=3.0)
        elif method == "POST":
            response = await client.post(url, json=json_data, timeout=3.0)
        elif method == "PUT":
            response = await client.put(url, json=json_data, timeout=3.0)
        else:
            logger.error(f"Unsupported HTTP method: {method}")
            return None
            
        if response.status_code == 200:
            return response.json()
        else:
            logger.warning(f"Error response from {country_id} ({url}): {response.status_code}")
            return None
    except httpx.RequestError as e:
        logger.error(f"Failed to connect to {country_id} backend at {url}: {e}")
        return None

@app.get("/")
def home():
    return {
        "status": "online",
        "service": "FutureKawa Central Backend (Siège)",
        "configured_countries": list(COUNTRIES.keys())
    }

@app.get("/api/central/countries")
async def list_countries():
    """
    Returns the list of configured countries and performs a live healthcheck 
    for each of them in parallel.
    """
    async with httpx.AsyncClient() as client:
        tasks = []
        country_ids = list(COUNTRIES.keys())
        
        for c_id in country_ids:
            tasks.append(fetch_from_country(client, c_id, "/"))
            
        results = await asyncio.gather(*tasks)
        
        response = []
        for i, c_id in enumerate(country_ids):
            is_online = results[i] is not None
            response.append({
                "id": c_id,
                "name": COUNTRIES[c_id]["name"],
                "url": COUNTRIES[c_id]["url"],
                "status": "online" if is_online else "offline"
            })
            
        return response
    
@app.get("/api/central/stocks")
async def get_consolidated_stocks(country: Optional[str] = Query(None, description="Filtrer par id pays (ex: bresil, equateur, colombie)")):
    """
    Queries all active country backends to consolidate the state of their stocks (lots).
    Always sorts them in FIFO order (oldest date_stockage first) to prioritize dispatch.
    """
    # If a specific country is requested, validate it
    if country and country not in COUNTRIES:
        raise HTTPException(status_code=400, detail=f"Pays '{country}' non configuré.")

    target_countries = [country] if country else list(COUNTRIES.keys())
    
    async with httpx.AsyncClient() as client:
        tasks = []
        for c_id in target_countries:
            tasks.append(fetch_from_country(client, c_id, "/lots"))
            
        results = await asyncio.gather(*tasks)
        
        consolidated_lots = []
        for i, c_id in enumerate(target_countries):
            lots_list = results[i]
            if lots_list and isinstance(lots_list, list):
                for lot in lots_list:
                    # Enforce/normalize country fields for consolidation
                    lot["country_id"] = c_id
                    lot["pays_nom"] = COUNTRIES[c_id]["name"]
                    consolidated_lots.append(lot)
            elif lots_list:
                logger.warning(f"Unexpected response format for lots from {c_id}: {type(lots_list)}")
                
        # Sort consolidated lots by date_stockage ascending (FIFO: oldest first)
        # Default fallback to empty string if date_stockage is missing
        consolidated_lots.sort(key=lambda x: x.get("date_stockage", ""))
        
        return consolidated_lots
    

 # [[TO DO]]
 # mesures 
 #  alertes
 # get lot/coutries
 #  update lot/coutries/status

 
@app.get("/api/central/mesures/{country_id}")
async def get_country_measures(country_id: str, limit: int = Query(100, description="Nombre max de mesures à récupérer")):
    """
    Fetches temperature and humidity measurements for a specific country
    to draw historical charts.
    """
    if country_id not in COUNTRIES:
        raise HTTPException(status_code=404, detail="Pays non configuré.")
        
    async with httpx.AsyncClient() as client:
        measures = await fetch_from_country(client, country_id, f"/mesures/dernieres/{limit}")
        if measures is None:
            # Fallback to general measures if last N endpoint fails or is not available
            measures = await fetch_from_country(client, country_id, "/mesures")
            
        if measures is None:
            raise HTTPException(status_code=502, detail=f"Impossible de contacter l'API du pays '{country_id}'.")
            
        return measures

@app.get("/api/central/alertes")
async def get_consolidated_alerts(only_unread: bool = Query(False, description="Récupérer uniquement les alertes non lues")):
    """
    Fetches and consolidates alerts from all active country backends.
    Sorted by date (newest first).
    """
    endpoint = "/alertes/non-lues" if only_unread else "/alertes"
    
    async with httpx.AsyncClient() as client:
        tasks = []
        country_ids = list(COUNTRIES.keys())
        for c_id in country_ids:
            tasks.append(fetch_from_country(client, c_id, endpoint))
            
        results = await asyncio.gather(*tasks)
        
        consolidated_alerts = []
        for i, c_id in enumerate(country_ids):
            alerts_list = results[i]
            if alerts_list and isinstance(alerts_list, list):
                for alert in alerts_list:
                    alert["country_id"] = c_id
                    alert["pays_nom"] = COUNTRIES[c_id]["name"]
                    consolidated_alerts.append(alert)
                    
        # Sort by date (usually alertes have a timestamp or date_alerte field)
        # Sort newest first
        consolidated_alerts.sort(key=lambda x: x.get("date_alerte" if "date_alerte" in x else "date_mesure", ""), reverse=True)
        
        return consolidated_alerts

@app.get("/api/central/lots/{country_id}/{lot_id}")
async def get_specific_lot(country_id: str, lot_id: str):
    """
    Fetches the details of a specific lot from the country where it is stored.
    """
    if country_id not in COUNTRIES:
        raise HTTPException(status_code=404, detail="Pays non configuré.")
        
    async with httpx.AsyncClient() as client:
        lot = await fetch_from_country(client, country_id, f"/lots/{lot_id}")
        if lot is None:
            raise HTTPException(status_code=404, detail=f"Lot '{lot_id}' non trouvé ou API pays indisponible.")
        
        lot["country_id"] = country_id
        lot["pays_nom"] = COUNTRIES[country_id]["name"]
        return lot

@app.put("/api/central/lots/{country_id}/{lot_id}/statut")
async def update_lot_status_remotely(country_id: str, lot_id: str, statut: str = Query(..., description="Nouveau statut (conforme, alerte, perime)")):
    """
    Allows the headquarters (siège) to update a lot status remotely on the country database.
    """
    if country_id not in COUNTRIES:
        raise HTTPException(status_code=404, detail="Pays non configuré.")
        
    async with httpx.AsyncClient() as client:
        endpoint = f"/lots/{lot_id}/statut?statut={statut}"
        updated_lot = await fetch_from_country(client, country_id, endpoint, method="PUT")
        
        if updated_lot is None:
            raise HTTPException(status_code=502, detail="Échec de la mise à jour du statut sur l'API pays.")
            
        return updated_lot
