import asyncio
import logging
import httpx
from fastapi import FastAPI, Depends, HTTPException, Query, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional

from config import get_configured_countries
from database import engine, SessionLocal
from models import Base
from auth import router as auth_router, extract_bearer, get_current_user, require_role
from users import router as users_router
from seed import run_seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend-central")

app = FastAPI(
    title="FutureKawa - Backend Central (Siège)",
    description=(
        "API centrale qui agrège et consolide les données des backends pays "
        "(Brésil, Équateur, Colombie) pour le frontend du siège."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)

COUNTRIES = get_configured_countries()


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        run_seed(db)


# ── Utilitaire HTTP ──────────────────────────────────────────────────────────

async def fetch_from_country(
    client: httpx.AsyncClient,
    country_id: str,
    endpoint: str,
    method: str = "GET",
    json_data: Any = None,
    token: Optional[str] = None,
) -> Optional[Any]:
    """
    Proxy HTTP vers un backend pays.
    Retourne le JSON parsé ou None si le backend est injoignable / renvoie une erreur.
    Propage le JWT (Authorization: Bearer) quand fourni.
    """
    if country_id not in COUNTRIES:
        logger.warning("Pays '%s' absent de la configuration.", country_id)
        return None

    url = f"{COUNTRIES[country_id]['url'].rstrip('/')}{endpoint}"
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        if method == "GET":
            response = await client.get(url, headers=headers, timeout=1.5)
        elif method == "POST":
            response = await client.post(url, json=json_data, headers=headers, timeout=1.5)
        elif method == "PUT":
            response = await client.put(url, json=json_data, headers=headers, timeout=1.5)
        else:
            logger.error("Méthode HTTP non supportée : %s", method)
            return None

        if response.status_code in (200, 201):
            return response.json()
        logger.warning("[%s] %s %s → HTTP %s", country_id, method, url, response.status_code)
        return None

    except httpx.RequestError as exc:
        logger.error("[%s] Erreur de connexion vers %s : %s", country_id, url, exc)
        return None


def _require_country(country_id: str) -> None:
    if country_id not in COUNTRIES:
        raise HTTPException(
            status_code=400,
            detail=f"Pays '{country_id}' non configuré. "
                   f"Valeurs acceptées : {list(COUNTRIES.keys())}",
        )


def _get_allowed_countries(current_user: dict) -> list:
    """Pays accessibles selon le rôle et les accès JWT."""
    if "admin" in current_user.get("roles", []):
        return list(COUNTRIES.keys())
    seen, result = set(), []
    for a in current_user.get("accesses", []):
        pays = a.get("pays")
        if pays and pays in COUNTRIES and pays not in seen:
            seen.add(pays)
            result.append(pays)
    return result


def _require_access(country_id: str, current_user: dict) -> None:
    """Vérifie que le pays est configuré ET que l'utilisateur y a accès."""
    _require_country(country_id)
    if "admin" in current_user.get("roles", []):
        return
    allowed = {a["pays"] for a in current_user.get("accesses", [])}
    if country_id not in allowed:
        raise HTTPException(status_code=403, detail=f"Accès au pays '{country_id}' refusé.")


# ── Santé ────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Santé"])
def home():
    """Point de vie du backend central."""
    return {
        "status": "online",
        "service": "FutureKawa Central Backend (Siège)",
        "configured_countries": list(COUNTRIES.keys()),
    }


# ── Pays ─────────────────────────────────────────────────────────────────────

@app.get("/api/central/countries", tags=["Pays"])
async def list_countries(_: dict = Depends(get_current_user)):
    """
    Retourne la liste des pays configurés avec un healthcheck live
    sur chaque backend pays.
    """
    country_ids = list(COUNTRIES.keys())
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            *[fetch_from_country(client, c_id, "/") for c_id in country_ids]
        )
    return [
        {
            "id": c_id,
            "name": COUNTRIES[c_id]["name"],
            "url": COUNTRIES[c_id]["url"],
            "status": "online" if results[i] is not None else "offline",
        }
        for i, c_id in enumerate(country_ids)
    ]


# ── Stocks / Lots ─────────────────────────────────────────────────────────────

