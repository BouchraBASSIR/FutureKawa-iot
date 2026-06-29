# Conception UML, MCD & Cas d'Utilisation - FutureKawa IoT

Ce document présente la phase de conception fonctionnelle et technique du système FutureKawa IoT à travers la modélisation UML (Unified Modeling Language) et Merise (MCD). Il a été mis à jour pour s'aligner rigoureusement sur le modèle de contrôle d'accès basé sur les rôles (RBAC) décrit dans la spécification d'accès du projet.

---

## 1. Diagrammes de Cas d'Utilisation par Acteur (Use Cases)

Afin d'éviter la surcharge d'un diagramme unique et les croisements complexes de flèches, la conception des cas d'utilisation a été segmentée par acteur du système. Cette approche permet de visualiser de manière ciblée le périmètre d'action, les inclusions («include») et extensions («extend») pour chaque rôle applicatif.

---

### A. Rôle : Opérateur (`operateur`)

L'opérateur intervient sur le terrain pour gérer l'entrée physique des lots et suivre localement l'état des entrepôts qui lui sont personnellement assignés.

```mermaid
graph LR
    Op["옷<br/>Opérateur (operateur)"]

    subgraph "Frontière Système - Périmètre Opérateur"
        UC_Saisie((Créer / Enregistrer un lot))
        UC_ConsulterOp((Consulter les lots de ses entrepôts))
        UC_Historique((Visualiser l'historique d'un lot))
        UC_VoirAlertesOp((Consulter les alertes de ses entrepôts))
        
        %% Inclusions
        UC_Auth((S'authentifier de manière sécurisée))
        UC_ValidID((Valider l'identifiant unique du lot))
    end

    Op --> UC_Saisie
    Op --> UC_ConsulterOp
    Op --> UC_Historique
    Op --> UC_VoirAlertesOp

    UC_Saisie -.->|«include»| UC_ValidID
    UC_ConsulterOp -.->|«include»| UC_Auth
```

**Description des actions :**
* **Créer / Enregistrer un lot** : Déclare l'entrée en stock d'un nouveau lot de café vert dans un hangar de l'un de ses entrepôts assignés. *Cette action inclut de force la validation syntaxique de l'identifiant unique.*
* **Consulter ses lots & alertes** : Suit l'état des stocks et visualise les dérives climatiques actives pour ses seuls entrepôts de rattachement. *La consultation nécessite une authentification préalable par JWT.*
* **Visualiser l'historique** : Analyse les courbes d'humidité et de température d'un lot sous sa responsabilité.

---

### B. Rôle : Responsable Pays (`responsable_pays`)

Le responsable pays pilote la conformité qualité et supervise l'ensemble des installations, des lots et des alertes pour les pays d'Amérique du Sud qui lui sont assignés.

```mermaid
graph LR
    Resp["옷<br/>Responsable Pays (responsable_pays)"]

    subgraph "Frontière Système - Périmètre Responsable Pays"
        UC_ConsulterResp((Superviser le Dashboard de ses pays))
        UC_Acquitter((Marquer les alertes comme lues / Acquitter))
        UC_Storage((Consulter la page Storage / Entrepôts))
        UC_Rapports((Consulter la page Rapports))
        UC_Config((Voir la configuration des seuils))
        UC_HistoriqueResp((Visualiser l'historique d'un lot))
        
        %% Inclusions
        UC_AuthResp((S'authentifier de manière sécurisée))
        UC_SaisieMotif((Saisir le motif d'acquittement))
    end

    Resp --> UC_ConsulterResp
    Resp --> UC_Acquitter
    Resp --> UC_Storage
    Resp --> UC_Rapports
    Resp --> UC_Config
    Resp --> UC_HistoriqueResp

    UC_ConsulterResp -.->|«include»| UC_AuthResp
    UC_Acquitter -.->|«include»| UC_SaisieMotif
```

**Description des actions :**
* **Superviser le Dashboard national** : Suit en temps réel les indicateurs clés et l'état des entrepôts de ses pays.
* **Marquer les alertes comme lues / Acquitter** : Valide l'acquittement d'une alerte climatique ou d'ancienneté. *L'acquittement implique obligatoirement l'écriture d'un motif explicatif (recherche de cause, action corrective).*
* **Consulter Storage, Rapports et Config** : Accède à l'inventaire des capteurs, télécharge les rapports de traçabilité mensuels et examine les seuils de tolérance thermo-hydriques de ses pays.

---

### C. Rôle : Administrateur (`admin`)

L'administrateur possède un accès global et illimité. Il est le seul rôle habilité à administrer la sécurité, configurer les paramètres généraux et gérer les utilisateurs du système.

