"""
FutureKawa - Modèles SQLAlchemy pour le backend central.
Gère uniquement les utilisateurs, rôles et leurs accès pays/entrepôts.
Les données IoT (lots, mesures, alertes) restent dans les backends pays.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Utilisateur(Base):
    __tablename__ = "utilisateur"

    id_utilisateur = Column(Integer, primary_key=True, autoincrement=True)
    nom            = Column(String,  nullable=False)
    prenom         = Column(String,  nullable=False)
    email          = Column(String,  unique=True, nullable=False, index=True)
    mot_de_passe   = Column(String,  nullable=False)  # hash bcrypt
    actif          = Column(Boolean, default=True, nullable=False)

    roles   = relationship("UtilisateurRole", back_populates="utilisateur", cascade="all, delete-orphan")
    accesses = relationship("UserAccess",     back_populates="utilisateur", cascade="all, delete-orphan")


class Role(Base):
    __tablename__ = "role"

    id_role     = Column(Integer, primary_key=True, autoincrement=True)
    libelle     = Column(String,  unique=True, nullable=False)
    description = Column(String,  nullable=True)

    utilisateur_roles = relationship("UtilisateurRole", back_populates="role")


class UtilisateurRole(Base):
    __tablename__ = "utilisateur_role"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    id_utilisateur = Column(Integer, ForeignKey("utilisateur.id_utilisateur", ondelete="CASCADE"), nullable=False)
    id_role        = Column(Integer, ForeignKey("role.id_role",               ondelete="CASCADE"), nullable=False)

    utilisateur = relationship("Utilisateur", back_populates="roles")
    role        = relationship("Role",        back_populates="utilisateur_roles")


class UserAccess(Base):
    """
    Accès d'un utilisateur à un pays, une exploitation et/ou un entrepôt.
    Les IDs exploitation/entrepôt sont des références souples vers les backends pays
    (pas de FK cross-base - on stocke les identifiants entiers tels quels).
    """
    __tablename__ = "user_access"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    id_utilisateur   = Column(Integer, ForeignKey("utilisateur.id_utilisateur", ondelete="CASCADE"), nullable=False)
    pays             = Column(String,  nullable=False)   # "bresil" | "equateur" | "colombie"
    exploitation_id  = Column(Integer, nullable=True)   # id_exploitation dans backend-pays
    entrepot_id      = Column(Integer, nullable=True)   # id_entrepot dans backend-pays

    utilisateur = relationship("Utilisateur", back_populates="accesses")
