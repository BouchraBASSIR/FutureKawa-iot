# 🤖 FutureKawa - Simulateur ESP32

Ce repository contient un simulateur ESP32 + DHT11 pour le **Brésil**.
Il envoie des mesures de température et d’humidité via MQTT vers le backend FutureKawa.

---

## 📋 Prérequis

Le projet **futurekawa-backend** doit déjà être démarré.
Il expose le broker MQTT `futurekawa-mqtt` sur le réseau Docker externe `backend-pays_default`.

---

## 🚀 Lancement

Le conteneur est construit et démarré avec :

```bash
docker compose up -d --build
```

Le service Compose crée le conteneur suivant :

| Service Compose     | Conteneur Docker         | Pays   | Temp idéale | Hum idéale |
|---------------------|--------------------------|--------|-------------|------------|
| `simulateur-bresil` | `futurekawa-sim-bresil`  | Brésil | 29°C        | 55%        |

---

## 👀 Voir la sortie du simulateur

Pour suivre la sortie du conteneur en direct :

```bash
docker attach futurekawa-sim-bresil
```

Pour ouvrir un autre terminal et lire les logs sans attacher la session :

```bash
docker logs -f futurekawa-sim-bresil
```

---

## 🧪 Mode anomalie

Le script Python supporte un mode anomalie via l’argument `--anomalie`.
Ce mode force des valeurs hors seuils pour tester les alertes côté backend.

Exemple d’exécution directe :

```bash
python simulateur_esp32.py --pays bresil --broker futurekawa-mqtt --port 1883 --intervalle 10 --anomalie
```

---

## 🛑 Arrêter

```bash
docker compose stop
```

Pour tout supprimer complètement, utilise plutôt :

```bash
docker compose down
```

