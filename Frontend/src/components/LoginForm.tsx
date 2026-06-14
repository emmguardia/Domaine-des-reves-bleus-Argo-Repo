import React, { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { FaLock, FaEnvelope } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import ForgotPasswordForm from './ForgotPasswordForm';
import { logger } from '../utils/logger';
import { checkRateLimit, getRemainingAttempts } from '../utils/rateLimiter';
const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setRateLimitError(null);
    logger.log('Tentative de connexion...');
    const rateLimitKey = `login_${email}`;
    if (!checkRateLimit(rateLimitKey, 'login')) {
      const remaining = getRemainingAttempts(rateLimitKey, 'login');
      setRateLimitError(`Trop de tentatives. Réessayez plus tard. (${remaining} tentatives restantes)`);
      return;
    }
    try {
      const result = await login(email, password, rememberMe);
      logger.log('Résultat de la connexion reçu');
      if (result.success) {
        logger.log('Connexion réussie');
        setSuccess(true);
        setTimeout(() => {
          logger.log('Redirection vers la page d\'accueil...');
          navigate('/');
        }, 1500);
      } else {
        logger.log('Erreur de connexion');
        setError(result.error || 'Une erreur est survenue lors de la connexion');
      }
    } catch (err) {
      logger.error('Erreur lors de la connexion:', err);
      setError('Une erreur est survenue lors de la connexion');
    }
  };
  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }
  return (
    <main className="pt-24 pb-12 min-h-screen bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-center mb-8">Connexion</h2>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
                {error}
              </div>
            )}
            {rateLimitError && (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 text-orange-600 rounded-lg">
                {rateLimitError}
              </div>
            )}
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Succès !</strong>
                <span className="block sm:inline"> Connexion réussie. Redirection...</span>
              </div>
            )}
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
              onSubmit={handleSubmit}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="flex items-center space-x-2">
                  <FaEnvelope className="h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input pl-24 placeholder:pl-5 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="flex items-center space-x-2">
                  <FaLock className="h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input pl-24 placeholder:pl-5 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox text-primary"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="ml-2 text-gray-600">Se souvenir de moi</span>
                </label>
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-primary hover:text-primary-600"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <button
                type="submit"
                className="button-primary w-full py-3 px-4 bg-primary text-white rounded-md hover:bg-accent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Se connecter
              </button>
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Pas encore de compte ?{' '}
                  <Link to="/register" className="text-primary hover:text-accent font-medium">
                    S'inscrire
                  </Link>
                </p>
              </div>
            </motion.form>
          </motion.div>
        </div>
      </div>
    </main>
  );
};
export default LoginForm;
