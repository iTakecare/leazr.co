
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
    console.log(`Début upload du fichier: ${file.name} vers ${bucketName}/${folder}`);
    console.log(`Fichier reçu:`, {
      name: file.name,
      type: file.type,
      size: file.size,
      constructor: file.constructor.name
    });
    
    // Vérifier que c'est bien un objet File
    if (!(file instanceof File)) {
      console.error("L'objet reçu n'est pas un File:", typeof file, file);
      toast.error("Format de fichier invalide");
      return null;
    }
    
    // S'assurer que le bucket existe
    const bucketExists = await ensureBucket(bucketName);
    if (!bucketExists) {
      toast.error("Erreur: Impossible d'accéder au stockage");
      return null;
    }
    
    // Validation stricte du type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    
    console.log(`Validation: type="${file.type}", extension="${fileExtension}"`);
    
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

    console.log(`Chemin du fichier: ${filePath}`);

    // Déterminer le type MIME correct
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      mimeType = getMimeType(fileExt);
    }
    
    console.log(`Type MIME utilisé: ${mimeType}`);
    console.log(`Upload du fichier brut de taille: ${file.size} bytes`);

    // Upload DIRECT du fichier File object - AUCUNE TRANSFORMATION
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: mimeType
      });

    if (error) {
      console.error("Erreur d'upload:", error);
      toast.error(`Erreur lors du téléchargement: ${error.message}`);
      return null;
    }

    console.log("Upload réussi:", data);

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log("URL publique générée:", urlData.publicUrl);
    toast.success("Logo téléchargé avec succès");
    
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
      return 'image/jpeg'; // Par défaut
  }
};
