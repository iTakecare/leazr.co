
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

// Fonction pour formatter une date relative (ex: "il y a 3 jours")
export const formatDistanceToNow = (date: Date) => {
  const now = new Date();
  const diffInMilliseconds = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} secondes`;
  } else if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? '1 minute' : `${diffInMinutes} minutes`;
  } else if (diffInHours < 24) {
    return diffInHours === 1 ? '1 heure' : `${diffInHours} heures`;
  } else if (diffInDays < 30) {
    return diffInDays === 1 ? '1 jour' : `${diffInDays} jours`;
  } else if (diffInMonths < 12) {
    return diffInMonths === 1 ? '1 mois' : `${diffInMonths} mois`;
  } else {
    return diffInYears === 1 ? '1 an' : `${diffInYears} ans`;
  }
};
