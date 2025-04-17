
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Uploads an image to Supabase storage and returns the public URL
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

    // Détecter le type MIME correct
    const contentType = getImageMimeType(file);
    console.log(`Type MIME détecté: ${contentType}`);
    
    // Générer un nom de fichier unique pour éviter les conflits
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
    
    // Cloner le fichier avec le bon type MIME
    const arrayBuffer = await file.arrayBuffer();
    const correctTypeFile = new File([arrayBuffer], fileName, { 
      type: contentType 
    });
    
    // Log pour débug
    console.log(`Fichier prêt pour upload:`, {
      name: correctTypeFile.name,
      type: correctTypeFile.type,
      size: correctTypeFile.size
    });
    
    // Upload avec les options explicites de content type
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, correctTypeFile, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Erreur d\'upload:', error.message);
      toast.error(`Erreur d'upload: ${error.message}`);
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    if (!urlData?.publicUrl) {
      const error = new Error("Impossible d'obtenir l'URL publique");
      console.error(error.message);
      toast.error(error.message);
      throw error;
    }
    
    console.log(`Image téléchargée avec succès: ${urlData.publicUrl}`);
    console.log(`Type MIME à vérifier dans le dashboard Supabase: ${contentType}`);
    
    return urlData.publicUrl;
    
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
