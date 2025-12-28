


import bcrypt
from datetime import datetime
from database import engine, Base, get_db
from models import User, Admin, Product, Cart, CartItem, Order, OrderItem, Address, Category
from sqlalchemy import text, inspect

def init_database():
    
    Base.metadata.create_all(bind=engine)
    print("✅ Tables créées avec succès!")

def migrate_add_default_address():
    
    try:
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'default_address' in columns:
            print("ℹ️  La colonne 'default_address' existe déjà dans la table 'users'")
            return
        
        
        with engine.connect() as conn:
            conn.execute(text())
            conn.commit()
            print("✅ Colonne 'default_address' ajoutée avec succès à la table 'users'")
    except Exception as e:
        print(f"⚠️  Erreur lors de la migration default_address: {str(e)}")
        

def create_admin():
    
    db = next(get_db())
    
    username = "Laurence"
    password = "ErH126Kf2.cv"
    
    
    existing_admin = db.query(Admin).filter(Admin.username == username).first()
    if existing_admin:
        print(f"ℹ️  L'administrateur '{username}' existe déjà, aucune action nécessaire")
        return
    
    
    password_bytes = password.encode('utf-8')[:72]
    password_truncated = password_bytes.decode('utf-8', errors='ignore')
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_truncated.encode('utf-8'), salt)
    hashed_password = hashed.decode('utf-8')
    
    
    admin = Admin(
        username=username,
        password=hashed_password
    )
    
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    print(f"✅ Administrateur '{username}' créé avec succès!")

def create_categories():
    
    db = next(get_db())
    
    categories_data = [
        {
            "name": "Accessoires",
            "description": "Accessoires de toilettage professionnels"
        },
        {
            "name": "Soins Et Parfums",
            "description": "Produits de soin et parfums pour chiens"
        },
        {
            "name": "Shampoings",
            "description": "Shampoings professionnels pour tous types de poils"
        }
    ]
    
    created_count = 0
    for cat_data in categories_data:
        existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
        if not existing:
            category = Category(**cat_data)
            db.add(category)
            created_count += 1
        else:
            print(f"ℹ️  La catégorie '{cat_data['name']}' existe déjà")
    
    db.commit()
    
    if created_count > 0:
        print(f"✅ {created_count} catégorie(s) créée(s) avec succès!")
    else:
        print(f"ℹ️  Toutes les catégories existent déjà, aucune action nécessaire")

