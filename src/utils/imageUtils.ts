
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadFileDirectly } from "@/services/directFileUploadService";

/**
 * Uploads an image to Supabase storage and returns the public URL
 * Using direct fetch approach
 */
export async function uploadImage(
  file: File,
  bucketName: string = "blog-images",
  folderPath: string = ""
): Promise<string | null> {
  try {
    console.log(`Début du téléchargement de l'image: ${file.name} vers le bucket: ${bucketName}`);
    
    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      console.error("Image trop volumineuse (max 5MB)");
      toast.error("L'image est trop volumineuse (max 5MB)");
      return null;
    }

    // Using the direct upload method via fetch
    const result = await uploadFileDirectly(file, bucketName, folderPath);
    
    if (result && result.url) {
      console.log(`Image téléchargée avec succès: ${result.url}`);
      return result.url;
    } else {
      throw new Error("Échec de l'upload de l'image");
    }
  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    toast.error("Erreur lors du téléchargement de l'image");
    throw error;
  }
};

// Fonction utilitaire pour détecter le type MIME à partir du fichier ou de son extension
function getImageMimeType(file: File): string {
  // Vérifier d'abord le type MIME du fichier
  if (file.type.startsWith('image/')) {
    return file.type;
  }

  // Si le type n'est pas défini, déduire à partir de l'extension
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

// Simplified function for basic URL manipulation - no JSON parsing needed
export function getCacheBustedUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Add cache busting parameter
  if (url.includes('?')) {
    return `${url}&t=${Date.now()}`;
  }
  
  return `${url}?t=${Date.now()}`;
}
