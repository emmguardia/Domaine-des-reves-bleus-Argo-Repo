const ALLOWED_API_URLS = [
  'https:
  'https:
  'http:
  'http:
];
export const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  const isProduction = typeof window !== 'undefined' && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1');
  if (isProduction || import.meta.env.PROD) {
    return '';
  }
  if (envUrl && ALLOWED_API_URLS.includes(envUrl)) {
    return envUrl;
  }
  if (envUrl && !ALLOWED_API_URLS.includes(envUrl)) {
    console.warn(`Configuration API invalide: ${envUrl}. Utilisation de l'URL par défaut.`);
    return 'http:
  }
  return 'http:
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
