import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Améliorons la gestion des cas particuliers pour éviter les erreurs
export const formatCurrency = (value: number | string | null | undefined): string => {
  // Protection contre les valeurs nulles/undefined/NaN
  if (value === null || value === undefined || value === "" || 
      (typeof value === 'number' && (isNaN(value) || !isFinite(value)))) {
    return "0,00 €";
  }
  
  // Conversion en nombre avec vérification stricte
  let numValue: number;
  
  if (typeof value === 'number') {
    numValue = value;
  } else if (typeof value === 'string') {
    // Conversion des chaînes en nombres
    const cleaned = value.replace(/[^\d.,\-]/g, '').replace(',', '.');
    numValue = parseFloat(cleaned);
    
    // Si la conversion échoue, retourner 0
    if (isNaN(numValue) || !isFinite(numValue)) {
      return "0,00 €";
    }
  } else {
    return "0,00 €";
  }
  
  // Arrondir les valeurs très proches de zéro pour éviter -0.00 €
  if (Math.abs(numValue) < 0.01) {
    numValue = 0;
  }
  
  try {
    // Utiliser l'API Intl pour un formatage cohérent
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return "0,00 €";
  }
};

// Conserver les autres fonctions de formatage sans changement
export const formatPercentage = (value: number | string): string => {
  // Vérification pour les valeurs nulles/undefined
  if (value === null || value === undefined || value === "") {
    return "0%";
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  
  if (isNaN(numValue)) return '0%';
  
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }).format(numValue / 100);
  } catch (error) {
    console.error("Error formatting percentage:", error);
    return "0%";
  }
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return "Date inconnue";
  try {
    return format(new Date(dateString), "dd MMMM yyyy à HH:mm:ss", { locale: fr });
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

export const formatPercentageWithComma = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return "0,00%";
  }
  
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  } catch (error) {
    console.error("Error formatting percentage with comma:", error);
    return "0,00%";
  }
};

// Nouvelle fonction pour formater les dates avec timezone pour la valeur légale
export const formatLegalTimestamp = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    
    // Format avec date complète, heure avec secondes et timezone
    const formattedDate = format(date, "dd MMMM yyyy", { locale: fr });
    const formattedTime = format(date, "HH:mm:ss", { locale: fr });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return `${formattedDate} à ${formattedTime} (${timezone})`;
  } catch (e) {
    console.error("Erreur de formatage de date:", e);
    return "";
  }
};
