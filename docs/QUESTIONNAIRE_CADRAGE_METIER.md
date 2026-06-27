# Questionnaire de Cadrage Métier - Phase 1

## Préparation à la Collecte des Besoins Applicatifs, Télémétrie & Centralisation

> **Cible de l'interview :** Directeur des Opérations Globales, Responsables d'Entrepôts (Brésil, Colombie, Équateur), Directeur de la Qualité et Responsable du Système d'Information (DSI).  


---

##  1. Méthodologie d'Interview-Type & Retranscription

Pour assurer un recueil d'exigences rigoureux et structuré, nous appliquons une démarche d'**entretien semi-directif**. Cette méthode permet à la fois de couvrir des questions précises et de laisser l'interlocuteur exprimer ses contraintes "terrain" quotidiennes.

### A. Format de l'Interview
*   **Durée :** 1h30 par profil (Terrain / Siège / Qualité / SI).
*   **Rôles :** Un interviewer (mène le fil conducteur) et un retranscripteur (capture les citations et les verbatims métiers).

### B. Méthodologie de Retranscription et d'Analyse
Pour transformer les verbatims des utilisateurs en spécifications techniques actionnables, deux livrables de synthèse sont systématiquement produits :

#### 1. Le Tableau d'Ingénierie des Exigences (Matrice de Traçabilité)
Chaque besoin exprimé est consigné dans un tableau de référence croisée structuré selon la méthode **MoSCOW** (Must have, Should have, Could have, Won't have) :

| ID Exigence | Source Métier | Description du Besoin Métier | Priorité | Faisabilité Technique & Composant Associé |
| :---: | :--- | :--- | :---: | :--- |
| **REQ-1.1** | Logistique | Suivre l'entrée en stock de chaque lot de café vert avec un ID unique. | **Must** | *Haute.* Géré par table SQL `lot` et API REST `POST /lots`. |
| **REQ-1.2** | Directeur | Consulter l'état global des stocks des 3 pays depuis le siège. | **Must** | *Moyenne.* Nécessite un agrégateur central asynchrone (`backend-central`). |
| **REQ-1.3** | Qualité | Visualiser l'historique thermique d'un lot sous forme de graphique. | **Should** | *Haute.* Utilisation de Recharts (Frontend) alimenté par l'API `/mesures`. |
| **REQ-1.4** | DSI | Lier les données d'expédition des lots à notre CRM de facturation B2B. | **Could** | *Moyenne.* API Gateway centrale avec authentification sécurisée JWT. |

#### 2. Cartographie Graphique des Flux d'Activités (Diagrammes de Processus / Swimlanes)
Les processus métiers sont modélisés sous forme de diagrammes de flux de données (Data Flow Diagrams) et de diagrammes de séquence fonctionnels. Ils décrivent graphiquement le parcours de l'information (ex: Capteur IoT $\rightarrow$ Broker MQTT local $\rightarrow$ Alerte Email au chef d'entrepôt $\rightarrow$ Historisation BDD $\rightarrow$ Agrégation au siège).

---

##  2. Le Questionnaire de Cadrage Métier (Phase 1)

---

### SECTION A : Besoins Métiers & Fonctionnalités Clés attendues

####  1. Gestion des Stocks, Traçabilité & Logique FIFO
*   **Q A.1.1 : Identification des Lots**  
    Comment sont identifiés et étiquetés vos lots de café vert à leur arrivée physique en entrepôt ? Souhaitez-vous une génération d'identifiant unique automatique ou la possibilité de saisir manuellement un code existant ?
*   **Q A.1.2 : Logique de Rotation FIFO (First In, First Out)**  
    Quels sont vos critères de priorité lors de la préparation des commandes d'expédition ? Comment l'outil peut-il vous aider à repérer visuellement et immédiatement les lots les plus anciens à sortir en priorité ?
*   **Q A.1.3 : Cycle de vie d'un lot**  
    Quels sont les statuts possibles d'un lot de café vert tout au long de sa période de stockage (ex: conforme, suspect, en alerte, déclassé, expédié) ?

