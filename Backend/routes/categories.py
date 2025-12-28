from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from middleware.auth import verify_admin_token
from models import Admin, Category, Product

router = APIRouter()

class CreateCategoryRequest(BaseModel):
    name: str
    description: Optional[str] = None

class UpdateCategoryRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

@router.get("/")
async def get_categories(admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    categories = db.query(Category).order_by(Category.name).all()
    return [
        {
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "createdAt": cat.created_at.isoformat() if cat.created_at else None
        }
        for cat in categories
    ]

@router.post("/")
async def create_category(
    request: CreateCategoryRequest,
    admin: Admin = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    existing = db.query(Category).filter(Category.name == request.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette catégorie existe déjà"
        )
    
    category = Category(
        name=request.name,
        description=request.description
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return {
        "id": category.id,
        "name": category.name,
        "description": category.description
    }

@router.put("/{category_id}")
async def update_category(
    category_id: int,
    request: UpdateCategoryRequest,
    admin: Admin = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catégorie non trouvée")
    
    if request.name is not None:
        existing = db.query(Category).filter(Category.name == request.name, Category.id != category_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cette catégorie existe déjà"
            )
        old_name = category.name
        category.name = request.name
        db.query(Product).filter(Product.category == old_name).update({"category": request.name})
    
    if request.description is not None:
        category.description = request.description
    
    db.commit()
    db.refresh(category)
    
    return {
        "id": category.id,
        "name": category.name,
        "description": category.description
    }

@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    admin: Admin = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catégorie non trouvée")
    
    products_count = db.query(Product).filter(Product.category == category.name).count()
    if products_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de supprimer cette catégorie car {products_count} produit(s) l'utilise(nt)"
        )
    
    db.delete(category)
    db.commit()
    return {"message": "Catégorie supprimée avec succès"}

