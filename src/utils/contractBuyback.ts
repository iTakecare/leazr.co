/**
 * Calcul du rachat de contrat (valeur résiduelle).
 *
 * Valeur de rachat = (nombre de mois restants × loyer mensuel) + valeur résiduelle
 * où valeur résiduelle = montant financé × (pourcentage / 100).
 */

const roundTo2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Nombre de mois pleins écoulés entre deux dates.
 */
const monthsElapsed = (from: Date, to: Date): number => {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
};

const monthsUntil = (from: Date, to: Date): number => {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() > from.getDate()) months += 1;
  return months;
};

export interface RemainingMonthsParams {
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  contractDuration?: number | null;
  now?: Date;
}

/**
 * Calcule le nombre de mois restants sur un contrat.
 * Priorité : date de début + durée. Sinon, date de fin. Sinon, durée totale.
 */
export const computeRemainingMonths = ({
  contractStartDate,
  contractEndDate,
  contractDuration,
  now = new Date(),
}: RemainingMonthsParams): number => {
  if (contractStartDate && contractDuration) {
    const elapsed = monthsElapsed(new Date(contractStartDate), now);
    return Math.max(0, Math.min(contractDuration, contractDuration - elapsed));
  }
  if (contractEndDate) {
    return Math.max(0, monthsUntil(now, new Date(contractEndDate)));
  }
  return contractDuration ?? 0;
};

export interface BuybackValueParams {
  remainingMonths: number;
  monthlyPayment: number;
  financedAmount: number;
  residualPercentage: number;
}

export interface BuybackValueResult {
  rentSum: number;
  residualValue: number;
  total: number;
}

export const computeBuybackValue = ({
  remainingMonths,
  monthlyPayment,
  financedAmount,
  residualPercentage,
}: BuybackValueParams): BuybackValueResult => {
  const rentSum = roundTo2((remainingMonths || 0) * (monthlyPayment || 0));
  const residualValue = roundTo2((financedAmount || 0) * (residualPercentage || 0) / 100);
  return {
    rentSum,
    residualValue,
    total: roundTo2(rentSum + residualValue),
  };
};
