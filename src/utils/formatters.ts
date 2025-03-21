
/**
 * Format a number as a currency string (EUR by default)
 */
export const formatCurrency = (
  value: number, 
  locale = 'fr-FR', 
  currency = 'EUR',
  maximumFractionDigits = 2
): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0,00 €';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits
  }).format(value);
};

/**
 * Format a date string to a localized date format
 */
export const formatDate = (
  date: string | Date, 
  locale = 'fr-FR'
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj);
};

/**
 * Format a date to French format (DD/MM/YYYY)
 */
export const formatDateToFrench = (
  date: string | Date
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
};

/**
 * Format the distance between a date and now in a human-readable format
 */
export const formatDistanceToNow = (
  date: Date
): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'moins d\'une minute';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} mois`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
};

/**
 * Format attributes from a product variant into a readable string
 */
export const formatAttributes = (attributes: Record<string, any> | undefined): string => {
  if (!attributes || Object.keys(attributes).length === 0) {
    return '';
  }
  
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
};

/**
 * Format a number as a percentage with comma as decimal separator for French locale
 */
export const formatPercentageWithComma = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0,00%';
  }
  
  return value.toFixed(2).replace('.', ',') + '%';
};

/**
 * Format a number as a percentage
 */
export const formatPercentage = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%';
  }
  
  // Convert decimal to percentage (e.g., 0.25 to 25%)
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Truncate a string to a maximum length and add ellipsis if needed
 */
export const truncateText = (text: string, maxLength = 100): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};
