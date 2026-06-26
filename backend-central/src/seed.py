"""
Seed initial : crée les rôles de base et un compte admin par défaut.
Appelé au démarrage de l'application si la table est vide.
"""
import os
import logging
from sqlalchemy.orm import Session

from models import Role, Utilisateur, UtilisateurRole
from auth import hash_password

logger = logging.getLogger("backend-central")

ROLES = [
    {"libelle": "admin",            "description": "Accès total — gestion utilisateurs et configuration"},
    {"libelle": "responsable_pays", "description": "Gestion des lots et alertes pour un pays"},
    {"libelle": "operateur",        "description": "Saisie de lots pour un entrepôt assigné"},
]

DEFAULT_ADMIN = {
    "nom":          "Admin",
    "prenom":       "Central",
    "email":        os.getenv("ADMIN_EMAIL",    "admin@futurekawa.com"),
    "mot_de_passe": os.getenv("ADMIN_PASSWORD", "Admin1234!"),
}


def run_seed(db: Session) -> None:
    # Rôles
    for role_data in ROLES:
        exists = db.query(Role).filter(Role.libelle == role_data["libelle"]).first()
        if not exists:
            db.add(Role(**role_data))
            logger.info("Rôle créé : %s", role_data["libelle"])
    db.commit()

    # Admin par défaut
    admin_exists = db.query(Utilisateur).filter(
        Utilisateur.email == DEFAULT_ADMIN["email"]
    ).first()
    if not admin_exists:
        admin = Utilisateur(
            nom=DEFAULT_ADMIN["nom"],
            prenom=DEFAULT_ADMIN["prenom"],
            email=DEFAULT_ADMIN["email"],
            mot_de_passe=hash_password(DEFAULT_ADMIN["mot_de_passe"]),
            actif=True,
        )
        db.add(admin)
        db.flush()

        role_admin = db.query(Role).filter(Role.libelle == "admin").first()
        db.add(UtilisateurRole(id_utilisateur=admin.id_utilisateur, id_role=role_admin.id_role))
        db.commit()
        logger.info("Compte admin créé : %s", DEFAULT_ADMIN["email"])
    else:
        logger.info("Seed : admin déjà présent.")
