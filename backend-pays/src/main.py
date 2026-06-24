"""
FutureKawa — Backend FastAPI pays (générique)
Configuré entièrement par variables d'environnement (PAYS, DATABASE_URL, MQTT_*, SMTP_*).
Un seul binaire — un seul docker-compose par pays.
"""
import os
import json
from sqlalchemy.exc import IntegrityError
import threading
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import paho.mqtt.client as mqtt
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from database import get_db, engine, SessionLocal
from models import Base, Config, Exploitation, Entrepot, Capteur, Mesure, Lot, AlerteMesure, AlerteLot
from auth_middleware import get_current_user, require_role, can_access_entrepot

# =====================
# INITIALISATION
# =====================

PAYS = os.getenv("PAYS", "inconnu")

app = FastAPI(title=f"FutureKawa - Backend {PAYS.capitalize()}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT   = int(os.getenv("MQTT_PORT", 1883))
MQTT_TOPIC  = "capteur/mesures"

# =====================
# CONFIG EMAIL — 100% depuis variables d'environnement
# =====================
SMTP_SERVER     = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT       = int(os.getenv("SMTP_PORT", 587))
SENDER_EMAIL    = os.getenv("SENDER_EMAIL", "")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD", "")


# =====================
# PYDANTIC MODELS
# =====================

# -- Config --
class ConfigCreate(BaseModel):
    pays                    : str
    temp_ideale             : float
    hum_ideale              : float
    tolerance_temp          : float
    tolerance_hum           : float
    email_destinataire      : str
    intervalle_verification : int


class ConfigUpdate(BaseModel):
    pays                    : Optional[str]   = None
    temp_ideale             : Optional[float] = None
    hum_ideale              : Optional[float] = None
    tolerance_temp          : Optional[float] = None
    tolerance_hum           : Optional[float] = None
    email_destinataire      : Optional[str]   = None
    intervalle_verification : Optional[int]   = None


# -- Exploitation --
class ExploitationCreate(BaseModel):
    nom       : str
    id_config : int


class ExploitationUpdate(BaseModel):
    nom       : Optional[str] = None
    id_config : Optional[int] = None


# -- Entrepot --
class EntrepotCreate(BaseModel):
    nom             : str
    localisation    : str
    id_exploitation : int


class EntrepotUpdate(BaseModel):
    nom             : Optional[str] = None
    localisation    : Optional[str] = None
    id_exploitation : Optional[int] = None


# -- Capteur --
class CapteurCreate(BaseModel):
    type_capteur : str
    reference    : str
    statut       : Optional[str] = "actif"
    id_entrepot  : int


class CapteurUpdate(BaseModel):
    type_capteur : Optional[str] = None
    reference    : Optional[str] = None
    statut       : Optional[str] = None
    id_entrepot  : Optional[int] = None


# -- Mesure --
class MesureCreate(BaseModel):
    temperature : float
    humidite    : float
    id_capteur  : int


# -- Lot --
class LotCreate(BaseModel):
    id_lot        : str
    id_entrepot   : int
    date_stockage : Optional[datetime] = None


# =====================
# ENVOI EMAIL
# =====================
def send_email(receiver_email, subject, body):
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("SENDER_EMAIL ou SENDER_PASSWORD non definis — email non envoye")
        return

    try:
        msg = MIMEMultipart()
        msg['From']    = SENDER_EMAIL
        msg['To']      = receiver_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, receiver_email, msg.as_string())
        print("E-mail envoye avec succes !")
        server.quit()

    except Exception as e:
        print(f"Erreur envoi email : {e}")