@app.get("/api/central/stocks", tags=["Stocks"])
async def get_consolidated_stocks(
    country: Optional[str] = Query(
        None,
        description="Filtrer par id pays (ex: bresil, equateur, colombie)",
    ),
    current_user: dict = Depends(get_current_user),
):
    """
    Consolide les lots des pays accessibles, triés en ordre FIFO.
    Filtre automatiquement selon les accès JWT de l'utilisateur.
    """
    allowed = _get_allowed_countries(current_user)
    if country:
        _require_country(country)  # 400 si pays inconnu
        if country not in allowed:
            raise HTTPException(status_code=403, detail=f"Accès au pays '{country}' refusé.")
        targets = [country]
    else:
        targets = allowed

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            *[fetch_from_country(client, c_id, "/lots") for c_id in targets]
        )

    lots: List[Dict] = []
    for i, c_id in enumerate(targets):
        raw = results[i]
        if not isinstance(raw, list):
            continue
        for lot in raw:
            lot["country_id"] = c_id
            lot["pays_nom"] = COUNTRIES[c_id]["name"]
            lots.append(lot)

    lots.sort(key=lambda x: x.get("date_stockage", ""))
    return lots


@app.get("/api/central/stocks/{country_id}/{lot_id}", tags=["Stocks"])
async def get_lot(country_id: str, lot_id: str, current_user: dict = Depends(get_current_user)):
    """Récupère le détail d'un lot précis depuis le backend du pays concerné."""
    _require_access(country_id, current_user)
    async with httpx.AsyncClient() as client:
        lot = await fetch_from_country(client, country_id, f"/lots/{lot_id}")

    if lot is None:
        raise HTTPException(
            status_code=404,
            detail="Lot introuvable ou backend pays indisponible.",
        )
    lot["country_id"] = country_id
    lot["pays_nom"] = COUNTRIES[country_id]["name"]
    return lot


@app.get("/api/central/stocks/{country_id}/{lot_id}/mesures", tags=["Stocks"])
async def get_lot_mesures(country_id: str, lot_id: str, current_user: dict = Depends(get_current_user)):
    """Historique température/humidité d'un lot."""
    _require_access(country_id, current_user)
    async with httpx.AsyncClient() as client:
        mesures = await fetch_from_country(client, country_id, f"/lots/{lot_id}/mesures")

    if mesures is None:
        raise HTTPException(status_code=502, detail="Backend pays indisponible.")
    return mesures


