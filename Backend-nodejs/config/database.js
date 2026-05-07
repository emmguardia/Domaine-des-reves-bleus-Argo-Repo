import mariadb from 'mariadb';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔌 [DB] Initialisation du pool de connexions MariaDB...');
console.log('🔌 [DB] Host:', process.env.MARIADB_HOST || 'localhost');
console.log('🔌 [DB] Database:', process.env.MARIADB_DATABASE || 'DRB');
console.log('🔌 [DB] Port:', process.env.MARIADB_PORT || '3306');

let pool = null;

try {
  pool = mariadb.createPool({
    host: process.env.MARIADB_HOST || 'localhost',
    user: process.env.MARIADB_USER,           // Pas de fallback root
    password: process.env.MARIADB_PASSWORD,   // Pas de fallback vide
    database: process.env.MARIADB_DATABASE || 'DRB',
    port: parseInt(process.env.MARIADB_PORT || '3306'),
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    connectTimeout: 10000,
    reconnect: true,
    charset: 'utf8mb4',
    // SSL activé en production pour chiffrer le trafic vers MariaDB externe.
    // MARIADB_CA_CERT : certificat CA en base64 (optionnel, pour les self-signed).
    // En dev, SSL désactivé pour simplifier le setup local.
    ssl: process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: process.env.MARIADB_SSL_REJECT_UNAUTHORIZED !== 'false',
          ca: process.env.MARIADB_CA_CERT
            ? Buffer.from(process.env.MARIADB_CA_CERT, 'base64').toString('utf8')
            : undefined,
        }
      : false,
    permitLocalInfile: false,
    initSql: 'SET NAMES utf8mb4',
    compress: false,
    socketPath: undefined
  });
  
  pool.getConnection()
    .then(conn => {
      console.log('✅ [DB] Test de connexion réussi');
      conn.release();
    })
    .catch(err => {
      console.error('❌ [DB] Test de connexion échoué:', err.message);
      console.error('❌ [DB] Code:', err.code);
      console.error('❌ [DB] Errno:', err.errno);
      console.error('❌ [DB] SQLState:', err.sqlState);
    });
  
  console.log('✅ [DB] Pool de connexions créé');
} catch (error) {
  console.warn('⚠️  [DB] Erreur lors de la création du pool:', error.message);
  console.warn('⚠️  [DB] Le serveur démarrera mais les routes nécessitant la DB ne fonctionneront pas');
}

export const getConnection = async () => {
  try {
    const conn = await pool.getConnection();
    return conn;
  } catch (error) {
    console.error('[DB] Connection error:', error.message);
    throw error;
  }
};

export const query = async (sql, params = []) => {
  if (!pool) {
    throw new Error('Pool de connexions non initialisé. Vérifiez la configuration de la base de données.');
  }
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(sql, params);
    return result;
  } catch (error) {
    console.error('[DB] Query error:', error.message);
    console.error('[DB] Error code:', error.code);
    console.error('[DB] Error errno:', error.errno);
    console.error('[DB] Error sqlState:', error.sqlState);
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DB] SQL:', sql);
      console.error('[DB] Params:', params);
    }
    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

export const transaction = async (callback) => {
  if (!pool) {
    throw new Error('Pool de connexions non initialisé. Vérifiez la configuration de la base de données.');
  }
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    console.error('[DB] Transaction error:', error.message);
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        console.error('[DB] Rollback error:', rollbackError.message);
      }
    }
    throw error;
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch (releaseError) {
        console.error('[DB] Release error:', releaseError.message);
      }
    }
  }
};

export default pool;
