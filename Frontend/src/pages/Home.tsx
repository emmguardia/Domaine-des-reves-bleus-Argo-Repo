import React from 'react';
import { motion } from 'framer-motion';
import { FaDog, FaCut, FaHeart, FaArrowRight, FaShoppingBag, FaPaw, FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <main>
      <section className="hero-section min-h-screen flex items-center justify-center text-white">
        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10 pt-24 sm:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight px-4">
              Le Domaine des Rêves Bleus
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-100 mb-8 sm:mb-12 max-w-2xl mx-auto font-light px-4">
              Un poil bien hydraté est un poil à moitié démêlé
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link to="/contact" className="button-primary text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3">
                Réserver maintenant
              </Link>
              <Link to="/products" className="button-secondary bg-white text-primary text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3">
                Découvrir nos produits
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 sm:py-16 md:py-20 bg-[#faf7f2]">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center"
          >
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">
                  Un toilettage professionnel<br/>
                  <span className="text-primary">pour votre fidèle compagnon</span>
                </h2>
                <p className="text-gray-600 text-sm sm:text-base md:text-lg leading-relaxed mb-6 sm:mb-8">
                  Avec Le Domaine des Rêves Bleus, nous comprenons que chaque chien est unique. 
                  Nous nous engageons à offrir des soins personnalisés adaptés à la race, au pelage et au tempérament de votre animal.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary/10 p-2 sm:p-3 rounded-full flex-shrink-0">
                    <FaCut className="text-lg sm:text-xl text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-1">Formation continue</h3>
                    <p className="text-gray-600 text-sm sm:text-base">Je réalise des formations avec des professionnels du monde du toilettage</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary/10 p-2 sm:p-3 rounded-full flex-shrink-0">
                    <FaHeart className="text-lg sm:text-xl text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-1">Spécialisation cocker</h3>
                    <p className="text-gray-600 text-sm sm:text-base">Toilettage spécialisé coupe cocker depuis 2017</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative h-48 sm:h-56 md:h-64 rounded-xl sm:rounded-2xl overflow-hidden"
              >
                <img 
                  src="/images/dog-grooming-1.jpg" 
                  alt="Toilettage professionnel" 
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative h-48 sm:h-56 md:h-64 mt-4 sm:mt-8 rounded-xl sm:rounded-2xl overflow-hidden"
              >
                <img 
                  src="/images/dog-grooming-2.jpg" 
                  alt="Soin du pelage" 
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 sm:py-16 md:py-20 bg-[#faf7f2]">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute -top-8 sm:-top-16 left-1/2 transform -translate-x-1/2 hidden sm:block">
              <FaPaw className="text-primary/10 text-[80px] sm:text-[120px]" />
            </div>
            
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 relative z-10">
              <div className="text-center space-y-3 sm:space-y-4">
                <div className="text-3xl sm:text-4xl font-bold text-primary">2016</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">BAC PRO élevage</h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  Canins et félins obtenu en 2016
                </p>
              </div>

              <div className="text-center space-y-3 sm:space-y-4">
                <div className="text-3xl sm:text-4xl font-bold text-primary">2017</div> 
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Spécialisation cocker</h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  Toilettage spécialisé coupe cocker depuis 2017
                </p>
              </div>

              <div className="text-center space-y-3 sm:space-y-4">
                <div className="text-3xl sm:text-4xl font-bold text-primary">2018</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Éducateur canin</h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  Brevet professionnel d'état obtenu en 2018
                </p>
              </div>
            </div>

            <div className="mt-8 sm:mt-12 md:mt-16 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg">
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">  
                <div className="md:w-1/3">
                  <img 
                    src="/images/groomer.jpg" 
                    alt="Notre experte toiletteuse" 
                    className="rounded-full w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-cover border-4 border-primary/20"
                  />
                </div>
                <div className="md:w-2/3 space-y-3 sm:space-y-4 text-center md:text-left">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
                    Laurence
                  </h3>
                  <p className="text-gray-600 italic text-sm sm:text-base">
                    "Je m'appelle Laurence, toiletteuse spécialisée en épilation depuis 2017. 
                  Après avoir obtenu mon BAC PRO élevage canins et félins en 2016, puis mon brevet professionnel d'état d'éducateur en 2018, 
                  je me suis spécialisée dans le toilettage et l'épilation des cockers anglais. 
                  Chaque année, je me perfectionne auprès des meilleurs professionnels du monde du toilettage pour toujours offrir 
                  des soins de qualité à vos compagnons.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2 sm:gap-4">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <FaStar key={i} className="text-yellow-400 text-sm sm:text-base" />
                      ))}
                    </div>
                    <span className="text-gray-600 text-sm sm:text-base">
                      Spécialisée en épilation cocker depuis 2017
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <span className="px-2 sm:px-3 py-1 bg-primary/10 text-primary rounded-full text-xs sm:text-sm">
                      BAC PRO élevage canins et félins 2016
                    </span>
                    <span className="px-2 sm:px-3 py-1 bg-primary/10 text-primary rounded-full text-xs sm:text-sm">
                      Éducateur brevet professionnel d'état 2018
                    </span>
                    <span className="px-2 sm:px-3 py-1 bg-primary/10 text-primary rounded-full text-xs sm:text-sm">
                      Toilettage spécialisé cocker depuis 2017
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-6 bg-[#faf7f2]">
        <div className="flex items-center justify-center py-16">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent w-full" />
          <div className="mx-4">
            <FaPaw className="text-2xl text-primary transform rotate-45" />
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent w-full" />
        </div>
      </div>

      <section className="pb-16 sm:pb-24 md:pb-32 bg-[#faf7f2]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative overflow-hidden rounded-xl sm:rounded-2xl shadow-xl group"
            >
              <Link to="/services" className="block">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/90 z-10 
                              transition-opacity group-hover:opacity-95 opacity-80" />
                <img 
                  src="/images/dog-grooming-3.jpg" 
                  alt="Services de toilettage" 
                  className="w-full h-64 sm:h-80 object-cover"
                />
                <div className="absolute inset-0 flex flex-col justify-center items-center text-white z-20 p-4 sm:p-6">
                  <FaCut className="text-3xl sm:text-4xl mb-3 sm:mb-4" />
                  <h3 className="text-xl sm:text-2xl font-bold mb-2 text-center">Nos Services</h3>
                  <p className="text-center max-w-xs text-gray-100 text-sm sm:text-base">
                    Découvrez nos prestations de toilettage professionnel
                  </p>
                  <div className="mt-4 sm:mt-6 flex items-center text-xs sm:text-sm font-medium group-hover:translate-x-2 transition-transform">
                    <span>En savoir plus</span>
                    <FaArrowRight className="ml-2" />
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative overflow-hidden rounded-xl sm:rounded-2xl shadow-xl group"
            >
              <Link to="/products" className="block">
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 to-primary/90 z-10 
                              transition-opacity group-hover:opacity-95 opacity-80" />
                <img 
                  src="/images/dog-products.jpg" 
                  alt="Produits pour chiens" 
                  className="w-full h-64 sm:h-80 object-cover"
                />
                <div className="absolute inset-0 flex flex-col justify-center items-center text-white z-20 p-4 sm:p-6">
                  <FaShoppingBag className="text-3xl sm:text-4xl mb-3 sm:mb-4" />
                  <h3 className="text-xl sm:text-2xl font-bold mb-2 text-center">Notre Boutique</h3>
                  <p className="text-center max-w-xs text-gray-100 text-sm sm:text-base">
                    Les meilleurs produits pour votre compagnon
                  </p>
                  <div className="mt-4 sm:mt-6 flex items-center text-xs sm:text-sm font-medium group-hover:translate-x-2 transition-transform">
                    <span>Découvrir</span>
                    <FaArrowRight className="ml-2" />
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