####  2. Gestion de la Mobilité (Ergonomie Terrain)
*   **Q A.2.1 : Équipements physiques des opérateurs**  
    Sur quels types de terminaux les chefs d'entrepôt vont-ils interagir avec l'application sur le terrain (tablettes durcies, smartphones, ordinateurs de bureau de l'entrepôt) ?
*   **Q A.2.2 : Ergonomie en environnement contraignant**  
    Les opérateurs terrain travaillant souvent debout, parfois avec des gants ou dans des zones sombres, de quelle interface ergonomique ont-ils besoin (ex: boutons de grande taille, contrastes élevés, lecture rapide par code-barres / QR Code) ?

####  3. Option d'Accès Centralisé & Consolidation (Siège Social)
*   **Q A.3.1 : Besoins de Supervision Globale**  
    En tant que Directeur des Opérations au siège, quelles informations clés devez-vous consolider en temps réel pour l'ensemble des pays (Brésil, Équateur, Colombie) ?
*   **Q A.3.2 : Temps de réponse acceptable**  
    Étant donné la distance physique entre le siège (central) et les backends locaux, quel est le délai d'affichage acceptable pour obtenir la consolidation des stocks mondiaux lors d'une connexion ?

####  4. Interfaçage avec le CRM & ERP Existant
*   **Q A.4.1 : Connexion au CRM / ERP**  
    Souhaitez-vous que l'application de suivi des stocks communique avec votre CRM de gestion commerciale ou votre ERP ? Si oui, quelles données doivent être synchronisées (ex: envoyer l'historique thermique du lot au CRM pour l'associer à la facture client B2B en gage de qualité) ?

---

### SECTION B : Contraintes Métiers à prendre en compte

####  1. Contraintes d'Infrastructure & Connectivité Réseau
*   **Q B.1.1 : Instabilité Réseau (Amérique du Sud)**  
    Vos entrepôts étant situés dans des régions parfois isolées géographiquement, les coupures internet sont fréquentes. L'application locale doit-elle continuer de fonctionner en autarcie (Edge Computing) ? Est-il acceptable que le siège ne voie plus un entrepôt temporairement si la connectivité locale reste intacte pour enregistrer les mesures IoT et lever les alertes ?
*   **Q B.1.2 : Choix des Protocoles IoT**  
    Au vu de la faible bande passante réseau dans vos exploitations, préférez-vous l'utilisation d'un protocole de messagerie ultra-léger et asynchrone (comme MQTT) plutôt que des requêtes HTTP lourdes pour la remonter des capteurs ?

####  2. Contraintes de Qualité Agroalimentaire & Réglementation
*   **Q B.2.1 : Seuils et Tolérances Thermiques/Hydrométriques**  
    Quelles sont les valeurs cibles de température et d'humidité à respecter selon les pays pour éviter la prolifération de moisissures ou la perte d'arômes des grains ? Quelles sont les tolérances absolues admises avant déclenchement d'un e-mail d'alerte ?
*   **Q B.2.2 : Auditabilité & Preuve Client**  
    Vos clients B2B premium exigent des preuves de conservation pour valider l'achat de café vert premium. Quelle doit être la durée minimale de conservation des historiques de température en base de données pour répondre à un audit qualité (ex: 2 ans, 5 ans) ?

####  3. Contraintes de Sécurité, d'Authentification & Rôles
*   **Q B.3.1 : Profilage & Droits d'Accès**  
    Comment souhaitez-vous segmenter les droits d'accès à l'application ? Un chef d'entrepôt brésilien peut-il visualiser ou modifier les stocks de l'entrepôt colombien, ou l'accès local doit-il être strictement cloisonné à son exploitation ?
*   **Q B.3.2 : Mécanismes de Sécurisation**  
    Quelles sont vos exigences en termes de sécurité de transmission des données sensibles (utilisateurs, mots de passe, configurations) ? Le protocole HTTPS et l'authentification par jeton JWT signé sont-ils requis pour l'ensemble des requêtes ?
