from database import engine, Base
from models import User, Admin, Product, Cart, CartItem, Order, OrderItem
from passlib.context import CryptContext
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_database():
    Base.metadata.create_all(bind=engine)
    print("✅ Base de données initialisée avec succès!")

if __name__ == "__main__":
    init_database()

