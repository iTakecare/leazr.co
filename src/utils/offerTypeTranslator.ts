
/**
 * Traduit les types d'offres de la base de données en libellés français pour l'affichage
 */

export const translateOfferType = (type: string | undefined | null): string => {
  if (!type) return "Non défini";
  
  switch (type.toLowerCase()) {
    case 'client_request':
      return "Dem. client";
    case 'web_request':
      return "Dem. web";
    case 'ambassador_offer':
      return "Offre ambassadeur";
    case 'partner_offer':
      return "Offre partenaire";
    default:
      return type;
  }
};

/**
 * Traduit les sources d'offres en libellés français
 */
export const translateOfferSource = (source: string | undefined | null): string => {
  if (!source) return "Non défini";
  
  switch (source.toLowerCase()) {
    case 'custom_pack':
      return "Pack personnalisé";
    case 'web_catalog':
      return "Catalogue web";
    default:
      return source;
  }
};

/**
 * Vérifie si le type d'offre a une commission
 * Les offres internes et web n'ont pas de commission
 */
export const hasCommission = (type: string | undefined | null): boolean => {
  if (!type) return false;
  
  // Seules les offres ambassadeur ont une commission
  return type.toLowerCase() === 'ambassador_offer';
};
