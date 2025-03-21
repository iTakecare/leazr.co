
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
 * Truncate a string to a maximum length and add ellipsis if needed
 */
export const truncateText = (text: string, maxLength = 100): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};
