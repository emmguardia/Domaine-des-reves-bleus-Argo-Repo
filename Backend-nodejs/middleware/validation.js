import { body, param, query, validationResult } from 'express-validator';

// Réexporter les validateurs pour faciliter les imports
export { body, param, query };

/**
 * Middleware pour gérer les erreurs de validation
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Erreur de validation',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Validations pour l'authentification
 */
export const validateRegister = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('Le prénom est requis')
    .isLength({ min: 2, max: 100 }).withMessage('Le prénom doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/).withMessage('Le prénom contient des caractères invalides'),
  
  body('lastName')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/).withMessage('Le nom contient des caractères invalides'),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Le numéro de téléphone est requis')
    .matches(/^[0-9]{10}$/).withMessage('Le numéro de téléphone doit contenir exactement 10 chiffres'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est requis')
    .isEmail().withMessage('Format d\'email invalide')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Le mot de passe est requis')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/).withMessage('Le mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre')
    .matches(/[@$!%*?&]/).withMessage('Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)'),
  
  handleValidationErrors
];

export const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est requis')
    .isEmail().withMessage('Format d\'email invalide')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Le mot de passe est requis'),
  
  handleValidationErrors
];

export const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est requis')
    .isEmail().withMessage('Format d\'email invalide')
    .normalizeEmail(),
  
  handleValidationErrors
];

export const validateResetPassword = [
  body('token')
    .trim()
    .notEmpty().withMessage('Le token est requis'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est requis')
    .isEmail().withMessage('Format d\'email invalide')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Le mot de passe est requis')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/).withMessage('Le mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre')
    .matches(/[@$!%*?&]/).withMessage('Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)'),
  
  handleValidationErrors
];

/**
 * Validations pour les produits
 */
export const validateProductId = [
  param('product_id')
    .isInt({ min: 1 }).withMessage('L\'ID du produit doit être un entier positif'),
  
  handleValidationErrors
];

export const validateCreateProduct = [
  body('name')
    .trim()
    .notEmpty().withMessage('Le nom du produit est requis')
    .isLength({ min: 2, max: 255 }).withMessage('Le nom doit contenir entre 2 et 255 caractères'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('La description est requise')
    .isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caractères'),
  
  body('price')
    .isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif'),
  
  body('image')
    .trim()
    .notEmpty().withMessage('L\'image est requise')
    .custom((value) => {
      if (value.startsWith('data:image/') && value.includes(';base64,')) return true;
      if (value.startsWith('http://') || value.startsWith('https://')) return true;
      return false;
    }).withMessage('L\'image doit être une URL valide ou une image uploadée.'),
  
  body('category')
    .trim()
    .notEmpty().withMessage('La catégorie est requise'),
  
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Le stock doit être un entier positif ou nul'),
  
  body('weightGrams')
    .optional()
    .isInt({ min: 1 }).withMessage('Le poids doit être un entier positif'),
  
  handleValidationErrors
];

/**
 * Validations pour le panier
 */
export const validateCartItem = [
  body('items').isArray().withMessage('Les items doivent être un tableau'),
  body('items.*.id').isInt({ min: 1 }).withMessage('L\'ID de l\'item doit être un entier positif'),
  body('items.*.name').trim().notEmpty().withMessage('Le nom de l\'item est requis'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('La quantité doit être un entier positif'),
  // image optionnelle : si vide/absente, le backend fait COALESCE(ci.image, p.image)
  // pour récupérer l'image depuis la table products. Cela évite d'envoyer
  // des images base64 (parfois 200KB+) dans le corps du POST → plus de 413.
  body('items.*.image').optional().trim(),

  handleValidationErrors
];

/**
 * Validations pour les adresses
 */
export const validateAddressId = [
  param('address_id')
    .isInt({ min: 1 }).withMessage('L\'ID de l\'adresse doit être un entier positif'),
  
  handleValidationErrors
];

export const validateCreateAddress = [
  body('label')
    .trim()
    .notEmpty().withMessage('Le libellé est requis')
    .isLength({ min: 2, max: 100 }).withMessage('Le libellé doit contenir entre 2 et 100 caractères'),
  
  body('firstName')
    .trim()
    .notEmpty().withMessage('Le prénom est requis')
    .isLength({ min: 2, max: 100 }).withMessage('Le prénom doit contenir entre 2 et 100 caractères'),
  
  body('lastName')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Le numéro de téléphone est requis')
    .matches(/^[0-9]{10}$/).withMessage('Le numéro de téléphone doit contenir exactement 10 chiffres'),
  
  body('address')
    .trim()
    .notEmpty().withMessage('L\'adresse est requise')
    .isLength({ min: 5, max: 500 }).withMessage('L\'adresse doit contenir entre 5 et 500 caractères'),
  
  body('city')
    .trim()
    .notEmpty().withMessage('La ville est requise')
    .isLength({ min: 2, max: 100 }).withMessage('La ville doit contenir entre 2 et 100 caractères'),
  
  body('postalCode')
    .trim()
    .notEmpty().withMessage('Le code postal est requis')
    .matches(/^[0-9]{5}$/).withMessage('Le code postal doit contenir exactement 5 chiffres'),
  
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Le pays doit contenir entre 2 et 100 caractères'),
  
  handleValidationErrors
];

/**
 * Validations pour les paiements
 */
export const validateCreatePaymentIntent = [
  body('amount')
    .isInt({ min: 1 }).withMessage('Le montant doit être un entier positif (en centimes)'),
  
  body('currency')
    .optional()
    .isIn(['eur', 'usd']).withMessage('La devise doit être EUR ou USD'),
  
  body('shippingCost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Les frais de livraison doivent être un nombre positif'),
  
  handleValidationErrors
];
