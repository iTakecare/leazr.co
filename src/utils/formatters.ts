
import { format, formatDistance, formatDistanceToNow as formatDistanceNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Format date to French format (e.g. "15 janvier 2023")
export const formatDateToFrench = (date: string | Date | undefined): string => {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  } catch (error) {
    console.error('Invalid date format:', error);
    return 'Date invalide';
  }
};

// Format time to French format (e.g. "15:30")
export const formatTimeToFrench = (date: string | Date | undefined): string => {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), 'HH:mm', { locale: fr });
  } catch (error) {
    console.error('Invalid date format:', error);
    return 'Heure invalide';
  }
};

// Format date and time to French format (e.g. "15 janvier 2023, 15:30")
export const formatDateTimeToFrench = (date: string | Date | undefined): string => {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), 'dd MMMM yyyy, HH:mm', { locale: fr });
  } catch (error) {
    console.error('Invalid date format:', error);
    return 'Date invalide';
  }
};

// Format currency to French format (e.g. "1 234,56 €")
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
};

// Format relative time (e.g. "il y a 2 jours")
export const formatDistanceToNow = (date: string | Date | undefined): string => {
  if (!date) return 'N/A';
  try {
    return formatDistanceNow(new Date(date), { addSuffix: true, locale: fr });
  } catch (error) {
    console.error('Invalid date format:', error);
    return 'Date invalide';
  }
};

// Format phone number to French format (e.g. "+33 1 23 45 67 89")
export const formatPhoneNumber = (phone: string | undefined): string => {
  if (!phone) return 'N/A';
  
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  // French mobile pattern (+33 6 12 34 56 78)
  if (digits.length === 10 && (digits.startsWith('06') || digits.startsWith('07'))) {
    return `+33 ${digits.slice(1, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  
  // Return original if no pattern matches
  return phone;
};
