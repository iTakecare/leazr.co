
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
  
  // Check for invalid patterns that commonly indicate problematic URLs
  if (url.includes('.emptyFolderPlaceholder') || 
      url.includes('undefined') ||
      url.endsWith('/')) {
    return false;
  }
  
  return true;
};

/**
 * Normalize a URL by removing double slashes and query parameters
 * Used for URL comparison and deduplication
 */
export const normalizeUrl = (url: string): string => {
  if (!url) return '';
  
  try {
    // First fix double slashes (except after protocol)
    let fixedSlashes = url.replace(/([^:])\/\/+/g, '$1/');
    
    // Remove any query parameters and hash fragments
    fixedSlashes = fixedSlashes.split('?')[0].split('#')[0];
    
    return fixedSlashes;
  } catch (err) {
    console.error("Error normalizing URL:", err);
    return url;
  }
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
        if (normalizedUrl && !uniqueUrlsSet.has(normalizedUrl)) {
          uniqueUrlsSet.add(normalizedUrl);
          // Fix URL before adding
          validUrls.push(cleanImageUrl(url));
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
  const cleanedUrl = url.replace(/([^:])\/\/+/g, '$1/');
  
  // Remove any timestamp parameters as they can cause caching issues
  const urlWithoutTimestamp = cleanedUrl.split('?')[0];
  
  return urlWithoutTimestamp;
};

/**
 * Legacy function kept for backward compatibility
 */
export const addTimestamp = (url: string): string => {
  return cleanImageUrl(url);
};
