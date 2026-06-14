import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { FaClock, FaMapMarkerAlt, FaEnvelope } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { sendContactEmail } from '../services/emailService';
const Contact: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  useEffect(() => {
    if (user) {
      setFormData({
        lastName: user.lastName || '',
        firstName: user.firstName || '',
        email: user.email || '',
        message: ''
      });
    }
  }, [user]);
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });
    try {
      const result = await sendContactEmail({
        from_name: `${formData.firstName} ${formData.lastName}`.trim(),
        from_email: formData.email,
        message: formData.message,
        phone: formData.phone || undefined,
        subject: 'Nouveau message de contact'
      });
      if (result.success) {
        setSubmitMessage({ type: 'success', text: result.message });
        setFormData({
          lastName: user?.lastName || '',
          firstName: user?.firstName || '',
          email: user?.email || '',
          message: ''
        });
      } else {
        setSubmitMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      setSubmitMessage({ type: 'error', text: 'Une erreur est survenue. Veuillez réessayer.' });
    } finally {
      setIsSubmitting(false);
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
            Contactez Laurence
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Toiletteuse spécialisée en épilation cocker, je suis à votre disposition pour vos questions
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card p-8"
          >
            <form className="space-y-6" onSubmit={handleSubmit}>
              {submitMessage.text && (
                <div className={`p-4 rounded-lg ${
                  submitMessage.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {submitMessage.text}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input 
                    type="text" 
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="form-input" 
                    placeholder="Votre nom" 
                  />
                  {user && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Pré-rempli</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <input 
                    type="text" 
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="form-input" 
                    placeholder="Votre prénom" 
                  />
                  {user && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Pré-rempli</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input" 
                  placeholder="votre@email.com" 
                />
                {user && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Pré-rempli</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea 
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className="form-input min-h-[150px]" 
                  placeholder="Votre message..."
                ></textarea>
              </div>
              <button 
                type="submit" 
                className="button-primary w-full"
                disabled={isSubmitting || !formData.firstName || !formData.lastName || !formData.email || !formData.message}
              >
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer le message'}
              </button>
            </form>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="contact-info-card p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <FaMapMarkerAlt className="text-2xl text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-xl mb-2">Adresse</h3>
                  <p className="text-gray-600">route de Mâcon<br />01660 Mézériat</p>
                </div>
              </div>
            </div>
            <div className="contact-info-card p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <FaClock className="text-2xl text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-xl mb-2">Horaires d'ouverture</h3>
                  <p className="text-gray-600">
                    Mardi - Vendredi: 9h30 - 18h00<br />
                    Lundi et Samedi: Fermé<br />
                    Dimanche: Fermé
                  </p>
                </div>
              </div>
            </div>
            <div className="contact-info-card p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <FaEnvelope className="text-2xl text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-xl mb-2">Email</h3>
                  <p className="text-gray-600">domainedesrevesbleus@orange.fr</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
};
export default Contact;
