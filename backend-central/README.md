# FutureKawa - Backend Central

API FastAPI centrale : authentification, agrégation des données multi-pays, RBAC.

## Prérequis

- Python 3.10+
- Base de données configurée (voir `.env`)

## Installation

```bash
python -m venv venv
source venv/bin/activate   # Windows : venv\Scripts\activate
pip install -r requirements.txt
```

## Démarrage

```bash
cd src
uvicorn main:app --port 9000 --reload
# Swagger disponible sur http://localhost:9000/docs
```

---

## Tests (pytest)

```bash
# Depuis la racine du module
pytest tests/ -v

# Avec rapport de couverture
pytest tests/ -v --cov=src --cov-report=term-missing
```

Les tests utilisent `app.dependency_overrides` pour mocker l'authentification - aucun token JWT nécessaire.

**Fichier de tests :** `tests/test_main.py` - 32 tests couvrant :

- Routes publiques (`/`, `/api/central/countries`)
- Dashboard, stocks, alertes, capteurs, mesures
- Filtres par pays (accès autorisé / refusé)
- Validation des paramètres invalides (400 vs 403)