# =====================
# VÉRIFICATION ALERTES MESURES
# Chaîne : mesure → capteur → entrepot → exploitation → config
# =====================
def verifier_alertes_mesures(id_mesure, temperature, humidite):
    db = SessionLocal()
    try:
        mesure = db.query(Mesure).filter(Mesure.id_mesure == id_mesure).first()
        if not mesure:
            return

        capteur = db.query(Capteur).filter(Capteur.id_capteur == mesure.id_capteur).first()
        if not capteur:
            return

        entrepot = db.query(Entrepot).filter(Entrepot.id_entrepot == capteur.id_entrepot).first()
        if not entrepot:
            return

        exploitation = db.query(Exploitation).filter(
            Exploitation.id_exploitation == entrepot.id_exploitation
        ).first()
        if not exploitation:
            return

        config = db.query(Config).filter(Config.id_config == exploitation.id_config).first()
        if not config:
            return

        alertes_email = []

        # Vérif température
        if temperature < (config.temp_ideale - config.tolerance_temp) or \
           temperature > (config.temp_ideale + config.tolerance_temp):

            alerte = AlerteMesure(
                type_alerte    = "temperature",
                message        = (
                    f"Temperature anormale : {temperature}C "
                    f"(ideal: {config.temp_ideale}C "
                    f"+/- {config.tolerance_temp}C)"
                ),
                valeur_mesuree = temperature,
                seuil_min      = config.temp_ideale - config.tolerance_temp,
                seuil_max      = config.temp_ideale + config.tolerance_temp,
                date_alerte    = datetime.utcnow(),
                statut         = "non_lue",
                id_mesure      = id_mesure
            )
            db.add(alerte)
            db.commit()
            alertes_email.append(
                f"- Temperature: {temperature}C "
                f"(ideal: {config.temp_ideale}C "
                f"+/- {config.tolerance_temp}C)"
            )

        # Vérif humidité
        if humidite < (config.hum_ideale - config.tolerance_hum) or \
           humidite > (config.hum_ideale + config.tolerance_hum):

            alerte = AlerteMesure(
                type_alerte    = "humidite",
                message        = (
                    f"Humidite anormale : {humidite}% "
                    f"(ideal: {config.hum_ideale}% "
                    f"+/- {config.tolerance_hum}%)"
                ),
                valeur_mesuree = humidite,
                seuil_min      = config.hum_ideale - config.tolerance_hum,
                seuil_max      = config.hum_ideale + config.tolerance_hum,
                date_alerte    = datetime.utcnow(),
                statut         = "non_lue",
                id_mesure      = id_mesure
            )
            db.add(alerte)
            db.commit()
            alertes_email.append(
                f"- Humidite: {humidite}% "
                f"(ideal: {config.hum_ideale}% "
                f"+/- {config.tolerance_hum}%)"
            )

        if alertes_email:
            details = "\n".join(alertes_email)
            body = (
                f"Bonjour,\n\n"
                f"Une anomalie a ete detectee dans les conditions de stockage.\n\n"
                f"Details de l'alerte :\n{details}\n\n"
                f"Pays : {config.pays}\n"
                f"Date : {datetime.utcnow()}\n\n"
                f"Veuillez consulter le tableau de bord pour plus de details.\n\n"
                f"Cordialement,\nL'equipe FutureKawa"
            )
            send_email(
                config.email_destinataire,
                "ALERTE : Anomalie detectee dans les conditions de stockage !",
                body
            )

    finally:
        db.close()


# =====================
# VÉRIFICATION ALERTES LOTS
# =====================
def verifier_alertes_lots():
    db = SessionLocal()
    try:
        limite       = datetime.utcnow() - timedelta(days=365)
        lots_anciens = db.query(Lot).filter(
            Lot.date_stockage < limite,
            Lot.statut != "perime"
        ).all()

        for lot in lots_anciens:
            lot.statut = "perime"
            alerte = AlerteLot(
                message     = (
                    f"Lot {lot.id_lot} perime — stocke depuis "
                    f"{lot.date_stockage.strftime('%Y-%m-%d')}"
                ),
                id_lot      = lot.id_lot,
                date_alerte = datetime.utcnow(),
                statut      = "non_lue"
            )
            db.add(alerte)

        if lots_anciens:
            db.commit()
            ids = [lot.id_lot for lot in lots_anciens]
            print(f"{len(ids)} lot(s) marques perimes : {ids}")

            # Récupérer le destinataire via la chaîne du premier lot
            premier_lot = lots_anciens[0]
            entrepot = db.query(Entrepot).filter(
                Entrepot.id_entrepot == premier_lot.id_entrepot
            ).first()
            email_dest = "admin@futurekawa.com"
            pays_label = "inconnu"

            if entrepot:
                exploitation = db.query(Exploitation).filter(
                    Exploitation.id_exploitation == entrepot.id_exploitation
                ).first()
                if exploitation:
                    config = db.query(Config).filter(
                        Config.id_config == exploitation.id_config
                    ).first()
                    if config:
                        email_dest = config.email_destinataire
                        pays_label = config.pays

            body = (
                f"Bonjour,\n\n"
                f"Les lots suivants ont depasse la duree maximale de stockage (365 jours) :\n\n"
                + "\n".join(f"- {lot.id_lot}" for lot in lots_anciens) +
                f"\n\nPays : {pays_label}\n"
                f"Date : {datetime.utcnow()}\n\n"
                f"Veuillez prendre les mesures necessaires.\n\n"
                f"Cordialement,\nL'equipe FutureKawa"
            )
            send_email(email_dest, "ALERTE : Lots perimes detectes !", body)

    finally:
        db.close()


