
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const getImageMimeType = (file: File): string => {
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
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
};

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
    
    // Créer un nouveau Blob avec le type MIME correct
    const contentType = getImageMimeType(file);
    console.log(`Type MIME détecté: ${contentType}`);
    
    // Lire le contenu du fichier pour créer un nouveau blob avec le bon type MIME
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([fileArrayBuffer], { type: contentType });
    const fileWithCorrectType = new File([fileBlob], file.name, { type: contentType });
    
    // Generate a unique filename to prevent conflicts
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
    
    console.log(`Préparation de l'upload avec type MIME: ${contentType} pour le fichier: ${filePath}`);
    
    // Upload avec contentType explicite et options supplémentaires
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileWithCorrectType, {
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
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    toast.error("Erreur lors du téléchargement de l'image");
    throw error;
  }
};
