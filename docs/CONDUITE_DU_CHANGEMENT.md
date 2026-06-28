# Conduite du Changement - Transition vers FutureKawa IoT

## 1. Contexte & Enjeux de la Transition

Historiquement, les chefs d'entrepôts de **FutureKawa** (notamment au **Brésil**) assuraient le suivi des conditions de stockage (température et humidité) ainsi que la traçabilité des lots de café vert de manière semi-manuelle, par le biais de **tableaux Excel** mis à jour lors de relevés physiques ponctuels.

Bien que rassurante et maîtrisée par les équipes locales, cette méthode présentait des risques importants :
*   Omissions ou erreurs de saisie manuelle.
*   Absence de réactivité en cas de dérive thermique soudaine (les alertes n'étaient détectées qu'au moment du relevé physique suivant).
*   Difficulté de fournir des historiques certifiés et continus aux clients B2B premium exigeant une traçabilité parfaite.

L'introduction de la solution **FutureKawa IoT** (boîtiers ESP32 avec capteurs de température et d'humidité remontant les données automatiquement, couplés à une interface web centralisée) représente une **rupture technologique et culturelle** majeure pour les collaborateurs terrain. 

Ce document dresse le plan de conduite du changement pour accompagner cette transition de façon progressive, participative et rassurante.

---

## 2. Le Modèle de William Bridges : Accompagner les Phases de Transition

Le modèle de William Bridges se concentre sur l'aspect psychologique de la transition à travers trois phases distinctes que nous appliquons aux chefs d'entrepôt brésiliens :

```
                  [ Transition de William Bridges ]
                  
     Phase 1 : Le Lâcher-prise  ──>   Phase 2 : La Zone Neutre  ──>  Phase 3 : Le Nouveau Départ
  (Abandonner les fichiers Excel)     (Phase d'adaptation & tests)   (Ancrage de l'outil web & IoT)
```

### Phase 1 : Ending, Losing, Letting Go (La fin, la perte, le lâcher-prise)
*   **Objectif :** Aider les chefs d'entrepôts à faire le "deuil" de leurs fichiers Excel locaux et de leurs habitudes de saisie.
*   **Actions :**
    *   **Reconnaître l'importance historique de leur travail sur Excel :** Valoriser le fait que ce sont ces fichiers Excel qui ont permis le succès opérationnel jusqu'ici.
    *   **Expliquer clairement les limites intrinsèques de l'ancien modèle :** Montrer la charge mentale que représentait cette routine de relevés physiques répétés, et la vulnérabilité de l'entreprise face aux audits clients exigeants.

### Phase 2 : The Neutral Zone (La zone neutre)
*   **Objectif :** Gérer l'insécurité et l'inconfort liés à la coexistence temporaire de l'ancien et du nouveau système. Les capteurs IoT sont installés, mais l'équipe n'a pas encore totalement confiance dans les données automatiques.
*   **Actions :**
    *   **Phase pilote en double saisie limitée (1 mois) :** Autoriser les équipes à conserver Excel tout en testant le nouveau système, pour comparer les données et se rassurer sur la fiabilité des capteurs ESP32.
    *   **Ateliers d'expression des doutes :** Réunions hebdomadaires courtes avec le correspondant SI local pour désamorcer les craintes de "perte de contrôle" ou d'erreurs matérielles.

### Phase 3 : The New Beginning (Le nouveau départ)
*   **Objectif :** Ancrer les nouvelles pratiques et célébrer les réussites apportées par le suivi automatisé.
*   **Actions :**
    *   **Valorisation du gain de temps :** Mettre en avant le fait que les chefs d'entrepôts passent désormais moins de temps sur la saisie et plus de temps sur l'optimisation logistique et la qualité du grain.
    *   **Célébration des premiers succès :** Féliciter publiquement l'entrepôt pilote du Brésil pour avoir évité une perte de lot grâce à une alerte e-mail de température automatique reçue à temps.

