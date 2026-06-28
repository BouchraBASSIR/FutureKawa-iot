# FutureKawa — Rôles et contrôle d'accès (RBAC)

Ce document décrit les trois rôles du système, ce que chaque rôle peut voir et faire, et comment le contrôle d'accès est appliqué côté backend et frontend.

---

## Les trois rôles

| Rôle | Libellé en base | Description |
|------|----------------|-------------|
| **Administrateur** | `admin` | Accès total à toutes les fonctionnalités et tous les pays |
| **Responsable pays** | `responsable_pays` | Gestion des lots et alertes pour ses pays assignés |
| **Opérateur** | `operateur` | Saisie de lots pour ses entrepôts assignés uniquement |

Les rôles sont définis dans `backend-central/src/seed.py` et stockés dans la table `role`.

---

## Ce que chaque rôle voit et peut faire

### Tableau récapitulatif

| Fonctionnalité | Admin | Responsable pays | Opérateur |
|----------------|:-----:|:----------------:|:---------:|
| **Dashboard** | Tous les pays | Ses pays uniquement | Ses entrepôts uniquement |
| **Voir les lots** | Tous | Tous (ses pays) | Ses entrepôts |
| **Créer un lot** | ✅ | ✅ | ✅ |
| **Voir les alertes** | Tous les pays | Ses pays | Ses entrepôts |
| **Marquer alertes comme lues** | ✅ | ✅ | ❌ |
| **Page Entrepôts / Storage** | ✅ | ✅ | ❌ menu masqué |
| **Page Rapports** | ✅ | ✅ | ❌ menu masqué |
| **Gestion des utilisateurs** | ✅ | ❌ | ❌ |
| **Assigner des rôles** | ✅ | ❌ | ❌ |
| **Assigner des accès pays/entrepôts** | ✅ | ❌ | ❌ |
| **Voir la configuration (seuils, email)** | ✅ | ✅ | ❌ |
| **Sélecteur de pays** | Tous les pays | Ses pays | Ses entrepôts |

---

### Admin

- Accède à **tout** sans restriction de pays ni d'entrepôt.
- Voit tous les menus : Dashboard, Lots, Alertes, Entrepôts, Rapports.
- Seul rôle pouvant créer des utilisateurs, assigner des rôles et configurer les accès.
- Dans le JWT : `roles: ["admin"]`, `accesses: []` (le tableau vide = accès total côté admin).

### Responsable pays

- Accède uniquement aux **pays qui lui sont assignés** (configurés par un admin).
- Voit les menus : Dashboard, Lots, Alertes, Entrepôts, Rapports.
- Ne voit **pas** la gestion des utilisateurs.
- Dans le JWT : `accesses: [{ pays: "equateur", entrepots: [...], exploitations: [...] }]`
- Le sélecteur de pays dans le Dashboard ne propose que ses pays.

### Opérateur

- Accède uniquement aux **entrepôts qui lui sont assignés** dans son pays.
- Ne voit **pas** les pages Entrepôts ni Rapports (menu masqué).
- Peut créer des lots uniquement dans ses entrepôts.
- Dans le JWT : `accesses: [{ pays: "bresil", entrepots: [3, 7], exploitations: [2] }]`

---

## Comment les accès sont stockés

### Base de données centrale (`backend-central`)

```
utilisateur          → compte (email, mot de passe hashé, actif)
role                 → définition des rôles
utilisateur_role     → liaison utilisateur ↔ rôle (many-to-many)
user_access          → accès par pays/entrepôt/exploitation
  colonnes : id_utilisateur, pays, entrepot_id, exploitation_id
```

### Token JWT

À la connexion, le backend-central génère un JWT contenant :

```json
{
  "sub":      "42",
  "email":    "responsable@futurekawa.com",
  "roles":    ["responsable_pays"],
  "accesses": [
    {
      "pays":          "equateur",
      "entrepots":     [1, 3],
      "exploitations": [2]
    }
  ],
  "exp":      1234567890
}
```

