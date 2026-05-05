import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaBath, FaCut, FaHeart, FaPaw, FaSprayCan, FaClock, FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../utils/security';

const ICON_MAP: Record<number, React.ReactNode> = {
  1: <FaBath className="text-3xl" />,
  2: <FaCut className="text-3xl" />,
  3: <FaSprayCan className="text-3xl" />,
  4: <FaPaw className="text-3xl" />,
};

interface Service {
  id: number;
  name: string;
  description: string;
  price: string;
  duration: string;
  details: string[];
}

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const API_URL = getApiUrl();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch(`${API_URL}/api/services`);
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Erreur chargement services:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-800 mb-8 text-center"
        >
          Prix des services
        </motion.h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            Les services seront bientôt disponibles.
          </div>
        ) : (
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
                    {ICON_MAP[service.id] || <FaPaw className="text-3xl" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{service.name}</h3>
                    {service.price && (
                      <p className="text-primary font-semibold">{service.price}</p>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <FaClock className="mr-2" />
                    Durée estimée: {service.duration}
                  </div>
                  <ul className="space-y-2">
                    {(service.details || []).map((detail, index) => (
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
        )}

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
