
/**
 * Utility functions for product image handling - Simplified version
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
 * Clean image URL to prevent issues
 * Returns original URL or placeholder if invalid
 */
export const addTimestamp = (url: string): string => {
  if (!url || !isValidImageUrl(url)) {
    return "/placeholder.svg";
  }
  
  // Check if it's already our placeholder
  if (url === '/placeholder.svg') {
    return url;
  }
  
  // Fix double slashes in URLs which can cause issues
  // This is a common issue with storage URLs
  const cleanedUrl = url.replace(/([^:])\/\/+/g, '$1/');
  
  return cleanedUrl;
};