Ce JWT est utilisé par **les deux backends** (même `JWT_SECRET`). Le backend-pays valide le token de manière autonome.

---

## Comment les accès sont contrôlés

### Backend central (`backend-central/src/main.py`)

Toutes les routes protégées utilisent `get_current_user` via FastAPI Depends.

**Logique de filtrage par pays :**
- `admin` → accès à tous les pays configurés
- Autres rôles → filtrés sur le tableau `accesses` du JWT

```python
# Vérification d'accès à un pays spécifique
def _require_access(country, current_user):
    if "admin" in current_user["roles"]:
        return  # admin passe toujours
    allowed = [a["pays"] for a in current_user["accesses"]]
    if country not in allowed:
        raise HTTPException(403, "Accès refusé à ce pays")
```

**Routes avec restriction de rôle supplémentaire :**

| Route | Rôles autorisés |
|-------|----------------|
| `PUT /api/central/alertes/toutes/lues` | `admin`, `responsable_pays` |
| `GET /api/central/{country_id}/config` | `admin`, `responsable_pays` |
| Toutes les routes `/api/central/users/*` | `admin` uniquement |

### Backend pays (`backend-pays/main.py`)

La plupart des routes sont ouvertes (données locales). L'auth est optionnelle.

**Lors de la création d'un lot :**
```python
def can_access_entrepot(user, entrepot_id):
    if "admin" in user["roles"] or "responsable_pays" in user["roles"]:
        return True  # accès total
    return entrepot_id in user["entrepots"]  # opérateur → entrepôts assignés seulement
```

### Frontend (`frontend-web/src`)

**Routes protégées** (`src/app/App.jsx`) :

```
/               → tout utilisateur connecté
/lots           → tout utilisateur connecté
/alerts         → tout utilisateur connecté
/storage        → admin ou responsable_pays seulement
/reports        → admin ou responsable_pays seulement
/login          → public
```

**Menu latéral** (`src/components/layout/Sidebar/Sidebar.jsx`) :
- Les items Entrepôts et Rapports sont masqués si `!hasRole("admin", "responsable_pays")`

**Filtrage des données** (`src/context/AuthContext.jsx`) :

| Fonction | Admin | Responsable pays | Opérateur |
|----------|-------|-----------------|-----------|
| `getAllowedPays()` | `null` (tous) | tableau de ses pays | tableau de ses pays |
| `getEntrepotsForPays(pays)` | `null` (tous) | `null` (tous dans son pays) | tableau de ses entrepôts |
| `getUserPays()` | `null` (multi-pays) | son pays (si 1 seul) | son pays |

> `null` signifie **pas de restriction** (l'API renvoie tout).
> Un tableau vide signifie **aucun accès**.

---

## Flux de connexion

```
1. POST /auth/login { email, mot_de_passe }
2. Backend vérifie les credentials → génère JWT (roles + accesses)
3. Frontend stocke le JWT dans localStorage (clé : futurekawa_token)
4. Frontend décode le JWT → construit le profil utilisateur
5. Chaque requête API inclut Authorization: Bearer <token>
6. Backend-central valide le JWT et filtre les données selon accesses
7. Backend-central forwarde les requêtes au backend-pays avec le même JWT
8. Backend-pays valide le JWT de son côté (même secret partagé)
```

---

## Propagation des accès

Quand un admin assigne un accès pays à un utilisateur :

```
Admin → POST /api/central/users/{id}/access { pays: "bresil", entrepot_id: 3 }
  ↓
backend-central enregistre dans user_access
  ↓
backend-central propage vers backend-pays du pays concerné :
  POST http://backend-bresil/utilisateurs { email, nom, prenom, roles, entrepots }
  (best-effort : si le backend-pays est inaccessible, l'accès central est quand même créé)
```

---

## Compte par défaut (seed)

Un seul compte est créé automatiquement au démarrage :

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| `admin@futurekawa.com` | `Admin1234!` (ou variable `ADMIN_PASSWORD`) | `admin` |

Les autres comptes doivent être créés manuellement via l'interface ou l'API (`POST /api/central/users`).
