
/**
 * Utility functions for product image handling
 */

/**
 * Checks if an image URL is valid - basic validation only
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
  
  // Exclude placeholders or hidden files
  if (
    url.includes('.emptyFolderPlaceholder') || 
    url.includes('undefined') ||
    url.endsWith('/')
  ) {
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
 * Simply adds a timestamp to URLs to prevent caching issues
 */
export const addTimestamp = (url: string): string => {
  if (!url || !isValidImageUrl(url)) {
    return "/placeholder.svg";
  }
  
  // Check if it's already our placeholder
  if (url === '/placeholder.svg') {
    return url;
  }
  
  try {
    // Simply append a timestamp query parameter in the simplest way
    const timestamp = Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${timestamp}`;
  } catch (e) {
    console.error("Error adding timestamp to URL:", url, e);
    return url; // Return original URL on error
  }
};
