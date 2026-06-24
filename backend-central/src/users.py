"""
Router : gestion des utilisateurs (admin only).
Endpoints consommés par la page /admin/utilisateurs du frontend.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from database import get_db
from models import Utilisateur, Role, UtilisateurRole, UserAccess
from auth import hash_password, get_current_user, require_role

router = APIRouter(prefix="/api/central/users", tags=["Utilisateurs"])

admin_only = require_role("admin")


# ── Schémas ──────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    nom: str
    prenom: str
    email: str
    mot_de_passe: str
    actif: bool = True


class UserUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[str] = None
    actif: Optional[bool] = None
    mot_de_passe: Optional[str] = None


class RoleAssign(BaseModel):
    id_role: int


class AccessAssign(BaseModel):
    pays: str
    exploitation_id: Optional[int] = None
    entrepot_id: Optional[int] = None


def _serialize_user(user: Utilisateur) -> dict:
    return {
        "id_utilisateur": user.id_utilisateur,
        "nom":            user.nom,
        "prenom":         user.prenom,
        "email":          user.email,
        "actif":          user.actif,
        "roles": [
            {"id_role": ur.role.id_role, "libelle": ur.role.libelle}
            for ur in user.roles
        ],
        "accesses": [
            {
                "id":              a.id,
                "pays":            a.pays,
                "exploitation_id": a.exploitation_id,
                "entrepot_id":     a.entrepot_id,
            }
            for a in user.accesses
        ],
    }


# ── Utilisateurs ──────────────────────────────────────────────────────────────

@router.get("", dependencies=[Depends(admin_only)])
def list_users(db: Session = Depends(get_db)):
    users = db.query(Utilisateur).all()
    return [_serialize_user(u) for u in users]


@router.get("/me/profile")
def my_profile(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(
        Utilisateur.id_utilisateur == int(current_user["sub"])
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return _serialize_user(user)


@router.get("/{user_id}", dependencies=[Depends(admin_only)])
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.id_utilisateur == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return _serialize_user(user)


@router.post("", status_code=201, dependencies=[Depends(admin_only)])
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(Utilisateur).filter(Utilisateur.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email déjà utilisé")
    user = Utilisateur(
        nom=body.nom,
        prenom=body.prenom,
        email=body.email,
        mot_de_passe=hash_password(body.mot_de_passe),
        actif=body.actif,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize_user(user)


@router.put("/{user_id}", dependencies=[Depends(admin_only)])
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.id_utilisateur == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if body.nom is not None:
        user.nom = body.nom
    if body.prenom is not None:
        user.prenom = body.prenom
    if body.email is not None:
        user.email = body.email
    if body.actif is not None:
        user.actif = body.actif
    if body.mot_de_passe:
        user.mot_de_passe = hash_password(body.mot_de_passe)
    db.commit()
    db.refresh(user)
    return _serialize_user(user)


@router.delete("/{user_id}", status_code=204, dependencies=[Depends(admin_only)])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.id_utilisateur == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    db.delete(user)
    db.commit()


# ── Rôles ─────────────────────────────────────────────────────────────────────

@router.get("/roles/list", dependencies=[Depends(admin_only)])
def list_roles(db: Session = Depends(get_db)):
    return db.query(Role).all()


@router.post("/{user_id}/roles", status_code=201, dependencies=[Depends(admin_only)])
def assign_role(user_id: int, body: RoleAssign, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.id_utilisateur == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    role = db.query(Role).filter(Role.id_role == body.id_role).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rôle introuvable")
    already = db.query(UtilisateurRole).filter(
        UtilisateurRole.id_utilisateur == user_id,
        UtilisateurRole.id_role == body.id_role,
    ).first()
    if already:
        raise HTTPException(status_code=409, detail="Rôle déjà assigné")
    db.add(UtilisateurRole(id_utilisateur=user_id, id_role=body.id_role))
    db.commit()
    return {"message": f"Rôle '{role.libelle}' assigné"}


@router.delete("/{user_id}/roles/{role_id}", status_code=204, dependencies=[Depends(admin_only)])
def remove_role(user_id: int, role_id: int, db: Session = Depends(get_db)):
    ur = db.query(UtilisateurRole).filter(
        UtilisateurRole.id_utilisateur == user_id,
        UtilisateurRole.id_role == role_id,
    ).first()
    if not ur:
        raise HTTPException(status_code=404, detail="Association introuvable")
    db.delete(ur)
    db.commit()


# ── Accès pays/entrepôt ───────────────────────────────────────────────────────

@router.post("/{user_id}/access", status_code=201, dependencies=[Depends(admin_only)])
def assign_access(user_id: int, body: AccessAssign, db: Session = Depends(get_db)):
    if not db.query(Utilisateur).filter(Utilisateur.id_utilisateur == user_id).first():
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    db.add(UserAccess(
        id_utilisateur=user_id,
        pays=body.pays,
        exploitation_id=body.exploitation_id,
        entrepot_id=body.entrepot_id,
    ))
    db.commit()
    return {"message": "Accès assigné"}


@router.delete("/{user_id}/access/{access_id}", status_code=204, dependencies=[Depends(admin_only)])
def remove_access(user_id: int, access_id: int, db: Session = Depends(get_db)):
    acc = db.query(UserAccess).filter(
        UserAccess.id == access_id,
        UserAccess.id_utilisateur == user_id,
    ).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Accès introuvable")
    db.delete(acc)
    db.commit()
