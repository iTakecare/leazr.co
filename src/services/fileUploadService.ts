
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Télécharge une image vers Supabase Storage
 */
export const uploadImage = async (
  file: File,
  bucketName: string = "site-settings",
  folder: string = ""
): Promise<string | null> => {
  try {
    console.log(`Début upload du fichier: ${file.name} vers ${bucketName}/${folder}`);
    
    // Créer un nom de fichier unique
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    console.log(`Chemin du fichier: ${filePath}`);

    // Télécharger le fichier directement
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error("Erreur d'upload:", error);
      
      // Si le bucket n'existe pas, essayer de le créer
      if (error.message.includes('does not exist') || error.message.includes('bucket')) {
        console.log("Tentative de création du bucket...");
        
        // Essayer de créer le bucket
        const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
          public: true
        });
        
        if (bucketError) {
          console.error("Erreur création bucket:", bucketError);
          toast.error("Erreur: Impossible de créer le bucket de stockage");
          return null;
        }
        
        // Réessayer l'upload après création du bucket
        const { data: retryData, error: retryError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type
          });
          
        if (retryError) {
          console.error("Erreur retry upload:", retryError);
          toast.error("Erreur lors du téléchargement du fichier");
          return null;
        }
        
        console.log("Upload réussi après création du bucket:", retryData);
      } else {
        toast.error("Erreur lors du téléchargement du fichier");
        return null;
      }
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log("URL publique générée:", urlData.publicUrl);
    toast.success("Fichier téléchargé avec succès");
    
    return urlData.publicUrl;
  } catch (error) {
    console.error("Erreur générale lors du téléchargement:", error);
    toast.error("Erreur lors du téléchargement du fichier");
    return null;
  }
};

/**
 * Ajoute un paramètre de cache-busting à une URL
 */
export const getCacheBustedUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};

/**
 * Détecte le type MIME à partir d'une extension de fichier
 */
export const getMimeType = (extension: string): string => {
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
    default:
      return 'application/octet-stream';
  }
};
