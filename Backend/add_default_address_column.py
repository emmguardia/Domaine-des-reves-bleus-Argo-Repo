#!/usr/bin/env python3
"""
Script simple pour ajouter la colonne default_address à la table users
"""

from database import engine
from sqlalchemy import text

def add_column():
    """Ajoute la colonne default_address à la table users"""
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN default_address TEXT NULL
            """))
            conn.commit()
            print("✅ Colonne 'default_address' ajoutée avec succès!")
    except Exception as e:
        error_msg = str(e)
        if "Duplicate column name" in error_msg or "already exists" in error_msg:
            print("ℹ️  La colonne 'default_address' existe déjà")
        else:
            print(f"❌ Erreur: {error_msg}")
            raise

if __name__ == "__main__":
    print("🚀 Ajout de la colonne default_address...")
    add_column()
    print("✅ Terminé!")

