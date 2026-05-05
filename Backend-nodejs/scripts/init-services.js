/**
 * Script d'initialisation de la table services et des 4 services par défaut
 * Exécuter: node scripts/init-services.js
 */
import mariadb from 'mariadb';
import dotenv from 'dotenv';

dotenv.config();

const pool = mariadb.createPool({
  host: process.env.MARIADB_HOST || 'localhost',
  user: process.env.MARIADB_USER || 'root',
  password: process.env.MARIADB_PASSWORD || '',
  database: process.env.MARIADB_DATABASE || 'DRB',
  port: parseInt(process.env.MARIADB_PORT || '3306'),
  connectionLimit: 2,
  connectTimeout: 10000,
});

const DEFAULT_SERVICES = [
  {
    name: 'Épilation Cocker',
    description: 'Épilation spécialisée pour cocker anglais avec soins adaptés.',
    price: '90€',
    duration: '2h - 3h',
    details: JSON.stringify([
      'Épilation complète du corps',
      'Bain avec shampooing adapté',
      'Séchage et brushing professionnel',
      'Coupe des griffes',
      'Nettoyage des oreilles'
    ]),
    sort_order: 1
  },
  {
    name: '1ère Épilation Cocker',
    description: 'Première épilation pour cocker avec soins particuliers.',
    price: '110€',
    duration: '3h - 4h',
    details: JSON.stringify([
      'Épilation complète première fois',
      'Soins particuliers pour adaptation',
      'Bain et séchage professionnel',
      "Conseils d'entretien",
      'Suivi personnalisé'
    ]),
    sort_order: 2
  },
  {
    name: 'Tonte',
    description: 'Tonte adaptée selon vos souhaits et la race de votre chien.',
    price: '70€',
    duration: '1h30 - 2h',
    details: JSON.stringify([
      'Tonte personnalisée',
      'Finitions aux ciseaux',
      'Brossage complet',
      'Coupe des griffes'
    ]),
    sort_order: 3
  },
  {
    name: 'Supplément Démêlage',
    description: "Démêlage supplémentaire selon l'état du pelage de votre chien.",
    price: '15€ - 30€',
    duration: '30min - 1h',
    details: JSON.stringify([
      "Évaluation de l'état du pelage",
      'Démêlage progressif et doux',
      'Soins hydratants',
      'Brossage final'
    ]),
    sort_order: 4
  }
];

async function init() {
  let conn;
  try {
    console.log('📦 Connexion à la base de données...');
    conn = await pool.getConnection();
    console.log('✅ Connecté');

    console.log('📦 Création de la table services...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price VARCHAR(50) DEFAULT '',
        duration VARCHAR(50) DEFAULT '',
        details LONGTEXT,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table services créée');

    const rows = await conn.query('SELECT COUNT(*) as count FROM services');
    const count = Number(rows[0]?.count ?? rows[0]?.COUNT ?? 0);
    if (count > 0) {
      console.log('ℹ️  La table contient déjà des services. Pas d\'insertion.');
      return;
    }

    console.log('📝 Insertion des 4 services par défaut...');
    for (const s of DEFAULT_SERVICES) {
      await conn.query(
        `INSERT INTO services (name, description, price, duration, details, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [s.name, s.description, s.price, s.duration, s.details, s.sort_order]
      );
    }
    console.log('✅ 4 services insérés avec succès');
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    if (err.code) console.error('   Code:', err.code);
    if (err.errno) console.error('   Errno:', err.errno);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

init();
