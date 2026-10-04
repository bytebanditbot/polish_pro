const DEFAULT_SITE_CONTENT = {
  homeBeforeAfter: [
    {
      label: 'Avant',
      description: 'Oxydation, rayures et manque de brillance.',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
      alt: 'Voiture avant detailing',
    },
    {
      label: 'Après',
      description: 'Reflet profond, finition brillante et parfaite.',
      image: 'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=900&q=80',
      alt: 'Voiture après detailing',
    },
  ],
  galleryProjects: [
    {
      title: 'Correction de peinture',
      category: 'Polissage',
      description: 'Restauration de la brillance et correction des micro-rayures.',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=85',
      alt: 'Voiture sportive après polissage',
    },
    {
      title: 'Finition brillante',
      category: 'Protection',
      description: 'Une finition profonde avec une protection durable.',
      image: 'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1000&q=85',
      alt: 'Carrosserie brillante après detailing',
    },
    {
      title: 'Soin extérieur',
      category: 'Detailing',
      description: 'Nettoyage minutieux et finitions soignées.',
      image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=85',
      alt: 'Détail extérieur d’une voiture',
    },
    {
      title: 'Rénovation de carrosserie',
      category: 'Polissage',
      description: 'Un résultat net, uniforme et éclatant.',
      image: 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1000&q=85',
      alt: 'Voiture rénovée et polie',
    },
    {
      title: 'Protection céramique',
      category: 'Protection',
      description: 'Une surface lisse et un éclat qui dure.',
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=85',
      alt: 'Voiture avec finition protectrice brillante',
    },
    {
      title: 'Detailing automobile',
      category: 'Detailing',
      description: 'Des détails travaillés pour une présentation impeccable.',
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1000&q=85',
      alt: 'Voiture préparée avec soin',
    },
  ],
  beforeAfter: [
    {
      title: 'Correction de peinture',
      before: {
        image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=85',
        alt: 'Voiture avant correction de peinture',
      },
      after: {
        image: 'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1000&q=85',
        alt: 'Voiture après correction de peinture',
      },
    },
    {
      title: 'Rénovation de carrosserie',
      before: {
        image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=85',
        alt: 'Voiture avant rénovation de carrosserie',
      },
      after: {
        image: 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1000&q=85',
        alt: 'Voiture après rénovation de carrosserie',
      },
    },
    {
      title: 'Protection et finition',
      before: {
        image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=85',
        alt: 'Voiture avant protection de finition',
      },
      after: {
        image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1000&q=85',
        alt: 'Voiture après protection de finition',
      },
    },
  ],
  reviews: [
    {
      name: 'Exemple fictif · Client 01',
      rating: 5,
      quote: 'Le résultat est superbe : la carrosserie a retrouvé une belle brillance. Travail minutieux et accueil au top.',
    },
    {
      name: 'Exemple fictif · Client 02',
      rating: 5,
      quote: 'Très satisfait du soin apporté à ma voiture. Chaque détail a été pris en compte, je recommande l’expérience.',
    },
    {
      name: 'Exemple fictif · Client 03',
      rating: 5,
      quote: 'Un service sérieux et un résultat qui fait plaisir à voir. Ma voiture est ressortie impeccable.',
    },
  ],
  contact: {
    name: 'Alex Martin',
    phone: '06 00 00 00 00',
    address: '12 rue des Ateliers, 74100 Annemasse',
    description: 'Finitions et detailing automobile professionnels.',
    note: 'Exemple fictif',
  },
  socials: {
    instagram: 'https://www.instagram.com/',
    tiktok: 'https://www.tiktok.com/',
    facebook: 'https://www.facebook.com/',
    youtube: 'https://www.youtube.com/',
    x: 'https://x.com/',
    snapchat: 'https://www.snapchat.com/',
  },
};

const isText = (value, maxLength, { optional = false } = {}) =>
  typeof value === 'string' && value.length <= maxLength &&
  (optional || value.trim().length > 0);

