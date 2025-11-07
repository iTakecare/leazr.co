/**
 * Calcule l'assurance annuelle pour une offre de leasing
 * Formule : mensualité × durée × 3,5% avec un minimum de 110€
 * 
 * @param monthlyPayment - Mensualité en euros
 * @param duration - Durée du financement en mois
 * @returns Montant de l'assurance annuelle en euros
 */
export const calculateAnnualInsurance = (monthlyPayment: number, duration: number): number => {
  if (monthlyPayment <= 0 || duration <= 0) {
    return 110; // Retourner le minimum si les valeurs sont invalides
  }

  const totalAmount = monthlyPayment * duration;
  const calculatedInsurance = totalAmount * 0.035;
  const minimumInsurance = 110;
  
  return Math.max(calculatedInsurance, minimumInsurance);
};
