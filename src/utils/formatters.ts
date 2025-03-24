// Formatage de prix/montants en euros
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

// Formatage de pourcentage
export const formatPercentage = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0 %';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numValue / 100);
};

// Formatage de pourcentage avec virgule
export const formatPercentageWithComma = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0 %';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numValue / 100);
};

// Formatage de date
export const formatDate = (date: string | Date): string => {
  if (!date) return "Date inconnue";
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Vérifier si la date est valide
    if (isNaN(dateObj.getTime())) {
      return "Date invalide";
    }
    
    // Utiliser des valeurs d'aujourd'hui si date future
    const now = new Date();
    const dateToUse = dateObj > now ? now : dateObj;
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateToUse);
  } catch (e) {
    console.error("Erreur lors du formatage de la date:", e);
    return "Erreur de date";
  }
};

// Formatage de date à la française
export const formatDateToFrench = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dateObj);
};

// Formatage d'heure
export const formatTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
};

// Formatage de date et heure
export const formatDateTime = (date: string | Date): string => {
  if (!date) return "Date inconnue";
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Vérifier si la date est valide
    if (isNaN(dateObj.getTime())) {
      return "Date invalide";
    }
    
    // Utiliser des valeurs d'aujourd'hui si date future
    const now = new Date();
    const dateToUse = dateObj > now ? now : dateObj;
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateToUse);
  } catch (e) {
    console.error("Erreur lors du formatage de la date/heure:", e);
    return "Erreur de date";
  }
};

// Formatage de temps relatif (il y a X minutes/heures/jours)
export const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffInMilliseconds = now.getTime() - date.getTime();
  
  // Convertir la différence en secondes
  const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
  
  if (diffInSeconds < 60) {
    return 'moins d\'une minute';
  }
  
  // Minutes
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  }
  
  // Heures
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  }
  
  // Jours
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  }
  
  // Mois
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} mois`;
  }
  
  // Années
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
};
