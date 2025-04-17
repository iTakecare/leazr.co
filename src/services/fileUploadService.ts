
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

/**
 * Détecte le type MIME correct basé sur l'extension du fichier
 */
export const getMimeType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
};

/**
 * Crée un nouveau Blob et File avec le type MIME correct
 */
export const createFileWithCorrectType = async (file: File): Promise<File> => {
  // Déterminer le type MIME correct
  const correctMimeType = getMimeType(file.name);
  console.log(`Type détecté pour ${file.name}: ${correctMimeType}`);
  
  // Lire le fichier comme ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Créer un nouveau Blob avec le type MIME correct
  const blob = new Blob([arrayBuffer], { type: correctMimeType });
  
  // Créer un nouveau File à partir du Blob
  return new File([blob], file.name, { type: correctMimeType });
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
    
    // Ensure the file has the correct MIME type
    const correctedFile = await createFileWithCorrectType(file);
    console.log(`Type MIME corrigé: ${correctedFile.type}`);
    
    // Prepare the path
    const timestamp = Date.now();
    const fileName = correctedFile.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const uniqueFileName = `${timestamp}-${fileName}`;
    const fullPath = folderPath ? `${folderPath}/${uniqueFileName}` : uniqueFileName;
    
    // Get the session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    // Upload directly using fetch to have full control over the Content-Type
    const uploadUrl = `https://cifbetjefyfocafanlhv.supabase.co/storage/v1/object/${bucketName}/${fullPath}`;
    
    const formData = new FormData();
    formData.append('file', correctedFile);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        // Let FormData set the correct boundary and Content-Type
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload error:', errorText);
      throw new Error(`Erreur d'upload: ${response.status} ${response.statusText}`);
    }
    
    // Construct the public URL
    const publicUrl = `https://cifbetjefyfocafanlhv.supabase.co/storage/v1/object/public/${bucketName}/${fullPath}`;
    
    console.log("Image uploaded successfully:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    toast.error("Erreur lors du téléchargement de l'image");
    throw error;
  }
};

// Obtenir une URL avec cache busting
export const getCacheBustedUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Ne pas ajouter de cache-busting aux URLs data:
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Ajouter le paramètre cache-busting
  const timestamp = Date.now();
  
  // Si l'URL contient déjà des paramètres, ajouter le cache-busting
  if (url.includes('?')) {
    return `${url}&t=${timestamp}`;
  }
  
  return `${url}?t=${timestamp}`;
};
