
/**
 * Traduit les types d'offres de la base de données en libellés français pour l'affichage
 */

import { OfferType } from '@/services/offers/types';

export const translateOfferType = (type: OfferType | string | undefined | null): string => {
  if (!type) return "Non défini";
  
  switch (type.toLowerCase()) {
    case 'ambassador_offer':
      return "Offre ambassadeur";
    case 'partner_offer':
      return "Offre partenaire";
    case 'direct_offer':
      return "Offre directe";
    case 'internal_offer':
      return "Offre interne";
    default:
      return "Type inconnu";
  }
};

/**
 * Vérifie si le type d'offre inclut une commission
 */
export const hasCommission = (type: OfferType | string | undefined | null): boolean => {
  if (!type) return false;
  
  return ['ambassador_offer', 'partner_offer'].includes(type.toLowerCase());
};
