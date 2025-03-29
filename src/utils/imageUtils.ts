
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Global image URL cache to prevent unnecessary storage requests
const globalImageCache: Map<string, string> = new Map();
const imageLoadAttempts: Map<string, number> = new Map();
const MAX_RETRY_ATTEMPTS = 2;

/**
 * Centralized utility for loading product images from Supabase storage
 */
export async function loadProductImagesFromStorage(productId: string): Promise<string[]> {
  // Return cached data if available
  const cacheKey = `product-images-${productId}`;
  const cachedData = sessionStorage.getItem(cacheKey);
  
  if (cachedData) {
    try {
      const parsedData = JSON.parse(cachedData);
      // Validate cached data and return if valid
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        // Refresh URLs with cache busters
        return parsedData.map(url => addCacheBuster(url));
      }
    } catch (e) {
      console.warn("Error parsing cached image data:", e);
      // Continue with storage request if cache is invalid
    }
  }
  
  try {
    const { data: files, error } = await supabase
      .storage
      .from("product-images")
      .list(productId, {
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      console.error("Error listing images in storage:", error);
      return [];
    }
    
    // Filter valid image files
    const imageFiles = files?.filter(file => 
      !file.name.startsWith('.') && 
      !file.name.endsWith('/') &&
      file.name !== '.emptyFolderPlaceholder'
    ) || [];
    
    if (imageFiles.length === 0) {
      return [];
    }
    
    // Generate image URLs with cache busting
    const imageUrls = imageFiles.map(file => {
      const { data } = supabase
        .storage
        .from("product-images")
        .getPublicUrl(`${productId}/${file.name}`);
      
      if (!data?.publicUrl) return null;
      
      // Cache the base URL
      globalImageCache.set(`${productId}-${file.name}`, data.publicUrl);
      
      return data.publicUrl;
    }).filter(Boolean) as string[];
    
    // Cache the results
    if (imageUrls.length > 0) {
      sessionStorage.setItem(cacheKey, JSON.stringify(imageUrls));
    }
    
    // Add cache busters to each URL
    return imageUrls.map(url => addCacheBuster(url));
  } catch (err) {
    console.error("Error loading product images:", err);
    return [];
  }
}

/**
 * Add cache-busting parameter to image URL
 */
export function addCacheBuster(url: string): string {
  if (!url || url === '/placeholder.svg') return '/placeholder.svg';
  
  try {
    const baseUrl = url.split('?')[0];
    const timestamp = Date.now();
    return `${baseUrl}?t=${timestamp}`;
  } catch (e) {
    return url;
  }
}

/**
 * Handle image loading errors with controlled retry logic
 */
export function handleImageError(
  imageUrl: string, 
  setImage: (url: string) => void, 
  setError: (hasError: boolean) => void,
  fallback: string = '/placeholder.svg'
): void {
  // Skip error handling for placeholder
  if (imageUrl === fallback) {
    return;
  }
  
  // Extract base URL without query params
  const baseUrl = imageUrl.split('?')[0];
  
  // Track retry attempts
  const attempts = imageLoadAttempts.get(baseUrl) || 0;
  imageLoadAttempts.set(baseUrl, attempts + 1);
  
  // Retry loading with cache buster
  if (attempts < MAX_RETRY_ATTEMPTS) {
    console.log(`Retrying image load (${attempts + 1}/${MAX_RETRY_ATTEMPTS}): ${baseUrl}`);
    setTimeout(() => {
      setImage(`${baseUrl}?t=${Date.now()}&retry=${attempts + 1}`);
    }, 800);
  } else {
    // Give up after max attempts
    console.error(`Failed to load image after ${MAX_RETRY_ATTEMPTS} attempts:`, baseUrl);
    setImage(fallback);
    setError(true);
    // Clean up tracking
    imageLoadAttempts.delete(baseUrl);
  }
}

/**
 * Fix common issues with URLs from different sources
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return '/placeholder.svg';
  
  // Skip placeholder
  if (url === '/placeholder.svg') return url;
  
  try {
    // Fix protocol issues
    let normalized = url
      // Fix protocol-relative URLs
      .replace(/^\/\//, 'https://')
      // Fix missing protocol
      .replace(/^(?!https?:\/\/)/, 'https://')
      // Fix double slashes in path
      .replace(/([^:]\/)\/+/g, '$1')
      // Remove trailing slashes
      .replace(/\/$/, '');
      
    // Fix common supabase URL issues
    if (normalized.includes('supabase.co') && !normalized.includes('storage/v1/object/public')) {
      normalized = normalized.replace(
        /supabase\.co\/(?!storage\/v1\/object\/public)/,
        'supabase.co/storage/v1/object/public/'
      );
    }
    
    return normalized;
  } catch (e) {
    console.error("Error normalizing image URL:", e);
    return url;
  }
}

/**
 * Reusable function to validate image URLs
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') return false;
  if (url === '/placeholder.svg') return false;
  
  return !(
    url.includes('.emptyFolderPlaceholder') || 
    url.split('/').pop()?.startsWith('.') ||
    url.includes('undefined') ||
    url.endsWith('/')
  );
}

/**
 * Deduplicate and validate an array of image URLs
 */
export function deduplicateImages(imageUrls: (string | null | undefined)[]): string[] {
  const validImages: string[] = [];
  const seenUrls = new Set<string>();
  
  imageUrls.forEach(url => {
    if (isValidImageUrl(url)) {
      // Normalize the URL and use as key for deduplication
      const baseUrl = (url as string).split('?')[0];
      
      if (!seenUrls.has(baseUrl)) {
        seenUrls.add(baseUrl);
        validImages.push(url as string);
      }
    }
  });
  
  return validImages;
}
