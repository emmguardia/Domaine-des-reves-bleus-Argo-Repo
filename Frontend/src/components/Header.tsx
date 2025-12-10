import React, { useState, useEffect } from 'react';
import { Menu, X, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaDog } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Cart from './Cart';
import { useCart } from '../context/CartContext';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { cartCount } = useCart();

  useEffect(() => {
    const handleAuthStateChange = (event: CustomEvent) => {
      setIsLoggedIn(!!event.detail);
    };

    window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);
    setIsLoggedIn(!!user);

    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
    };
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className={`glass-effect fixed w-full z-50 ${scrolled ? 'py-2 sm:py-3' : 'py-3 sm:py-4'} rounded-b-3xl`}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 sm:space-x-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <FaDog className="text-primary text-2xl sm:text-3xl" />
              </motion.div>
              <h1 className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                <span className="hidden sm:inline">Le Domaine des Rêves Bleus</span>
                <span className="sm:hidden">Rêves Bleus</span>
              </h1>
            </Link>

            <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              <Link to="/" className="text-gray-600 hover:text-primary transition-colors font-medium text-sm xl:text-base">
                Accueil
              </Link>
              <Link to="/products" className="text-gray-600 hover:text-primary transition-colors font-medium text-sm xl:text-base">
                Boutique
              </Link>
              <Link to="/services" className="text-gray-600 hover:text-primary transition-colors font-medium text-sm xl:text-base">
                Services
              </Link>
              <Link to="/contact" className="text-gray-600 hover:text-primary transition-colors font-medium text-sm xl:text-base">
                Contact
              </Link>
            </nav>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative text-gray-600 hover:text-primary transition-colors p-2"
              >
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-[10px] sm:text-xs">
                    {cartCount}
                  </span>
                )}
              </button>

              <div className="hidden md:flex items-center space-x-3 xl:space-x-4">
                {isLoggedIn && user ? (
                  <>
                    <span className="text-gray-600 text-sm xl:text-base hidden lg:inline">Bonjour, {user.firstName}</span>
                    <Link
                      to="/profile"
                      className="text-gray-600 hover:text-primary transition-colors font-medium text-sm xl:text-base"
                    >
                      Profil
                    </Link>
                    <button
                      onClick={logout}
                      className="button-secondary text-sm xl:text-base px-4 xl:px-6 py-2"
                    >
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="text-gray-600 hover:text-primary transition-colors text-sm xl:text-base"
                    >
                      Connexion
                    </Link>
                    <Link
                      to="/register"
                      className="button-primary text-sm xl:text-base px-4 xl:px-6 py-2"
                    >
                      Inscription
                    </Link>
                  </>
                )}
              </div>

              <button
                className="lg:hidden text-gray-600 focus:outline-none p-2 z-50"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menu"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden backdrop-blur-md absolute top-full left-0 right-0 shadow-xl border-t border-gray-200"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}
          >
            <nav className="flex flex-col py-4 px-4 sm:px-6">
              <Link 
                to="/" 
                className="text-gray-700 hover:text-primary transition-colors font-medium py-3 px-4 rounded-lg hover:bg-primary/5 text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                Accueil
              </Link>
              <Link 
                to="/products" 
                className="text-gray-700 hover:text-primary transition-colors font-medium py-3 px-4 rounded-lg hover:bg-primary/5 text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                Boutique
              </Link>
              <Link 
                to="/services" 
                className="text-gray-700 hover:text-primary transition-colors font-medium py-3 px-4 rounded-lg hover:bg-primary/5 text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                Services
              </Link>
              <Link 
                to="/contact" 
                className="text-gray-700 hover:text-primary transition-colors font-medium py-3 px-4 rounded-lg hover:bg-primary/5 text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              {isLoggedIn && user ? (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="px-4 py-2 text-sm text-gray-500">Bonjour, {user.firstName}</div>
                  <Link 
                    to="/profile" 
                    className="text-gray-700 hover:text-primary transition-colors font-medium py-3 px-4 rounded-lg hover:bg-primary/5 text-base"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profil
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="button-secondary text-left w-full mt-2 py-3 px-4"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  <Link 
                    to="/login" 
                    className="text-gray-700 hover:text-primary transition-colors font-medium py-3 px-4 rounded-lg hover:bg-primary/5 text-base"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Connexion
                  </Link>
                  <Link 
                    to="/register" 
                    className="button-primary text-center w-full mt-2 py-3 px-4"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Inscription
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </header>

      {isCartOpen && <Cart onClose={() => setIsCartOpen(false)} />}
    </>
  );
};

export default Header;