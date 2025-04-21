
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

/**
 * Format a date to French format
 * @param date - The date to format
 * @param includeTime - Whether to include time (default: false)
 */
export const formatDateToFrench = (
  date: Date | string,
  includeTime = false
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return dateObj.toLocaleDateString('fr-FR', options);
};

/**
 * Format a date for legal documents with time
 * @param date - The date to format
 */
export const formatLegalTimestamp = (
  date: Date | string
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const options: Intl.DateTimeFormatOptions = { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  
  return dateObj.toLocaleDateString('fr-FR', options).replace(',', ' à');
};

/**
 * Format a date to a relative time string (e.g., "il y a 2 jours")
 * @param date - The date to format
 * @param baseDate - The base date to compare with (default: new Date())
 */
export const formatDistanceToNow = (
  date: Date | string,
  baseDate: Date = new Date()
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const diffMs = baseDate.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSecs < 60) {
    return 'moins d\'une minute';
  } else if (diffMins < 60) {
    return diffMins === 1 ? 'environ une minute' : `environ ${diffMins} minutes`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? 'environ une heure' : `environ ${diffHours} heures`;
  } else if (diffDays < 30) {
    return diffDays === 1 ? 'environ un jour' : `environ ${diffDays} jours`;
  } else if (diffMonths < 12) {
    return diffMonths === 1 ? 'environ un mois' : `environ ${diffMonths} mois`;
  } else {
    return diffYears === 1 ? 'environ un an' : `environ ${diffYears} ans`;
  }
};
