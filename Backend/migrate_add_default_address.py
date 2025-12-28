


from database import engine
from sqlalchemy import text, inspect

def migrate_add_default_address():
    
    
    
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'default_address' in columns:
        print("ℹ️  La colonne 'default_address' existe déjà dans la table 'users'")
        return
    
    
    with engine.connect() as conn:
        try:
            
            
            conn.execute(text())
            conn.commit()
            print("✅ Colonne 'default_address' ajoutée avec succès à la table 'users'")
        except Exception as e:
            conn.rollback()
            print(f"❌ Erreur lors de l'ajout de la colonne: {str(e)}")
            raise

if __name__ == "__main__":
    print("🚀 Migration: Ajout de la colonne default_address...")
    print("")
    migrate_add_default_address()
    print("")
    print("✅ Migration terminée!")

