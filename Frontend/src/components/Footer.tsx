import React from 'react';
import { Link } from 'react-router-dom';
import { FaDog } from 'react-icons/fa';
const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-700 py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <FaDog className="text-3xl text-primary" />
              <span className="text-xl font-bold text-white">Le Domaine des Rêves Bleus</span>
            </div>
            <p className="text-gray-300">
              L'excellence pour votre compagnon à quatre pattes
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-300 hover:text-primary">Accueil</Link></li>
              <li><Link to="/products" className="text-gray-300 hover:text-primary">Boutique</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-primary">Contact</Link></li>
              <li><Link to="/admin-panel" className="text-gray-300 hover:text-primary">Panel Admin</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Horaires</h3>
            <ul className="space-y-2 text-gray-300">
              <li>Lundi: Fermé</li>
              <li>Mardi - Vendredi: 9h30 - 18h00</li>
              <li>Samedi et Dimanche: Fermé</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-300">
              <li>Adresse route de Mâcon</li>
              <li>01660 Mezeriat</li>
              <li>domainedesrevesbleus@orange.fr</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-600 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400">
            <p>© 2026 Le Domaine des Rêves Bleus - Tous droits réservés</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/mentions-legales" className="hover:text-primary transition-colors">Mentions légales</Link>
              <Link to="/cgv" className="hover:text-primary transition-colors">Condition Général de Vente</Link>
              <Link to="/politique-de-confidentialite" className="hover:text-primary transition-colors">Politique de Confidentialité</Link>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-500 text-sm">
            <p>Site réalisé par <a href="https://zenixweb.fr" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">ZenixWeb</a></p>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
