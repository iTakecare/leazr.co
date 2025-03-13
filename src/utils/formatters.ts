
/**
 * Format number as currency (EUR)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

/**
 * Format price for display (same as formatCurrency but exported with a different name)
 */
export const formatPrice = (amount: number): string => {
  return formatCurrency(amount);
};

/**
 * Format number as percentage
 */
export const formatPercentage = (percentage: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percentage / 100);
};

/**
 * Format date in French locale
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};
