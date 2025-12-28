from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from middleware.auth import verify_token
from models import User, Cart, CartItem

router = APIRouter()
security = HTTPBearer()

class CartItemRequest(BaseModel):
    id: int
    name: str
    price: float
    quantity: int
    image: str
    volume: Optional[str] = None
    weightGrams: Optional[int] = 100
    fragrance: Optional[str] = None

class UpdateCartRequest(BaseModel):
    items: List[CartItemRequest]

@router.get("/")
async def get_cart(
    user: User = Depends(verify_token),
    db: Session = Depends(get_db)
):
    try:
        cart = db.query(Cart).filter(Cart.user_id == user.id).first()
        
        if not cart:
            cart = Cart(user_id=user.id)
            db.add(cart)
        db.commit()
        db.refresh(cart)
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
        
        return {
            "id": cart.id,
            "user": cart.user_id,
            "items": [
                {
                    "id": item.item_id,
                    "name": item.name,
                    "price": item.price,
                    "quantity": item.quantity,
                    "image": item.image,
                    "volume": item.volume,
                    "weightGrams": item.weight_grams,
                    "fragrance": item.fragrance
                }
                for item in cart_items
            ],
            "createdAt": cart.created_at.isoformat() if cart.created_at else None,
            "updatedAt": cart.updated_at.isoformat() if cart.updated_at else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur serveur: {str(e)}"
        )

@router.post("/")
async def update_cart(
    request: UpdateCartRequest,
    user: User = Depends(verify_token),
    db: Session = Depends(get_db)
):
    try:
        cart = db.query(Cart).filter(Cart.user_id == user.id).first()
        
        if not cart:
            cart = Cart(user_id=user.id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        
        # Supprimer les anciens items
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        
        for item_data in request.items:
            cart_item = CartItem(
                cart_id=cart.id,
                item_id=item_data.id,
                name=item_data.name,
                price=item_data.price,
                quantity=item_data.quantity,
                image=item_data.image,
                volume=item_data.volume,
                weight_grams=item_data.weightGrams or 100,
                fragrance=item_data.fragrance
            )
            db.add(cart_item)
        
        db.commit()
        db.refresh(cart)
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
        
        return {
            "id": cart.id,
            "user": cart.user_id,
            "items": [
                {
                    "id": item.item_id,
                    "name": item.name,
                    "price": item.price,
                    "quantity": item.quantity,
                    "image": item.image,
                    "volume": item.volume,
                    "weightGrams": item.weight_grams,
                    "fragrance": item.fragrance
                }
                for item in cart_items
            ],
            "createdAt": cart.created_at.isoformat() if cart.created_at else None,
            "updatedAt": cart.updated_at.isoformat() if cart.updated_at else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur serveur: {str(e)}"
        )

@router.delete("/")
async def clear_cart(
    user: User = Depends(verify_token),
    db: Session = Depends(get_db)
):
    cart = db.query(Cart).filter(Cart.user_id == user.id).first()
    
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()
    
    return {"message": "Panier vidé avec succès"}