const isImageUrl = (value) => {
  if (!isText(value, 2048)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

function isProject(project) {
  return project && typeof project === 'object' &&
    isText(project.title, 120) &&
    ['Polissage', 'Protection', 'Detailing'].includes(project.category) &&
    isText(project.description, 500) &&
    isImageUrl(project.image) &&
    isText(project.alt, 250);
}

function isComparison(comparison) {
  const isPhoto = (photo) => photo && typeof photo === 'object' &&
    isImageUrl(photo.image) && isText(photo.alt, 250);
  return comparison && typeof comparison === 'object' &&
    isText(comparison.title, 120) &&
    isPhoto(comparison.before) && isPhoto(comparison.after);
}

function isHomeBeforeAfter(item) {
  return item && typeof item === 'object' &&
    isText(item.label, 30) &&
    isText(item.description, 500) &&
    isImageUrl(item.image) &&
    isText(item.alt, 250);
}

function isReview(review) {
  return review && typeof review === 'object' &&
    isText(review.name, 100) &&
    Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5 &&
    isText(review.quote, 1000);
}

function isSocialUrl(value) {
  if (value === '') return true;
  if (!isText(value, 2048)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function validateSiteContent(content) {
  const keys = ['homeBeforeAfter', 'galleryProjects', 'beforeAfter', 'reviews', 'contact', 'socials'];
  if (!content || typeof content !== 'object' ||
      Object.keys(content).length !== keys.length ||
      !keys.every((key) => Object.hasOwn(content, key))) {
    return 'Le contenu doit inclure les sections Avant/Après de l’accueil, la galerie, les comparaisons, les avis, le contact et les réseaux.';
  }
  if (!Array.isArray(content.galleryProjects) || content.galleryProjects.length > 30 ||
      !content.galleryProjects.every(isProject)) {
    return 'Chaque réalisation doit avoir un titre, une catégorie valide, une description, une URL d’image et un texte alternatif.';
  }
  if (!Array.isArray(content.homeBeforeAfter) || content.homeBeforeAfter.length > 10 ||
      !content.homeBeforeAfter.every(isHomeBeforeAfter)) {
    return 'Chaque image d’accueil doit avoir un libellé, une description, une URL d’image et un texte alternatif.';
  }
  if (!Array.isArray(content.beforeAfter) || content.beforeAfter.length > 20 ||
      !content.beforeAfter.every(isComparison)) {
    return 'Chaque comparaison doit avoir un titre et des URL et textes alternatifs valides pour les images Avant et Après.';
  }
  if (!Array.isArray(content.reviews) || content.reviews.length > 30 ||
      !content.reviews.every(isReview)) {
    return 'Chaque avis doit avoir un nom, une note entre 1 et 5 et un commentaire.';
  }
  const contact = content.contact;
  if (!contact || typeof contact !== 'object' ||
      !isText(contact.name, 120) || !isText(contact.phone, 80) ||
      !isText(contact.address, 250) || !isText(contact.description, 300) ||
      !isText(contact.note, 100, { optional: true })) {
    return 'Les informations du contact doivent être valides.';
  }
  const socialKeys = Object.keys(DEFAULT_SITE_CONTENT.socials);
  if (!content.socials || typeof content.socials !== 'object' ||
      Object.keys(content.socials).length !== socialKeys.length ||
      !socialKeys.every((key) => isSocialUrl(content.socials[key]))) {
    return 'Les liens de réseaux sociaux doivent être des URL HTTPS valides ou être laissés vides.';
  }
  return null;
}

function validateService(service) {
  if (!service || typeof service !== 'object' ||
      !isText(service.name, 120) || !isText(service.description, 1000) ||
      !Number.isInteger(service.price_eur) || service.price_eur < 0 ||
      !Number.isInteger(service.duration_min) || service.duration_min < 1 || service.duration_min > 1440) {
    return 'Un service doit avoir un nom, une description, un prix entier positif ou nul et une durée de 1 à 1440 minutes.';
  }
  return null;
}

module.exports = {
  DEFAULT_SITE_CONTENT,
  validateService,
  validateSiteContent,
};