```mermaid
graph LR
    Admin["옷<br/>Administrateur (admin)"]

    subgraph "Frontière Système - Périmètre Administrateur"
        UC_AdminUsers((Gérer les comptes utilisateurs))
        UC_AssignRoles((Assigner les rôles et accès fins))
        UC_ConfigSeuils((Configurer les seuils globaux))
        UC_FullAccess((Superviser l'ensemble du système))
        
        %% Inclusions
        UC_AuthAdmin((S'authentifier de manière sécurisée))
    end

    Admin --> UC_AdminUsers
    Admin --> UC_AssignRoles
    Admin --> UC_ConfigSeuils
    Admin --> UC_FullAccess

    UC_FullAccess -.->|«include»| UC_AuthAdmin
```

**Description des actions :**
* **Gérer les comptes utilisateurs** : Crée, active, désactive ou modifie les fiches des employés en base centrale.
* **Assigner les rôles et accès fins** : Lie un rôle (`admin`, `responsable_pays`, `operateur`) à un compte et lui associe de manière extrêmement fine des accès géographiques par pays, par exploitation ou par entrepôt (table `user_access`).
* **Configurer les seuils globaux** : Modifie les seuils d'alerte climatiques, d'ancienneté des stocks de café, et configure les destinataires de notification mail pour l'ensemble des pays d'opération.
* **Superviser l'ensemble du système** : Bénéficie par héritage de tous les droits de consultation et d'acquittement, sans restriction géographique.

---

### D. Acteur : Capteur IoT (Système)

Le capteur IoT est un acteur automatique technologique qui alimente la base de données et lève de manière autonome des alertes climatiques.

```mermaid
graph LR
    System["[ Capteur IoT (Système) ]"]

    subgraph "Frontière Système - Périmètre Capteur IoT"
        UC_Mesures((Enregistrer les mesures d'ambiance))
        UC_GenAlerte((Générer une alerte automatique))
    end

    System --> UC_Mesures
    UC_GenAlerte -.->|«extend»| UC_Mesures
```

**Description des actions :**
* **Enregistrer les mesures d'ambiance** : Transmet périodiquement les valeurs de température et d'humidité mesurées par les sondes physiques.
* **Générer une alerte automatique** : Si la température ou l'humidité mesurées sortent de la plage de tolérance de la configuration, le cas d'utilisation d'enregistrement est étendu par la génération et l'enregistrement automatique d'une alerte en base de données.

---

## 2. Modèle Conceptuel de Données (MCD - Merise)

Le Modèle Conceptuel de Données (MCD) décrit la structure d'information de manière abstraite. Les entités liées aux rôles et à l'accès (`UTILISATEUR`, `ROLE` et `USER_ACCESS`) ont été rigoureusement réadaptées pour correspondre à l'architecture RBAC réelle du système.

```mermaid
graph LR
    %% Entités
    Config[CONFIG<br/><u>id_config</u><br/>pays<br/>temp_ideale<br/>temp_tolerance<br/>hum_ideale<br/>hum_tolerance]
    Exploitation[EXPLOITATION<br/><u>id_exploitation</u><br/>nom]
    Entrepot[ENTREPOT<br/><u>id_entrepot</u><br/>nom<br/>localisation]
    Capteur[CAPTEUR<br/><u>id_capteur</u><br/>nom<br/>type]
    Mesure[MESURE<br/><u>id_mesure</u><br/>temperature<br/>humidite<br/>date_mesure]
    Lot[LOT<br/><u>id_lot</u><br/>date_stockage<br/>statut]
    Utilisateur[UTILISATEUR<br/><u>id_utilisateur</u><br/>nom<br/>prenom<br/>email<br/>mot_de_passe<br/>actif]
    Role[ROLE<br/><u>id_role</u><br/>libelle<br/>description]
    UserAccess[USER_ACCESS<br/><u>id_access</u><br/>pays<br/>exploitation_id<br/>entrepot_id]
    AlerteMesure[ALERTE_MESURE<br/><u>id_alerte_mesure</u><br/>message<br/>date_alerte<br/>statut]
    AlerteLot[ALERTE_LOT<br/><u>id_alerte_lot</u><br/>message<br/>date_alerte<br/>statut]

    %% Associations Merise (avec cardinalités)
    Config ---|1,1| Regir((Régir))
    Regir ---|1,N| Exploitation

    Exploitation ---|1,1| Posseder((Posséder))
    Posseder ---|1,N| Entrepot

    Entrepot ---|1,1| Contenir((Contenir))
    Contenir ---|1,N| Capteur

    Entrepot ---|1,1| Stocker((Stocker))
    Stocker ---|0,N| Lot

    Capteur ---|1,1| Enregistrer((Enregistrer))
    Enregistrer ---|0,N| Mesure

    Mesure ---|1,1| GenererM((Générer))
    GenererM ---|0,N| AlerteMesure

    Lot ---|1,1| GenererL((Générer))
    GenererL ---|0,N| AlerteLot

    Utilisateur ---|1,1| Saisir((Saisir))
    Saisir ---|0,N| Lot

    Utilisateur ---|0,N| Attribuer((Attribuer))
    Attribuer ---|0,N| Role

    Utilisateur ---|0,N| Detenir((Détenir))
    Detenir ---|1,1| UserAccess
```

