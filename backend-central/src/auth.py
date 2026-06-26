import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Utilisateur, UserAccess

router = APIRouter(prefix="/auth", tags=["Auth"])

JWT_SECRET    = os.getenv("JWT_SECRET", "futurekawa-dev-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 8

pwd_context  = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


# ── Utilitaires ──────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _build_token_payload(user: Utilisateur, db: Session) -> dict:
    roles = [ur.role.libelle for ur in user.roles]

    accesses_raw = (
        db.query(UserAccess)
        .filter(UserAccess.id_utilisateur == user.id_utilisateur)
        .all()
    )

    pays_map: dict = {}
    for a in accesses_raw:
        if a.pays not in pays_map:
            pays_map[a.pays] = {"pays": a.pays, "entrepots": [], "exploitations": []}
        if a.entrepot_id and a.entrepot_id not in pays_map[a.pays]["entrepots"]:
            pays_map[a.pays]["entrepots"].append(a.entrepot_id)
        if a.exploitation_id and a.exploitation_id not in pays_map[a.pays]["exploitations"]:
            pays_map[a.pays]["exploitations"].append(a.exploitation_id)

    return {
        "sub":      str(user.id_utilisateur),
        "email":    user.email,
        "nom":      user.nom,
        "prenom":   user.prenom,
        "roles":    roles,
        "accesses": list(pays_map.values()),
        "exp":      datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
    }


def create_access_token(user: Utilisateur, db: Session) -> str:
    payload = _build_token_payload(user, db)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token manquant",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decode_token(credentials.credentials)


def require_role(*roles: str):
    """Dépendance FastAPI : vérifie que l'utilisateur possède au moins un des rôles."""
    def _check(current_user: dict = Depends(get_current_user)):
        if not any(r in current_user.get("roles", []) for r in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rôle requis : {list(roles)}",
            )
        return current_user
    return _check


def extract_bearer(request: Request) -> Optional[str]:
    """Extrait le token Bearer brut d'une requête (pour le proxy vers backend-pays)."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


# ── Schémas ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    mot_de_passe: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Authentifie un utilisateur et retourne un JWT signé."""
    user = (
        db.query(Utilisateur)
        .filter(Utilisateur.email == body.email, Utilisateur.actif == True)
        .first()
    )
    if not user or not verify_password(body.mot_de_passe, user.mot_de_passe):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    token = create_access_token(user, db)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur connecté (extrait du JWT)."""
    return current_user
