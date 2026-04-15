import { Equipment, Leaser, LeaserRange } from '@/types/equipment';
import { defaultLeasers } from '@/data/leasers';

export interface CalculationResult {
  totalPurchasePrice: number;
  normalMarginAmount: number;
  normalMarginPercentage: number;
  normalMonthlyPayment: number;
  adjustedMarginAmount: number;
  adjustedMarginPercentage: number;
  adjustedMonthlyPayment: number;
  marginDifference: number;
  globalCoefficient: number;
  totalFinancedAmount: number;
}

// Arrondi précis à 2 décimales (méthode bancaire)
export const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export const calculateFinancedAmountForEquipment = (equipment: Equipment): number => {
  // Calculer avec précision complète puis arrondir à 2 décimales
  const purchaseTotal = equipment.purchasePrice * equipment.quantity;
  const marginAmount = purchaseTotal * (equipment.margin / 100);
  const financedAmount = purchaseTotal + marginAmount;
  return roundToTwoDecimals(financedAmount);
};

// Valeurs de fallback statiques pour éviter les erreurs
const DEFAULT_FALLBACK_RANGES: LeaserRange[] = [
  { id: "fallback-1", min: 500, max: 2500, coefficient: 3.55 },
  { id: "fallback-2", min: 2500.01, max: 5000, coefficient: 3.27 },
  { id: "fallback-3", min: 5000.01, max: 12500, coefficient: 3.18 },
  { id: "fallback-4", min: 12500.01, max: 25000, coefficient: 3.17 },
  { id: "fallback-5", min: 25000.01, max: 50000, coefficient: 3.16 }
];

export const findCoefficientForAmount = (
  amount: number, 
  leaser: Leaser | null, 
  duration: number = 36
): number => {
  const ranges = leaser?.ranges || DEFAULT_FALLBACK_RANGES;
  
  if (!ranges || ranges.length === 0) {
    return 3.55; // Coefficient par défaut
  }
  
  const range = ranges.find((r) => 
    amount >= r.min && amount <= r.max
  );
  
  if (!range) {
    return ranges[0]?.coefficient || 3.55;
  }

  // Si le range a des coefficients par durée, les utiliser
  if (range.duration_coefficients && range.duration_coefficients.length > 0) {
    const durationCoeff = range.duration_coefficients.find(
      dc => dc.duration_months === duration
    );
    if (durationCoeff) {
      return durationCoeff.coefficient;
    }
  }
  
  // Sinon utiliser le coefficient par défaut
  return range.coefficient || 3.55;
};

export const calculateEquipmentResults = (
  equipmentList: Equipment[], 
  leaser: Leaser | null,
  duration: number = 36
): CalculationResult => {
  console.log("🔢 CALCUL - Début des calculs avec:", {
    equipmentCount: equipmentList.length,
    leaser: leaser?.name || "Default"
  });

  // 1. Calculer le prix d'achat total (avec quantités)
  const totalPurchasePrice = equipmentList.reduce((sum, equipment) => {
    return sum + (equipment.purchasePrice * equipment.quantity);
  }, 0);

  // 2. Calculer la mensualité normale
  // Toujours recalculer à partir du prix d'achat + marge + coefficient de la durée courante
  // Cela garantit que le changement de durée se répercute correctement sur les mensualités
  const normalMonthlyPayment = equipmentList.reduce((sum, equipment) => {
    const financedAmount = calculateFinancedAmountForEquipment(equipment);
    const coeff = findCoefficientForAmount(financedAmount, leaser, duration);
    // Arrondir la mensualité à 2 décimales
    const monthlyForOne = roundToTwoDecimals((financedAmount * coeff) / 100);
    console.log(`📊 CALC - Recalculated monthlyPayment for ${equipment.title} (${duration}m, coef=${coeff}%): ${monthlyForOne}`);
    return sum + monthlyForOne;
  }, 0);

  // 3. Calculer le montant financé total individuel (pour référence)
  const totalFinancedAmountIndividual = equipmentList.reduce((sum, equipment) => {
    return sum + calculateFinancedAmountForEquipment(equipment);
  }, 0);

  // 4. Calculer le coefficient global
  const globalCoefficient = findCoefficientForAmount(totalFinancedAmountIndividual, leaser, duration);
  const adjustedMonthlyPayment = roundToTwoDecimals((totalFinancedAmountIndividual * globalCoefficient) / 100);

  // 5. CALCUL INVERSÉ DU MONTANT FINANCÉ (méthode Grenke)
  // Grenke calcule : montant_financé = mensualité × 100 / coefficient
  // C'est la formule correcte pour obtenir le montant réellement financé
  const totalFinancedAmountDisplay = globalCoefficient > 0 
    ? roundToTwoDecimals((normalMonthlyPayment * 100) / globalCoefficient)
    : totalFinancedAmountIndividual;

  // 6. CALCUL DE LA MARGE À PARTIR DU MONTANT FINANCÉ
  // Marge = Montant financé (somme des P.V.) - Prix d'achat total
  // C'est la vraie marge générée, cohérente avec le montant financé affiché
  const normalMarginAmount = roundToTwoDecimals(totalFinancedAmountDisplay - totalPurchasePrice);
  const normalMarginPercentage = totalPurchasePrice > 0 
    ? (normalMarginAmount / totalPurchasePrice) * 100 
    : 0;

  // 7. Calculer la marge ajustée avec le coefficient global
  const monthlyPaymentRatio = normalMonthlyPayment > 0 ? (adjustedMonthlyPayment / normalMonthlyPayment) : 1;
  const adjustedMarginAmount = normalMarginAmount * monthlyPaymentRatio;
  const adjustedMarginPercentage = totalPurchasePrice > 0 
    ? (adjustedMarginAmount / totalPurchasePrice) * 100 
    : 0;

  // 8. Calculer la différence de marge
  const marginDifference = normalMarginAmount - adjustedMarginAmount;

  console.log("🔢 CALCUL - Détail des calculs:", {
    totalPurchasePrice,
    normalMarginAmount,
    normalMarginPercentage,
    totalFinancedAmountIndividual,
    totalFinancedAmountDisplay,
    normalMonthlyPayment,
    globalCoefficient,
    adjustedMonthlyPayment,
    monthlyPaymentRatio,
    adjustedMarginAmount,
    adjustedMarginPercentage,
    marginDifference,
    explanation: marginDifference > 0 ? "Perte de marge avec coefficient global" : "Gain de marge avec coefficient global"
  });

  const result: CalculationResult = {
    totalPurchasePrice,
    normalMarginAmount,
    normalMarginPercentage,
    normalMonthlyPayment,
    adjustedMarginAmount,
    adjustedMarginPercentage,
    adjustedMonthlyPayment,
    marginDifference,
    globalCoefficient,
    // Utiliser le montant financé calculé inversement (méthode Grenke)
    totalFinancedAmount: totalFinancedAmountDisplay
  };

  console.log("🔢 CALCUL - Résultats finaux:", result);

  return result;
};
