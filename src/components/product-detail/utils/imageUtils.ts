
/**
 * Utility functions for product image handling
 */

/**
 * Very simple check if an image URL is valid - basic validation only
 */
export const isValidImageUrl = (url: string | null | undefined): boolean => {
  // If the URL is null, undefined or empty, it's not valid
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  // If it's the default placeholder image, it's not considered valid
  if (url === '/placeholder.svg') {
    return false;
  }
  
  return true;
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
 * Add a unique timestamp to prevent caching issues
 * But avoid adding one if URL already has one
 */
export const addTimestamp = (url: string): string => {
  if (!url || !isValidImageUrl(url)) {
    return "/placeholder.svg";
  }
  
  // Check if it's already our placeholder
  if (url === '/placeholder.svg') {
    return url;
  }
  
  // Don't add a timestamp if there's already one
  if (url.includes('?t=') || url.includes('&t=')) {
    return url;
  }
  
  try {
    // Simply append a timestamp query parameter
    const timestamp = Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${timestamp}`;
  } catch (e) {
    return url; // Return original URL on error
  }
};
