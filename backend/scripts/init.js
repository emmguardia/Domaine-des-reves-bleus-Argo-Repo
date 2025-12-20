// Script MongoDB pour initialiser l'admin et les produits
// À exécuter avec: mongosh -u admin -p H7Kmi12laf6. < init.js
// OU: sudo docker exec -i mongodb-les-reves-bleus mongosh -u admin -p H7Kmi12laf6. < init.js

// Utiliser la base de données
use('les_reves_bleus');

// ============================================
// CRÉATION DE L'ADMIN
// ============================================
// Mot de passe: 9cku6XMJqmdMgs*.
// IMPORTANT: Le hash doit être généré avec bcrypt (12 rounds)
// Pour générer le hash, utilisez Node.js:
// node -e "import('bcryptjs').then(bcrypt => bcrypt.default.hash('9cku6XMJqmdMgs*.', 12).then(h => console.log(h)))"

// Supprimer l'admin existant s'il existe
db.admins.deleteOne({ username: "Laurence" });

// Insérer l'admin avec le mot de passe hashé
// Hash bcrypt généré pour le mot de passe: 9cku6XMJqmdMgs*.
db.admins.insertOne({
  username: "Laurence",
  password: "$2a$12$MAOeVTIVrOyNBledKLSV/O6HfJmSLly4kquVR/TKyLYYzJ6yJHB3e",
  createdAt: new Date(),
  updatedAt: new Date()
});

// ============================================
// CRÉATION DES PRODUITS
// ============================================

// Supprimer les produits existants (optionnel)
db.products.deleteMany({});

