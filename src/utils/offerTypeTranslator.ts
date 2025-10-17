
/**
 * Traduit les types d'offres de la base de données en libellés français pour l'affichage
 */

export const translateOfferType = (type: string | undefined | null): string => {
  if (!type) return "Non défini";
  
  switch (type.toLowerCase()) {
    case 'client_request':
      return "Demande client";
    case 'ambassador_offer':
      return "Offre ambassadeur";
    case 'partner_offer':
      return "Offre partenaire";
    default:
      return type;
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
