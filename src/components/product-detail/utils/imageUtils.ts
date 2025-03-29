
/**
 * Utility functions for product image handling
 */

/**
 * Checks if an image URL is valid - simplified version that doesn't attempt to validate URLs
 * that could trigger CORS or storage permission issues
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
    url.split('/').pop()?.startsWith('.') ||
    url.includes('undefined') ||
    url.endsWith('/')
  ) {
    return false;
  }
  
  // Simple format validation - accept anything that looks like a path or URL
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
 * Add a timestamp to image URLs to prevent caching issues
 * Simplified version to avoid errors with storage permissions
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
    // Don't try to modify Supabase storage URLs in a way that might trigger validation or permission issues
    // Just append a timestamp query parameter in the simplest way possible
    const timestamp = Date.now();
    const separator = url.includes('?') ? '&' : '?';
    
    return `${url}${separator}t=${timestamp}`;
  } catch (e) {
    console.error("Error adding timestamp to URL:", url, e);
    return url; // Return original URL on error instead of placeholder
  }
};
