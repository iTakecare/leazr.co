
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0,00 €';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
};

export const formatPercentage = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0%';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(numValue / 100);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return "Date inconnue";
  try {
    return format(new Date(dateString), "dd MMMM yyyy à HH:mm", { locale: fr });
  } catch {
    return "Date incorrecte";
  }
};
