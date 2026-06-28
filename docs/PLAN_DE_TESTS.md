# Plan de Tests - FutureKawa IoT

Ce document présente la stratégie de test et les scénarios concrets de vérification de la solution applicative de suivi de stockage et de surveillance IoT de **FutureKawa**. Ce plan de tests a pour but de vérifier la conformité de la solution développée par rapport au cahier des charges des directions métiers.

---

## 1. Stratégie de Test & Niveaux de Couverture

La validation de la solution repose sur trois niveaux complémentaires garantissant la robustesse, la stabilité et l'adéquation métier :

1.  **Tests Unitaires :** Validation isolée de la logique métier pure (calcul des alertes de température et d'humidité selon les pays, vérification de la logique FIFO, construction des messages d'alerte).
2.  **Tests d'Intégration API :** Validation de l'interaction entre les services (FastAPI, base de données relationnelle locale et centrale, middleware de sécurité JWT).
3.  **Tests BDD (Behavior Driven Development) / Flux End-to-End :** Validation des parcours fonctionnels réels décrits en Gherkin (langage naturel métier) et vérification du flux de données complet (IoT -> Broker MQTT -> Backend Pays -> Base de données).

---

## 2. Scénarios de Test Concrets

### Scénario 1 : Test Unitaire (Logique Métier d'Alerte Température)
*   **Objectif :** Vérifier que l'algorithme d'alerte identifie correctement les dérives thermiques selon les configurations de chaque pays.
*   **Données d'entrée :**
    *   Pays : `Brésil` (Température idéale : 29°C, Tolérance : ±3°C, soit une plage conforme de [26°C ; 32°C])
    *   Température testée : `35°C` (température anormale)
*   **Procédure :**
    1.  Instancier la classe de vérification `AlerteMetier` avec les seuils du Brésil.
    2.  Appeler la fonction `temperature_hors_seuil("Bresil", 35.0)`.
*   **Résultat attendu :**
    *   La fonction retourne `True` (hors seuil).
    *   Le statut de l'alerte générée doit être `"en_alerte"` (ou `"non_lue"` en base de données).
    *   Le message d'alerte généré doit correspondre à : *"Température anormale : 35°C (seuil: 26.0–32.0°C)"*.

---

### Scénario 2 : Test d'Intégration API (Création et Persistance d'un Lot)
*   **Objectif :** Valider qu'un lot de café vert saisi via l'API REST est correctement validé, persisté en base de données SQL et consultable.
*   **Données d'entrée (Payload JSON) :**
    ```json
    {
      "id_lot": "LOT-BR-2026-06",
      "id_entrepot": 1,
      "id_utilisateur": 2,
      "date_stockage": "2026-06-26T10:00:00Z"
    }
    ```
*   **Procédure :**
    1.  S'authentifier en tant que Gestionnaire pour obtenir un jeton JWT valide.
    2.  Envoyer une requête `POST /lots` avec le payload ci-dessus et le header d'autorisation.
    3.  Vérifier le code de retour HTTP de la réponse.
    4.  Envoyer une requête `GET /lots/LOT-BR-2026-06` pour récupérer le lot.
*   **Résultats attendus :**
    *   Le code HTTP de création est `201 Created`.
    *   Le lot retourné possède les mêmes informations que le payload, avec un statut `"conforme"`.
    *   Une tentative de re-création du même lot (`id_lot` identique) retourne un code `409 Conflict` (unicité de la clé primaire).

---

### Scénario 3 : Test de Flux IoT Complet (Simulateur -> Mosquitto -> BDD)
*   **Objectif :** Valider l'intégration matérielle et réseau : l'envoi de mesures par un microcontrôleur ou son simulateur, leur traitement par l'API locale et leur persistance en temps réel.
*   **Données d'entrée (Payload MQTT sur le topic `capteur/mesures`) :**
    ```json
    {
      "capteur_id": 1,
      "temperature": 28.5,
      "humidite": 54.0
    }
    ```
*   **Procédure :**
    1.  Démarrer le broker MQTT Mosquitto local.
    2.  Démarrer le backend pays local avec la souscription active sur `capteur/mesures`.
    3.  Publier le message JSON ci-dessus sur le broker via le simulateur ESP32.
    4.  Consulter la base de données locale ou appeler l'API `/mesures` pour ce capteur.
*   **Résultats attendus :**
    *   Le backend pays intercepte le message MQTT sans erreur de parsing.
    *   Une nouvelle ligne est insérée dans la table `mesure` avec la température `28.5` et l'humidité `54.0`.
    *   La mesure étant dans les clous pour le Brésil (28.5°C est compris entre 26°C et 32°C, 54% d'humidité est compris entre 53% et 57%), aucune alerte n'est déclenchée en base ni par e-mail.

---

### Scénario 4 : Test de Détection de Lot Périmé (Règle Métier 365 jours)
*   **Objectif :** Valider que les lots stockés depuis plus de 365 jours sont automatiquement marqués comme périmés et lèvent une alerte par e-mail.
*   **Données d'entrée :**
    *   Un lot `LOT-BR-ANCIEN` créé avec une `date_stockage` datant de 400 jours dans le passé.
*   **Procédure :**
    1.  Lancer la tâche planifiée ou appeler l'endpoint de vérification des alertes de lots `/alertes/verifier-lots` (ou fonction `verifier_alertes_lots()`).
*   **Résultats attendus :**
    *   Le statut du lot `LOT-BR-ANCIEN` en base de données passe de `"conforme"` à `"perime"`.
    *   Une entrée est créée dans la table `alerte_lot` avec un message d'alerte explicite.
    *   Un e-mail d'alerte est envoyé à l'adresse du responsable configurée en base de données avec la liste des lots périmés.

---

## 3. Matrice de Conformité Fonctionnelle

| ID Exigence | Fonctionnalité Attendue (Directions Métiers) | Validé par quel scénario ? | Statut (Conforme / Non) |
| :--- | :--- | :--- | :--- |
| **REQ-01** | Multi-pays (Brésil, Colombie, Équateur) et suivi des entrepôts | Scénario 2, Tests d'intégration API | **Conforme** |
| **REQ-02** | Logique FIFO sur l'affichage des lots (plus anciens d'abord) | Tests unitaires (`trier_lots_fifo`) & Tri par défaut Frontend | **Conforme** |
| **REQ-03** | Télémétrie automatique IoT (Température & Humidité) via MQTT | Scénario 3, Flux IoT | **Conforme** |
| **REQ-04** | Seuils et tolérances de conservation spécifiques par pays | Scénario 1, Tests unitaires alertes | **Conforme** |
| **REQ-05** | Alerte dérive de conditions de stockage + Envoi d'email | Scénario 1 & 3, Tests unitaires & intégration | **Conforme** |
| **REQ-06** | Alerte de péremption si stockage > 365 jours + Envoi d'email | Scénario 4, Logic Alertes lots | **Conforme** |
| **REQ-07** | Dashboard centralisé au siège avec agrégation asynchrone | Tests d'intégration Central, Dashboard web | **Conforme** |
| **REQ-08** | Visualisation des graphiques historiques de conditions par lot | Composant `LotDetail.jsx` (Recharts) | **Conforme** |