def create_products():
    
    db = next(get_db())
    
    
    existing_products = db.query(Product).count()
    if existing_products > 0:
        print(f"ℹ️  {existing_products} produit(s) existent déjà, aucune action nécessaire")
        return
    
    products_data = [
        {
            "name": "Carde double flex",
            "description": "Carde professionnelle double face pour démêler efficacement",
            "price": 21.00,
            "image": "/images/Carde_double_flex.jpg",
            "rating": 5.0,
            "category": "Accessoires",
            "weight_grams": 175,
            "stock": 10,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Carde à nœud",
            "description": "Carde spécialement conçue pour éliminer les nœuds tenaces",
            "price": 21.00,
            "image": "/images/Carde_à_nœuds.jpg",
            "rating": 5.0,
            "category": "Accessoires",
            "weight_grams": 60,
            "stock": 10,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Peigne",
            "description": "Peigne professionnel pour finition et démêlage",
            "price": 7.50,
            "image": "/images/Peigne.jpg",
            "rating": 4.0,
            "category": "Accessoires",
            "weight_grams": 90,
            "stock": 15,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Coat prince 20 dents",
            "description": "Peigne Coat Prince professionnel 20 dents pour toilettage précis",
            "price": 35.50,
            "image": "/images/Coat_prince_20_dents.jpg",
            "rating": 5.0,
            "category": "Accessoires",
            "weight_grams": 115,
            "stock": 8,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Coupe nœud",
            "description": "Ciseaux spécialisés pour couper les nœuds sans blesser",
            "price": 11.00,
            "image": "/images/coupe_noeud.png",
            "rating": 4.0,
            "category": "Accessoires",
            "weight_grams": 60,
            "stock": 12,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Crochets à tique",
            "description": "Outils professionnels pour retirer les tiques en toute sécurité",
            "price": 7.00,
            "image": "/images/Crochets_a_tique.jpg",
            "rating": 4.0,
            "category": "Accessoires",
            "weight_grams": 30,
            "stock": 20,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Spray Conditionneur",
            "description": "Produit sublime pour éclat et brillance du pelage",
            "price": 20.50,
            "image": "/images/Spray_Conditionneur.jpg",
            "rating": 4.0,
            "category": "Soins Et Parfums",
            "weight_grams": 285,
            "stock": 15,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Lotion Aloe Vera",
            "description": "Lotion démêlante enrichie à l'aloe vera pour faciliter le brossage",
            "price": 16.00,
            "image": "/images/Lotion_Aloe_Vera.jpg",
            "rating": 5.0,
            "category": "Soins Et Parfums",
            "volumes": {"250ml": 16.00},
            "weight_grams": 285,
            "stock": 12,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Lotion Argan",
            "description": "Shampooing doux enrichi à l'aloe vera pour tous types de poils",
            "price": 16.00,
            "image": "/images/Lotion_Argan.jpg",
            "rating": 5.0,
            "category": "Soins Et Parfums",
            "volumes": {"250ml": 16.00},
            "weight_grams": 285,
            "stock": 12,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Crème Argan",
            "description": "Crème démêlante enrichie à l'argan pour faciliter le brossage",
            "price": 16.00,
            "image": "/images/Crème_Argan.jpg",
            "rating": 5.0,
            "category": "Soins Et Parfums",
            "volumes": {"250ml": 16.00},
            "weight_grams": 275,
            "stock": 10,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Crème Aloe Vera",
            "description": "Crème démêlante enrichie à l'aloe vera pour faciliter le brossage",
            "price": 16.00,
            "image": "/images/Crème_Aloe_Vera.jpg",
            "rating": 5.0,
            "category": "Soins Et Parfums",
            "volumes": {"250ml": 16.00},
            "weight_grams": 275,
            "stock": 10,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Shampoing Aloe Vera",
            "description": "Shampooing doux enrichi à l'aloe vera pour tous types de poils",
            "price": 12.50,
            "image": "/images/Shampoing_Aloe_Vera.jpg",
            "rating": 5.0,
            "category": "Shampoings",
            "volumes": {"250ml": 12.50},
            "weight_grams": 280,
            "stock": 15,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Shampoing Forty",
            "description": "Shampooing professionnel forty pour tous types de poils",
            "price": 12.50,
            "image": "/images/Shampoing_Forty.jpg",
            "rating": 0.0,
            "category": "Shampoings",
            "volumes": {"250ml": 12.50},
            "weight_grams": 280,
            "stock": 15,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Shampooing Copacabana",
            "description": "Shampooing copacabana pour poils brillants et soyeux",
            "price": 12.50,
            "image": "/images/Shampoing_Forty.jpg",
            "rating": 0.0,
            "category": "Shampoings",
            "volumes": {"250ml": 12.50},
            "weight_grams": 280,
            "is_new": False,
            "is_placeholder": True,
            "stock": 0
        },
        {
            "name": "Shampoing Argan",
            "description": "Shampooing doux à l'argan pour peaux sensibles",
            "price": 12.50,
            "image": "/images/Shampoing_Argan.jpg",
            "rating": 4.0,
            "category": "Shampoings",
            "volumes": {"250ml": 12.50},
            "weight_grams": 280,
            "stock": 15,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Shampooing Amandes",
            "description": "Shampooing doux aux amandes pour peaux sensibles",
            "price": 12.50,
            "image": "/images/Shampoing_Amandes.jpg",
            "rating": 4.0,
            "category": "Shampoings",
            "volumes": {"250ml": 12.50},
            "weight_grams": 280,
            "stock": 15,
            "is_new": False,
            "is_placeholder": False
        },
        {
            "name": "Parfum",
            "description": "Parfum délicat pour chiens, senteur fraîche et durable",
            "price": 8.00,
            "image": "/images/Parfum.jpg",
            "rating": 4.0,
            "category": "Soins Et Parfums",
            "weight_grams": 30,
            "fragrances": {
                "Malabar": {"name": "Malabar", "description": "Senteur exotique et envoûtante"},
                "Bamboo": {"name": "Bamboo", "description": "Senteur de bambou apaisante et naturelle"},
                "Boo Tella": {"name": "Boo Tella", "description": "Senteur gourmande et réconfortante"},
                "Pitchoun": {"name": "Pitchoun", "description": "Senteur douce et tendre, parfait pour les petits chiens"},
                "Mimosa": {"name": "Mimosa", "description": "Senteur florale printanière et délicate"},
                "Pelluche": {"name": "Pelluche", "description": "Senteur douce et câline, comme un doudou parfumé"},
                "Pomme": {"name": "Pomme", "description": "Senteur fruitée et fraîche de pomme croquante"},
                "Scarlett": {"name": "Scarlett", "description": "Senteur élégante et sophistiquée"},
                "Lulu": {"name": "Lulu", "description": "Senteur joyeuse et pétillante"}
            },
            "stock": 25,
            "is_new": False,
            "is_placeholder": False
        }
    ]
    
    
    for product_data in products_data:
        product = Product(**product_data)
        db.add(product)
    
    db.commit()
    print(f"✅ {len(products_data)} produit(s) créé(s) avec succès!")

def main():
    
    print("🚀 Initialisation de la base de données...")
    print("")
    
    
    init_database()
    
    
    print("")
    print("🔄 Vérification des migrations...")
    migrate_add_default_address()
    
    
    print("")
    print("📝 Création de l'administrateur...")
    create_admin()
    
    
    print("")
    print("📁 Création des catégories...")
    create_categories()
    
    
    print("")
    print("📦 Création des produits...")
    create_products()
    
    print("")
    print("✅ Initialisation terminée avec succès!")
    print("   - Admin: Laurence")
    print("   - Catégories: 3")
    print("   - Produits: 17")

if __name__ == "__main__":
    main()
