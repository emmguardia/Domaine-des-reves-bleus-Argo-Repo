const ALLOWED_API_URLS = [
  'https://domainedesrevesbleus.eu/api',
  'https://api.domainedesrevesbleus.eu',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
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
    if (import.meta.env.DEV) {
      console.warn(`Configuration API invalide: ${envUrl}. Utilisation de l'URL par défaut.`);
    }
    return 'http://localhost:8000';
  }
  return 'http://localhost:8000';
};
// Détermine si une clé doit être encodée. Insensible à la casse : avant, le test
// `key.includes('token')` laissait passer adminToken/authToken (T majuscule), qui
// étaient donc stockés EN CLAIR au lieu d'être obfusqués.
const isSensitiveKey = (key: string): boolean => {
  const k = key.toLowerCase();
  return k.includes('token') || k.includes('password') || k.includes('secret');
};

export const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      if (isSensitiveKey(key)) {
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
      if (isSensitiveKey(key)) {
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

/**
 * Fetch pour les routes admin - ajoute le token et redirige vers login en cas de 401
 */
export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = secureStorage.getItem('adminToken');
  if (!token) {
    secureStorage.removeItem('adminToken');
    secureStorage.removeItem('adminUser');
    window.location.href = '/admin-panel';
    return new Response(null, { status: 401 });
  }
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    secureStorage.removeItem('adminToken');
    secureStorage.removeItem('adminUser');
    window.location.href = '/admin-panel';
  }
  return response;
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some((type) => {
    if (type.endsWith('/*')) return file.type.startsWith(type.slice(0, -1));
    return file.type === type;
  });
}

export function validateFileSize(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}
