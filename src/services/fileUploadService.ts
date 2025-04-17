
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Upload an image to a specific bucket
 */
export const uploadImage = async (
  file: File,
  bucketName: string = "blog-images",
  folderPath: string = ""
): Promise<string | null> => {
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
    
    console.log(`Tentative d'upload du fichier...`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
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
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    toast.error("Erreur lors du téléchargement de l'image");
    throw error;
  }
};

