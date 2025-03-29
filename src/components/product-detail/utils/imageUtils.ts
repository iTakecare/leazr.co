
/**
 * Utility functions for product image handling
 */

/**
 * Check if an image URL is valid
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
 * Normalize a URL by removing double slashes and query parameters
 * Used for URL comparison and deduplication
 */
export const normalizeUrl = (url: string): string => {
  // First fix double slashes (except after protocol)
  const fixedSlashes = url.replace(/([^:])\/\/+/g, '$1/');
  
  // Remove any query parameters
  return fixedSlashes.split('?')[0];
};

/**
 * Filter and deduplicate valid image URLs
 */
export const filterValidImages = (mainImageUrl: string, additionalUrls: string[] = []): string[] => {
  // Create a set to deduplicate images based on normalized URL
  const uniqueUrlsSet = new Set<string>();
  const validUrls: string[] = [];
  
  // Process the main image first if valid
  if (isValidImageUrl(mainImageUrl)) {
    const normalizedMainUrl = normalizeUrl(mainImageUrl);
    uniqueUrlsSet.add(normalizedMainUrl);
    validUrls.push(mainImageUrl);
  }
  
  // Process additional images if valid
  if (Array.isArray(additionalUrls)) {
    additionalUrls.forEach(url => {
      // Only add if it's valid and not already added (based on normalized URL)
      if (isValidImageUrl(url)) {
        const normalizedUrl = normalizeUrl(url);
        if (!uniqueUrlsSet.has(normalizedUrl)) {
          uniqueUrlsSet.add(normalizedUrl);
          validUrls.push(url.replace(/([^:])\/\/+/g, '$1/'));  // Fix double slashes in the URL
        }
      }
    });
  }
  
  return validUrls;
};

/**
 * Clean image URL to prevent issues
 * Returns original URL with fixed slashes or placeholder if invalid
 */
export const cleanImageUrl = (url: string): string => {
  if (!url || !isValidImageUrl(url)) {
    return "/placeholder.svg";
  }
  
  // Check if it's already our placeholder
  if (url === '/placeholder.svg') {
    return url;
  }
  
  // Fix double slashes in URLs which can cause issues
  return url.replace(/([^:])\/\/+/g, '$1/');
};

/**
 * Legacy function kept for backward compatibility
 */
export const addTimestamp = (url: string): string => {
  return cleanImageUrl(url);
};