# =====================
# MQTT — RECEPTION MESURES
# =====================
def on_message(client, userdata, msg):
    try:
        payload    = json.loads(msg.payload.decode())
        temperature = payload.get("temperature")
        humidite    = payload.get("humidite")
        capteur_id  = payload.get("capteur_id")

        if temperature is None or humidite is None or capteur_id is None:
            print(f"Payload MQTT invalide : {payload}")
            return

        db = SessionLocal()
        try:
            capteur = db.query(Capteur).filter(Capteur.id_capteur == capteur_id).first()
            if not capteur:
                print(f"Capteur {capteur_id} non trouve en BDD")
                return

            mesure = Mesure(
                temperature = temperature,
                humidite    = humidite,
                date_mesure = datetime.utcnow(),
                id_capteur  = capteur_id
            )
            db.add(mesure)
            db.commit()
            db.refresh(mesure)
            print(f"Mesure MQTT sauvegardee : id={mesure.id_mesure} temp={temperature} hum={humidite}")
        finally:
            db.close()

        verifier_alertes_mesures(mesure.id_mesure, temperature, humidite)

    except Exception as e:
        print(f"Erreur traitement message MQTT : {e}")


def demarrer_mqtt():
    while True:
        try:
            client = mqtt.Client()
            client.on_message = on_message
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            client.subscribe(MQTT_TOPIC)
            print(f"MQTT connecte sur {MQTT_BROKER}:{MQTT_PORT} — topic: {MQTT_TOPIC}")
            client.loop_forever()
        except Exception as e:
            print(f"MQTT echec connexion : {e} - retry dans 5s")
            time.sleep(5)


# =====================
# TÂCHE PÉRIODIQUE — VÉRIFICATION LOTS
# =====================
def tache_periodique():
    while True:
        db = SessionLocal()
        try:
            config = db.query(Config).first()
            intervalle = config.intervalle_verification if config else 3600
        finally:
            db.close()
        time.sleep(intervalle)
        print("Tache periodique : verification des lots...")
        verifier_alertes_lots()


threading.Thread(target=demarrer_mqtt,    daemon=True).start()
threading.Thread(target=tache_periodique, daemon=True).start()

# ── Santé ─────────────────────────────────────────────────────────────────────

@app.get("/")
def accueil():
    return {"message": f"FutureKawa Backend {PAYS.capitalize()} - API en ligne"}


# ── Config ───────────────────────────────────────────────────
@app.post("/config")
def creer_config(config: ConfigCreate, db: Session = Depends(get_db)):
    existing = db.query(Config).first()
    if existing:
        raise HTTPException(status_code=400, detail="Config existe deja - utilisez PUT /config")

    nouvelle_config = Config(
        pays                    = config.pays,
        temp_ideale             = config.temp_ideale,
        hum_ideale              = config.hum_ideale,
        tolerance_temp          = config.tolerance_temp,
        tolerance_hum           = config.tolerance_hum,
        email_destinataire      = config.email_destinataire,
        intervalle_verification = config.intervalle_verification
    )
    db.add(nouvelle_config)
    db.commit()
    db.refresh(nouvelle_config)
    return nouvelle_config


