import React from 'react';
import { motion } from 'framer-motion';
import { FaBath, FaCut, FaHeart, FaPaw, FaSprayCan, FaClock, FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';
const Services: React.FC = () => {
  const services = [
    {
      id: 1,
      icon: <FaBath className="text-3xl" />,
      name: 'Épilation Cocker',
      description: 'Épilation spécialisée pour cocker anglais avec soins adaptés.',
      price: '90€',
      duration: '2h - 3h',
      details: [
        'Épilation complète du corps',
        'Bain avec shampooing adapté',
        'Séchage et brushing professionnel',
        'Coupe des griffes',
        'Nettoyage des oreilles'
      ]
    },
    {
      id: 2,
      icon: <FaCut className="text-3xl" />,
      name: '1ère Épilation Cocker',
      description: 'Première épilation pour cocker avec soins particuliers.',
      price: '110€',
      duration: '3h - 4h',
      details: [
        'Épilation complète première fois',
        'Soins particuliers pour adaptation',
        'Bain et séchage professionnel',
        'Conseils d\'entretien',
        'Suivi personnalisé'
      ]
    },
    {
      id: 3,
      icon: <FaSprayCan className="text-3xl" />,
      name: 'Tonte',
      description: 'Tonte adaptée selon vos souhaits et la race de votre chien.',
      price: '70€',
      duration: '1h30 - 2h',
      details: [
        'Tonte personnalisée',
        'Finitions aux ciseaux',
        'Brossage complet',
        'Coupe des griffes'
      ]
    },
    {
      id: 4,
      icon: <FaPaw className="text-3xl" />,
      name: 'Supplément Démêlage',
      description: 'Démêlage supplémentaire selon l\'état du pelage de votre chien.',
      price: '15€ - 30€',
      duration: '30min - 1h',
      details: [
        'Évaluation de l\'état du pelage',
        'Démêlage progressif et doux',
        'Soins hydratants',
        'Brossage final'
      ]
    }
  ];
  return (
    <main className="pt-24 pb-12">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Services d'Épilation Cocker
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Spécialisée en épilation cocker depuis 2017, je propose des soins adaptés à cette race
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {services.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="service-card p-6 rounded-2xl"
            >
              <div className="flex items-center mb-4">
                <div className="bg-primary/10 p-4 rounded-xl text-primary mr-4">
                  {service.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{service.name}</h3>
                  <p className="text-primary font-semibold">{service.price}</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">{service.description}</p>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <FaClock className="mr-2" />
                  Durée estimée: {service.duration}
                </div>
                <ul className="space-y-2">
                  {service.details.map((detail, index) => (
                    <li key={index} className="flex items-start">
                      <FaHeart className="text-primary mt-1 mr-2 text-sm" />
                      <span className="text-gray-600">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link 
                to="/contact" 
                className="button-primary w-full text-center"
              >
                Réserver ce service
              </Link>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gray-50 rounded-2xl p-8 text-center"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Toilettage Spécialisé par Race
          </h2>
          <p className="text-gray-600 mb-6">
            Nous sommes spécialisés dans le toilettage de toutes les races de chiens, 
            avec une expertise particulière pour les races à poils longs et les toilettages spécifiques.
          </p>
          <Link 
            to="/contact" 
            className="button-primary inline-flex items-center"
          >
            Demander un devis personnalisé
            <FaArrowRight className="ml-2" />
          </Link>
        </motion.div>
      </div>
    </main>
  );
};
export default Services;
