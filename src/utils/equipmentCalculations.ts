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

export const calculateFinancedAmountForEquipment = (equipment: Equipment): number => {
  return equipment.purchasePrice * equipment.quantity * (1 + equipment.margin / 100);
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

  // 2. Calculer la marge normale (somme des marges individuelles avec quantités)
  const normalMarginAmount = equipmentList.reduce((sum, equipment) => {
    return sum + (equipment.purchasePrice * equipment.quantity * equipment.margin / 100);
  }, 0);

  const normalMarginPercentage = totalPurchasePrice > 0 
    ? (normalMarginAmount / totalPurchasePrice) * 100 
    : 0;

  // 3. Calculer le montant financé total avec les marges individuelles
  const totalFinancedAmountIndividual = totalPurchasePrice + normalMarginAmount;

  // 4. Calculer la mensualité normale (somme des mensualités individuelles)
  const normalMonthlyPayment = equipmentList.reduce((sum, equipment) => {
    if (equipment.monthlyPayment) {
      return sum + (equipment.monthlyPayment * equipment.quantity);
    }
    // Si pas de mensualité définie, calculer avec le coefficient individuel
    const financedAmount = calculateFinancedAmountForEquipment(equipment);
    const coeff = findCoefficientForAmount(financedAmount, leaser, duration);
    const monthlyForOne = (financedAmount * coeff) / 100;
    return sum + monthlyForOne;
  }, 0);

  // 5. Calculer avec le coefficient global sur le montant financé total
  const globalCoefficient = findCoefficientForAmount(totalFinancedAmountIndividual, leaser, duration);
  const adjustedMonthlyPayment = (totalFinancedAmountIndividual * globalCoefficient) / 100;

  // 6. Calculer la marge ajustée réelle avec la mensualité globale
  // Ratio de réduction de la mensualité appliqué à la marge
  const monthlyPaymentRatio = normalMonthlyPayment > 0 ? (adjustedMonthlyPayment / normalMonthlyPayment) : 1;
  const adjustedMarginAmount = normalMarginAmount * monthlyPaymentRatio;
  const adjustedMarginPercentage = totalPurchasePrice > 0 
    ? (adjustedMarginAmount / totalPurchasePrice) * 100 
    : 0;

  // 7. Calculer la différence de marge réelle
  // Différence = Marge normale - Marge ajustée (avec coefficient global)
  // Si positif : on perd de la marge avec le coefficient global
  // Si négatif : on gagne de la marge avec le coefficient global
  const marginDifference = normalMarginAmount - adjustedMarginAmount;

  console.log("🔢 CALCUL - Détail des calculs:", {
    totalPurchasePrice,
    normalMarginAmount,
    normalMarginPercentage,
    totalFinancedAmountIndividual,
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
    totalFinancedAmount: totalFinancedAmountIndividual
  };

  console.log("🔢 CALCUL - Résultats finaux:", result);

  return result;
};