@app.get("/config")
def get_config_api(db: Session = Depends(get_db)):
    config = db.query(Config).first()
    if not config:
        raise HTTPException(status_code=404, detail="Aucune config - utilisez POST /config")
    return config


@app.put("/config")
def update_config(config: ConfigUpdate, db: Session = Depends(get_db)):
    existing = db.query(Config).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Aucune config - utilisez POST /config")

    if config.pays                    is not None: existing.pays                    = config.pays
    if config.temp_ideale             is not None: existing.temp_ideale             = config.temp_ideale
    if config.hum_ideale              is not None: existing.hum_ideale              = config.hum_ideale
    if config.tolerance_temp          is not None: existing.tolerance_temp          = config.tolerance_temp
    if config.tolerance_hum           is not None: existing.tolerance_hum           = config.tolerance_hum
    if config.email_destinataire      is not None: existing.email_destinataire      = config.email_destinataire
    if config.intervalle_verification is not None: existing.intervalle_verification = config.intervalle_verification

    db.commit()
    db.refresh(existing)
    return {"message": "Config mise a jour", "config": existing}


# ── Exploitations ────────────────────────────────────────────
@app.post("/exploitations", status_code=status.HTTP_201_CREATED)
def creer_exploitation(data: ExploitationCreate, db: Session = Depends(get_db)):
    config = db.query(Config).filter(Config.id_config == data.id_config).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config introuvable")

    exploitation = Exploitation(nom=data.nom, id_config=data.id_config)
    db.add(exploitation)
    db.commit()
    db.refresh(exploitation)
    return exploitation


@app.get("/exploitations")
def get_exploitations(db: Session = Depends(get_db)):
    return db.query(Exploitation).all()


@app.get("/exploitations/{id_exploitation}")
def get_exploitation(id_exploitation: int, db: Session = Depends(get_db)):
    exploitation = db.query(Exploitation).filter(
        Exploitation.id_exploitation == id_exploitation
    ).first()
    if not exploitation:
        raise HTTPException(status_code=404, detail="Exploitation non trouvee")
    return exploitation


@app.put("/exploitations/{id_exploitation}")
def update_exploitation(id_exploitation: int, data: ExploitationUpdate, db: Session = Depends(get_db)):
    exploitation = db.query(Exploitation).filter(
        Exploitation.id_exploitation == id_exploitation
    ).first()
    if not exploitation:
        raise HTTPException(status_code=404, detail="Exploitation non trouvee")

    if data.nom       is not None: exploitation.nom       = data.nom
    if data.id_config is not None: exploitation.id_config = data.id_config
    db.commit()
    db.refresh(exploitation)
    return exploitation


@app.delete("/exploitations/{id_exploitation}")
def supprimer_exploitation(id_exploitation: int, db: Session = Depends(get_db)):
    exploitation = db.query(Exploitation).filter(
        Exploitation.id_exploitation == id_exploitation
    ).first()
    if not exploitation:
        raise HTTPException(status_code=404, detail="Exploitation non trouvee")
    db.delete(exploitation)
    db.commit()
    return {"message": "Exploitation supprimee"}


# ── Entrepots ────────────────────────────────────────────────
@app.post("/entrepots", status_code=status.HTTP_201_CREATED)
def creer_entrepot(data: EntrepotCreate, db: Session = Depends(get_db)):
    exploitation = db.query(Exploitation).filter(
        Exploitation.id_exploitation == data.id_exploitation
    ).first()
    if not exploitation:
        raise HTTPException(status_code=404, detail="Exploitation introuvable")

    entrepot = Entrepot(
        nom=data.nom,
        localisation=data.localisation,
        id_exploitation=data.id_exploitation
    )
    db.add(entrepot)
    db.commit()
    db.refresh(entrepot)
    return entrepot


@app.get("/entrepots")
def get_entrepots(db: Session = Depends(get_db)):
    return db.query(Entrepot).all()


@app.get("/entrepots/{id_entrepot}")
def get_entrepot(id_entrepot: int, db: Session = Depends(get_db)):
    entrepot = db.query(Entrepot).filter(Entrepot.id_entrepot == id_entrepot).first()
    if not entrepot:
        raise HTTPException(status_code=404, detail="Entrepot non trouve")
    return entrepot


