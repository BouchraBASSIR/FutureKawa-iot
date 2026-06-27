"""
Génère 14 jours de mesures IoT historiques pour tous les backends pays actifs.
Usage : python seed_mesures.py [--pays equateur|bresil|colombie]
python3 seed_mesures.py --pays equateur

Les backends doivent être démarrés (docker compose up).
"""
import sys
import math
import random
import requests
from datetime import datetime, timedelta, timezone

BACKENDS = {
    "equateur": "http://localhost:8001",
    "bresil":   "http://localhost:8000",
    "colombie": "http://localhost:8002",
}

# Filtre optionnel
targets = sys.argv[2:] if len(sys.argv) > 2 and sys.argv[1] == "--pays" else list(BACKENDS.keys())

MESURES_PAR_JOUR = 6   # toutes les 4 heures
JOURS            = 14
NOW              = datetime.now(timezone.utc)

# Profil réaliste café : temp 18-24°C, hum 55-70%
# Quelques jours chauds pour déclencher des alertes (visuellement intéressant)
PROFIL = {
    # (temp_base, hum_base, temp_amplitude, hum_amplitude)
    "equateur": (20.0, 62.0, 3.5, 6.0),
    "bresil":   (22.0, 65.0, 4.0, 7.0),
    "colombie": (19.5, 60.0, 3.0, 5.5),
}

def valeur(base, amplitude, jour, heure, noise=0.5):
    """Courbe sinusoïdale journalière + tendance + bruit."""
    tendance  = math.sin(jour / JOURS * math.pi) * amplitude * 0.4  # pic milieu période
    journalier = math.sin((heure / 24) * 2 * math.pi - math.pi / 2) * amplitude * 0.5
    bruit      = random.gauss(0, noise)
    return round(base + tendance + journalier + bruit, 1)

total_ok  = 0
total_err = 0

for pays in targets:
    url = BACKENDS.get(pays)
    if not url:
        print(f"[!] Pays inconnu : {pays}")
        continue

    # Récupère les capteurs
    try:
        caps = requests.get(f"{url}/capteurs", timeout=3).json()
    except Exception as e:
        print(f"[✗] {pays}: impossible de joindre {url} ({e})")
        continue

    if not caps:
        print(f"[!] {pays}: aucun capteur trouvé")
        continue

    tb, hb, ta, ha = PROFIL.get(pays, (21.0, 62.0, 3.5, 6.0))
    print(f"\n[{pays.upper()}] {len(caps)} capteur(s) - {JOURS} jours × {MESURES_PAR_JOUR}/j")

    for cap in caps:
        cid   = cap["id_capteur"]
        ok    = 0
        for j in range(JOURS - 1, -1, -1):  # du plus ancien au plus récent
            for h_idx in range(MESURES_PAR_JOUR):
                heure = (h_idx * 24) // MESURES_PAR_JOUR
                dt    = NOW - timedelta(days=j, hours=24 - heure)
                temp  = valeur(tb, ta, JOURS - 1 - j, heure)
                hum   = valeur(hb, ha, JOURS - 1 - j, heure, noise=1.0)
                hum   = max(40.0, min(95.0, hum))  # bornes réalistes

                payload = {
                    "temperature": temp,
                    "humidite":    hum,
                    "id_capteur":  cid,
                    "date_mesure": dt.isoformat(),
                }
                try:
                    r = requests.post(f"{url}/mesures", json=payload, timeout=3)
                    if r.status_code == 201:
                        ok += 1
                    else:
                        total_err += 1
                except Exception:
                    total_err += 1

        total_ok += ok
        print(f"  capteur #{cid} ({cap.get('reference','?')}) → {ok} mesures insérées")

print(f"\n{'='*50}")
print(f"  Total : {total_ok} mesures créées, {total_err} erreurs")
print(f"{'='*50}")
