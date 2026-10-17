import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getApiUrl } from '../utils/security';

// Même règle que le backend (routes/admin.js → checkAdminPassword)
const rules = [
  { label: 'Au moins 10 caractères', test: (p: string) => p.length >= 10 },
  { label: 'Au moins une lettre', test: (p: string) => /\p{L}/u.test(p) },
  { label: 'Au moins un caractère spécial (ex. ! ? @ # - _ .)', test: (p: string) => /[^\p{L}\p{N}\s]/u.test(p) },
];

// Le token est dans le fragment (#token=...) : jamais envoyé au serveur dans l'URL ni dans le Referer
const getToken = () => new URLSearchParams(window.location.hash.slice(1)).get('token') || '';

function AdminResetPassword() {
  const [token] = useState(getToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [doneUsername, setDoneUsername] = useState<string | null>(null);
  const API_URL = getApiUrl();

  const allRulesOk = rules.every((r) => r.test(password)) && password.length <= 72;
  const matches = password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!allRulesOk) return setError('Le mot de passe ne respecte pas les règles.');
    if (!matches) return setError('Les deux mots de passe ne sont pas identiques.');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Erreur lors de la réinitialisation');
      }
      // Retire le token de la barre d'adresse et de l'historique
      window.history.replaceState(null, '', window.location.pathname);
      setDoneUsername(data.username || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h2>
          <p className="text-gray-600">Espace administrateur</p>
        </div>

        {doneUsername !== null ? (
          <div className="space-y-6 text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              Mot de passe modifié avec succès.
              {doneUsername && (
                <>
                  <br />
                  Votre nom d'utilisateur : <strong>{doneUsername}</strong>
                </>
              )}
            </div>
            <Link to="/admin-panel" className="button-primary w-full inline-block">
              Se connecter
            </Link>
          </div>
        ) : !token ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Lien invalide. Demandez un nouveau lien à votre administrateur.
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input w-full"
                />
              </div>
              <ul className="text-sm space-y-1">
                {rules.map((r) => (
                  <li key={r.label} className={r.test(password) ? 'text-green-600' : 'text-gray-500'}>
                    {r.test(password) ? '✓' : '•'} {r.label}
                  </li>
                ))}
              </ul>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  maxLength={72}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="form-input w-full"
                />
                {confirm && !matches && (
                  <p className="text-sm text-red-600 mt-1">Les deux mots de passe ne sont pas identiques.</p>
                )}
              </div>
            </div>
            <button type="submit" disabled={loading || !allRulesOk || !matches} className="button-primary w-full">
              {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default AdminResetPassword;
