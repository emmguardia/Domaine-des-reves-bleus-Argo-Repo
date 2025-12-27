from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Product

router = APIRouter()

@router.get("/")
async def get_products(db: Session = Depends(get_db)):
    products = db.query(Product).order_by(Product.category, Product.name).all()
    
    return [
        {
            "_id": product.id,
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "image": product.image,
            "category": product.category,
            "stock": product.stock,
            "weightGrams": product.weight_grams,
            "volumes": product.volumes,
            "fragrances": product.fragrances,
            "rating": product.rating,
            "isNew": product.is_new,
            "isPlaceholder": product.is_placeholder,
            "createdAt": product.created_at.isoformat() if product.created_at else None,
            "updatedAt": product.updated_at.isoformat() if product.updated_at else None
        }
        for product in products
    ]

@router.get("/{product_id}")
async def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit non trouvé"
        )
    
    return {
        "_id": product.id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "image": product.image,
        "category": product.category,
        "stock": product.stock,
        "weightGrams": product.weight_grams,
        "volumes": product.volumes,
        "fragrances": product.fragrances,
        "rating": product.rating,
        "isNew": product.is_new,
        "isPlaceholder": product.is_placeholder,
        "createdAt": product.created_at.isoformat() if product.created_at else None,
        "updatedAt": product.updated_at.isoformat() if product.updated_at else None
    }

