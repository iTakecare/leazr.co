
/**
 * Traduit les types d'offres de la base de données en libellés français pour l'affichage
 */

export const translateOfferType = (type: string | undefined | null): string => {
  if (!type) return "Non défini";
  
  switch (type.toLowerCase()) {
    case 'ambassador_offer':
      return "Offre ambassadeur";
    case 'partner_offer':
      return "Offre partenaire";
    case 'direct_offer':
      return "Offre directe";
    case 'admin_offer':
      return "Offre administrative";
    case 'client_request':
      return "Demande client";
    case 'internal_offer':
      return "Offre interne";
    default:
      return type;
  }
};

/**
 * Vérifie si le type d'offre a une commission
 * Les offres internes n'ont pas de commission
 */
export const hasCommission = (type: string | undefined | null): boolean => {
  if (!type) return false;
  
  // Les offres internes ou de type 'internal_offer' n'ont pas de commission
  return type.toLowerCase() !== 'internal_offer';
};
