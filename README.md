# FutureKawa - Plateforme de Traçabilité & Surveillance IoT du Café Vert

Ce dépôt contient l'ensemble des livrables logiciels, d'infrastructure (CI/CD, conteneurisation) et documentaires ( guide utilisateur avec referentiel technique/fonctionel cadrage, conduite du changement, plans de tests) développés pour répondre aux exigences de la certification MSPR (Bloc 4).

---

## 1. Vue d'Ensemble du Projet

FutureKawa est une solution technologique distribuée de supervision et de contrôle de la qualité de stockage du café vert premium. Elle assure :
*   La collecte continue des données ambiantes (température et humidité) des entrepôts locaux via des sondes connectées (ESP32) communiquant en MQTT.
*   La résilience locale des entrepôts grâce à des bases PostgreSQL et APIs FastAPI locales autonomes fonctionnant en autarcie (Edge computing).
*   L'agrégation asynchrone concurrente des stocks mondiaux (Brésil, Colombie, Équateur) au niveau du serveur central du siège.
*   La surveillance automatisée de la chaîne de valeur via un moteur d'alertes instantanées par e-mail en cas d'anomalies de stockage ou de dépassement de la durée légale (FIFO - 365 jours).

---

## 2. Structure Générale du Répertoire

La racine du projet est organisée de manière à séparer les livrables d'évaluation, les lanceurs rapides de développement et le code source complet :

```
FutureKawa-iot/              # Dossier racine du projet logiciel & infrastructure
   ├── backend-central/      # Code source du backend d'agrégation centrale (siège)
   ├── backend-pays/         # Code source du backend d'entrepôt local (Brésil)   
   ├── frontend-web/         # Application web de supervision (React)
   ├── futurekawa-simulateur/# Simulateur de trames de capteurs IoT (Python)
   ├── iot-module/           # Code embarqué destiné au microcontrôleur ESP32 (C++)
   ├── Jenkins/              # Pipelines d'intégration et déploiement continu (CI/CD)
   ├── docs/                 # Dossier centralisant tous les documentations (archi, guide user)
   └── docker-compose.yml    # Descripteur d'orchestration de tous les conteneurs du projet
   └── README.md

```

---

## 3. Référentiels d'Accompagnement & Livrables Documentaires

L'intégralité des documents requis par le client et les grilles d'évaluation de la certification sont rédigés et disponibles sous format Markdown dans le dossier `FutureKawa-iot/docs/` (et dupliqués pour certains à la racine) :

### Conception & Architecture
*   **`conception_uml.md`** : Phase de conception structurelle et fonctionnelle du projet. Contient le diagramme de Cas d'Utilisation UML, le Modèle Conceptuel de Données (MCD) Merise (incluant la gestion des rôles de sécurité), le Diagramme de Classes logique UML, et le Diagramme de Séquence fonctionnel de levée d'alerte.
*   **`ARCHITECTURE.md`** : Manuel d'architecture et référentiel technique complet (Structure détaillée, prérequis d'installation, guide d'installation Docker et manuel, liste des dépendances logicielles clés, justifications des choix technologiques et analyse de robustesse/résilience).

### Accompagnement Utilisateur & Cadrage Métier
*   **`GUIDE_UTILISATEUR.md`** : Guide pratique d'utilisation et d'administration de la plateforme, incluant la cartographie fonctionnelle de l'application (Mermaid), le dictionnaire des profils d'utilisateurs métiers (Chef d'entrepôt, Responsable Qualité, Directeur) et le manuel réflexe en cas d'alerte.
*   **`QUESTIONNAIRE_CADRAGE_METIER.md`** : Éléments de préparation et méthodologie de collecte des besoins applicatifs et de télémétrie pour la solution actuelle (Phase 1). Contient la matrice de traçabilité des exigences métiers (MoSCoW) et le questionnaire d'interview semi-directive associé.
*   **`QUESTIONNAIRE_PHASE_AUTOMATISATION_2.md`** : Document de cadrage, questionnaire métier d'incident et schéma d'asservissement physique (nominal, dégradé, sécurité) en vue de la future phase d'automatisation des entrepôts (Phase 2).

### Tests & Conduite du Changement
*   **`PLAN_DE_TESTS.md`** : Stratégie de couverture de test logicielle (Unitaires, API, BDD, Flux IoT) avec la description détaillée de 4 scénarios concrets et la matrice de conformité fonctionnelle associée.
*   **`CONDUITE_DU_CHANGEMENT.md`** : Planification de la transition d'activité des fichiers Excel vers le suivi automatisé par IoT pour les équipes brésiliennes, s'appuyant sur le modèle de transition de William Bridges et découpé sur 4 axes de conduite (Informer, Communiquer, Former, Faire participer).

---

## 4. Démarrage Rapide

### Option 1 : Démarrage local direct (Sans Docker)
Pour lancer rapidement un environnement local de démonstration basé sur SQLite :
1.  Double-cliquez sur le fichier **`lanceur_sans_docker.bat`** à la racine de ce répertoire.
2.  Le script va automatiquement configurer les environnements virtuels Python, installer les dépendances, et lancer l'API pays locale ainsi que le simulateur de capteurs IoT.

### Option 2 : Orchestration globale (Avec Docker Compose)
Pour lancer l'intégralité de l'écosystème distribué (4 conteneurs PostgreSQL, 3 brokers Mosquitto, 4 APIs FastAPI et le portail React) :
1.  Naviguez dans le répertoire de la solution logicielle :
    ```bash
    cd FutureKawa-iot
    ```
2.  Copiez et complétez votre fichier de configuration d'environnement :
    ```bash
    cp .env.example .env
    ```
3.  Démarrez l'orchestration :
    ```bash
    docker compose up -d --build
    ```
4.  Ouvrez votre navigateur internet sur **`http://localhost:3000`** pour accéder au portail d'administration.
