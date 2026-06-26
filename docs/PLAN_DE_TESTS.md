[[TODO]] 
Lister scénarios concrets :
           1. Test Unitaire : Calcul des alertes de température (ex: envoyer 35^\circC au Brésil →
              statut attendu: "ALERTE").
           2. Test d'Intégration API : Enregistrer un lot via la route POST et vérifier sa présence en
              BDD SQL.
           3. Test de Flux IoT : Le simulateur publie sur MQTT → l'API consomme et stocke en BDD.
