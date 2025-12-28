import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
window.addEventListener('error', (event) => {
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
    errorSource.includes('stripe.com') ||
    errorMessage.includes('Configuration API invalide') ||
    errorMessage.includes('Configuration API') ||
    errorMessage.includes('gtag') ||
    errorMessage.includes('googletagmanager') ||
    errorSource.includes('googletagmanager') ||
    errorSource.includes('google-analytics')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
}, true);
window.addEventListener('unhandledrejection', (event) => {
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
    errorStack.includes('stripe.com') ||
    errorMessage.includes('Configuration API invalide') ||
    errorMessage.includes('Configuration API') ||
    errorMessage.includes('gtag') ||
    errorMessage.includes('googletagmanager') ||
    errorStack.includes('googletagmanager') ||
    errorStack.includes('google-analytics')
  ) {
    event.preventDefault();
    return false;
  }
});
const originalConsoleError = console.error;
console.error = function(...args: any[]) {
  const message = args.join(' ');
  if (
    message.includes('r.stripe.com') ||
    message.includes('m.stripe.com') ||
    message.includes('ERR_BLOCKED_BY_ADBLOCKER') ||
    (message.includes('stripe') && message.includes('Failed to fetch')) ||
    message.includes('bootstrap-autofill-overlay') ||
    message.includes('insertBefore') ||
    message.includes('NotFoundError') ||
    message.includes('Configuration API invalide') ||
    message.includes('Configuration API') ||
    message.includes('gtag') ||
    message.includes('googletagmanager') ||
    message.includes('google-analytics')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};
window.addEventListener('error', (event) => {
  const errorMessage = event.message || event.error?.message || '';
  const errorSource = event.filename || event.error?.stack || '';
  if (
    errorMessage.includes('bootstrap-autofill-overlay') ||
    errorMessage.includes('insertBefore') ||
    errorMessage.includes('NotFoundError') ||
    errorSource.includes('autofill') ||
    errorSource.includes('password-manager') ||
    errorMessage.includes('Configuration API invalide') ||
    errorMessage.includes('Configuration API') ||
    errorMessage.includes('gtag') ||
    errorMessage.includes('googletagmanager') ||
    errorSource.includes('googletagmanager') ||
    errorSource.includes('google-analytics')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
}, true);
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || event.reason?.toString() || '';
  const errorStack = event.reason?.stack || '';
  if (
    errorMessage.includes('bootstrap-autofill-overlay') ||
    errorMessage.includes('insertBefore') ||
    errorMessage.includes('NotFoundError') ||
    errorStack.includes('autofill') ||
    errorMessage.includes('Configuration API invalide') ||
    errorMessage.includes('Configuration API') ||
    errorMessage.includes('gtag') ||
    errorMessage.includes('googletagmanager') ||
    errorStack.includes('googletagmanager') ||
    errorStack.includes('google-analytics')
  ) {
    event.preventDefault();
    return false;
  }
});
function waitForStyles(): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      document.body.classList.add('styles-loaded');
      resolve();
    }, 2000);
    const markStylesLoaded = () => {
      clearTimeout(timeout);
      const stylesheets = Array.from(document.styleSheets);
      const allLoaded = stylesheets.every(sheet => {
        try {
          return sheet.cssRules || sheet.rules;
        } catch (e) {
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
        setTimeout(markStylesLoaded, 50);
      }
    };
    if (document.readyState === 'complete') {
      markStylesLoaded();
    } else if (document.readyState === 'interactive') {
      window.addEventListener('load', markStylesLoaded);
      setTimeout(markStylesLoaded, 500);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        window.addEventListener('load', markStylesLoaded);
        setTimeout(markStylesLoaded, 500);
      });
    }
  });
}
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
        </AuthProvider>
      </React.StrictMode>,
    );
  } catch (error) {
    console.error('Failed to render React app:', error);
    rootElement.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Erreur de chargement</h1><p>Veuillez rafraîchir la page.</p></div>';
  }
}
