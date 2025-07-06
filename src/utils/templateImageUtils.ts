/**
 * Utility function to get the display URL from a template image
 * Handles both URL and base64 data formats consistently
 */
export const getTemplateImageUrl = (pageImage: any): string | null => {
  if (!pageImage) return null;
  
  // Check for direct URL first
  if (pageImage.url) {
    return `${pageImage.url}?t=${new Date().getTime()}`;
  }
  
  // Check for base64 data
  if (pageImage.data) {
    return pageImage.data;
  }
  
  return null;
};

/**
 * Get the background image URL for a specific page from template images
 */
export const getPageBackgroundUrl = (templateImages: any[], currentPage: number): string | null => {
  if (!templateImages || templateImages.length === 0) return null;
  
  const pageImage = templateImages.find(img => img.page === currentPage);
  return getTemplateImageUrl(pageImage);
};