### Règles d'Associations et Cardinalités (Merise) :

*   **Régir** : Une configuration réglementaire (`CONFIG`) régit une ou plusieurs exploitations d'un pays. Cardinalités : `CONFIG (1,1)` - `EXPLOITATION (1,N)`.
*   **Posséder** : Une exploitation possède un ou plusieurs entrepôts physiques de stockage. Cardinalités : `EXPLOITATION (1,1)` - `ENTREPOT (1,N)`.
*   **Contenir** : Un entrepôt contient un ou plusieurs capteurs IoT physiques. Cardinalités : `ENTREPOT (1,1)` - `CAPTEUR (1,N)`.
*   **Stocker** : Un entrepôt héberge zéro ou plusieurs lots de café vert. Cardinalités : `ENTREPOT (1,1)` - `LOT (0,N)`.
*   **Enregistrer** : Un capteur de télémétrie enregistre zéro ou plusieurs mesures d'ambiance au fil du temps. Cardinalités : `CAPTEUR (1,1)` - `MESURE (0,N)`.
*   **Saisir** : Un utilisateur authentifié (généralement opérateur de terrain) saisit l'entrée en stock de zéro ou plusieurs lots de café. Cardinalités : `UTILISATEUR (1,1)` - `LOT (0,N)`.
*   **Attribuer (Liaison Associative)** : Un utilisateur possède un ou plusieurs rôles d'accès (`admin`, `responsable_pays`, `operateur`), et un rôle peut être attribué à zéro ou plusieurs utilisateurs (many-to-many). Cardinalités : `UTILISATEUR (0,N)` - `ROLE (0,N)`.
*   **Détenir (Accès fins)** : Un utilisateur possède zéro ou plusieurs autorisations d'accès géographiques (`USER_ACCESS`), chaque autorisation ciblant de manière optionnelle un pays, une exploitation et/ou un entrepôt spécifique. Cardinalités : `UTILISATEUR (0,N)` - `USER_ACCESS (1,1)`.
*   **Générer (Mesure)** : Une mesure hors-limite génère zéro ou plusieurs alertes de conditions de stockage. Cardinalités : `MESURE (1,1)` - `ALERTE_MESURE (0,N)`.
*   **Générer (Lot)** : Un lot stocké depuis plus de 365 jours génère zéro ou plusieurs alertes de péremption. Cardinalités : `LOT (1,1)` - `ALERTE_LOT (0,N)`.

---

## 3. Diagramme de Classes (Structure Logique - UML)

Le diagramme de classes ci-dessous modélise la structure physique et logique de nos bases de données. Il intègre désormais la table `UserAccess` utilisée au niveau de la base centrale pour restreindre géographiquement les rôles, ainsi que les tables locales de propagation d'accès (`UtilisateurExploitation`, `UtilisateurEntrepot`) au sein de la base de données de chaque pays.

