import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiUrl } from '../utils/security';
import { secureStorage } from '../utils/security';
import { logger } from '../utils/logger';
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  token: string;
  defaultAddress?: string;
}
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (firstName: string, lastName: string, phone: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
const AUTH_STATE_CHANGED = 'authStateChanged';
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const updateUserState = (userData: User | null) => {
    logger.log('Mise à jour de l\'état utilisateur');
    setUser(userData);
    if (userData) {
      secureStorage.setItem('user', JSON.stringify(userData));
      secureStorage.setItem('token', userData.token);
    } else {
      secureStorage.removeItem('user');
      secureStorage.removeItem('token');
    }
    window.dispatchEvent(new CustomEvent(AUTH_STATE_CHANGED, { detail: userData }));
  };
  const isTokenExpired = (token: string): boolean => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return true; 
      }
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        logger.log('Token expiré');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Erreur lors de la vérification du token:', error);
      return true; 
    }
  };
  useEffect(() => {
    logger.log('Vérification de l\'état de connexion au chargement...');
    const storedUser = secureStorage.getItem('user');
    const storedToken = secureStorage.getItem('token');
    if (storedUser && storedToken) {
      try {
        if (isTokenExpired(storedToken)) {
          logger.log('Token expiré, déconnexion automatique...');
          updateUserState(null);
          return;
        }
        const userData = JSON.parse(storedUser);
        logger.log('Utilisateur trouvé dans le stockage local');
        updateUserState(userData);
      } catch (error) {
        logger.error('Erreur lors de la récupération des données utilisateur:', error);
        updateUserState(null);
      }
    } else {
      logger.log('Aucun utilisateur trouvé dans le stockage local');
      updateUserState(null);
    }
  }, []);

  // Vérification périodique de l'expiration du token (toutes les 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      const token = secureStorage.getItem('token');
      if (token && isTokenExpired(token)) {
        logger.log('Token expiré (vérification périodique), déconnexion automatique...');
        updateUserState(null);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);
  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    logger.log('Tentative de connexion');
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Réponse non-JSON reçue du serveur');
      }
      const data = await response.json();
      logger.log('Réponse du serveur reçue');
      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }
      logger.log('Connexion réussie, mise à jour de l\'état...');
      updateUserState(data);
      if (rememberMe) {
        secureStorage.setItem('rememberMe', 'true');
      } else {
        secureStorage.removeItem('rememberMe');
      }
      return { success: true };
    } catch (error) {
      logger.error('Erreur lors de la connexion:', error);
      if (error instanceof Error) {
        try {
          const errorData = JSON.parse(error.message);
          return { success: false, error: Array.isArray(errorData) ? errorData[0].msg : errorData.msg };
        } catch {
          return { success: false, error: 'Une erreur est survenue lors de la connexion' };
        }
      }
      return { success: false, error: 'Une erreur est survenue lors de la connexion' };
    }
  };
  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 8) {
      return { isValid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);
    if (!hasUpperCase || !hasLowerCase || !hasDigit || !hasSpecialChar) {
      return { 
        isValid: false, 
        message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)' 
      };
    }
    return { isValid: true, message: 'Mot de passe valide !' };
  };
  const validateRegistrationData = (data: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    password: string;
  }): string[] => {
    const errors: string[] = [];
    if (!data.firstName.trim() || !data.lastName.trim()) {
      errors.push('Le prénom et le nom de famille sont requis');
    }
    if (!/^[0-9]{10}$/.test(data.phone.replace(/\s/g, ''))) {
      errors.push('Le numéro de téléphone doit contenir exactement 10 chiffres');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Format d\'email invalide');
    }
    return errors;
  };
  const register = async (firstName: string, lastName: string, phone: string, email: string, password: string) => {
    const registrationData = {
      firstName,
      lastName,
      phone,
      email,
      password,
      username: email
    };
    const validationErrors = validateRegistrationData(registrationData);
    if (validationErrors.length > 0) {
      throw new Error(JSON.stringify(validationErrors));
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(JSON.stringify([passwordValidation.message]));
    }
    const response = await fetch(`${getApiUrl()}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Réponse non-JSON reçue du serveur');
    }
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }
    const data = await response.json();
    setUser(data);
    secureStorage.setItem('user', JSON.stringify(data));
    secureStorage.setItem('token', data.token);
  };
  const logout = () => {
    logger.log('Déconnexion...');
    updateUserState(null);
  };
  const refreshUser = async () => {
    try {
      const token = secureStorage.getItem('token');
      if (!token) return;
      if (isTokenExpired(token)) {
        logger.log('Token expiré lors du rafraîchissement, déconnexion...');
        updateUserState(null);
        return;
      }
      const response = await fetch(`${getApiUrl()}/api/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        logger.log('Token invalide (401), déconnexion...');
        updateUserState(null);
        return;
      }
      if (!response.ok) return;
      const data = await response.json();
      const normalized = {
        ...(user || {}),
        ...data,
        token: token,
      } as User;
      updateUserState(normalized);
    } catch (e) {
      logger.error('Erreur lors de la mise à jour des informations utilisateur:', e);
      if (e instanceof Error && e.message.includes('401')) {
        updateUserState(null);
      }
    }
  };
  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}; 