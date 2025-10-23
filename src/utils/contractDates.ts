/**
 * Utility functions for contract date calculations
 */

/**
 * Calcule la date de fin de contrat à partir de la date de début et de la durée
 * @param startDate - Date de début du contrat (format ISO ou Date)
 * @param durationMonths - Durée du contrat en mois
 * @returns Date de fin du contrat ou null si données invalides
 */
export const calculateContractEndDate = (
  startDate: string | Date | null | undefined,
  durationMonths: number | null | undefined
): Date | null => {
  if (!startDate || !durationMonths) return null;
  
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;
  
  const end = new Date(start);
  end.setMonth(end.getMonth() + durationMonths);
  
  return end;
};

/**
 * Vérifie si un contrat expire bientôt (dans les 3 prochains mois)
 * @param endDate - Date de fin du contrat
 * @returns true si le contrat expire dans les 3 prochains mois
 */
export const isExpiringSoon = (
  endDate: string | Date | null | undefined
): boolean => {
  if (!endDate) return false;
  
  const end = new Date(endDate);
  if (isNaN(end.getTime())) return false;
  
  const now = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  
  return end >= now && end <= threeMonthsFromNow;
};

/**
 * Formatte une date au format français
 * @param dateString - Date à formater
 * @returns Date formatée ou texte d'erreur
 */
export const formatContractDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "Non définie";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Date incorrecte";
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    return "Date incorrecte";
  }
};