```mermaid
classDiagram
    class Config {
        +int id_config
        +string pays
        +float temp_ideale
        +float temp_tolerance
        +float hum_ideale
        +float hum_tolerance
    }

    class Exploitation {
        +int id_exploitation
        +string nom
        +int id_config
    }

    class Entrepot {
        +int id_entrepot
        +string nom
        +string localisation
        +int id_exploitation
    }

    class Capteur {
        +int id_capteur
        +string nom
        +string type
        +int id_entrepot
    }

    class Mesure {
        +int id_mesure
        +float temperature
        +float humidite
        +datetime date_mesure
        +int id_capteur
    }

    class Lot {
        +string id_lot
        +datetime date_stockage
        +string statut
        +int id_entrepot
        +int id_utilisateur
    }

    class AlerteMesure {
        +int id_alerte
        +string message
        +datetime date_alerte
        +string statut
        +int id_mesure
    }

    class AlerteLot {
        +int id_alerte
        +string message
        +datetime date_alerte
        +string statut
        +string id_lot
    }

    class Utilisateur {
        +int id_utilisateur
        +string nom
        +string prenom
        +string email
        +string mot_de_passe
        +bool actif
    }

    class Role {
        +int id_role
        +string libelle
        +string description
    }

    class UtilisateurRole {
        +int id_utilisateur_role
        +int id_utilisateur
        +int id_role
    }

    class UserAccess {
        <<Central DB Only>>
        +int id
        +int id_utilisateur
        +string pays
        +int exploitation_id
        +int entrepot_id
    }

    class UtilisateurExploitation {
        <<Local DB Only>>
        +int id_utilisateur_exploitation
        +int id_utilisateur
        +int id_exploitation
        +datetime date_debut
        +datetime date_fin
    }

    class UtilisateurEntrepot {
        <<Local DB Only>>
        +int id_utilisateur_entrepot
        +int id_utilisateur
        +int id_entrepot
        +datetime date_debut
        +datetime date_fin
    }

    Config "1" -- "1..*" Exploitation : régit
    Exploitation "1" -- "1..*" Entrepot : possède
    Entrepot "1" -- "1..*" Capteur : contient
    Entrepot "1" -- "0..*" Lot : stocke
    Capteur "1" -- "0..*" Mesure : enregistre
    Mesure "1" -- "0..*" AlerteMesure : génère
    Lot "1" -- "0..*" AlerteLot : génère
    Utilisateur "1" -- "0..*" Lot : enregistre
    
    %% Relations RBAC / Accès
    Utilisateur "1" -- "0..*" UtilisateurRole : dispose
    Role "1" -- "0..*" UtilisateurRole : est_assigné
    Utilisateur "1" -- "0..*" UserAccess : détient_accès_central
    Utilisateur "1" -- "0..*" UtilisateurExploitation : détient_accès_local_exploitations
    Utilisateur "1" -- "0..*" UtilisateurEntrepot : détient_accès_local_entrepots
    UtilisateurExploitation "0..*" -- "1" Exploitation : cible
    UtilisateurEntrepot "0..*" -- "1" Entrepot : cible
```

---

## 4. Diagramme de Séquence Fonctionnel (Scénario d'Alerte & Contrôle RBAC)

Ce diagramme décrit la séquence des échanges fonctionnels lors d'un scénario de détection de dérive thermique au sein d'un entrepôt. Il met en scène le rôle restrictif de l'**Opérateur** (qui constate l'alerte sur son secteur et résout l'incident de façon physique mais n'a pas les droits pour l'acquitter en ligne) et le rôle du **Responsable Pays** (qui analyse l'historique et possède l'autorisation de marquer l'alerte comme lue en base de données).

```mermaid
sequenceDiagram
    actor Capteur as Capteur IoT
    actor Op as Opérateur (operateur)
    actor Resp as Responsable Pays (responsable_pays)
    participant App as Application FutureKawa
    participant Mail as Serveur de Messagerie

    %% 1. Détection automatique par le capteur
    Capteur->>App: Transmet relevé thermique anormal (ex: 35°C au Brésil)
    Note over App: Détection du dépassement des seuils configurés
    App->>App: Enregistre la mesure et génère l'alerte (statut: active)
    App->>Mail: Déclenche l'envoi d'un email d'alerte prioritaire
    Mail-->>Resp: Livré : Notification de dérive thermique (Brésil)
    
    %% 2. Consultation et intervention locale par l'Opérateur
    Op->>App: Se connecte au dashboard (filtré sur son entrepôt assigné)
    App-->>Op: Affiche l'alerte de dépassement thermique active
    Note over Op: Intervention physique sur le terrain (démarrage aération forcée)
    
    %% 3. Analyse et acquittement par le Responsable Pays
    Resp->>App: Accède au Dashboard pays et sélectionne le Brésil
    Resp->>App: Analyse le graphique d'historique thermique du lot concerné
    Resp->>App: Soumet une requête d'acquittement avec motif d'intervention
    
    %% 4. Validation RBAC et mise à jour
    Note over App: Vérification du JWT (Rôle 'responsable_pays' et accès pays 'bresil')
    alt Accès validé (admin ou responsable de ce pays)
        App->>App: Met à jour le statut de l'alerte (marquée comme lue)
        App-->>Resp: Affiche : Confirmation d'acquittement enregistrée
        Op->>App: Rafraîchit sa page (l'alerte est désormais archivée/invisible)
    else Accès refusé (Rôle opérateur ou pays non assigné)
        App-->>Resp: Erreur 403 (Action refusée ou Accès refusé)
    end
```