@app.put("/entrepots/{id_entrepot}")
def update_entrepot(id_entrepot: int, data: EntrepotUpdate, db: Session = Depends(get_db)):
    entrepot = db.query(Entrepot).filter(Entrepot.id_entrepot == id_entrepot).first()
    if not entrepot:
        raise HTTPException(status_code=404, detail="Entrepot non trouve")

    if data.nom             is not None: entrepot.nom             = data.nom
    if data.localisation    is not None: entrepot.localisation    = data.localisation
    if data.id_exploitation is not None: entrepot.id_exploitation = data.id_exploitation
    db.commit()
    db.refresh(entrepot)
    return entrepot


@app.delete("/entrepots/{id_entrepot}")
def supprimer_entrepot(id_entrepot: int, db: Session = Depends(get_db)):
    entrepot = db.query(Entrepot).filter(Entrepot.id_entrepot == id_entrepot).first()
    if not entrepot:
        raise HTTPException(status_code=404, detail="Entrepot non trouve")
    db.delete(entrepot)
    db.commit()
    return {"message": "Entrepot supprime"}


# ── Capteurs ─────────────────────────────────────────────────
@app.post("/capteurs", status_code=status.HTTP_201_CREATED)
def creer_capteur(data: CapteurCreate, db: Session = Depends(get_db)):
    entrepot = db.query(Entrepot).filter(Entrepot.id_entrepot == data.id_entrepot).first()
    if not entrepot:
        raise HTTPException(status_code=404, detail="Entrepot introuvable")

    capteur = Capteur(
        type_capteur = data.type_capteur,
        reference    = data.reference,
        statut       = data.statut or "actif",
        id_entrepot  = data.id_entrepot
    )
    db.add(capteur)
    db.commit()
    db.refresh(capteur)
    return capteur


@app.get("/capteurs")
def get_capteurs(db: Session = Depends(get_db)):
    return db.query(Capteur).all()


@app.get("/capteurs/{id_capteur}")
def get_capteur(id_capteur: int, db: Session = Depends(get_db)):
    capteur = db.query(Capteur).filter(Capteur.id_capteur == id_capteur).first()
    if not capteur:
        raise HTTPException(status_code=404, detail="Capteur non trouve")
    return capteur


@app.put("/capteurs/{id_capteur}")
def update_capteur(id_capteur: int, data: CapteurUpdate, db: Session = Depends(get_db)):
    capteur = db.query(Capteur).filter(Capteur.id_capteur == id_capteur).first()
    if not capteur:
        raise HTTPException(status_code=404, detail="Capteur non trouve")

    if data.type_capteur is not None: capteur.type_capteur = data.type_capteur
    if data.reference    is not None: capteur.reference    = data.reference
    if data.statut       is not None: capteur.statut       = data.statut
    if data.id_entrepot  is not None: capteur.id_entrepot  = data.id_entrepot
    db.commit()
    db.refresh(capteur)
    return capteur


@app.delete("/capteurs/{id_capteur}")
def supprimer_capteur(id_capteur: int, db: Session = Depends(get_db)):
    capteur = db.query(Capteur).filter(Capteur.id_capteur == id_capteur).first()
    if not capteur:
        raise HTTPException(status_code=404, detail="Capteur non trouve")
    db.delete(capteur)
    db.commit()
    return {"message": "Capteur supprime"}


# ── Mesures ──────────────────────────────────────────────────
@app.get("/mesures")
def get_mesures(db: Session = Depends(get_db)):
    return db.query(Mesure).order_by(Mesure.date_mesure.desc()).all()


@app.post("/mesures", status_code=status.HTTP_201_CREATED)
def creer_mesure(data: MesureCreate, db: Session = Depends(get_db)):
    capteur = db.query(Capteur).filter(Capteur.id_capteur == data.id_capteur).first()
    if not capteur:
        raise HTTPException(status_code=404, detail="Capteur introuvable")

    nouvelle_mesure = Mesure(
        temperature = data.temperature,
        humidite    = data.humidite,
        date_mesure = datetime.utcnow(),
        id_capteur  = data.id_capteur
    )
    db.add(nouvelle_mesure)
    db.commit()
    db.refresh(nouvelle_mesure)

    verifier_alertes_mesures(nouvelle_mesure.id_mesure, data.temperature, data.humidite)
    return nouvelle_mesure


