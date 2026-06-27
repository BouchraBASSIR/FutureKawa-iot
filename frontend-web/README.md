# FutureKawa - Frontend Web

Application React de monitoring IoT des entrepôts frigorifiques.

## Prérequis

- Node.js 18+
- Backend central lancé sur `http://localhost:9000`

## Installation

```bash
npm install
```

## Démarrage

```bash
npm start
# Ouvre http://localhost:3000
```

---

## Tests unitaires (Jest + React Testing Library)

Les tests unitaires testent les composants et services de manière isolée, sans navigateur.

```bash
# Lancer tous les tests une fois
npm test

# Mode watch (relance à chaque modification)
npm run test:watch

# Avec rapport de couverture
npm run test:coverage
```

**Fichiers de tests :**

| Fichier | Ce qui est testé |
|---|---|
| `src/__tests__/AuthContext.test.jsx` | RBAC : hasRole, getEntrepotsForPays, login/logout |
| `src/__tests__/KPICard.test.jsx` | Rendu du composant KPI |
| `src/__tests__/dashboardService.test.js` | Appels API (getEntrepots, getMesures…) |
| `src/__tests__/chartHelpers.test.js` | Agrégation des données de graphiques |

---

## Tests E2E (Cypress)

Les tests E2E pilotent un vrai navigateur. Il faut que l'application **et** le backend tournent.

### 1. Démarrer les serveurs

```bash
# Terminal 1 — frontend
npm start

# Terminal 2 — backend central
cd ../backend-central
uvicorn src.main:app --port 9000 --reload
```

### 2. Lancer Cypress

```bash
# Interface graphique (recommandé pour déboguer)
npm run cy:open

# Headless (CI / ligne de commande)
npm run cy:run
```
**Fichiers de tests E2E :**

| Fichier | Ce qui est testé |
|---|---|
| `cypress/e2e/01_login.cy.js` | Formulaire de login, erreur, redirection |
| `cypress/e2e/02_navigation.cy.js` | Accès à toutes les pages (admin) |
| `cypress/e2e/03_rbac.cy.js` | Redirection si non authentifié, accès admin |
| `cypress/e2e/04_lots.cy.js` | Page lots accessible sans erreur |
