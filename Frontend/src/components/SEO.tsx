import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}

const BASE_URL = 'https://domainedesrevesbleus.eu';

const defaultSEO = {
  title: 'Laurence Melozay - Domaine des reves bleus | Toilettage Canin Professionnel Paris',
  description: 'Laurence Melozay, toiletteuse professionnelle spécialisée en épilation cocker depuis 2017. Domaine des reves bleus - Salon de toilettage canin professionnel à Paris. Services de toilettage, produits de soin et accessoires pour chiens.',
  keywords: 'Laurence Melozay, Domaine des reves bleus, domaine des rêves bleus, toilettage chien Paris, salon toilettage canin, toiletteuse professionnelle, épilation cocker, toilettage spécialisé cocker, toilettage canin professionnel, Paris',
  ogImage: `${BASE_URL}/images/groomer.jpg`,
};

const routeSEO: Record<string, Partial<SEOProps>> = {
  '/': {
    title: 'Laurence Melozay - Domaine des reves bleus | Toilettage Canin Professionnel Paris',
    description: 'Laurence Melozay, toiletteuse professionnelle spécialisée en épilation cocker depuis 2017. Domaine des reves bleus - Salon de toilettage canin professionnel à Paris. Services de toilettage, produits de soin et accessoires pour chiens. BAC PRO élevage canins et félins 2016, Éducateur canin BP 2018.',
    keywords: 'Laurence Melozay, Domaine des reves bleus, domaine des rêves bleus, toilettage chien Paris, salon toilettage canin, toiletteuse professionnelle, épilation cocker, toilettage spécialisé cocker, toilettage canin professionnel, Paris, BAC PRO élevage canins félins, éducateur canin',
  },
  '/products': {
    title: 'Produits de Toilettage Canin - Laurence Melozay | Domaine des reves bleus',
    description: 'Découvrez la sélection de produits de toilettage professionnel pour chiens de Laurence Melozay au Domaine des reves bleus. Shampoings, après-shampoings, accessoires et soins de qualité pour votre compagnon.',
    keywords: 'produits toilettage chien, shampoing chien, accessoires chien, soin chien, produits professionnels, Laurence Melozay, Domaine des reves bleus',
  },
  '/services': {
    title: 'Services de Toilettage Canin - Laurence Melozay | Domaine des reves bleus',
    description: 'Services de toilettage professionnel pour chiens par Laurence Melozay au Domaine des reves bleus. Toilettage complet, coupe, bain, soins des ongles et des oreilles. Spécialisée en épilation cocker depuis 2017. Prestations sur rendez-vous à Paris.',
    keywords: 'service toilettage chien, salon toilettage, coupe chien, bain chien, soins chien, Laurence Melozay, Domaine des reves bleus, épilation cocker, toilettage spécialisé cocker',
  },
  '/contact': {
    title: 'Contact - Laurence Melozay | Domaine des reves bleus | Salon de Toilettage Canin Paris',
    description: 'Contactez Laurence Melozay au Domaine des reves bleus pour prendre rendez-vous pour le toilettage de votre chien. Salon professionnel de toilettage canin à Paris et région parisienne.',
    keywords: 'contact toilettage chien, rendez-vous toilettage, salon chien Paris, Laurence Melozay, Domaine des reves bleus, contact toiletteuse professionnelle',
  },
  '/mentions-legales': {
    title: 'Mentions Légales - Domaine des reves bleus',
    description: 'Mentions légales du site Domaine des reves bleus, salon de toilettage professionnel pour chiens.',
    keywords: 'mentions légales, Domaine des reves bleus',
  },
  '/cgv': {
    title: 'Conditions Générales de Vente - Domaine des reves bleus',
    description: 'Conditions générales de vente des services et produits de toilettage canin Domaine des reves bleus.',
    keywords: 'CGV, conditions générales de vente, Domaine des reves bleus',
  },
  '/politique-de-confidentialite': {
    title: 'Politique de Confidentialité - Domaine des reves bleus',
    description: 'Politique de confidentialité et protection des données personnelles du site Domaine des reves bleus.',
    keywords: 'politique confidentialité, protection données, RGPD, Domaine des reves bleus',
  },
  '/login': {
    noindex: true,
  },
  '/register': {
    noindex: true,
  },
  '/reset-password': {
    noindex: true,
  },
  '/profile': {
    noindex: true,
  },
  '/checkout': {
    noindex: true,
  },
  '/order-confirmation': {
    noindex: true,
  },
  '/admin-panel': {
    noindex: true,
  },
};

function SEO({ title, description, keywords, canonical, ogImage, noindex }: SEOProps) {
  const location = useLocation();
  const pathname = location.pathname;
  
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  const routeConfig = routeSEO[normalizedPath] || {};
  const finalTitle = title || routeConfig.title || defaultSEO.title;
  const finalDescription = description || routeConfig.description || defaultSEO.description;
  const finalKeywords = keywords || routeConfig.keywords || defaultSEO.keywords;
  const finalCanonical = canonical || `${BASE_URL}${normalizedPath === '/' ? '' : normalizedPath}`;
  const finalOgImage = ogImage || routeConfig.ogImage || defaultSEO.ogImage;
  const shouldNoIndex = noindex !== undefined ? noindex : routeConfig.noindex || false;

  useEffect(() => {
    document.title = finalTitle;

    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (isProperty) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const updateLinkTag = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    updateMetaTag('description', finalDescription);
    updateMetaTag('keywords', finalKeywords);
    
    if (shouldNoIndex) {
      updateMetaTag('robots', 'noindex, nofollow');
      updateMetaTag('googlebot', 'noindex, nofollow');
    } else {
      updateMetaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
      updateMetaTag('googlebot', 'index, follow');
    }

    updateLinkTag('canonical', finalCanonical);

    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:url', finalCanonical, true);
    updateMetaTag('og:title', finalTitle, true);
    updateMetaTag('og:description', finalDescription, true);
    updateMetaTag('og:image', finalOgImage, true);
    updateMetaTag('og:locale', 'fr_FR', true);
    updateMetaTag('og:site_name', 'Domaine des reves bleus - Laurence Melozay', true);

    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:url', finalCanonical);
    updateMetaTag('twitter:title', finalTitle);
    updateMetaTag('twitter:description', finalDescription);
    updateMetaTag('twitter:image', finalOgImage);
  }, [finalTitle, finalDescription, finalKeywords, finalCanonical, finalOgImage, shouldNoIndex]);

  return null;
}

export default SEO;
