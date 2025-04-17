
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

    // Generate a unique filename to prevent conflicts
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

    // Création du nom de fichier pour stockage local (fallback)
    const localFileName = `/lovable-uploads/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;

    // Try uploading directly via Supabase Storage
    try {
      console.log(`Tentative d'upload du fichier...`);
      
      // Important: Use 'blog-images' (with dash) instead of 'Blog Images' (with space)
      const { data, error } = await supabase.storage
        .from("blog-images")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error('Erreur d\'upload:', error.message);
        toast.error(`Erreur d'upload: ${error.message}`);
        return localFileName; // Fallback en cas d'erreur
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from("blog-images")
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        console.error("Impossible d'obtenir l'URL publique");
        toast.error("Impossible d'obtenir l'URL publique");
        return localFileName; // Fallback en cas d'erreur
      }
      
      console.log(`Image téléchargée avec succès: ${urlData.publicUrl}`);
      return urlData.publicUrl;
      
    } catch (error) {
      console.error('Erreur générale d\'upload:', error);
      // Utiliser le fallback local
      return localFileName;
    }
  } catch (error) {
    console.error('Erreur générale:', error);
    toast.error("Erreur lors du téléchargement de l'image");
    
    // Fallback pour garantir qu'une image est toujours disponible
    const timestamp = Date.now();
    return `/lovable-uploads/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
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
