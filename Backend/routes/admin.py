from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from jose import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os
from database import get_db
from middleware.auth import verify_admin_token
from models import Admin, Product, Order, OrderStatus, PaymentStatus, User

router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET")

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class CreateProductRequest(BaseModel):
    name: str
    description: str
    price: float
    image: str
    category: str
    stock: int = 0
    weightGrams: int = 100
    volumes: Optional[dict] = None
    fragrances: Optional[dict] = None
    rating: float = 0.0
    isNew: bool = False
    isPlaceholder: bool = False

class UpdateProductRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    weightGrams: Optional[int] = None
    volumes: Optional[dict] = None
    fragrances: Optional[dict] = None
    rating: Optional[float] = None
    isNew: Optional[bool] = None
    isPlaceholder: Optional[bool] = None

class UpdateOrderStatusRequest(BaseModel):
    status: str

@router.post("/login")
async def admin_login(request: AdminLoginRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.username == request.username).first()
    
    fake_hash = "$2a$10$fakehashforsecuritypurposesonly"
    password_to_check = admin.password if admin else fake_hash
    
    if not admin or not pwd_context.verify(request.password, password_to_check):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects"
        )
    
    admin.last_login = datetime.utcnow()
    db.commit()
    
    if not JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur de configuration serveur"
        )
    
    token = jwt.encode(
        {"id": admin.id, "role": "admin", "exp": datetime.utcnow() + timedelta(hours=24)},
        JWT_SECRET,
        algorithm="HS256"
    )
    
    return {
        "token": token,
        "admin": {
            "id": admin.id,
            "username": admin.username
        }
    }

@router.get("/products")
async def get_all_products(admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    products = db.query(Product).order_by(Product.created_at.desc()).all()
    return products

@router.get("/products/{product_id}")
async def get_product(product_id: int, admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produit non trouvé")
    return product

@router.post("/products")
async def create_product(request: CreateProductRequest, admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    product = Product(
        name=request.name,
        description=request.description,
        price=request.price,
        image=request.image,
        category=request.category,
        stock=request.stock,
        weight_grams=request.weightGrams,
        volumes=request.volumes,
        fragrances=request.fragrances,
        rating=request.rating,
        is_new=request.isNew,
        is_placeholder=request.isPlaceholder
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.put("/products/{product_id}")
async def update_product(product_id: int, request: UpdateProductRequest, admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produit non trouvé")
    
    if request.name is not None:
        product.name = request.name
    if request.description is not None:
        product.description = request.description
    if request.price is not None:
        product.price = request.price
    if request.image is not None:
        product.image = request.image
    if request.category is not None:
        product.category = request.category
    if request.stock is not None:
        product.stock = request.stock
    if request.weightGrams is not None:
        product.weight_grams = request.weightGrams
    if request.volumes is not None:
        product.volumes = request.volumes
    if request.fragrances is not None:
        product.fragrances = request.fragrances
    if request.rating is not None:
        product.rating = request.rating
    if request.isNew is not None:
        product.is_new = request.isNew
    if request.isPlaceholder is not None:
        product.is_placeholder = request.isPlaceholder
    
    db.commit()
    db.refresh(product)
    return product

@router.delete("/products/{product_id}")
async def delete_product(product_id: int, admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produit non trouvé")
    
    db.delete(product)
    db.commit()
    return {"message": "Produit supprimé avec succès"}

@router.get("/orders")
async def get_orders(status_filter: Optional[str] = None, admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    
    orders = query.order_by(Order.created_at.desc()).all()
    return orders

@router.get("/orders/{order_id}")
async def get_order(order_id: int, admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande non trouvée")
    return order

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: int, request: UpdateOrderStatusRequest, admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    valid_statuses = ["pending", "paid", "preparing", "shipped", "delivered", "cancelled"]
    if request.status not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Statut invalide")
    
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande non trouvée")
    
    order.status = OrderStatus(request.status)
    if request.status == "shipped":
        order.shipped_at = datetime.utcnow()
    
    db.commit()
    db.refresh(order)
    return order

@router.delete("/orders/{order_id}")
async def delete_order(order_id: int, admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande non trouvée")
    
    if order.status not in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La commande doit être envoyée ou livrée avant d'être supprimée"
        )
    
    db.delete(order)
    db.commit()
    return {"message": "Commande supprimée avec succès"}

@router.get("/orders/history/all")
async def get_order_history(admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    return orders

@router.get("/stats")
async def get_stats(admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    total_products = db.query(Product).count()
    low_stock_products = db.query(Product).filter(Product.stock <= 5, Product.stock > 0).count()
    out_of_stock_products = db.query(Product).filter(Product.stock == 0).count()
    
    total_orders = db.query(Order).count()
    pending_orders = db.query(Order).filter(Order.status == OrderStatus.PENDING).count()
    preparing_orders = db.query(Order).filter(Order.status == OrderStatus.PREPARING).count()
    shipped_orders = db.query(Order).filter(Order.status == OrderStatus.SHIPPED).count()
    
    total_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.payment_status == PaymentStatus.SUCCEEDED
    ).scalar() or 0.0
    
    return {
        "products": {
            "total": total_products,
            "lowStock": low_stock_products,
            "outOfStock": out_of_stock_products
        },
        "orders": {
            "total": total_orders,
            "pending": pending_orders,
            "preparing": preparing_orders,
            "shipped": shipped_orders
        },
        "revenue": {
            "total": float(total_revenue)
        }
    }

