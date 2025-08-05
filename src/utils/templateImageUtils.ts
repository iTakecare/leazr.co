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

/**
 * Get the template preview image URL from various possible structures
 */
export const getTemplatePreviewImage = (template: any): string | null => {
  // Check template_metadata.pages_data first
  if (template.template_metadata?.pages_data?.[0]?.image_url) {
    return template.template_metadata.pages_data[0].image_url;
  }
  
  // Check template.images array
  if (template.images?.[0]?.image_url) {
    return template.images[0].image_url;
  }
  
  // Check direct template.image_url
  if (template.image_url) {
    return template.image_url;
  }
  
  // Check preview_image_url
  if (template.preview_image_url) {
    return template.preview_image_url;
  }
  
  return null;
};