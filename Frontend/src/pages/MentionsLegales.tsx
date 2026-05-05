import React from 'react';
import { motion } from 'framer-motion';
const MentionsLegales: React.FC = () => {
  return (
    <main className="pt-24 pb-12">
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-8">
            Mentions légales
          </h1>
          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Informations concernant le site</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Nom du site :</strong> Domaine des Rêves Bleus</li>
                <li><strong>URL :</strong> www.domainedesrevesbleus.eu</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Éditeur du site</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Nom / Raison sociale :</strong> Domaine des Rêves Bleus</li>
                <li><strong>Adresse :</strong>69400 Arnas, France</li>
                <li><strong>Téléphone :</strong> 07 86 10 07 23</li>
                <li><strong>Email :</strong> domainedesrevesbleus@orange.fr</li>
                <li><strong>Statut / Forme juridique :</strong> Individuel BA au réel simplifié</li>
                <li><strong>Numéro SIRET / Identification :</strong> 844 066 001 00018</li>
                <li><strong>Responsable de la publication :</strong> Melozay Laurence</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Hébergement</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Hébergeur :</strong> Monnet Mata Enzo</li>
                <li><strong>Adresse :</strong>69830 St Georges de Reneins, France</li>
                <li><strong>Téléphone :</strong> 06 17 06 31 44</li>
                <li><strong>Email :</strong> enzo.mnt.mata@gmail.com</li>
                <li><strong>Site web :</strong> www.zenixweb.fr</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Propriété intellectuelle</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Contenu protégé :</strong> Textes, images, vidéos, logos, graphismes, bases de données, et tout autre contenu.</li>
                <li><strong>Droits :</strong> Toute reproduction, modification, diffusion ou exploitation totale ou partielle du site ou de son contenu est interdite sans autorisation écrite préalable de l'éditeur.</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Collecte et traitement des données</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Finalité :</strong> Les informations recueillies via le formulaire de contact sont destinées à Melozay Laurence et sont utilisées pour répondre à vos demandes de devis et de contact. Conformément à la loi "informatique et libertés" du 6 janvier 1978 modifiée et au RGPD.</li>
                <li><strong>Conformité :</strong> Loi « Informatique et Libertés » du 6 janvier 1978 modifiée et RGPD.</li>
                <li><strong>Droits des utilisateurs :</strong> Droit d'accès, de rectification, de suppression et d'opposition.</li>
                <li><strong>Contact pour exercer ces droits :</strong> contactez-nous à : domainedesrevesbleus@orange.fr</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Cookies</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Utilisation :</strong> Ce site n'utilise pas de cookies de tracking ou d'analyse. Seuls des cookies techniques nécessaires au fonctionnement du site peuvent être utilisés.</li>
                <li><strong>Gestion :</strong> Vous pouvez configurer votre navigateur pour refuser certains cookies.</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Limitation de responsabilité</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Exactitude des informations :</strong> L'éditeur s'efforce d'assurer la précision et l'actualité des informations publiées.</li>
                <li><strong>Exonération :</strong> L'éditeur ne peut être tenu responsable des dommages directs ou indirects liés à l'accès ou à l'utilisation du site.</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Liens externes</h2>
              <p className="text-gray-600 leading-relaxed">
                <strong>Responsabilité :</strong> L'éditeur décline toute responsabilité pour le contenu des sites tiers accessibles via des liens.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Droit applicable et juridiction</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Droit applicable :</strong> Droit français</li>
                <li><strong>Tribunal compétent :</strong> Tout litige en relation avec l'utilisation du site www.domainedesrevesbleus.eu est soumis au droit français. Il est fait attribution exclusive de juridiction aux tribunaux compétents de Lyon.</li>
              </ul>
            </section>
          </div>
        </motion.div>
      </div>
    </main>
  );
};
export default MentionsLegales;
