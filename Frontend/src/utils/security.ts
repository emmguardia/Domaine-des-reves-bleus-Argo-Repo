const ALLOWED_API_URLS = [
  'https://domainedesrevesbleus.eu',
  'https://api.domainedesrevesbleus.eu',
  'http://localhost:8000',
  'http://localhost:3002'
];

export const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // Détecter si on est en production (pas de localhost)
  const isProduction = typeof window !== 'undefined' && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1');
  
  // En production, utiliser une URL relative pour utiliser automatiquement le protocole de la page
  // Le nginx proxy routera /api/ vers le backend Kubernetes
  if (isProduction || import.meta.env.PROD) {
    // Retourner une chaîne vide pour utiliser des URLs relatives
    // Exemple: '' + '/api/cart' = '/api/cart' (URL relative qui utilisera HTTPS automatiquement)
    return '';
  }
  
  // En développement, utiliser l'URL de l'env ou localhost
  if (envUrl && ALLOWED_API_URLS.includes(envUrl)) {
    return envUrl;
  }
  
  if (envUrl && !ALLOWED_API_URLS.includes(envUrl)) {
    // Afficher un warning au lieu de throw pour ne pas bloquer l'application
    console.warn(`Configuration API invalide: ${envUrl}. Utilisation de l'URL par défaut.`);
    return 'http://localhost:8000';
  }
  
  // Par défaut en développement
  return 'http://localhost:8000';
};

export const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      if (key.includes('token') || key.includes('password') || key.includes('secret')) {
        const encrypted = btoa(value);
        localStorage.setItem(key, encrypted);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Erreur lors du stockage sécurisé:', error);
    }
  },
  
  getItem: (key: string): string | null => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;
      
      if (key.includes('token') || key.includes('password') || key.includes('secret')) {
        try {
          return atob(value);
        } catch {
          return value;
        }
      }
      
      return value;
    } catch (error) {
      console.error('Erreur lors de la récupération sécurisée:', error);
      return null;
    }
  },
  
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  }
};

