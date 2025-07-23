/**
 * Generates a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @returns The slugified string
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple consecutive hyphens with single hyphen
};

/**
 * Extracts UUID from a string that contains UUID followed by slug
 * @param uuidWithSlug - String in format "uuid-slug" or just "uuid"
 * @returns The extracted UUID
 */
export const extractUuidFromSlug = (uuidWithSlug: string): string => {
  // UUID pattern: 8-4-4-4-12 characters
  const uuidRegex = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const match = uuidWithSlug.match(uuidRegex);
  
  if (match) {
    return match[1];
  }
  
  // If no UUID pattern found, return the original string (might already be a clean UUID)
  return uuidWithSlug;
};