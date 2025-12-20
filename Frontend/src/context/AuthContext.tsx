import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (firstName: string, lastName: string, phone: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://domainedesrevesbleus.famillemntmata.eu';

// Créer un événement personnalisé pour la mise à jour de l'état
const AUTH_STATE_CHANGED = 'authStateChanged';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Fonction pour mettre à jour l'état utilisateur
  const updateUserState = (userData: User | null) => {
    if (import.meta.env.DEV) {
      console.log('Mise à jour de l\'état utilisateur:', userData);
    }
    setUser(userData);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', userData.token);
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    // Déclencher l'événement de changement d'état
    window.dispatchEvent(new CustomEvent(AUTH_STATE_CHANGED, { detail: userData }));
  };

  // Fonction pour vérifier si un token JWT est expiré
  const isTokenExpired = (token: string): boolean => {
    try {
      // Décoder le token JWT (il est en format base64url)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return true; // Token invalide
      }
      
      // Décoder le payload (partie 2 du token)
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // Vérifier l'expiration
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        if (import.meta.env.DEV) {
          console.log('Token expiré:', payload.exp, 'vs', currentTime);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error);
      return true; // Si on ne peut pas décoder, on considère qu'il est invalide
    }
  };

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Vérification de l\'état de connexion au chargement...');
    }
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      try {
        // Vérifier si le token est expiré
        if (isTokenExpired(storedToken)) {
          if (import.meta.env.DEV) {
            console.log('Token expiré, déconnexion automatique...');
          }
          updateUserState(null);
          return;
        }
        
        const userData = JSON.parse(storedUser);
        if (import.meta.env.DEV) {
          console.log('Utilisateur trouvé dans le stockage local:', userData);
        }
        updateUserState(userData);
      } catch (error) {
        console.error('Erreur lors de la récupération des données utilisateur:', error);
        updateUserState(null);
      }
    } else {
      if (import.meta.env.DEV) {
        console.log('Aucun utilisateur trouvé dans le stockage local');
      }
      updateUserState(null);
    }
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    if (import.meta.env.DEV) {
      console.log('Tentative de connexion avec:', email, 'rememberMe:', rememberMe);
    }
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
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
      if (import.meta.env.DEV) {
        console.log('Réponse du serveur:', data);
      }

      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      if (import.meta.env.DEV) {
        console.log('Connexion réussie, mise à jour de l\'état...');
      }
      updateUserState(data);
      
      // Si rememberMe est true, on stocke les informations dans localStorage
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
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

    // Validation du prénom et du nom
    if (!data.firstName.trim() || !data.lastName.trim()) {
      errors.push('Le prénom et le nom de famille sont requis');
    }

    // Validation du téléphone
    if (!/^[0-9]{10}$/.test(data.phone.replace(/\s/g, ''))) {
      errors.push('Le numéro de téléphone doit contenir exactement 10 chiffres');
    }

    // Validation de l'email
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

    // Validation des autres champs
    const validationErrors = validateRegistrationData(registrationData);
    if (validationErrors.length > 0) {
      throw new Error(JSON.stringify(validationErrors));
    }

    // Validation spécifique du mot de passe
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(JSON.stringify([passwordValidation.message]));
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
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
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('token', data.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    console.log('Déconnexion...');
    updateUserState(null);
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Vérifier si le token est expiré avant de faire la requête
      if (isTokenExpired(token)) {
        if (import.meta.env.DEV) {
          console.log('Token expiré lors du rafraîchissement, déconnexion...');
        }
        updateUserState(null);
        return;
      }
      
      const response = await fetch(`${API_URL}/api/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Si la réponse est 401, le token est invalide ou expiré
      if (response.status === 401) {
        console.log('Token invalide (401), déconnexion...');
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
      console.error('Erreur lors de la mise à jour des informations utilisateur:', e);
      // En cas d'erreur réseau ou autre, vérifier si c'est une erreur d'authentification
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