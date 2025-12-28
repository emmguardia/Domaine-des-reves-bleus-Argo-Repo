from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from middleware.auth import verify_token
from models import User, Address

router = APIRouter()

class CreateAddressRequest(BaseModel):
    label: str
    firstName: str
    lastName: str
    phone: str
    address: str
    city: str
    postalCode: str
    country: str = "France"
    isDefault: bool = False

class UpdateAddressRequest(BaseModel):
    label: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postalCode: Optional[str] = None
    country: Optional[str] = None
    isDefault: Optional[bool] = None

@router.get("/")
async def get_addresses(
    user: User = Depends(verify_token),
    db: Session = Depends(get_db)
):
    addresses = db.query(Address).filter(Address.user_id == user.id).all()
    return [
        {
            "id": addr.id,
            "label": addr.label,
            "firstName": addr.first_name,
            "lastName": addr.last_name,
            "phone": addr.phone,
            "address": addr.address,
            "city": addr.city,
            "postalCode": addr.postal_code,
            "country": addr.country,
            "isDefault": addr.is_default,
            "createdAt": addr.created_at.isoformat() if addr.created_at else None
        }
        for addr in addresses
    ]

@router.post("/")
async def create_address(
    request: CreateAddressRequest,
    user: User = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if request.isDefault:
        db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})
    
    address = Address(
        user_id=user.id,
        label=request.label,
        first_name=request.firstName,
        last_name=request.lastName,
        phone=request.phone,
        address=request.address,
        city=request.city,
        postal_code=request.postalCode,
        country=request.country,
        is_default=request.isDefault
    )
    
    db.add(address)
    db.commit()
    db.refresh(address)
    
    return {
        "id": address.id,
        "label": address.label,
        "firstName": address.first_name,
        "lastName": address.last_name,
        "phone": address.phone,
        "address": address.address,
        "city": address.city,
        "postalCode": address.postal_code,
        "country": address.country,
        "isDefault": address.is_default
    }

@router.put("/{address_id}")
async def update_address(
    address_id: int,
    request: UpdateAddressRequest,
    user: User = Depends(verify_token),
    db: Session = Depends(get_db)
):
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adresse non trouvée")
    
    if request.isDefault is True:
        db.query(Address).filter(Address.user_id == user.id, Address.id != address_id).update({"is_default": False})
    
    if request.label is not None:
        address.label = request.label
    if request.firstName is not None:
        address.first_name = request.firstName
    if request.lastName is not None:
        address.last_name = request.lastName
    if request.phone is not None:
        address.phone = request.phone
    if request.address is not None:
        address.address = request.address
    if request.city is not None:
        address.city = request.city
    if request.postalCode is not None:
        address.postal_code = request.postalCode
    if request.country is not None:
        address.country = request.country
    if request.isDefault is not None:
        address.is_default = request.isDefault
    
    db.commit()
    db.refresh(address)
    
    return {
        "id": address.id,
        "label": address.label,
        "firstName": address.first_name,
        "lastName": address.last_name,
        "phone": address.phone,
        "address": address.address,
        "city": address.city,
        "postalCode": address.postal_code,
        "country": address.country,
        "isDefault": address.is_default
    }

@router.delete("/{address_id}")
async def delete_address(
    address_id: int,
    user: User = Depends(verify_token),
    db: Session = Depends(get_db)
):
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adresse non trouvée")
    
    db.delete(address)
    db.commit()
    return {"message": "Adresse supprimée"}