@app.get("/mesures/dernieres/{n}")
def get_dernieres_mesures(n: int, db: Session = Depends(get_db)):
    return db.query(Mesure).order_by(Mesure.date_mesure.desc()).limit(n).all()


@app.get("/mesures/derniers-jours/{jours}")
def get_mesures_derniers_jours(jours: int, db: Session = Depends(get_db)):
    limite = datetime.utcnow() - timedelta(days=jours)
    return db.query(Mesure).filter(
        Mesure.date_mesure >= limite
    ).order_by(Mesure.date_mesure.asc()).all()


@app.get("/mesures/par-entrepot/{id_entrepot}")
def get_mesures_par_entrepot(id_entrepot: int, db: Session = Depends(get_db)):
    capteurs = db.query(Capteur).filter(Capteur.id_entrepot == id_entrepot).all()
    capteur_ids = [c.id_capteur for c in capteurs]
    return db.query(Mesure).filter(
        Mesure.id_capteur.in_(capteur_ids)
    ).order_by(Mesure.date_mesure.desc()).all()


# ── Lots ─────────────────────────────────────────────────────
@app.post("/lots", status_code=status.HTTP_201_CREATED)
def creer_lot(
    lot: LotCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    entrepot = db.query(Entrepot).filter(Entrepot.id_entrepot == lot.id_entrepot).first()
    if not entrepot:
        raise HTTPException(status_code=404, detail="Entrepot introuvable")

    if not can_access_entrepot(lot.id_entrepot, current_user):
        raise HTTPException(status_code=403, detail="Accès non autorisé à cet entrepôt")

    nouveau_lot = Lot(
        id_lot         = lot.id_lot,
        id_entrepot    = lot.id_entrepot,
        id_utilisateur = int(current_user["sub"]),
        date_stockage  = lot.date_stockage or datetime.utcnow(),
        statut         = "conforme"
    )
    db.add(nouveau_lot)
    try:
        db.commit()
        db.refresh(nouveau_lot)
        return nouveau_lot
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Un lot avec cet identifiant existe deja.")


@app.get("/lots")
def get_lots(db: Session = Depends(get_db)):
    return db.query(Lot).order_by(Lot.date_stockage.asc()).all()


@app.get("/lots/alertes/liste")
def get_lots_alertes(db: Session = Depends(get_db)):
    return db.query(Lot).filter(Lot.statut != "conforme").all()


@app.get("/lots/{lot_id}")
def get_lot(lot_id: str, db: Session = Depends(get_db)):
    lot = db.query(Lot).filter(Lot.id_lot == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot non trouve")
    return lot


@app.put("/lots/{lot_id}/statut")
def update_statut(lot_id: str, statut: str, db: Session = Depends(get_db)):
    lot = db.query(Lot).filter(Lot.id_lot == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot non trouve")
    lot.statut = statut
    db.commit()
    db.refresh(lot)
    return lot


@app.get("/lots/{lot_id}/mesures")
def get_lot_mesures(lot_id: str, db: Session = Depends(get_db)):
    """Historique température/humidité depuis la date de stockage du lot."""
    lot = db.query(Lot).filter(Lot.id_lot == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot non trouve")

    capteurs = db.query(Capteur).filter(Capteur.id_entrepot == lot.id_entrepot).all()
    capteur_ids = [c.id_capteur for c in capteurs]

    return db.query(Mesure).filter(
        Mesure.id_capteur.in_(capteur_ids),
        Mesure.date_mesure >= lot.date_stockage
    ).order_by(Mesure.date_mesure.asc()).all()


# ── Alertes Mesures ──────────────────────────────────────────
@app.get("/alertes-mesures")
def get_alertes_mesures(db: Session = Depends(get_db)):
    return db.query(AlerteMesure).order_by(AlerteMesure.date_alerte.desc()).all()


@app.post("/alertes-mesures", status_code=status.HTTP_201_CREATED)
def creer_alerte_mesure(data: dict, db: Session = Depends(get_db)):
    nouvelle_alerte = AlerteMesure(
        type_alerte    = data.get("type_alerte"),
        message        = data.get("message"),
        valeur_mesuree = data.get("valeur_mesuree"),
        seuil_min      = data.get("seuil_min"),
        seuil_max      = data.get("seuil_max"),
        id_mesure      = data.get("id_mesure"),
        date_alerte    = datetime.utcnow(),
        statut         = "non_lue"
    )
    db.add(nouvelle_alerte)
    db.commit()
    db.refresh(nouvelle_alerte)
    return nouvelle_alerte


@app.get("/alertes-mesures/non-lues")
def get_alertes_mesures_non_lues(db: Session = Depends(get_db)):
    return db.query(AlerteMesure).filter(
        AlerteMesure.statut == "non_lue"
    ).order_by(AlerteMesure.date_alerte.desc()).all()


@app.put("/alertes-mesures/{alerte_id}/lue")
def marquer_alerte_mesure_lue(alerte_id: int, db: Session = Depends(get_db)):
    alerte = db.query(AlerteMesure).filter(
        AlerteMesure.id_alerte_mesure == alerte_id
    ).first()
    if not alerte:
        raise HTTPException(status_code=404, detail="Alerte mesure non trouvee")
    alerte.statut = "lue"
    db.commit()
    db.refresh(alerte)
    return alerte


@app.put("/alertes-mesures/toutes/lues")
def marquer_toutes_alertes_mesures_lues(db: Session = Depends(get_db)):
    db.query(AlerteMesure).filter(
        AlerteMesure.statut == "non_lue"
    ).update({"statut": "lue"})
    db.commit()
    return {"message": "Toutes les alertes mesure marquees comme lues"}


@app.delete("/alertes-mesures/{alerte_id}")
def supprimer_alerte_mesure(alerte_id: int, db: Session = Depends(get_db)):
    alerte = db.query(AlerteMesure).filter(
        AlerteMesure.id_alerte_mesure == alerte_id
    ).first()
    if not alerte:
        raise HTTPException(status_code=404, detail="Alerte mesure non trouvee")
    db.delete(alerte)
    db.commit()
    return {"message": "Alerte mesure supprimee"}


@app.delete("/alertes-mesures")
def supprimer_toutes_alertes_mesures(db: Session = Depends(get_db)):
    db.query(AlerteMesure).delete()
    db.commit()
    return {"message": "Toutes les alertes mesure supprimees"}


# ── Alertes Lots ─────────────────────────────────────────────
@app.get("/alertes-lots")
def get_alertes_lots(db: Session = Depends(get_db)):
    return db.query(AlerteLot).order_by(AlerteLot.date_alerte.desc()).all()


@app.post("/alertes-lots", status_code=status.HTTP_201_CREATED)
def creer_alerte_lot(data: dict, db: Session = Depends(get_db)):
    nouvelle_alerte = AlerteLot(
        message     = data.get("message"),
        id_lot      = data.get("id_lot"),
        date_alerte = datetime.utcnow(),
        statut      = "non_lue"
    )
    db.add(nouvelle_alerte)
    db.commit()
    db.refresh(nouvelle_alerte)
    return nouvelle_alerte


@app.get("/alertes-lots/non-lues")
def get_alertes_lots_non_lues(db: Session = Depends(get_db)):
    return db.query(AlerteLot).filter(
        AlerteLot.statut == "non_lue"
    ).order_by(AlerteLot.date_alerte.desc()).all()


@app.put("/alertes-lots/{alerte_id}/lue")
def marquer_alerte_lot_lue(alerte_id: int, db: Session = Depends(get_db)):
    alerte = db.query(AlerteLot).filter(AlerteLot.id_alerte_lot == alerte_id).first()
    if not alerte:
        raise HTTPException(status_code=404, detail="Alerte lot non trouvee")
    alerte.statut = "lue"
    db.commit()
    db.refresh(alerte)
    return alerte


@app.put("/alertes-lots/toutes/lues")
def marquer_toutes_alertes_lots_lues(db: Session = Depends(get_db)):
    db.query(AlerteLot).filter(
        AlerteLot.statut == "non_lue"
    ).update({"statut": "lue"})
    db.commit()
    return {"message": "Toutes les alertes lot marquees comme lues"}


@app.delete("/alertes-lots/{alerte_id}")
def supprimer_alerte_lot(alerte_id: int, db: Session = Depends(get_db)):
    alerte = db.query(AlerteLot).filter(AlerteLot.id_alerte_lot == alerte_id).first()
    if not alerte:
        raise HTTPException(status_code=404, detail="Alerte lot non trouvee")
    db.delete(alerte)
    db.commit()
    return {"message": "Alerte lot supprimee"}


@app.delete("/alertes-lots")
def supprimer_toutes_alertes_lots(db: Session = Depends(get_db)):
    db.query(AlerteLot).delete()
    db.commit()
    return {"message": "Toutes les alertes lot supprimees"}


# ── Alertes combinées ────────────────────────────────────────
@app.get("/alertes")
def get_toutes_alertes(db: Session = Depends(get_db)):
    mesures = db.query(AlerteMesure).order_by(AlerteMesure.date_alerte.desc()).all()
    lots    = db.query(AlerteLot).order_by(AlerteLot.date_alerte.desc()).all()
    return {"alertes_mesures": mesures, "alertes_lots": lots}


@app.get("/alertes/count")
def get_alertes_count(db: Session = Depends(get_db)):
    total_mesures    = db.query(AlerteMesure).count()
    non_lues_mesures = db.query(AlerteMesure).filter(AlerteMesure.statut == "non_lue").count()
    total_lots       = db.query(AlerteLot).count()
    non_lues_lots    = db.query(AlerteLot).filter(AlerteLot.statut == "non_lue").count()
    return {
        "total_mesures":    total_mesures,
        "non_lues_mesures": non_lues_mesures,
        "total_lots":       total_lots,
        "non_lues_lots":    non_lues_lots,
        "total":            total_mesures + total_lots,
        "non_lues":         non_lues_mesures + non_lues_lots
    }


@app.put("/alertes/toutes/lues")
def marquer_toutes_alertes_lues(db: Session = Depends(get_db)):
    db.query(AlerteMesure).filter(AlerteMesure.statut == "non_lue").update({"statut": "lue"})
    db.query(AlerteLot).filter(AlerteLot.statut == "non_lue").update({"statut": "lue"})
    db.commit()
    return {"message": "Toutes les alertes marquees comme lues"}


@app.delete("/alertes")
def supprimer_toutes_alertes(db: Session = Depends(get_db)):
    db.query(AlerteMesure).delete()
    db.query(AlerteLot).delete()
    db.commit()
    return {"message": "Toutes les alertes supprimees"}


# ── Stats dashboard ──────────────────────────────────────────
@app.get("/stats/dashboard")
def get_stats_dashboard(db: Session = Depends(get_db)):
    config = db.query(Config).first()

    total_lots    = db.query(Lot).count()
    conforme_lots = db.query(Lot).filter(Lot.statut == "conforme").count()
    alerte_lots   = db.query(Lot).filter(Lot.statut == "en_alerte").count()
    perime_lots   = db.query(Lot).filter(Lot.statut == "perime").count()

    non_lues_mesures = db.query(AlerteMesure).filter(AlerteMesure.statut == "non_lue").count()
    non_lues_lots    = db.query(AlerteLot).filter(AlerteLot.statut == "non_lue").count()

    mesures = db.query(Mesure).order_by(Mesure.date_mesure.desc()).limit(500).all()
    if mesures:
        temp_moy = sum(m.temperature for m in mesures) / len(mesures)
        hum_moy  = sum(m.humidite    for m in mesures) / len(mesures)
    else:
        temp_moy = hum_moy = 0

    return {
        "pays":             config.pays if config else "inconnu",
        "total_lots":       total_lots,
        "conforme_lots":    conforme_lots,
        "alerte_lots":      alerte_lots,
        "perime_lots":      perime_lots,
        "alertes_actives":  non_lues_mesures + non_lues_lots,
        "temp_moyenne":     round(temp_moy, 1),
        "humidite_moyenne": round(hum_moy, 1),
    }


