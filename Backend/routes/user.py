from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import get_db
from middleware.auth import verify_token
from models import User

router = APIRouter()
security = HTTPBearer()

class UpdateUserRequest(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

@router.get("/")
async def get_user(
    user: User = Depends(verify_token),
    db: Session = Depends(get_db)
):
    return {
        "_id": user.id,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "phone": user.phone,
        "email": user.email,
        "role": user.role.value,
        "createdAt": user.created_at.isoformat() if user.created_at else None
    }

@router.put("/")
async def update_user(
    request: UpdateUserRequest,
    user: User = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if request.firstName is not None:
        user.first_name = request.firstName
    if request.lastName is not None:
        user.last_name = request.lastName
    if request.phone is not None:
        if not request.phone.isdigit() or len(request.phone) != 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le numéro de téléphone doit contenir 10 chiffres"
            )
        user.phone = request.phone
    if request.email is not None:
        existing_user = db.query(User).filter(
            User.email == request.email.lower(),
            User.id != user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cet email est déjà utilisé"
            )
        user.email = request.email.lower()
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Profil mis à jour",
        "user": {
            "_id": user.id,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "phone": user.phone,
            "email": user.email
        }
    }

@router.delete("/")
async def delete_user(
    user: User = Depends(verify_token),
    db: Session = Depends(get_db)
):
    db.delete(user)
    db.commit()
    return {"message": "Compte supprimé"}

