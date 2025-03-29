
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

// Global image URL cache to prevent unnecessary storage requests
const globalImageCache: Map<string, string> = new Map();
const imageLoadAttempts: Map<string, number> = new Map();
const MAX_RETRY_ATTEMPTS = 2;

/**
 * Ensures a bucket exists before attempting to use it
 */
export const ensureBucket = async (bucketName: string): Promise<boolean> => {
  try {
    // Check if bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('Error checking buckets:', error);
      return false;
    }

    // If the bucket exists, return true
    if (buckets.some(bucket => bucket.name === bucketName)) {
      return true;
    }

    // Try to create the bucket with Edge Function
    try {
      const response = await fetch('/api/create-storage-bucket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bucketName }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(`Bucket ${bucketName} created successfully via Edge Function`);
          return true;
        }
      }
      
      console.error(`Failed to create bucket ${bucketName} via Edge Function`);
    } catch (edgeFnError) {
      console.error(`Error calling Edge Function:`, edgeFnError);
    }

    // Try to create the bucket directly (fallback)
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true
    });

    if (createError) {
      if (createError.message.includes('already exists')) {
        return true;
      }
      console.error(`Error creating bucket ${bucketName}:`, createError);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error checking/creating bucket ${bucketName}:`, error);
    return false;
  }
};

/**
 * Detect file extension from filename
 */
export const detectFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

/**
 * Detect mime type from file extension
 */
export const detectMimeTypeFromExtension = (extension: string): string => {
  switch (extension.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'pdf':
      return 'application/pdf';
    case 'doc':
    case 'docx':
      return 'application/msword';
    case 'xls':
    case 'xlsx':
      return 'application/vnd.ms-excel';
    default:
      return 'application/octet-stream';
  }
};

/**
 * Force correct mime type for a file
 */
export const enforceCorrectMimeType = (file: File): File => {
  const fileExt = detectFileExtension(file.name);
  const mimeType = detectMimeTypeFromExtension(fileExt);
  
  if (file.type && file.type.startsWith('image/') && file.type !== 'application/octet-stream') {
    return file;
  }
  
  try {
    return new File([file], file.name, { 
      type: mimeType,
      lastModified: file.lastModified 
    });
  } catch (error) {
    console.warn('Could not create new File with forced MIME type, using original:', error);
    return file;
  }
};

/**
 * Upload an image to a Supabase storage bucket
 * @param file The file to upload
 * @param bucketName The storage bucket name
 * @param folderPath Optional folder path within the bucket
 * @returns The URL of the uploaded image or null if upload failed
 */
export const uploadImage = async (
  file: File,
  bucketName: string,
  folderPath: string = ''
): Promise<string | null> => {
  try {
    const bucketExists = await ensureBucket(bucketName);
    if (!bucketExists) {
      toast.error(`Bucket ${bucketName} doesn't exist and could not be created`);
      return null;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`File is too large. Maximum size is 5MB.`);
      return null;
    }

    // Check file type
    const fileExt = detectFileExtension(file.name);
    if (!fileExt) {
      toast.error(`Unsupported file type or missing extension.`);
      return null;
    }

    // Ensure correct MIME type
    const fileWithCorrectMime = enforceCorrectMimeType(file);
    
    // Generate unique filename
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

    // Determine correct MIME type
    const contentType = fileWithCorrectMime.type || detectMimeTypeFromExtension(fileExt);
    
    console.log(`Uploading file with content type: ${contentType}, size: ${file.size} bytes`);

    // Convert file to Blob with explicit MIME type
    const fileBlob = new Blob([await fileWithCorrectMime.arrayBuffer()], { type: contentType });

    // Upload file with correct contentType
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType
      });

    if (error) {
      console.error('Upload error:', error);
      toast.error("Error uploading file");
      return null;
    }

    // Get public URL
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    toast.error("Error uploading file");
    return null;
  }
};

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
