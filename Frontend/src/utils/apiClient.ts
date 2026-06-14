import { getApiUrl } from './security';
import { getCSRFToken } from './csrf';
import { checkRateLimit } from './rateLimiter';
import { logger } from './logger';
interface RequestOptions extends RequestInit {
  skipRateLimit?: boolean;
  skipCSRF?: boolean;
}
export const apiClient = {
  async request(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    const { skipRateLimit = false, skipCSRF = false, ...fetchOptions } = options;
    const url = `${getApiUrl()}${endpoint}`;
    const rateLimitKey = `api_${endpoint}_${Date.now()}`;
    if (!skipRateLimit && !checkRateLimit(rateLimitKey, 'api')) {
      throw new Error('Trop de requêtes. Veuillez patienter.');
    }
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };
    if (!skipCSRF) {
      const csrfToken = getCSRFToken();
      headers['X-CSRF-Token'] = csrfToken;
    }
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
      if (response.status === 401) {
        const secureStorage = (await import('./security')).secureStorage;
        secureStorage.removeItem('token');
        secureStorage.removeItem('adminToken');
        window.location.href = '/login';
      }
      return response;
    } catch (error) {
      logger.error('Erreur API:', error);
      throw error;
    }
  },
  async get(endpoint: string, options?: RequestOptions): Promise<Response> {
    return this.request(endpoint, { ...options, method: 'GET' });
  },
  async post(endpoint: string, data?: unknown, options?: RequestOptions): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async put(endpoint: string, data?: unknown, options?: RequestOptions): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async delete(endpoint: string, options?: RequestOptions): Promise<Response> {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },
};
