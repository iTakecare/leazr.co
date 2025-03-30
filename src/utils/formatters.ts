
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const formatCurrency = (value: number | string): string => {
  // First, ensure we have a number
  let numValue: number;
  
  if (typeof value === 'number') {
    numValue = value;
  } else if (typeof value === 'string') {
    numValue = parseFloat(value);
  } else {
    numValue = 0;
  }
  
  if (isNaN(numValue)) {
    console.warn("formatCurrency received an invalid value:", value);
    numValue = 0;
  }
  
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

export const formatDateToFrench = (dateString: string | Date): string => {
  if (!dateString) return "Date inconnue";
  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
  } catch {
    return "Date incorrecte";
  }
};

export const formatDistanceToNow = (dateString: string | Date): string => {
  if (!dateString) return "";
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    // Simple implementation - could be expanded with a library like date-fns
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return "aujourd'hui";
    if (diffDays === 1) return "hier";
    if (diffDays < 7) return `il y a ${diffDays} jours`;
    if (diffDays < 30) return `il y a ${Math.floor(diffDays/7)} semaine${Math.floor(diffDays/7) > 1 ? 's' : ''}`;
    if (diffDays < 365) return `il y a ${Math.floor(diffDays/30)} mois`;
    return `il y a ${Math.floor(diffDays/365)} an${Math.floor(diffDays/365) > 1 ? 's' : ''}`;
  } catch {
    return "date inconnue";
  }
};

export const formatPercentageWithComma = (value: number): string => {
  if (isNaN(value)) return "0,00%";
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
};