// Insérer tous les produits
db.products.insertMany([
  {
    name: "Carde double flex",
    description: "Carde professionnelle double face pour démêler efficacement",
    price: 21.00,
    image: "/images/Carde_double_flex.jpg",
    rating: 5,
    category: "Accessoires",
    weightGrams: 175,
    stock: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Carde à nœud",
    description: "Carde spécialement conçue pour éliminer les nœuds tenaces",
    price: 21.00,
    image: "/images/Carde_à_nœuds.jpg",
    rating: 5,
    category: "Accessoires",
    weightGrams: 60,
    stock: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Peigne",
    description: "Peigne professionnel pour finition et démêlage",
    price: 7.50,
    image: "/images/Peigne.jpg",
    rating: 4,
    category: "Accessoires",
    weightGrams: 90,
    stock: 15,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Coat prince 20 dents",
    description: "Peigne Coat Prince professionnel 20 dents pour toilettage précis",
    price: 35.50,
    image: "/images/Coat_prince_20_dents.jpg",
    rating: 5,
    category: "Accessoires",
    weightGrams: 115,
    stock: 8,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Coupe nœud",
    description: "Ciseaux spécialisés pour couper les nœuds sans blesser",
    price: 11.00,
    image: "/images/coupe_noeud.png",
    rating: 4,
    category: "Accessoires",
    weightGrams: 60,
    stock: 12,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Crochets à tique",
    description: "Outils professionnels pour retirer les tiques en toute sécurité",
    price: 7.00,
    image: "/images/Crochets_a_tique.jpg",
    rating: 4,
    category: "Accessoires",
    weightGrams: 30,
    stock: 20,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Spray Conditionneur",
    description: "Produit sublime pour éclat et brillance du pelage",
    price: 20.50,
    image: "/images/Spray_Conditionneur.jpg",
    rating: 4,
    category: "Soins Et Parfums",
    weightGrams: 285,
    stock: 15,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Lotion Aloe Vera",
    description: "Lotion démêlante enrichie à l'aloe vera pour faciliter le brossage",
    price: 16.00,
    image: "/images/Lotion_Aloe_Vera.jpg",
    rating: 5,
    category: "Soins Et Parfums",
    volumes: { "250ml": 16.00 },
    weightGrams: 285,
    stock: 12,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Lotion Argan",
    description: "Shampooing doux enrichi à l'aloe vera pour tous types de poils",
    price: 16.00,
    image: "/images/Lotion_Argan.jpg",
    rating: 5,
    category: "Soins Et Parfums",
    volumes: { "250ml": 16.00 },
    weightGrams: 285,
    stock: 12,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Crème Argan",
    description: "Crème démêlante enrichie à l'argan pour faciliter le brossage",
    price: 16.00,
    image: "/images/Crème_Argan.jpg",
    rating: 5,
    category: "Soins Et Parfums",
    volumes: { "250ml": 16.00 },
    weightGrams: 275,
    stock: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Crème Aloe Vera",
    description: "Crème démêlante enrichie à l'aloe vera pour faciliter le brossage",
    price: 16.00,
    image: "/images/Crème_Aloe_Vera.jpg",
    rating: 5,
    category: "Soins Et Parfums",
    volumes: { "250ml": 16.00 },
    weightGrams: 275,
    stock: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Shampoing Aloe Vera",
    description: "Shampooing doux enrichi à l'aloe vera pour tous types de poils",
    price: 12.50,
    image: "/images/Shampoing_Aloe_Vera.jpg",
    rating: 5,
    category: "Shampoings",
    volumes: { "250ml": 12.50 },
    weightGrams: 280,
    stock: 15,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Shampoing Forty",
    description: "Shampooing professionnel forty pour tous types de poils",
    price: 12.50,
    image: "/images/Shampoing_Forty.jpg",
    category: "Shampoings",
    volumes: { "250ml": 12.50 },
    weightGrams: 280,
    stock: 15,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Shampooing Copacabana",
    description: "Shampooing copacabana pour poils brillants et soyeux",
    price: 12.50,
    image: "/images/Shampoing_Forty.jpg",
    category: "Shampoings",
    volumes: { "250ml": 12.50 },
    weightGrams: 280,
    isPlaceholder: true,
    stock: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Shampoing Argan",
    description: "Shampooing doux à l'argan pour peaux sensibles",
    price: 12.50,
    image: "/images/Shampoing_Argan.jpg",
    rating: 4,
    category: "Shampoings",
    volumes: { "250ml": 12.50 },
    weightGrams: 280,
    stock: 15,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Shampooing Amandes",
    description: "Shampooing doux aux amandes pour peaux sensibles",
    price: 12.50,
    image: "/images/Shampoing_Amandes.jpg",
    rating: 4,
    category: "Shampoings",
    volumes: { "250ml": 12.50 },
    weightGrams: 280,
    stock: 15,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Parfum",
    description: "Parfum délicat pour chiens, senteur fraîche et durable",
    price: 8.00,
    image: "/images/Parfum.jpg",
    rating: 4,
    category: "Soins Et Parfums",
    weightGrams: 30,
    fragrances: {
      "Malabar": { name: "Malabar", description: "Senteur exotique et envoûtante" },
      "Bamboo": { name: "Bamboo", description: "Senteur de bambou apaisante et naturelle" },
      "Boo Tella": { name: "Boo Tella", description: "Senteur gourmande et réconfortante" },
      "Pitchoun": { name: "Pitchoun", description: "Senteur douce et tendre, parfait pour les petits chiens" },
      "Mimosa": { name: "Mimosa", description: "Senteur florale printanière et délicate" },
      "Pelluche": { name: "Pelluche", description: "Senteur douce et câline, comme un doudou parfumé" },
      "Pomme": { name: "Pomme", description: "Senteur fruitée et fraîche de pomme croquante" },
      "Scarlett": { name: "Scarlett", description: "Senteur élégante et sophistiquée" },
      "Lulu": { name: "Lulu", description: "Senteur joyeuse et pétillante" }
    },
    stock: 25,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print("✅ Initialisation terminée avec succès!");
print("   - Admin créé: Laurence");
print("   - Produits insérés: 17");

