import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const MAX_PASSWORD_LENGTH = 72; // Limite de bcrypt

/**
 * Hash un mot de passe avec bcrypt
 */
export const hashPassword = async (password) => {
  try {
    // Tronquer le mot de passe à 72 caractères (limite de bcrypt)
    const passwordBytes = Buffer.from(password, 'utf-8').slice(0, MAX_PASSWORD_LENGTH);
    const passwordTruncated = passwordBytes.toString('utf-8', 0, passwordBytes.length);
    
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashed = await bcrypt.hash(passwordTruncated, salt);
    return hashed;
  } catch (error) {
    console.error('Erreur lors du hashage du mot de passe:', error);
    throw new Error('Erreur lors du hashage du mot de passe');
  }
};

/**
 * Vérifie un mot de passe avec bcrypt
 */
export const verifyPassword = async (password, hashedPassword) => {
  try {
    // Tronquer le mot de passe à 72 caractères (limite de bcrypt)
    const passwordBytes = Buffer.from(password, 'utf-8').slice(0, MAX_PASSWORD_LENGTH);
    const passwordTruncated = passwordBytes.toString('utf-8', 0, passwordBytes.length);
    
    return await bcrypt.compare(passwordTruncated, hashedPassword);
  } catch (error) {
    console.error('Erreur lors de la vérification du mot de passe:', error);
    return false;
  }
};
