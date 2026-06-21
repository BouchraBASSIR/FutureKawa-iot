"""
Tests d'intégration — API FastAPI via AsyncClient + ASGITransport (SQLite in-memory).
Aucune connexion PostgreSQL ou MQTT requise.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../src"))

import pytest
import httpx
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Couper les threads background (MQTT + tâche périodique) avant l'import de main
with patch("threading.Thread"):
    from main import app
    from models import Base
    from database import get_db

# ── DB SQLite in-memory pour les tests ───────────────────────
SQLALCHEMY_TEST_URL = "sqlite:///./test_backend_pays.db"

test_engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestSession  = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield


@pytest.fixture
async def ac():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client


# ── Helpers ──────────────────────────────────────────────────

async def creer_config(ac):
    return await ac.post("/config", json={
        "pays":                    "bresil",
        "temp_ideale":             29.0,
        "hum_ideale":              55.0,
        "tolerance_temp":          3.0,
        "tolerance_hum":           2.0,
        "email_destinataire":      "manager@futurekawa.com",
        "intervalle_verification": 3600
    })


async def creer_exploitation(ac, id_config=1):
    return await ac.post("/exploitations", json={"nom": "Ferme A", "id_config": id_config})


async def creer_entrepot(ac, id_exploitation=1):
    return await ac.post("/entrepots", json={
        "nom":             "Entrepot Principal",
        "localisation":    "Zone Nord",
        "id_exploitation": id_exploitation
    })


async def creer_capteur(ac, id_entrepot=1):
    return await ac.post("/capteurs", json={
        "type_capteur": "temp_hum",
        "reference":    "CAP-001",
        "id_entrepot":  id_entrepot
    })


async def creer_utilisateur(ac, email="jean.dupont@futurekawa.com"):
    return await ac.post("/utilisateurs", json={
        "nom":          "Dupont",
        "prenom":       "Jean",
        "email":        email,
        "mot_de_passe": "secret123"
    })


async def setup_complet(ac):
    """Crée config → exploitation → entrepot → capteur → utilisateur."""
    await creer_config(ac)
    await creer_exploitation(ac)
    await creer_entrepot(ac)
    await creer_capteur(ac)
    await creer_utilisateur(ac)


# ── Tests santé ───────────────────────────────────────────────

async def test_accueil(ac):
    r = await ac.get("/")
    assert r.status_code == 200
    assert "FutureKawa" in r.json()["message"]


# ── Tests config ──────────────────────────────────────────────

async def test_creer_config(ac):
    r = await creer_config(ac)
    assert r.status_code == 200
    assert r.json()["pays"] == "bresil"
    assert r.json()["temp_ideale"] == 29.0


async def test_get_config_absent(ac):
    r = await ac.get("/config")
    assert r.status_code == 404


async def test_get_config_present(ac):
    await creer_config(ac)
    r = await ac.get("/config")
    assert r.status_code == 200
    assert r.json()["hum_ideale"] == 55.0


async def test_update_config(ac):
    await creer_config(ac)
    r = await ac.put("/config", json={"temp_ideale": 30.0})
    assert r.status_code == 200
    assert r.json()["config"]["temp_ideale"] == 30.0


async def test_creer_config_double_interdit(ac):
    await creer_config(ac)
    r = await creer_config(ac)
    assert r.status_code == 400


# ── Tests exploitations ───────────────────────────────────────

async def test_creer_exploitation(ac):
    await creer_config(ac)
    r = await creer_exploitation(ac)
    assert r.status_code == 201
    assert r.json()["nom"] == "Ferme A"


async def test_creer_exploitation_config_inexistante(ac):
    r = await creer_exploitation(ac, id_config=999)
    assert r.status_code == 404


async def test_get_exploitations_vide(ac):
    r = await ac.get("/exploitations")
    assert r.status_code == 200
    assert r.json() == []


async def test_get_exploitation_inexistante(ac):
    r = await ac.get("/exploitations/999")
    assert r.status_code == 404


async def test_supprimer_exploitation(ac):
    await creer_config(ac)
    await creer_exploitation(ac)
    r = await ac.delete("/exploitations/1")
    assert r.status_code == 200


# ── Tests entrepôts ───────────────────────────────────────────

async def test_creer_entrepot(ac):
    await creer_config(ac); await creer_exploitation(ac)
    r = await creer_entrepot(ac)
    assert r.status_code == 201
    assert r.json()["nom"] == "Entrepot Principal"


async def test_creer_entrepot_exploitation_inexistante(ac):
    r = await creer_entrepot(ac, id_exploitation=999)
    assert r.status_code == 404


async def test_get_entrepots_vide(ac):
    r = await ac.get("/entrepots")
    assert r.status_code == 200
    assert r.json() == []


async def test_supprimer_entrepot(ac):
    await creer_config(ac); await creer_exploitation(ac); await creer_entrepot(ac)
    r = await ac.delete("/entrepots/1")
    assert r.status_code == 200


# ── Tests capteurs ────────────────────────────────────────────

async def test_creer_capteur(ac):
    await creer_config(ac); await creer_exploitation(ac); await creer_entrepot(ac)
    r = await creer_capteur(ac)
    assert r.status_code == 201
    assert r.json()["reference"] == "CAP-001"


async def test_creer_capteur_entrepot_inexistant(ac):
    r = await creer_capteur(ac, id_entrepot=999)
    assert r.status_code == 404


async def test_get_capteurs_vide(ac):
    r = await ac.get("/capteurs")
    assert r.status_code == 200
    assert r.json() == []


# ── Tests mesures ─────────────────────────────────────────────

async def test_creer_mesure(ac):
    with patch("main.verifier_alertes_mesures"):
        await setup_complet(ac)
        r = await ac.post("/mesures", json={"temperature": 28.5, "humidite": 54.0, "id_capteur": 1})
    assert r.status_code == 201
    assert r.json()["temperature"] == 28.5


async def test_creer_mesure_capteur_inexistant(ac):
    r = await ac.post("/mesures", json={"temperature": 28.5, "humidite": 54.0, "id_capteur": 999})
    assert r.status_code == 404


async def test_get_mesures(ac):
    with patch("main.verifier_alertes_mesures"):
        await setup_complet(ac)
        await ac.post("/mesures", json={"temperature": 29.0, "humidite": 55.0, "id_capteur": 1})
        await ac.post("/mesures", json={"temperature": 30.0, "humidite": 56.0, "id_capteur": 1})
    r = await ac.get("/mesures")
    assert r.status_code == 200
    assert len(r.json()) == 2


async def test_get_dernieres_mesures(ac):
    with patch("main.verifier_alertes_mesures"):
        await setup_complet(ac)
        for i in range(5):
            await ac.post("/mesures", json={"temperature": 29.0 + i, "humidite": 55.0, "id_capteur": 1})
    r = await ac.get("/mesures/dernieres/3")
    assert r.status_code == 200
    assert len(r.json()) == 3


# ── Tests lots ────────────────────────────────────────────────

async def test_creer_lot(ac):
    await setup_complet(ac)
    r = await ac.post("/lots", json={"id_lot": "LOT-001", "id_entrepot": 1, "id_utilisateur": 1})
    assert r.status_code == 201
    assert r.json()["id_lot"] == "LOT-001"
    assert r.json()["statut"] == "conforme"


async def test_creer_lot_doublon(ac):
    await setup_complet(ac)
    await ac.post("/lots", json={"id_lot": "LOT-001", "id_entrepot": 1, "id_utilisateur": 1})
    r = await ac.post("/lots", json={"id_lot": "LOT-001", "id_entrepot": 1, "id_utilisateur": 1})
    assert r.status_code == 409


async def test_creer_lot_entrepot_inexistant(ac):
    await creer_utilisateur(ac)
    r = await ac.post("/lots", json={"id_lot": "LOT-X", "id_entrepot": 999, "id_utilisateur": 1})
    assert r.status_code == 404


async def test_creer_lot_utilisateur_inexistant(ac):
    await creer_config(ac); await creer_exploitation(ac); await creer_entrepot(ac)
    r = await ac.post("/lots", json={"id_lot": "LOT-X", "id_entrepot": 1, "id_utilisateur": 999})
    assert r.status_code == 404


async def test_get_lot_inexistant(ac):
    r = await ac.get("/lots/INCONNU")
    assert r.status_code == 404


async def test_get_lots_renvoie_liste(ac):
    await setup_complet(ac)
    await ac.post("/lots", json={"id_lot": "LOT-A", "id_entrepot": 1, "id_utilisateur": 1})
    await ac.post("/lots", json={"id_lot": "LOT-B", "id_entrepot": 1, "id_utilisateur": 1})
    r = await ac.get("/lots")
    assert r.status_code == 200
    assert len(r.json()) == 2


async def test_get_lot_mesures(ac):
    with patch("main.verifier_alertes_mesures"):
        await setup_complet(ac)
        await ac.post("/lots", json={"id_lot": "LOT-001", "id_entrepot": 1, "id_utilisateur": 1})
        await ac.post("/mesures", json={"temperature": 29.0, "humidite": 55.0, "id_capteur": 1})
    r = await ac.get("/lots/LOT-001/mesures")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_get_lot_mesures_lot_inexistant(ac):
    r = await ac.get("/lots/INCONNU/mesures")
    assert r.status_code == 404


# ── Tests alertes ─────────────────────────────────────────────

async def test_alertes_vides(ac):
    r = await ac.get("/alertes")
    assert r.status_code == 200
    data = r.json()
    assert "alertes_mesures" in data
    assert "alertes_lots"    in data
    assert data["alertes_mesures"] == []
    assert data["alertes_lots"]    == []


async def test_alertes_count_zero(ac):
    r = await ac.get("/alertes/count")
    assert r.status_code == 200
    data = r.json()
    assert data["total"]    == 0
    assert data["non_lues"] == 0
    assert "total_mesures"    in data
    assert "total_lots"       in data
    assert "non_lues_mesures" in data
    assert "non_lues_lots"    in data


async def test_marquer_toutes_alertes_lues(ac):
    r = await ac.put("/alertes/toutes/lues")
    assert r.status_code == 200


async def test_supprimer_toutes_alertes(ac):
    r = await ac.delete("/alertes")
    assert r.status_code == 200


# ── Tests stats dashboard ─────────────────────────────────────

async def test_dashboard_sans_donnees(ac):
    r = await ac.get("/stats/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert data["total_lots"] == 0
    assert data["conforme_lots"] == 0


async def test_dashboard_avec_lot(ac):
    await setup_complet(ac)
    await ac.post("/lots", json={"id_lot": "LOT-001", "id_entrepot": 1, "id_utilisateur": 1})
    r = await ac.get("/stats/dashboard")
    assert r.status_code == 200
    assert r.json()["total_lots"]    == 1
    assert r.json()["conforme_lots"] == 1


# ── Tests utilisateurs ────────────────────────────────────────

async def test_creer_utilisateur(ac):
    r = await creer_utilisateur(ac)
    assert r.status_code == 201
    assert r.json()["email"] == "jean.dupont@futurekawa.com"


async def test_creer_utilisateur_email_doublon(ac):
    await creer_utilisateur(ac)
    r = await creer_utilisateur(ac)
    assert r.status_code == 409


async def test_get_utilisateur_inexistant(ac):
    r = await ac.get("/utilisateurs/999")
    assert r.status_code == 404


async def test_supprimer_utilisateur(ac):
    await creer_utilisateur(ac)
    r = await ac.delete("/utilisateurs/1")
    assert r.status_code == 200


# ── Tests rôles ───────────────────────────────────────────────

async def test_creer_role(ac):
    r = await ac.post("/roles", json={"libelle": "admin", "description": "Administrateur"})
    assert r.status_code == 201
    assert r.json()["libelle"] == "admin"


async def test_creer_role_doublon(ac):
    await ac.post("/roles", json={"libelle": "admin"})
    r = await ac.post("/roles", json={"libelle": "admin"})
    assert r.status_code == 409


async def test_get_roles_vide(ac):
    r = await ac.get("/roles")
    assert r.status_code == 200
    assert r.json() == []


async def test_supprimer_role_inexistant(ac):
    r = await ac.delete("/roles/999")
    assert r.status_code == 404