---

## 3. Plan d'Action Structuré sur 4 Axes

Pour assurer le succès du déploiement auprès des métiers, nous déployons une stratégie globale déclinée en 4 leviers fondamentaux :

```
┌─────────────────────────────────────────────────────────────┐
│                   PLAN D'ACTION MÉTIER                      │
├───────────────┬───────────────────────────────┬─────────────┤
│ 1. INFORMER   │ Conférences de cadrage        │ Quoi &      │
│               │ & Notes explicatives          │ Pourquoi ?  │
├───────────────┼───────────────────────────────┼─────────────┤
│ 2. COMMUNIQUER│ Newsletters, Démo vidéo       │ Quel        │
│               │ & fiches avantages            │ bénéfice ?  │
├───────────────┼───────────────────────────────┼─────────────┤
│ 3. FORMER     │ Ateliers pratiques interactifs│ Comment     │
│               │ & Guides "Pas-à-Pas"          │ faire ?     │
├───────────────┼───────────────────────────────┼─────────────┤
│ 4. PARTICIPER │ Questionnaire de cadrage,     │ Co-         │
│               │ Ateliers de co-conception     │ construction│
└───────────────┴───────────────────────────────┴─────────────┘
```

### Axe 1 : INFORMER (Quoi et Pourquoi ?)
*   **Cible :** L'ensemble des collaborateurs de l'entrepôt du Brésil (Chefs d'exploitation, chefs d'entrepôt, techniciens logistiques).
*   **Actions :**
    *   **Réunion de lancement (Kick-off) :** Présentation du projet IoT par le Directeur des Opérations et la DSI pour donner du sens politique et opérationnel.
    *   **Note de cadrage écrite (en portugais) :** Distribution d'un document synthétique détaillant le calendrier du projet, les étapes d'installation des capteurs et les rôles de chacun.

### Axe 2 : COMMUNIQUER (Quels bénéfices pour eux ?)
*   **Cible :** Principalement les Chefs d'entrepôts brésiliens.
*   **Actions :**
    *   **Fiche "WIIFM" (What's In It For Me / Qu'est-ce que j'y gagne ?) :** Expliquer comment l'outil va simplifier leur quotidien (ex : *"Plus besoin d'aller relever le thermomètre à 5h du matin sous la pluie, l'ESP32 le fait tout seul. Vous recevez un e-mail uniquement s'il y a un vrai problème !"*).
    *   **Courte capsule vidéo de démonstration (2 min) :** Présenter l'interface web finale très visuelle (courbes Recharts claires, pastilles de couleur vert/orange/rouge pour les statuts des lots).

### Axe 3 : FORMER (Comment faire ?)
*   **Cible :** Les utilisateurs directs du système (Chefs d'entrepôts, équipe Qualité).
*   **Actions :**
    *   **Sessions de formation "Hands-on" :** Ateliers pratiques de 2 heures par groupes de 3-4 personnes. Manipulation directe de l'application web, simulation de pannes et gestion d'alertes réelles.
    *   **Création de fiches réflexes (Quick-Reference Guides) :** Documents plastifiés au format A4 affichés dans l'entrepôt expliquant comment lire une alerte sur le dashboard et les étapes de levée de doute.

### Axe 4 : FAIRE PARTICIPER (Co-construction & Appropriation)
*   **Cible :** Les référents métiers et key-users.
*   **Actions :**
    *   **Phase d'interview & questionnaire préalable :** Consultation directe des métiers (voir le document `questionnaire-faire-participer-client.txt`) pour intégrer leurs contraintes terrain dès la phase de spécification.
    *   **Ateliers d'adaptation ergonomique :** Permettre aux chefs d'entrepôts de choisir la fréquence de rafraîchissement idéale des graphiques et le formatage des e-mails d'alerte pour qu'ils se sentent acteurs de la conception du système.
