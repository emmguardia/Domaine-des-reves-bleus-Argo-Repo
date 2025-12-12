import React from 'react';
import { motion } from 'framer-motion';

function PolitiqueConfidentialite() {
  return (
    <main className="pt-24 pb-12">
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-8">
            Politique de Confidentialité
          </h1>
          
          <div className="space-y-8 text-gray-700">
            <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
              <p className="text-gray-700 leading-relaxed">
                <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-gray-700 leading-relaxed mt-2">
                La présente politique de confidentialité décrit la manière dont Domaine des Rêves Bleus collecte, utilise et protège vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.
              </p>
            </div>

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Responsable du traitement</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Nom :</strong> Domaine des Rêves Bleus</li>
                <li><strong>Représentant légal :</strong> Melozay Laurence</li>
                <li><strong>Adresse :</strong> 35 chemin des vignes, 69400 Arnas, France</li>
                <li><strong>Téléphone :</strong> 07 86 10 07 23</li>
                <li><strong>Email :</strong> domainedesrevesbleus@orange.fr</li>
                <li><strong>Numéro SIRET :</strong> 844 066 001 00018</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Données personnelles collectées</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Nous collectons les données personnelles suivantes :
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-4">
                <h3 className="font-semibold text-gray-800 mb-3">2.1. Données collectées lors de l'inscription</h3>
                <ul className="space-y-2 text-gray-600 list-disc list-inside">
                  <li>Prénom</li>
                  <li>Nom de famille</li>
                  <li>Adresse email</li>
                  <li>Numéro de téléphone</li>
                  <li>Mot de passe (stocké de manière sécurisée et cryptée)</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg mb-4">
                <h3 className="font-semibold text-gray-800 mb-3">2.2. Données collectées lors des commandes</h3>
                <ul className="space-y-2 text-gray-600 list-disc list-inside">
                  <li>Adresse de livraison complète</li>
                  <li>Informations de paiement (traitées de manière sécurisée via Stripe)</li>
                  <li>Historique des commandes</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg mb-4">
                <h3 className="font-semibold text-gray-800 mb-3">2.3. Données collectées via le formulaire de contact</h3>
                <ul className="space-y-2 text-gray-600 list-disc list-inside">
                  <li>Prénom et nom</li>
                  <li>Adresse email</li>
                  <li>Message et contenu de la demande</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">2.4. Données techniques collectées automatiquement</h3>
                <ul className="space-y-2 text-gray-600 list-disc list-inside">
                  <li>Adresse IP</li>
                  <li>Type de navigateur et système d'exploitation</li>
                  <li>Pages visitées et durée de visite</li>
                  <li>Token d'authentification (JWT) stocké localement pour la session</li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Finalités du traitement</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Vos données personnelles sont collectées et traitées pour les finalités suivantes :
              </p>
              <ul className="space-y-2 text-gray-600 list-disc list-inside">
                <li><strong>Gestion des comptes utilisateurs :</strong> Création, authentification et gestion de votre compte</li>
                <li><strong>Traitement des commandes :</strong> Gestion des commandes, livraisons et facturation</li>
                <li><strong>Communication :</strong> Réponse à vos demandes de contact, devis et questions</li>
                <li><strong>Réservations de services :</strong> Gestion des rendez-vous de toilettage</li>
                <li><strong>Amélioration du service :</strong> Analyse statistique et amélioration de l'expérience utilisateur</li>
                <li><strong>Obligations légales :</strong> Respect des obligations comptables et fiscales</li>
                <li><strong>Sécurité :</strong> Prévention de la fraude et sécurisation du site</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Base légale du traitement</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Le traitement de vos données personnelles est fondé sur :
              </p>
              <ul className="space-y-2 text-gray-600 list-disc list-inside">
                <li><strong>Votre consentement :</strong> Pour l'inscription et l'utilisation du site</li>
                <li><strong>L'exécution d'un contrat :</strong> Pour le traitement de vos commandes et réservations</li>
                <li><strong>L'intérêt légitime :</strong> Pour l'amélioration de nos services et la sécurité du site</li>
                <li><strong>Les obligations légales :</strong> Pour la conservation des données comptables et fiscales</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Stockage et sécurité des données</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-4">
                <h3 className="font-semibold text-gray-800 mb-3">5.1. Stockage des données</h3>
                <p className="text-gray-600 mb-2 leading-relaxed">
                  Vos données personnelles sont stockées dans une base de données sécurisée hébergée sur nos serveurs. 
                  Les mots de passe sont cryptés de manière irréversible (hachage).
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Certaines données sont également stockées temporairement dans le stockage local de votre navigateur (localStorage) 
                  pour maintenir votre session de connexion. Ces données sont automatiquement supprimées lors de la déconnexion.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">5.2. Mesures de sécurité</h3>
                <p className="text-gray-600 mb-2 leading-relaxed">
                  Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
                </p>
                <ul className="space-y-2 text-gray-600 list-disc list-inside">
                  <li>Chiffrement des données sensibles (HTTPS/SSL)</li>
                  <li>Authentification sécurisée par tokens JWT</li>
                  <li>Accès restreint aux données personnelles</li>
                  <li>Sauvegardes régulières de la base de données</li>
                  <li>Mise à jour régulière des systèmes de sécurité</li>
                </ul>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Durée de conservation des données</h2>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Données de compte utilisateur :</strong> Conservées pendant toute la durée d'existence de votre compte et 3 ans après sa suppression</li>
                <li><strong>Données de commande :</strong> Conservées 10 ans conformément aux obligations comptables et fiscales</li>
                <li><strong>Données de contact :</strong> Conservées 3 ans à compter du dernier contact</li>
                <li><strong>Données de connexion :</strong> Conservées 12 mois maximum</li>
                <li><strong>Cookies et données de navigation :</strong> Conservés selon la durée de vie des cookies (voir section Cookies)</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Partage et transmission des données</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Vos données personnelles ne sont pas vendues, louées ou partagées avec des tiers à des fins commerciales.
              </p>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Nous pouvons partager vos données uniquement dans les cas suivants :
              </p>
              <ul className="space-y-2 text-gray-600 list-disc list-inside">
                <li><strong>Prestataires de services :</strong> Avec nos prestataires techniques (hébergement, paiement) sous contrat strict de confidentialité</li>
                <li><strong>Stripe :</strong> Pour le traitement sécurisé des paiements (conformément à leur politique de confidentialité)</li>
                <li><strong>Services de livraison :</strong> Pour l'acheminement de vos commandes (adresse de livraison uniquement)</li>
                <li><strong>Obligations légales :</strong> En cas d'obligation légale ou de réquisition judiciaire</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Cookies et technologies similaires</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Notre site utilise des cookies et technologies similaires pour :
              </p>
              <ul className="space-y-2 text-gray-600 list-disc list-inside">
                <li><strong>Cookies techniques :</strong> Nécessaires au fonctionnement du site (authentification, panier)</li>
                <li><strong>LocalStorage :</strong> Stockage temporaire des données de session utilisateur (token JWT, préférences)</li>
              </ul>
              <p className="text-gray-600 mt-4 leading-relaxed">
                <strong>Note :</strong> Nous n'utilisons pas de cookies de tracking ou d'analyse publicitaire. 
                Vous pouvez configurer votre navigateur pour refuser les cookies, mais cela peut affecter certaines fonctionnalités du site.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Vos droits</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">9.1. Droit d'accès</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Vous pouvez accéder à toutes vos données personnelles en vous connectant à votre compte ou en nous contactant.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">9.2. Droit de rectification</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Vous pouvez modifier vos données personnelles directement depuis votre compte ou en nous contactant.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">9.3. Droit à l'effacement</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Vous pouvez demander la suppression de vos données personnelles, sous réserve des obligations légales de conservation.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">9.4. Droit à la portabilité</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Vous pouvez demander à recevoir vos données dans un format structuré et couramment utilisé.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">9.5. Droit d'opposition</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Vous pouvez vous opposer au traitement de vos données pour des motifs légitimes.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">9.6. Droit à la limitation</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Vous pouvez demander la limitation du traitement de vos données dans certains cas.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">9.7. Droit de retirer votre consentement</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Vous pouvez retirer votre consentement à tout moment, sans affecter la licéité du traitement effectué avant le retrait.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg mt-4">
                <p className="text-gray-700 leading-relaxed">
                  <strong>Pour exercer vos droits :</strong> Contactez-nous par email à <a href="mailto:domainedesrevesbleus@orange.fr" className="text-blue-600 hover:underline">domainedesrevesbleus@orange.fr</a> 
                  ou par courrier à l'adresse indiquée ci-dessus. Nous répondrons à votre demande dans un délai d'un mois.
                </p>
              </div>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Réclamation auprès de la CNIL</h2>
              <p className="text-gray-600 leading-relaxed">
                Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la 
                Commission Nationale de l'Informatique et des Libertés (CNIL) :
              </p>
              <ul className="space-y-2 text-gray-600 mt-4">
                <li><strong>Site web :</strong> <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.cnil.fr</a></li>
                <li><strong>Téléphone :</strong> 01 53 73 22 22</li>
                <li><strong>Adresse :</strong> 3 Place de Fontenoy - TSA 80715, 75334 Paris Cedex 07</li>
              </ul>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Modifications de la politique de confidentialité</h2>
              <p className="text-gray-600 leading-relaxed">
                Nous nous réservons le droit de modifier la présente politique de confidentialité à tout moment. 
                Toute modification sera publiée sur cette page avec indication de la date de mise à jour. 
                Nous vous encourageons à consulter régulièrement cette page pour prendre connaissance des éventuelles modifications.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">12. Contact</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Pour toute question concernant cette politique de confidentialité ou le traitement de vos données personnelles, 
                vous pouvez nous contacter :
              </p>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Email :</strong> <a href="mailto:domainedesrevesbleus@orange.fr" className="text-blue-600 hover:underline">domainedesrevesbleus@orange.fr</a></li>
                <li><strong>Téléphone :</strong> 07 86 10 07 23</li>
                <li><strong>Adresse :</strong> 35 chemin des vignes, 69400 Arnas, France</li>
              </ul>
            </section>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

export default PolitiqueConfidentialite;

