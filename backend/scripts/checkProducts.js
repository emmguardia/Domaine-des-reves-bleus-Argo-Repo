// Script pour vérifier si les produits sont dans la base de données
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
// Essayer plusieurs chemins possibles pour .env
const envPaths = [
  join(__dirname, '..', '.env'),
  join(process.cwd(), '.env'),
  join(__dirname, '..', '..', '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Fichier .env trouvé: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  Aucun fichier .env trouvé, utilisation des variables d\'environnement système');
  dotenv.config(); // Essayer de charger depuis les variables système
}

async function checkProducts() {
  try {
    // Connexion à MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI n\'est pas défini dans .env');
      process.exit(1);
    }

    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');

    // Compter les produits
    const count = await Product.countDocuments();
    console.log(`\n📦 Nombre de produits dans la base: ${count}`);

    if (count === 0) {
      console.log('\n⚠️  Aucun produit trouvé dans la base de données!');
      console.log('💡 Vous devez exécuter le script init.js pour initialiser les produits.');
      console.log('   Commande: mongosh -u admin -p H7Kmi12laf6. < backend/scripts/init.js');
      console.log('   OU: sudo docker exec -i mongodb-les-reves-bleus mongosh -u admin -p H7Kmi12laf6. < backend/scripts/init.js');
    } else {
      // Afficher quelques produits
      const products = await Product.find().limit(5);
      console.log('\n📋 Exemples de produits:');
      products.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   Catégorie: ${product.category}`);
        console.log(`   Prix: ${product.price}€`);
        console.log(`   Stock: ${product.stock}`);
        console.log(`   Image: ${product.image}`);
      });
    }

    // Fermer la connexion
    await mongoose.connection.close();
    console.log('\n✅ Vérification terminée');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

checkProducts();

