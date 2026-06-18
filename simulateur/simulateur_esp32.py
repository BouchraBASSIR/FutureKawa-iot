import paho.mqtt.client as mqtt
import json
import time
import random
import argparse

# =====================
# PROFILS PAR PAYS
# Seuils officiels FutureKawa (cahier des charges)
# =====================
PAYS_CONFIG = {
    "bresil":   {"temp_ideale": 29.0, "hum_ideale": 55.0},
    "equateur": {"temp_ideale": 31.0, "hum_ideale": 60.0},
    "colombie": {"temp_ideale": 26.0, "hum_ideale": 80.0},
}

MQTT_TOPIC = "capteur/mesures"

# =====================
# SIMULATION CAPTEUR DHT11
# =====================
def simuler_mesure(temp_ideale, hum_ideale, avec_anomalie=False):
    """
    Mode normal  : légère variation naturelle autour de l'idéal (±1.5°C / ±1%)
    Mode anomalie: valeurs hors tolérance (±5°C / ±4%) -> déclenche les alertes
    """
    if avec_anomalie:
        temp = round(temp_ideale + random.uniform(4.0, 6.0) * random.choice([-1, 1]), 1)
        hum  = round(hum_ideale  + random.uniform(3.0, 5.0) * random.choice([-1, 1]), 1)
    else:
        temp = round(temp_ideale + random.uniform(-1.5, 1.5), 1)
        hum  = round(hum_ideale  + random.uniform(-1.0, 1.0), 1)
    return temp, hum

# =====================
# CALLBACKS MQTT
# =====================
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[MQTT] Connecte au broker !")
    else:
        print(f"[MQTT] Echec connexion (code: {rc})")

def on_publish(client, userdata, mid):
    pass  # silencieux, le print est dans la boucle

# =====================
# MAIN
# =====================
def main():
    parser = argparse.ArgumentParser(description="Simulateur ESP32 DHT11 - FutureKawa")
    parser.add_argument("--pays",       default="bresil",   choices=["bresil", "equateur", "colombie"],
                        help="Pays à simuler (defaut: bresil)")
    parser.add_argument("--broker",     default="localhost",
                        help="Adresse IP du broker MQTT (defaut: localhost)")
    parser.add_argument("--port",       default=1883, type=int,
                        help="Port MQTT (defaut: 1883)")
    parser.add_argument("--intervalle", default=10,   type=int,
                        help="Secondes entre chaque envoi (defaut: 10)")
    parser.add_argument("--anomalie",   action="store_true",
                        help="Simuler des valeurs hors seuils (pour tester les alertes)")
    args = parser.parse_args()

    config = PAYS_CONFIG[args.pays]

    print("=" * 50)
    print("   SIMULATEUR ESP32 + DHT11 - FutureKawa")
    print("=" * 50)
    print(f"  Pays        : {args.pays.upper()}")
    print(f"  Broker MQTT : {args.broker}:{args.port}")
    print(f"  Topic       : {MQTT_TOPIC}")
    print(f"  Intervalle  : {args.intervalle}s")
    print(f"  Mode        : {'ANOMALIE (hors seuils)' if args.anomalie else 'Normal'}")
    print(f"  Temp ideale : {config['temp_ideale']}C")
    print(f"  Hum ideale  : {config['hum_ideale']}%")
    print("=" * 50)

    # Connexion MQTT (client ID unique comme l'ESP32)
    client_id = f"esp32-capteur-{args.pays}"
    client = mqtt.Client(client_id=client_id)
    client.on_connect = on_connect
    client.on_publish = on_publish

    while True:
        try:
            print(f"\n[MQTT] Connexion a {args.broker}:{args.port}...")
            client.connect(args.broker, args.port, 60)
            client.loop_start()
            break
        except Exception as e:
            print(f"[MQTT] Erreur : {e} — retry dans 5s")
            time.sleep(5)

    # Boucle d'envoi
    compteur = 1
    try:
        while True:
            temp, hum = simuler_mesure(
                config["temp_ideale"],
                config["hum_ideale"],
                avec_anomalie=args.anomalie
            )

            payload = json.dumps({
                "temperature": temp,
                "humidite":    hum,
                "timestamp":   int(time.time() * 1000)  # comme l'ESP32 (millis)
            })

            print(f"[#{compteur:04d}] Temp: {temp}°C | Hum: {hum}% | Payload: {payload}")
            client.publish(MQTT_TOPIC, payload)
            compteur += 1
            time.sleep(args.intervalle)

    except KeyboardInterrupt:
        print("\n[INFO] Simulateur arrete (Ctrl+C).")
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()