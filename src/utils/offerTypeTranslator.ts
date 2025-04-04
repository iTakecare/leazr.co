
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
