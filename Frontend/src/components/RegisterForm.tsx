import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaPhone, FaLock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { checkRateLimit, getRemainingAttempts } from '../utils/rateLimiter';
const RegisterForm: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  const validatePhone = (phone: string) => {
    return /^\d{10}$/.test(phone);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRateLimitError(null);
    const rateLimitKey = `register_${email}`;
    if (!checkRateLimit(rateLimitKey, 'register')) {
      const remaining = getRemainingAttempts(rateLimitKey, 'register');
      setRateLimitError(`Trop de tentatives. Réessayez plus tard. (${remaining} tentatives restantes)`);
      return;
    }
    if (!validateEmail(email)) {
      setError("Format d'email invalide");
      return;
    }
    if (!validatePhone(phone)) {
      setError('Le numéro de téléphone doit contenir exactement 10 chiffres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      await register(firstName, lastName, phone, email, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      if (err instanceof Error) {
        try {
          const errorMessages = JSON.parse(err.message);
          if (Array.isArray(errorMessages)) {
            setError(errorMessages.join('\n'));
          } else {
            setError(errorMessages.message || "Une erreur est survenue lors de l'inscription");
          }
        } catch {
          setError("Une erreur est survenue lors de l'inscription");
        }
      } else {
        setError("Une erreur est survenue lors de l'inscription");
      }
    }
  };
  return (
    <main className="pt-24 pb-12 min-h-screen bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-center mb-8">Inscription</h2>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
                {error.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
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
                <span className="block sm:inline"> Inscription réussie. Redirection vers la page d'accueil...</span>
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
                  Prénom
                </label>
                <div className="flex items-center space-x-2">
                  <FaUser className="h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="form-input w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Entrez votre prénom"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <div className="flex items-center space-x-2">
                  <FaUser className="h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="form-input w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Entrez votre nom"
                    required
                  />
                </div>
              </div>
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
                    className="form-input w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Entrez votre email"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <div className="flex items-center space-x-2">
                  <FaPhone className="h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Entrez votre numéro de téléphone"
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
                  <div className="flex-1">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Entrez votre mot de passe"
                      required
                    />
                    <PasswordStrengthMeter password={password} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <div className="flex items-center space-x-2">
                  <FaLock className="h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Confirmez votre mot de passe"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="button-primary w-full py-3 px-4 bg-primary text-white rounded-md hover:bg-accent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                S'inscrire
              </button>
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Déjà inscrit ?{' '}
                  <Link to="/login" className="text-primary hover:text-accent font-medium">
                    Se connecter
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
export default RegisterForm; 