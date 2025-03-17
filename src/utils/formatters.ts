
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatPercentage = (percent: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(percent / 100);
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('fr-FR').format(
    typeof date === 'string' ? new Date(date) : date
  );
};

export const formatPhoneNumber = (phone: string): string => {
  // Simple French phone number formatting
  if (!phone) return '';
  
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format for French numbers (assuming starts with 0)
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  
  // International format
  if (digits.length > 10) {
    const countryCode = digits.slice(0, digits.length - 9);
    const restDigits = digits.slice(digits.length - 9);
    return `+${countryCode} ${restDigits.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}`;
  }
  
  return phone;
};
