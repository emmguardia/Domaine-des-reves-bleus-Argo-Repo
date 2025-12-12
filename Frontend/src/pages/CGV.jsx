import React from 'react';
import { motion } from 'framer-motion';

function CGV() {
  return (
    <main className="pt-24 pb-12">
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-8">
            Conditions Générales de Vente (CGV)
          </h1>
          
          <div className="space-y-8 text-gray-700">
            {/* Informations entreprise */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Entreprise</h2>
              <ul className="space-y-2">
                <li><strong>Nom :</strong> Domaine des Rêves Bleus</li>
                <li><strong>Adresse :</strong> 35 chemin des vignes, 69400 Arnas, France</li>
                <li><strong>Téléphone :</strong> 07 86 10 07 23</li>
                <li><strong>Email :</strong> domainedesrevesbleus@orange.fr</li>
                <li><strong>Numéro SIRET :</strong> 844 066 001 00018</li>
                <li><strong>Représentant légal :</strong> Melozay Laurence</li>
              </ul>
            </div>

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Objet</h2>
              <p className="text-gray-600 leading-relaxed">
                Les présentes Conditions Générales de Vente (CGV) définissent les droits et obligations entre
                Domaine des Rêves Bleus et ses clients dans le cadre de la vente de produits d'hygiène pour
                chien et matériel de toilettage et service de toilettage pour les chiens.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Produits et services</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Description :</strong> Produits d'hygiène pour chien et matériel de toilettage, service de toilettage pour chien.</li>
                <li><strong>Disponibilité :</strong> Les produits sont disponibles sur l'année en fonction des stocks. Les rendez-vous de toilettage seront pris par téléphone.</li>
                <li><strong>Photos et illustrations (si boutique en ligne) :</strong> Les visuels sont donnés à titre indicatif.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Commandes</h2>
              <ul className="space-y-2 text-gray-600">
                <li>Toute commande implique l'acceptation des présentes CGV.</li>
                <li>Les commandes peuvent être passées par : en ligne / par téléphone / par email.</li>
                <li>L'entreprise se réserve le droit de refuser toute commande en cas de litige, défaut de paiement, stock épuisé...</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Réservations</h2>
              <ul className="space-y-2 text-gray-600">
                <li>Les réservations se font via le téléphone / email / sur place.</li>
                <li>Toute réservation est considérée comme ferme dès confirmation.</li>
                <li><strong>Conditions d'annulation :</strong> Gratuite jusqu'à 24h avant l'expédition.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Tarifs et modalités de paiement</h2>
              <ul className="space-y-2 text-gray-600">
                <li>Les prix sont indiqués en € TTC.</li>
                <li><strong>Modes de paiement acceptés :</strong> Espèces si paiement de la commande est retiré sur l'entreprise, carte bancaire sur internet / virement / chèque.</li>
                <li><strong>Paiement exigible :</strong> À la commande</li>
                <li><strong>Possibilité de paiement en plusieurs fois :</strong> Paiement en plusieurs fois refusé</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Livraison</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Zones de livraison :</strong> France entière</li>
                <li><strong>Délais :</strong> 8 à 15 jours ouvrés pour les commandes passées en ligne</li>
                <li><strong>Frais :</strong> Variables selon poids</li>
                <li><strong>Réception :</strong> Le client doit vérifier la marchandise à la livraison et signaler toute anomalie immédiatement.</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Obligations du client</h2>
              <p className="text-gray-600 mb-2">Le client s'engage à :</p>
              <ul className="space-y-2 text-gray-600 list-disc list-inside">
                <li>Fournir des informations exactes lors de la commande ou réservation.</li>
                <li>Régler les paiements aux échéances convenues.</li>
                <li>Respecter les conditions spécifiques liées au service réservé (ponctualité pour un rendez-vous).</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Obligations du prestataire</h2>
              <p className="text-gray-600 mb-2">L'entreprise s'engage à :</p>
              <ul className="space-y-2 text-gray-600 list-disc list-inside">
                <li>Fournir les produits ou services conformément à la commande validée.</li>
                <li>Respecter les délais convenus (sauf cas de force majeure).</li>
                <li>Garantir la qualité et la conformité des produits/services.</li>
              </ul>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Annulation et remboursement</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Commande/Service :</strong> Remboursement total si annulation &gt; 24h, sinon aucun</li>
                <li><strong>Réservations :</strong> Remboursement total si annulation &gt; 24h, sinon aucun</li>
                <li><strong>Produits physiques :</strong> Remboursements sous 15 jours après retour du produit dans son état d'origine.</li>
              </ul>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Propriété et garanties</h2>
              <ul className="space-y-2 text-gray-600">
                <li>Les produits livrés restent la propriété de l'entreprise jusqu'au paiement complet.</li>
                <li><strong>Garantie légale :</strong> Conformément aux articles L.217-4 et suivants du Code de la consommation.</li>
              </ul>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">12. Données personnelles</h2>
              <p className="text-gray-600 leading-relaxed">
                Les informations collectées sont nécessaires au traitement des commandes/réservations. Elles
                ne seront pas transmises à des tiers sans consentement du client.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">13. Litiges et droit applicable</h2>
              <p className="text-gray-600 leading-relaxed mb-2">
                En cas de litige, les parties chercheront d'abord une solution amiable.
              </p>
              <p className="text-gray-600 leading-relaxed">
                À défaut, le litige sera porté devant le tribunal compétent de Villefranche-sur-Saône.
              </p>
              <p className="text-gray-600 leading-relaxed mt-2">
                Les présentes CGV sont régies par le droit français.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

export default CGV;

