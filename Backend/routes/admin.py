from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from jose import jwt
import bcrypt
from datetime import datetime, timedelta
import os
from database import get_db
from middleware.auth import verify_admin_token
from models import Admin, Product, Order, OrderStatus, PaymentStatus, User
from datetime import datetime, timedelta
import csv
import io
from fastapi.responses import StreamingResponse

router = APIRouter()
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET")

def verify_password(password: str, hashed: str) -> bool:
    
    
    password_bytes = password.encode('utf-8')[:72]
    password_truncated = password_bytes.decode('utf-8', errors='ignore')
    try:
        return bcrypt.checkpw(password_truncated.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

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
    
    if not admin or not verify_password(request.password, admin.password):
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
    return [
        {
            "id": product.id,
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

@router.get("/stats/advanced")
async def get_advanced_stats(period: int = 7, admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    if period < 3:
        period = 3
    
    now = datetime.utcnow()
    last_7_days = now - timedelta(days=7)
    last_30_days = now - timedelta(days=30)
    
    revenue_7d = db.query(func.sum(Order.total_amount)).filter(
        Order.payment_status == PaymentStatus.SUCCEEDED,
        Order.created_at >= last_7_days
    ).scalar() or 0.0
    
    revenue_30d = db.query(func.sum(Order.total_amount)).filter(
        Order.payment_status == PaymentStatus.SUCCEEDED,
        Order.created_at >= last_30_days
    ).scalar() or 0.0
    
    orders_7d = db.query(func.count(Order.id)).filter(
        Order.created_at >= last_7_days
    ).scalar() or 0
    
    orders_30d = db.query(func.count(Order.id)).filter(
        Order.created_at >= last_30_days
    ).scalar() or 0
    
    daily_revenue = []
    for i in range(period):
        day_start = now - timedelta(days=period-1-i)
        day_end = day_start + timedelta(days=1)
        day_revenue = db.query(func.sum(Order.total_amount)).filter(
            Order.payment_status == PaymentStatus.SUCCEEDED,
            Order.created_at >= day_start,
            Order.created_at < day_end
        ).scalar() or 0.0
        daily_revenue.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "revenue": float(day_revenue)
        })
    
    return {
        "revenue": {
            "last7Days": float(revenue_7d),
            "last30Days": float(revenue_30d),
            "daily": daily_revenue
        },
        "orders": {
            "last7Days": orders_7d,
            "last30Days": orders_30d
        }
    }

@router.get("/export/orders")
async def export_orders_csv(admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "User ID", "Payment Intent", "Total", "Shipping Cost",
        "Status", "Payment Status", "Created At"
    ])
    
    for order in orders:
        writer.writerow([
            order.id,
            order.user_id,
            order.payment_intent_id,
            order.total_amount,
            order.shipping_cost,
            order.status.value,
            order.payment_status.value,
            order.created_at.isoformat() if order.created_at else ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders_export.csv"}
    )

@router.get("/users")
async def get_users(admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": user.id,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.value,
            "createdAt": user.created_at.isoformat() if user.created_at else None,
            "ordersCount": db.query(Order).filter(Order.user_id == user.id).count()
        }
        for user in users
    ]

@router.get("/users/{user_id}")
async def get_user(user_id: int, admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")
    
    orders = db.query(Order).filter(Order.user_id == user_id).all()
    
    return {
        "id": user.id,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "orders": [
            {
                "id": order.id,
                "totalAmount": order.total_amount,
                "status": order.status.value,
                "createdAt": order.created_at.isoformat() if order.created_at else None
            }
            for order in orders
        ]
    }

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin: Admin = Depends(verify_admin_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")
    
    if user.role.value == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de supprimer un administrateur"
        )
    
    db.delete(user)
    db.commit()
    return {"message": "Utilisateur supprimé avec succès"}

