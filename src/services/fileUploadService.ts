
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
 * Récupère un fichier File à partir de données potentiellement corrompues/sérialisées
 */
const recoverFileFromCorruptedData = (data: any): File | null => {
  try {
    console.log("=== TENTATIVE DE RÉCUPÉRATION DE FICHIER ===");
    console.log("Type de données reçues:", typeof data);
    console.log("Données:", data);

    // Si c'est déjà un File, pas de problème
    if (data instanceof File) {
      return data;
    }

    // Si c'est un objet avec des propriétés de File
    if (data && typeof data === 'object' && data.name && data.type) {
      console.log("Tentative de reconstruction du File depuis l'objet");
      
      // Essayer de récupérer le contenu du fichier
      if (data.stream && typeof data.stream === 'function') {
        // Créer un nouveau File à partir du stream
        return new File([data.stream()], data.name, { type: data.type });
      }
      
      // Si on a un ArrayBuffer ou Uint8Array
      if (data.arrayBuffer || data.buffer) {
        const buffer = data.arrayBuffer || data.buffer;
        return new File([buffer], data.name, { type: data.type });
      }
    }

    console.error("Impossible de récupérer le fichier depuis les données corrompues");
    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération du fichier:", error);
    return null;
  }
};

/**
 * Validation approfondie du type MIME
 */
const validateMimeType = (file: File): boolean => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 
    'image/gif', 'image/webp', 'image/svg+xml'
  ];
  
  const fileExtension = file.name.toLowerCase().split('.').pop();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  
  console.log("=== VALIDATION MIME TYPE ===");
  console.log("Type MIME du fichier:", file.type);
  console.log("Extension du fichier:", fileExtension);
  
  // Vérifier d'abord le type MIME
  if (allowedTypes.includes(file.type)) {
    console.log("Type MIME valide:", file.type);
    return true;
  }
  
  // Si le type MIME n'est pas correct, vérifier l'extension
  if (allowedExtensions.includes(fileExtension || '')) {
    console.log("Extension valide, MIME type sera corrigé:", fileExtension);
    return true;
  }
  
  // Cas spécial: certains navigateurs peuvent avoir des types MIME incorrects
  if (file.type === 'application/json' && allowedExtensions.includes(fileExtension || '')) {
    console.warn("ATTENTION: Type MIME application/json détecté pour un fichier image");
    console.warn("Ceci indique un problème de sérialisation du fichier");
    return false; // Retourner false pour déclencher une récupération
  }
  
  return false;
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
      name: file?.name,
      type: file?.type,
      size: file?.size,
      isFile: file instanceof File,
      isBlob: file instanceof Blob,
      constructor: file?.constructor?.name,
      keys: file ? Object.keys(file) : 'N/A'
    });
    
    // ÉTAPE 1: Validation et récupération du fichier
    let validFile: File = file;
    
    // Tentative de récupération si le fichier n'est pas valide
    if (!(file instanceof File)) {
      console.warn("ALERTE: L'objet reçu n'est PAS un File natif");
      console.log("Tentative de récupération...");
      
      const recoveredFile = recoverFileFromCorruptedData(file);
      if (recoveredFile) {
        validFile = recoveredFile;
        console.log("Fichier récupéré avec succès!");
      } else {
        console.error("ERREUR CRITIQUE: Impossible de récupérer le fichier:", {
          typeOf: typeof file,
          isArray: Array.isArray(file),
          stringified: JSON.stringify(file).substring(0, 200)
        });
        toast.error("Erreur: Le fichier n'est pas au bon format");
        return null;
      }
    }
    
    // ÉTAPE 2: Validation approfondie du type MIME
    if (!validateMimeType(validFile)) {
      console.error(`Type de fichier non autorisé:`, {
        fileName: validFile.name,
        fileType: validFile.type,
        extension: validFile.name.toLowerCase().split('.').pop()
      });
      toast.error("Format de fichier non supporté. Utilisez JPG, PNG, GIF, WEBP ou SVG.");
      return null;
    }
    
    // ÉTAPE 3: S'assurer que le bucket existe
    const bucketExists = await ensureBucket(bucketName);
    if (!bucketExists) {
      toast.error("Erreur: Impossible d'accéder au stockage");
      return null;
    }
    
    // ÉTAPE 4: Vérifier la taille (max 5MB)
    if (validFile.size > 5 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux. Taille maximum: 5MB");
      return null;
    }
    
    // ÉTAPE 5: Créer un nom de fichier unique avec l'extension correcte
    const fileExtension = validFile.name.toLowerCase().split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExt = fileExtension || (validFile.type.includes('jpeg') ? 'jpg' : validFile.type.split('/')[1]);
    const fileName = `image-${timestamp}-${randomId}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Corriger le type MIME si nécessaire
    const correctedMimeType = validFile.type && validFile.type !== 'application/json' 
      ? validFile.type 
      : getMimeType(fileExt);

    console.log(`=== INFORMATIONS D'UPLOAD FINALES ===`, {
      fileName,
      filePath,
      fileSize: validFile.size,
      originalContentType: validFile.type,
      correctedContentType: correctedMimeType,
      fileExtension: fileExt
    });

    // ÉTAPE 6: UPLOAD VERS SUPABASE
    console.log(`=== UPLOAD VERS SUPABASE ===`);
    console.log(`Tentative d'upload du fichier (${validFile.size} bytes) vers ${bucketName}/${filePath}`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, validFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: correctedMimeType
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
