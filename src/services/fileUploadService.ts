
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * S'assure qu'un bucket existe dans Supabase Storage
 */
export const ensureBucket = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Vérification de l'existence du bucket: ${bucketName}`);
    
    // Vérifier si le bucket existe déjà en essayant de lister son contenu
    const { data: listData, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1 });

    if (!listError) {
      console.log(`Le bucket ${bucketName} existe déjà`);
      return true;
    }

    // Si le bucket n'existe pas, essayer de le créer
    if (listError.message.includes('does not exist')) {
      console.log(`Tentative de création du bucket: ${bucketName}`);
      
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });

      if (createError) {
        console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
        toast.error(`Impossible de créer le bucket de stockage: ${createError.message}`);
        return false;
      }

      console.log(`Bucket ${bucketName} créé avec succès`);
      return true;
    }

    console.error(`Erreur d'accès au bucket ${bucketName}:`, listError);
    return false;
  } catch (error) {
    console.error(`Erreur lors de la vérification du bucket ${bucketName}:`, error);
    return false;
  }
};

/**
 * Télécharge une image vers Supabase Storage
 */
export const uploadImage = async (
  file: File,
  bucketName: string = "site-settings",
  folder: string = ""
): Promise<string | null> => {
  try {
    console.log(`=== DÉBUT UPLOAD IMAGE ===`);
    console.log(`Fichier original reçu:`, {
      name: file.name,
      type: file.type,
      size: file.size,
      isFile: file instanceof File,
      isBlob: file instanceof Blob
    });
    
    // VALIDATION CRITIQUE : Vérifier que c'est bien un objet File natif
    if (!(file instanceof File)) {
      console.error("ERREUR CRITIQUE: L'objet reçu n'est PAS un File:", {
        typeOf: typeof file,
        isArray: Array.isArray(file),
        stringified: JSON.stringify(file).substring(0, 100)
      });
      toast.error("Erreur: Le fichier n'est pas au bon format");
      return null;
    }
    
    // S'assurer que le bucket existe
    const bucketExists = await ensureBucket(bucketName);
    if (!bucketExists) {
      toast.error("Erreur: Impossible d'accéder au stockage");
      return null;
    }
    
    // Validation des types de fichiers
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    
    console.log(`Validation fichier:`, {
      fileType: file.type,
      extension: fileExtension,
      typeValid: allowedTypes.includes(file.type),
      extensionValid: allowedExtensions.includes(fileExtension || '')
    });
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      console.error(`Type de fichier non autorisé: ${file.type}, extension: ${fileExtension}`);
      toast.error("Format de fichier non supporté. Utilisez JPG, PNG, GIF, WEBP ou SVG.");
      return null;
    }
    
    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux. Taille maximum: 5MB");
      return null;
    }
    
    // Créer un nom de fichier unique avec l'extension correcte
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExt = fileExtension || (file.type.includes('jpeg') ? 'jpg' : file.type.split('/')[1]);
    const fileName = `logo-${timestamp}-${randomId}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    console.log(`Informations d'upload:`, {
      fileName,
      filePath,
      fileSize: file.size,
      contentType: file.type
    });

    // UPLOAD CRITIQUE : Passer le File object RAW directement
    console.log(`=== UPLOAD VERS SUPABASE ===`);
    console.log(`Tentative d'upload du fichier File brut (${file.size} bytes) vers ${bucketName}/${filePath}`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || getMimeType(fileExt)
      });

    if (error) {
      console.error("=== ERREUR UPLOAD SUPABASE ===", {
        message: error.message,
        statusCode: error.statusCode,
        error: error
      });
      toast.error(`Erreur lors du téléchargement: ${error.message}`);
      return null;
    }

    console.log("=== UPLOAD RÉUSSI ===", {
      data,
      path: data?.path,
      fullPath: data?.fullPath
    });

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log("=== URL PUBLIQUE GÉNÉRÉE ===", {
      publicUrl: urlData.publicUrl
    });
    
    toast.success("Logo téléchargé avec succès");
    return urlData.publicUrl;
    
  } catch (error) {
    console.error("=== ERREUR GÉNÉRALE UPLOAD ===", {
      error,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined
    });
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
      return 'image/jpeg';
  }
};
