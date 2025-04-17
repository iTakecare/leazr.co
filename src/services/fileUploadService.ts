
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { detectMimeTypeFromExtension, uploadFileDirectly } from "./directFileUploadService";

/**
 * Vérifie si un bucket existe et le crée si nécessaire
 */
export const ensureBucket = async (bucketName: string): Promise<boolean> => {
  try {
    // Vérifier si le bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("Erreur lors de la vérification des buckets:", listError);
      return false;
    }
    
    // Si le bucket existe déjà, retourner true
    if (buckets.some(bucket => bucket.name === bucketName)) {
      return true;
    }
    
    console.log(`Le bucket ${bucketName} n'existe pas, mais on continue (il a été créé manuellement dans la console Supabase)`);
    return true;
  } catch (error) {
    console.error(`Erreur lors de la vérification du bucket ${bucketName}:`, error);
    return false;
  }
};

/**
 * Upload an image to a specific bucket using direct fetch approach
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
    
    // Utiliser la méthode d'upload direct via fetch
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
