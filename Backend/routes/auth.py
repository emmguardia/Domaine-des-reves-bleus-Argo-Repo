from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator
from jose import jwt
import bcrypt
import secrets
from datetime import datetime, timedelta
import os
from database import get_db
from models import User

router = APIRouter()
security = HTTPBearer()

def hash_password(password: str) -> str:
    
    
    password_bytes = password.encode('utf-8')[:72]
    password_truncated = password_bytes.decode('utf-8', errors='ignore')
    
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_truncated.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    
    
    password_bytes = password.encode('utf-8')[:72]
    password_truncated = password_bytes.decode('utf-8', errors='ignore')
    try:
        return bcrypt.checkpw(password_truncated.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

JWT_SECRET = os.getenv("JWT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://domainedesrevesbleus.eu")

class RegisterRequest(BaseModel):
    firstName: str
    lastName: str
    phone: str
    email: EmailStr
    password: str
    
    @validator("phone")
    def validate_phone(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Le numéro de téléphone doit contenir 10 chiffres")
        return v
    
    @validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères")
        if not any(c.isupper() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins une majuscule")
        if not any(c.islower() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins une minuscule")
        if not any(c.isdigit() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre")
        if not any(c in "@$!%*?&" for c in v):
            raise ValueError("Le mot de passe doit contenir au moins un caractère spécial")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    rememberMe: bool = False

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    email: EmailStr
    password: str
    
    @validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères")
        if not any(c.isupper() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins une majuscule")
        if not any(c.islower() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins une minuscule")
        if not any(c.isdigit() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre")
        if not any(c in "@$!%*?&" for c in v):
            raise ValueError("Le mot de passe doit contenir au moins un caractère spécial")
        return v

@router.post("/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un utilisateur avec cet email existe déjà"
        )
    
    hashed_password = hash_password(request.password)
    
    user = User(
        first_name=request.firstName,
        last_name=request.lastName,
        phone=request.phone,
        email=request.email.lower(),
        password=hashed_password
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    if not JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur de configuration serveur"
        )
    
    token = jwt.encode(
        {"id": user.id},
        JWT_SECRET,
        algorithm="HS256"
    )
    
    return {
        "_id": user.id,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "phone": user.phone,
        "email": user.email,
        "token": token
    }

@router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower()).first()
    
    if not user or not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )
    
    if not JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur de configuration serveur"
        )
    
    expires_in = "30d" if request.rememberMe else "24h"
    expires_delta = timedelta(days=30) if request.rememberMe else timedelta(hours=24)
    
    token = jwt.encode(
        {"id": user.id, "exp": datetime.utcnow() + expires_delta},
        JWT_SECRET,
        algorithm="HS256"
    )
    
    return {
        "_id": user.id,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "phone": user.phone,
        "email": user.email,
        "token": token,
        "rememberMe": request.rememberMe
    }

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user:
        return {"success": False, "message": "Aucun compte trouvé avec cette adresse email"}
    
    reset_token = secrets.token_urlsafe(32)
    reset_token_expiry = datetime.utcnow() + timedelta(hours=24)
    
    user.reset_password_token = reset_token
    user.reset_password_expiry = reset_token_expiry
    db.commit()
    
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}&email={request.email}"
    
    return {
        "success": True,
        "message": "Un email de réinitialisation a été envoyé à votre adresse email.",
        "resetLink": reset_link
    }

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email == request.email.lower(),
        User.reset_password_token == request.token,
        User.reset_password_expiry > datetime.utcnow()
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalide ou expiré"
        )
    
    hashed_password = hash_password(request.password)
    user.password = hashed_password
    user.reset_password_token = None
    user.reset_password_expiry = None
    db.commit()
    
    return {"message": "Mot de passe réinitialisé avec succès"}

