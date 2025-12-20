import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'

// Gestionnaire d'erreurs global pour filtrer les erreurs non critiques (Stripe télémétrie bloquée par adblockers)
window.addEventListener('error', (event) => {
  // Ignorer silencieusement les erreurs Stripe télémétrie bloquées par les adblockers
  const errorMessage = event.message || event.error?.message || '';
  const errorSource = event.filename || event.error?.stack || '';
  
  if (
    errorMessage.includes('r.stripe.com') ||
    errorMessage.includes('m.stripe.com') ||
    errorMessage.includes('ERR_BLOCKED_BY_ADBLOCKER') ||
    (errorMessage.includes('Failed to fetch') && (
      errorSource.includes('stripe') || 
      errorMessage.includes('stripe')
    )) ||
    errorSource.includes('stripe.com')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
}, true); // Utiliser capture phase pour intercepter plus tôt

// Gestionnaire pour les promesses rejetées non gérées
window.addEventListener('unhandledrejection', (event) => {
  // Ignorer silencieusement les erreurs Stripe télémétrie bloquées par les adblockers
  const errorMessage = event.reason?.message || event.reason?.toString() || '';
  const errorStack = event.reason?.stack || '';
  
  if (
    errorMessage.includes('r.stripe.com') ||
    errorMessage.includes('m.stripe.com') ||
    errorMessage.includes('ERR_BLOCKED_BY_ADBLOCKER') ||
    (errorMessage.includes('Failed to fetch') && (
      errorStack.includes('stripe') || 
      errorMessage.includes('stripe')
    )) ||
    errorStack.includes('stripe.com')
  ) {
    event.preventDefault();
    return false;
  }
});

// Intercepter les erreurs console.error pour Stripe télémétrie et gestionnaires de mots de passe
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  if (
    message.includes('r.stripe.com') ||
    message.includes('m.stripe.com') ||
    message.includes('ERR_BLOCKED_BY_ADBLOCKER') ||
    (message.includes('stripe') && message.includes('Failed to fetch')) ||
    message.includes('bootstrap-autofill-overlay') ||
    message.includes('insertBefore') ||
    message.includes('NotFoundError')
  ) {
    // Ignorer silencieusement
    return;
  }
  originalConsoleError.apply(console, args);
};

// Gestionnaire d'erreurs pour les gestionnaires de mots de passe (LastPass, 1Password, etc.)
window.addEventListener('error', (event) => {
  const errorMessage = event.message || event.error?.message || '';
  const errorSource = event.filename || event.error?.stack || '';
  
  // Ignorer les erreurs des gestionnaires de mots de passe
  if (
    errorMessage.includes('bootstrap-autofill-overlay') ||
    errorMessage.includes('insertBefore') ||
    errorMessage.includes('NotFoundError') ||
    errorSource.includes('autofill') ||
    errorSource.includes('password-manager')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
}, true);

// Gestionnaire pour les promesses rejetées des gestionnaires de mots de passe
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || event.reason?.toString() || '';
  const errorStack = event.reason?.stack || '';
  
  if (
    errorMessage.includes('bootstrap-autofill-overlay') ||
    errorMessage.includes('insertBefore') ||
    errorMessage.includes('NotFoundError') ||
    errorStack.includes('autofill')
  ) {
    event.preventDefault();
    return false;
  }
});

// Attendre que les styles soient chargés avant de rendre l'application
function waitForStyles() {
  return new Promise((resolve) => {
    // Fonction pour marquer les styles comme chargés
    const markStylesLoaded = () => {
      // Attendre que tous les stylesheets soient chargés
      const stylesheets = Array.from(document.styleSheets);
      const allLoaded = stylesheets.every(sheet => {
        try {
          return sheet.cssRules || sheet.rules; // Vérifier si le stylesheet est accessible
        } catch (e) {
          // Si on ne peut pas accéder (CORS), on considère qu'il est chargé
          return true;
        }
      });
      
      if (allLoaded || document.readyState === 'complete') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.body.classList.add('styles-loaded');
            resolve();
          });
        });
      } else {
        // Réessayer après un court délai
        setTimeout(markStylesLoaded, 50);
      }
    };
    
    // Si le document est déjà chargé
    if (document.readyState === 'complete') {
      markStylesLoaded();
    } else if (document.readyState === 'interactive') {
      // Attendre que tous les styles soient chargés
      window.addEventListener('load', markStylesLoaded);
      // Timeout de sécurité
      setTimeout(markStylesLoaded, 1000);
    } else {
      // Attendre que le DOM soit prêt puis que les styles soient chargés
      document.addEventListener('DOMContentLoaded', () => {
        window.addEventListener('load', markStylesLoaded);
        // Timeout de sécurité
        setTimeout(markStylesLoaded, 1000);
      });
    }
  });
}

// Attendre les styles puis rendre l'application
waitForStyles().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <AuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
      </AuthProvider>
    </React.StrictMode>,
  );
});