
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
    console.log("Données détaillées:", {
      constructor: data?.constructor?.name,
      isFile: data instanceof File,
      isBlob: data instanceof Blob,
      hasName: !!data?.name,
      hasType: !!data?.type,
      hasSize: !!data?.size,
      type: data?.type,
      name: data?.name
    });

    // Si c'est déjà un File, pas de problème
    if (data instanceof File) {
      console.log("✅ Fichier déjà valide (File)");
      return data;
    }

    // Si c'est un Blob, le convertir en File
    if (data instanceof Blob) {
      console.log("✅ Conversion Blob vers File");
      return new File([data], 'recovered-file', { type: data.type });
    }

    // Si c'est un objet avec des propriétés de File mais type MIME incorrect
    if (data && typeof data === 'object' && data.name) {
      console.log("🔧 Reconstruction du File depuis l'objet sérialisé");
      
      // Détecter le type MIME correct basé sur l'extension
      const fileExtension = data.name.toLowerCase().split('.').pop();
      const correctMimeType = getMimeType(fileExtension || '');
      
      console.log("Extension détectée:", fileExtension);
      console.log("Type MIME corrigé:", correctMimeType);

      // Cas spécial: objet File sérialisé avec données binaires
      if (data._data || data.data || data.stream) {
        console.log("📦 Tentative de récupération des données binaires");
        
        const binaryData = data._data || data.data;
        if (typeof binaryData === 'string') {
          try {
            const binaryString = atob(binaryData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            return new File([bytes], data.name, { type: correctMimeType });
          } catch (e) {
            console.error("Erreur décodage base64:", e);
          }
        }
        
        if (binaryData instanceof ArrayBuffer || binaryData instanceof Uint8Array) {
          return new File([binaryData], data.name, { type: correctMimeType });
        }

        // Essayer via stream
        if (data.stream && typeof data.stream === 'function') {
          try {
            const streamData = data.stream();
            return new File([streamData], data.name, { type: correctMimeType });
          } catch (e) {
            console.error("Erreur lors de l'utilisation du stream:", e);
          }
        }
      }

      // Si on a juste les métadonnées, créer un File vide avec le bon type MIME
      // Cela permettra au moins de corriger le type MIME pour les validations
      if (data.size && data.lastModified) {
        console.log("🆘 Création d'un File de substitution avec métadonnées");
        try {
          // Essayer de récréer le File à partir de l'objet sérialisé
          const fileArray = new Uint8Array(0); // File vide temporaire
          return new File([fileArray], data.name, { 
            type: correctMimeType,
            lastModified: data.lastModified 
          });
        } catch (e) {
          console.error("Erreur création File de substitution:", e);
        }
      }
    }

    console.error("❌ Impossible de récupérer le fichier depuis les données corrompues");
    console.error("Structure disponible:", Object.keys(data || {}));
    return null;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du fichier:", error);
    return null;
  }
};

/**
 * Validation et correction du type MIME
 */
const validateAndCorrectMimeType = (file: File): { isValid: boolean; correctedFile: File } => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 
    'image/gif', 'image/webp', 'image/svg+xml'
  ];
  
  const fileExtension = file.name.toLowerCase().split('.').pop();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  
  console.log("=== VALIDATION ET CORRECTION MIME TYPE ===");
  console.log("Type MIME original:", file.type);
  console.log("Extension du fichier:", fileExtension);
  
  // Si l'extension n'est pas valide, rejeter
  if (!allowedExtensions.includes(fileExtension || '')) {
    console.error("Extension non autorisée:", fileExtension);
    return { isValid: false, correctedFile: file };
  }
  
  // Déterminer le bon type MIME basé sur l'extension
  const correctMimeType = getMimeType(fileExtension || '');
  console.log("Type MIME correct attendu:", correctMimeType);
  
  // Si le type MIME est déjà correct
  if (allowedTypes.includes(file.type) && file.type === correctMimeType) {
    console.log("✅ Type MIME déjà correct");
    return { isValid: true, correctedFile: file };
  }
  
  // Corriger le type MIME si nécessaire
  console.log("🔧 Correction du type MIME de", file.type, "vers", correctMimeType);
  const correctedFile = new File([file], file.name, { 
    type: correctMimeType,
    lastModified: file.lastModified 
  });
  
  console.log("✅ Fichier corrigé:", {
    name: correctedFile.name,
    type: correctedFile.type,
    size: correctedFile.size
  });
  
  return { isValid: true, correctedFile };
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
    
    // Vérification stricte du type File
    if (!(file instanceof File)) {
      console.warn("⚠️ ALERTE: L'objet reçu n'est PAS un File natif");
      console.log("Type reçu:", typeof file);
      console.log("Constructor:", (file as any)?.constructor?.name);
      console.log("Tentative de récupération...");
      
      const recoveredFile = recoverFileFromCorruptedData(file);
      if (recoveredFile) {
        validFile = recoveredFile;
        console.log("✅ Fichier récupéré avec succès!");
      } else {
        console.error("❌ ERREUR CRITIQUE: Impossible de récupérer le fichier:", {
          typeOf: typeof file,
          isArray: Array.isArray(file),
          constructor: (file as any)?.constructor?.name,
          keys: file ? Object.keys(file as any) : 'N/A',
          stringified: JSON.stringify(file).substring(0, 500)
        });
        toast.error("Erreur: Le fichier n'est pas au bon format. Veuillez réessayer.");
        return null;
      }
    }
    
    // Vérification finale que nous avons un File valide
    if (!validFile || !(validFile instanceof File)) {
      console.error("❌ ÉCHEC FINAL: Pas de File valide après récupération");
      toast.error("Erreur: Impossible de traiter le fichier");
      return null;
    }
    
    console.log("✅ File validé:", {
      name: validFile.name,
      type: validFile.type,
      size: validFile.size,
      constructor: validFile.constructor.name
    });
    
    // ÉTAPE 2: Validation et correction du type MIME
    const { isValid, correctedFile } = validateAndCorrectMimeType(validFile);
    if (!isValid) {
      console.error(`Type de fichier non autorisé:`, {
        fileName: validFile.name,
        fileType: validFile.type,
        extension: validFile.name.toLowerCase().split('.').pop()
      });
      toast.error("Format de fichier non supporté. Utilisez JPG, PNG, GIF, WEBP ou SVG.");
      return null;
    }
    
    // Utiliser le fichier corrigé pour la suite
    validFile = correctedFile;
    
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

    // ÉTAPE 6: UPLOAD VERS SUPABASE - CLIENT AUTHENTIFIÉ
    console.log(`=== UPLOAD VERS SUPABASE (CLIENT AUTHENTIFIÉ) ===`);
    console.log(`Upload avec client Supabase authentifié pour respect des politiques RLS`);
    
    // Utiliser le client Supabase authentifié qui respecte les politiques RLS
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, validFile, {
        cacheControl: '3600',
        upsert: true
        // Ne pas spécifier contentType, laisser Supabase le détecter automatiquement
      });

    if (error) {
      console.error("Erreur client Supabase:", {
        error: error.message,
        details: error
      });
      toast.error(`Erreur lors du téléchargement: ${error.message}`);
      return null;
    }

    console.log("Upload réussi via client Supabase:", data);

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