@app.post("/api/central/{country_id}/lots", status_code=201, tags=["Stocks"])
async def create_lot(country_id: str, request: Request, lot_data: Dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Crée un nouveau lot dans le backend du pays cible."""
    _require_access(country_id, current_user)
    token = extract_bearer(request)
    async with httpx.AsyncClient() as client:
        result = await fetch_from_country(
            client, country_id, "/lots", method="POST", json_data=lot_data, token=token
        )

    if result is None:
        raise HTTPException(
            status_code=502,
            detail="Backend pays indisponible ou erreur lors de la création du lot.",
        )
    return result


# ── Alertes ───────────────────────────────────────────────────────────────────

@app.get("/api/central/alertes", tags=["Alertes"])
async def get_consolidated_alertes(
    country: Optional[str] = Query(None, description="Filtrer par pays"),
    current_user: dict = Depends(get_current_user),
):
    """
    Consolide les alertes des pays accessibles, triées par date décroissante.
    Filtre automatiquement selon les accès JWT de l'utilisateur.
    """
    allowed = _get_allowed_countries(current_user)
    if country:
        if country not in allowed:
            raise HTTPException(status_code=403, detail=f"Accès au pays '{country}' refusé.")
        targets = [country]
    else:
        targets = allowed

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            *[fetch_from_country(client, c_id, "/alertes") for c_id in targets]
        )

    consolidated: Dict[str, List] = {"alertes_mesures": [], "alertes_lots": []}
    for i, c_id in enumerate(targets):
        raw = results[i]
        if not isinstance(raw, dict):
            continue
        for am in raw.get("alertes_mesures", []):
            am["country_id"] = c_id
            am["pays_nom"] = COUNTRIES[c_id]["name"]
            consolidated["alertes_mesures"].append(am)
        for al in raw.get("alertes_lots", []):
            al["country_id"] = c_id
            al["pays_nom"] = COUNTRIES[c_id]["name"]
            consolidated["alertes_lots"].append(al)

    for key in consolidated:
        consolidated[key].sort(key=lambda x: x.get("date_alerte", ""), reverse=True)

    return consolidated


@app.get("/api/central/alertes/count", tags=["Alertes"])
async def get_consolidated_alertes_count(current_user: dict = Depends(get_current_user)):
    """
    Retourne le décompte des alertes non lues pour les pays accessibles.
    Inclut un détail par pays pour permettre un affichage segmenté.
    """
    country_ids = _get_allowed_countries(current_user)
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            *[fetch_from_country(client, c_id, "/alertes/count") for c_id in country_ids]
        )

    totals: Dict[str, Any] = {
        "total_mesures": 0,
        "non_lues_mesures": 0,
        "total_lots": 0,
        "non_lues_lots": 0,
        "total": 0,
        "non_lues": 0,
        "par_pays": {},
    }
    for i, c_id in enumerate(country_ids):
        raw = results[i]
        if not isinstance(raw, dict):
            totals["par_pays"][c_id] = {"status": "offline"}
            continue
        totals["total_mesures"]   += raw.get("total_mesures",    0)
        totals["non_lues_mesures"] += raw.get("non_lues_mesures", 0)
        totals["total_lots"]       += raw.get("total_lots",       0)
        totals["non_lues_lots"]    += raw.get("non_lues_lots",    0)
        totals["total"]            += raw.get("total",            0)
        totals["non_lues"]         += raw.get("non_lues",         0)
        totals["par_pays"][c_id] = raw

    return totals


@app.put("/api/central/alertes/toutes/lues", tags=["Alertes"])
async def marquer_toutes_alertes_lues(current_user: dict = Depends(require_role("admin", "responsable_pays"))):
    """Marque toutes les alertes comme lues dans les backends pays accessibles."""
    country_ids = _get_allowed_countries(current_user)
    async with httpx.AsyncClient() as client:
        await asyncio.gather(
            *[
                fetch_from_country(client, c_id, "/alertes/toutes/lues", method="PUT")
                for c_id in country_ids
            ]
        )
    return {"message": "Toutes les alertes ont été marquées comme lues."}


@app.put("/api/central/{country_id}/alertes-mesures/{alerte_id}/lue", tags=["Alertes"])
async def marquer_alerte_mesure_lue(country_id: str, alerte_id: int, current_user: dict = Depends(get_current_user)):
    """Marque une alerte de mesure comme lue dans le backend pays concerné."""
    _require_access(country_id, current_user)
    async with httpx.AsyncClient() as client:
        result = await fetch_from_country(
            client, country_id, f"/alertes-mesures/{alerte_id}/lue", method="PUT"
        )
    if result is None:
        raise HTTPException(status_code=502, detail="Backend pays indisponible.")
    return result


@app.put("/api/central/{country_id}/alertes-lots/{alerte_id}/lue", tags=["Alertes"])
async def marquer_alerte_lot_lue(country_id: str, alerte_id: int, current_user: dict = Depends(get_current_user)):
    """Marque une alerte de lot comme lue dans le backend pays concerné."""
    _require_access(country_id, current_user)
    async with httpx.AsyncClient() as client:
        result = await fetch_from_country(
            client, country_id, f"/alertes-lots/{alerte_id}/lue", method="PUT"
        )
    if result is None:
        raise HTTPException(status_code=502, detail="Backend pays indisponible.")
    return result


# ── Dashboard ─────────────────────────────────────────────────────────────────

@app.get("/api/central/dashboard", tags=["Dashboard"])
async def get_consolidated_dashboard(current_user: dict = Depends(get_current_user)):
    """
    KPI consolidés pour les pays accessibles (lots, alertes actives).
    Filtre automatiquement selon les accès JWT de l'utilisateur.
    """
    country_ids = _get_allowed_countries(current_user)
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            *[fetch_from_country(client, c_id, "/stats/dashboard") for c_id in country_ids]
        )

    summary: Dict[str, Any] = {
        "total_lots":      0,
        "conforme_lots":   0,
        "alerte_lots":     0,
        "perime_lots":     0,
        "alertes_actives": 0,
        "par_pays":        {},
    }
    for i, c_id in enumerate(country_ids):
        raw = results[i]
        if not isinstance(raw, dict):
            summary["par_pays"][c_id] = {"status": "offline"}
            continue
        summary["total_lots"]      += raw.get("total_lots",      0)
        summary["conforme_lots"]   += raw.get("conforme_lots",   0)
        summary["alerte_lots"]     += raw.get("alerte_lots",     0)
        summary["perime_lots"]     += raw.get("perime_lots",     0)
        summary["alertes_actives"] += raw.get("alertes_actives", 0)
        summary["par_pays"][c_id] = raw

    return summary


# ── Routes proxy par pays ─────────────────────────────────────────────────────
#
# Ces routes transmettent la requête directement au backend du pays demandé.
# Elles permettent au frontend d'accéder à des données spécifiques à un pays
# sans connaître l'URL interne de ce backend.
#
# IMPORTANT : ces routes avec {country_id} générique sont déclarées EN DERNIER
# pour éviter tout conflit de routage avec les routes spécifiques ci-dessus.

@app.get("/api/central/{country_id}/capteurs", tags=["Proxy pays"])
async def get_capteurs(country_id: str, current_user: dict = Depends(get_current_user)):
    """Liste des capteurs IoT d'un pays donné."""
    _require_access(country_id, current_user)
    async with httpx.AsyncClient() as client:
        result = await fetch_from_country(client, country_id, "/capteurs")
    if result is None:
        raise HTTPException(status_code=502, detail="Backend pays indisponible.")
    return result


@app.get("/api/central/{country_id}/entrepots/{entrepot_id}/mesures", tags=["Proxy pays"])
async def get_mesures_par_entrepot(country_id: str, entrepot_id: int, current_user: dict = Depends(get_current_user)):
    """Mesures IoT d'un entrepôt spécifique (filtrées par capteurs de cet entrepôt)."""
    _require_access(country_id, current_user)
    async with httpx.AsyncClient() as client:
        result = await fetch_from_country(client, country_id, f"/mesures/par-entrepot/{entrepot_id}")
    if result is None:
        raise HTTPException(status_code=502, detail="Backend pays indisponible.")
    return result


@app.get("/api/central/{country_id}/exploitations", tags=["Proxy pays"])
async def get_exploitations(country_id: str, current_user: dict = Depends(get_current_user)):
    """Liste des exploitations d'un pays donné."""
    _require_access(country_id, current_user)
    async with httpx.AsyncClient() as client:
        result = await fetch_from_country(client, country_id, "/exploitations")
    if result is None:
        raise HTTPException(status_code=502, detail="Backend pays indisponible.")
    return result


@app.get("/api/central/{country_id}/entrepots", tags=["Proxy pays"])
async def get_entrepots(country_id: str, current_user: dict = Depends(get_current_user)):
    """Liste des entrepôts d'un pays donné."""
    _require_access(country_id, current_user)
    async with httpx.AsyncClient() as client:
        result = await fetch_from_country(client, country_id, "/entrepots")
    if result is None:
        raise HTTPException(status_code=502, detail="Backend pays indisponible.")
    return result


@app.get("/api/central/{country_id}/utilisateurs", tags=["Proxy pays"])
async def get_utilisateurs_pays(country_id: str, current_user: dict = Depends(get_current_user)):
    """Liste des utilisateurs enregistrés dans le backend d'un pays donné."""
    _require_access(country_id, current_user)
    async with httpx.AsyncClient() as client:
        result = await fetch_from_country(client, country_id, "/utilisateurs")
    return result or []


@app.get("/api/central/{country_id}/mesures", tags=["Proxy pays"])
async def get_mesures(country_id: str, current_user: dict = Depends(get_current_user)):
    """Historique complet des mesures IoT d'un pays donné."""
    _require_access(country_id, current_user)
    async with httpx.AsyncClient() as client:
        result = await fetch_from_country(client, country_id, "/mesures")
    if result is None:
        raise HTTPException(status_code=502, detail="Backend pays indisponible.")
    return result


@app.get("/api/central/{country_id}/config", tags=["Proxy pays"])
async def get_config(country_id: str, current_user: dict = Depends(require_role("admin", "responsable_pays"))):
    """Configuration (seuils température/humidité, email) d'un pays donné."""
    _require_access(country_id, current_user)
    async with httpx.AsyncClient() as client:
        result = await fetch_from_country(client, country_id, "/config")
    if result is None:
        raise HTTPException(status_code=502, detail="Backend pays indisponible.")
    return result
