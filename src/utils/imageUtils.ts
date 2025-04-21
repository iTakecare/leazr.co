
import { toast } from "sonner";
import { uploadImage as uploadImageService, getCacheBustedUrl as getCacheBustedUrlService } from "@/services/fileUploadService";

/**
 * Uploads an image to Supabase storage and returns the public URL
 */
export async function uploadImage(
  file: File,
  bucketName: string = "blog-images",
  folderPath: string = ""
): Promise<string | null> {
  return uploadImageService(file, bucketName, folderPath);
}

// Function to get a cache-busted URL for images
export function getCacheBustedUrl(url: string | null | undefined): string {
  return getCacheBustedUrlService(url);
}

// Function to get MIME type from file extension
export function getImageMimeType(file: File): string {
  // First check the file's type
  if (file.type.startsWith('image/')) {
    return file.type;
  }

  // If type is not defined, deduce from extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  switch (extension) {
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
    default:
      return 'application/octet-stream';
  }
}
