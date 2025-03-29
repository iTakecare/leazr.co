
/**
 * Utility functions for product image handling
 */

/**
 * Checks if an image URL is valid
 */
export const isValidImageUrl = (url: string | null | undefined): boolean => {
  // Si l'URL est null, undefined ou une chaîne vide, elle n'est pas valide
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  // Si c'est l'image placeholder par défaut, considérée comme non valide (pour forcer le chargement d'une vraie image)
  if (url === '/placeholder.svg') {
    return false;
  }
  
  // Exclure les placeholders ou fichiers cachés
  if (
    url.includes('.emptyFolderPlaceholder') || 
    url.split('/').pop()?.startsWith('.') ||
    url.includes('undefined') ||
    url.endsWith('/')
  ) {
    return false;
  }
  
  // Validation simplifiée pour accepter les URLs les plus courantes sans validation complexe
  // Accepter toute URL commençant par http(s):// ou data: ou /
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('/')) {
    return true;
  }
  
  // Essayer de déterminer si c'est une URL ou un chemin relatif
  return url.includes('/');
};

/**
 * Filter and deduplicate valid image URLs
 */
export const filterValidImages = (mainImageUrl: string, additionalUrls: string[] = []): string[] => {
  // Create a set to deduplicate images
  const uniqueUrlsSet = new Set<string>();
  const validUrls: string[] = [];
  
  // Process the main image first if valid
  if (isValidImageUrl(mainImageUrl)) {
    uniqueUrlsSet.add(mainImageUrl);
    validUrls.push(mainImageUrl);
  }
  
  // Process additional images if valid
  if (Array.isArray(additionalUrls)) {
    additionalUrls.forEach(url => {
      // Only add if it's valid and not already added
      if (isValidImageUrl(url) && !uniqueUrlsSet.has(url)) {
        uniqueUrlsSet.add(url);
        validUrls.push(url);
      }
    });
  }
  
  return validUrls;
};

/**
 * Add a timestamp to image URLs to prevent caching issues
 */
export const addTimestamp = (url: string): string => {
  if (!url || !isValidImageUrl(url)) {
    return "/placeholder.svg";
  }
  
  try {
    // Check if it's already our placeholder
    if (url === '/placeholder.svg') {
      return url;
    }
    
    // Simplifier la gestion pour toutes les URLs
    // Strip any existing timestamp parameter
    let cleanUrl = url;
    if (url.includes('?t=') || url.includes('&t=')) {
      cleanUrl = url.replace(/([?&])t=\d+(&|$)/, '$1').replace(/[?&]$/, '');
    }
    
    // Add a timestamp query parameter to prevent caching
    const timestamp = Date.now();
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}t=${timestamp}`;
    
  } catch (e) {
    return "/placeholder.svg";
  }
};
