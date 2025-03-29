
/**
 * Utility functions for product image handling
 */

/**
 * Checks if an image URL is valid
 */
export const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  if (url === '/placeholder.svg') {
    return false;
  }
  
  // Exclude placeholder or hidden files
  if (
    url.includes('.emptyFolderPlaceholder') || 
    url.split('/').pop()?.startsWith('.') ||
    url.includes('undefined') ||
    url.endsWith('/')
  ) {
    return false;
  }
  
  // Try to validate as URL
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
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
  if (!url || url === '/placeholder.svg' || !isValidImageUrl(url)) {
    return "/placeholder.svg";
  }
  
  try {
    // Add a timestamp query parameter to prevent caching
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  } catch (e) {
    return "/placeholder.svg";
  }
};
