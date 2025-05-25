
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Service d'upload direct sans transformation
 */
export const directUploadToSupabase = async (
  file: File,
  bucketName: string = "site-settings",
  folder: string = "logos"
): Promise<string | null> => {
  try {
    console.log(`=== UPLOAD DIRECT SUPABASE ===`);
    console.log(`Fichier à uploader:`, {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    // Validation du fichier
    if (!file || !(file instanceof File)) {
      console.error("Le fichier n'est pas valide");
      toast.error("Fichier invalide");
      return null;
    }

    // Validation du type MIME
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      console.error(`Type MIME non autorisé: ${file.type}`);
      toast.error("Type de fichier non supporté");
      return null;
    }

    // Vérification de la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error(`Fichier trop volumineux: ${file.size} bytes`);
      toast.error("Fichier trop volumineux (max 5MB)");
      return null;
    }

    // Créer un nom unique
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `logo-${timestamp}-${randomId}.${extension}`;
    const filePath = `${folder}/${fileName}`;

    console.log(`Tentative d'upload vers: ${bucketName}/${filePath}`);

    // Créer une nouvelle instance File avec les bonnes propriétés
    const uploadFile = new File([file], fileName, {
      type: file.type,
      lastModified: Date.now()
    });

    console.log(`Fichier pour upload:`, {
      name: uploadFile.name,
      type: uploadFile.type,
      size: uploadFile.size
    });

    // Upload direct vers Supabase
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uploadFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error("Erreur Supabase:", error);
      toast.error(`Erreur upload: ${error.message}`);
      return null;
    }

    console.log("Upload réussi:", data);

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log("URL publique:", urlData.publicUrl);
    toast.success("Logo uploadé avec succès");
    
    return urlData.publicUrl;

  } catch (error) {
    console.error("Erreur générale:", error);
    toast.error("Erreur lors de l'upload");
    return null;
  }
};

/**
 * Alternative avec ArrayBuffer
 */
export const uploadViaArrayBuffer = async (
  file: File,
  bucketName: string = "site-settings",
  folder: string = "logos"
): Promise<string | null> => {
  try {
    console.log(`=== UPLOAD VIA ARRAYBUFFER ===`);
    
    // Lire le fichier comme ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log(`ArrayBuffer créé: ${uint8Array.length} bytes`);

    // Créer un nom unique
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `logo-${timestamp}-${randomId}.${extension}`;
    const filePath = `${folder}/${fileName}`;

    // Upload de l'ArrayBuffer
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uint8Array, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error("Erreur upload ArrayBuffer:", error);
      toast.error(`Erreur: ${error.message}`);
      return null;
    }

    console.log("Upload ArrayBuffer réussi:", data);

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    toast.success("Logo uploadé via ArrayBuffer");
    return urlData.publicUrl;

  } catch (error) {
    console.error("Erreur ArrayBuffer:", error);
    toast.error("Erreur lors de l'upload ArrayBuffer");
    return null;
  }
};
