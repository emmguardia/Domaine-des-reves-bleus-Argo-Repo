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

// Intercepter les erreurs console.error pour Stripe télémétrie
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  if (
    message.includes('r.stripe.com') ||
    message.includes('m.stripe.com') ||
    message.includes('ERR_BLOCKED_BY_ADBLOCKER') ||
    (message.includes('stripe') && message.includes('Failed to fetch'))
  ) {
    // Ignorer silencieusement
    return;
  }
  originalConsoleError.apply(console, args);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
    <CartProvider>
      <App />
    </CartProvider>
    </AuthProvider>
  </React.StrictMode>,
)