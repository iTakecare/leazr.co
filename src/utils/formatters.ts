
/**
 * Format a number as currency
 * @param value - The number to format
 * @param currency - The currency code (default: EUR)
 * @param locale - The locale to use (default: fr-FR)
 */
export const formatCurrency = (value: number, currency = 'EUR', locale = 'fr-FR'): string => {
  // Handle NaN, null, undefined
  if (value === null || value === undefined || isNaN(value)) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(0);
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Format a number as a percentage
 * @param value - The number to format (0.1 = 10%)
 * @param locale - The locale to use (default: fr-FR)
 */
export const formatPercentage = (value: number, locale = 'fr-FR'): string => {
  // Handle NaN, null, undefined
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
};

/**
 * Format a date
 * @param date - The date to format
 * @param locale - The locale to use (default: fr-FR)
 * @param options - Date formatting options
 */
export const formatDate = (
  date: Date | string,
  locale = 'fr-FR',
  options: Intl.DateTimeFormatOptions = { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  }
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
};

/**
 * Format a number
 * @param value - The number to format
 * @param locale - The locale to use (default: fr-FR)
 * @param minimumFractionDigits - Minimum fraction digits (default: 0)
 * @param maximumFractionDigits - Maximum fraction digits (default: 2)
 */
export const formatNumber = (
  value: number, 
  locale = 'fr-FR',
  minimumFractionDigits = 0,
  maximumFractionDigits = 2
): string => {
  // Handle NaN, null, undefined
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
};
