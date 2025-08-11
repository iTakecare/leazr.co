
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
const recoverFileFromCorruptedData = async (data: any): Promise<File | null> => {
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

    // Si c'est déjà un File, vérifier son intégrité
    if (data instanceof File) {
      console.log("✅ Fichier déjà valide (File)");
      
      // Vérifier que le fichier n'est pas vide et a des données binaires
      if (data.size === 0) {
        console.warn("⚠️ Fichier vide détecté");
        return null;
      }
      
      // Vérifier que le type MIME n'est pas application/json pour un fichier image
      const fileExtension = data.name.toLowerCase().split('.').pop();
      const expectedMimeType = getMimeType(fileExtension || '');
      
      if (data.type === 'application/json' && expectedMimeType.startsWith('image/')) {
        console.log("🔧 Correction du type MIME de application/json vers", expectedMimeType);
        
        // Lire le contenu du fichier et le recréer avec le bon type MIME
        try {
          const arrayBuffer = await data.arrayBuffer();
          const correctedFile = new File([arrayBuffer], data.name, { 
            type: expectedMimeType,
            lastModified: data.lastModified 
          });
          
          console.log("✅ Fichier corrigé:", {
            name: correctedFile.name,
            type: correctedFile.type,
            size: correctedFile.size
          });
          
          return correctedFile;
        } catch (e) {
          console.error("❌ Erreur lors de la lecture du fichier:", e);
          return null;
        }
      }
      
      return data;
    }

    // Si c'est un Blob, le convertir en File
    if (data instanceof Blob) {
      console.log("✅ Conversion Blob vers File");
      const fileExtension = (data as any).name ? (data as any).name.toLowerCase().split('.').pop() : 'jpg';
      const correctMimeType = getMimeType(fileExtension || 'jpg');
      return new File([data], (data as any).name || 'recovered-file', { type: correctMimeType });
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
 * Valide qu'un fichier File contient bien des données binaires valides
 */
const validateFileIntegrity = async (file: File): Promise<{ isValid: boolean; correctedFile?: File }> => {
  try {
    console.log("=== VALIDATION DE L'INTÉGRITÉ DU FICHIER ===");
    console.log("Fichier à valider:", {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Vérifier que le fichier n'est pas vide
    if (file.size === 0) {
      console.error("❌ Fichier vide");
      return { isValid: false };
    }
    
    // Lire le contenu du fichier pour vérifier qu'il contient des données binaires
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    console.log("Premiers octets du fichier:", Array.from(bytes.slice(0, 10)).map(b => b.toString(16)));
    
    // Vérifier que le fichier contient des données binaires valides
    if (bytes.length === 0) {
      console.error("❌ Aucune donnée binaire trouvée");
      return { isValid: false };
    }
    
    // Déterminer le bon type MIME basé sur l'extension
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const expectedMimeType = getMimeType(fileExtension || '');
    
    // Si le type MIME est incorrect, le corriger
    if (file.type !== expectedMimeType) {
      console.log("🔧 Correction du type MIME de", file.type, "vers", expectedMimeType);
      
      const correctedFile = new File([arrayBuffer], file.name, { 
        type: expectedMimeType,
        lastModified: file.lastModified 
      });
      
      return { isValid: true, correctedFile };
    }
    
    console.log("✅ Fichier valide");
    return { isValid: true, correctedFile: file };
    
  } catch (error) {
    console.error("❌ Erreur lors de la validation du fichier:", error);
    return { isValid: false };
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
 * Télécharge une image vers Supabase Storage - Approche ArrayBuffer simplifiée
 */
export const uploadImage = async (
  file: File,
  bucketName: string = "site-settings",
  folder: string = ""
): Promise<string | null> => {
  try {
    console.log(`=== DÉBUT UPLOAD IMAGE (ARRAYBUFFER) ===`);
    console.log(`Fichier original reçu:`, {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      isFile: file instanceof File
    });

    // Validation de base
    if (!file) {
      toast.error("Aucun fichier fourni");
      return null;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux. Taille maximum: 5MB");
      return null;
    }

    // Détecter le type MIME correct basé sur l'extension
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      toast.error("Format de fichier non supporté. Utilisez JPG, PNG, GIF, WEBP ou SVG.");
      return null;
    }

    const correctMimeType = getMimeType(fileExtension);
    console.log("Type MIME détecté:", correctMimeType);

    // S'assurer que le bucket existe
    const bucketExists = await ensureBucket(bucketName);
    if (!bucketExists) {
      toast.error("Erreur: Impossible d'accéder au stockage");
      return null;
    }

    // ÉTAPE CRITIQUE: Lire le fichier comme ArrayBuffer et créer un nouveau Blob
    console.log("=== LECTURE DU FICHIER COMME ARRAYBUFFER ===");
    const arrayBuffer = await file.arrayBuffer();
    const binaryData = new Uint8Array(arrayBuffer);
    
    console.log("Données binaires lues:", {
      size: binaryData.length,
      premiersBytesHex: Array.from(binaryData.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    });

    // Créer un nouveau Blob avec les données binaires et le bon type MIME
    const uploadBlob = new Blob([binaryData], { type: correctMimeType });
    
    console.log("Blob créé pour upload:", {
      size: uploadBlob.size,
      type: uploadBlob.type
    });

    // Créer un nom de fichier unique
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `image-${timestamp}-${randomId}.${fileExtension}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    console.log(`=== UPLOAD VERS SUPABASE ===`);
    console.log(`Chemin: ${bucketName}/${filePath}`);
    console.log(`Type MIME forcé: ${correctMimeType}`);

    // Upload du Blob vers Supabase avec le type MIME correct
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uploadBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: correctMimeType // Forcer explicitement le type MIME
      });

    if (error) {
      console.error("Erreur upload Supabase:", error);
      toast.error(`Erreur lors du téléchargement: ${error.message}`);
      return null;
    }

    console.log("Upload réussi:", data);

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log("URL publique générée:", urlData.publicUrl);
    toast.success("Image téléchargée avec succès");
    
    return urlData.publicUrl;
    
  } catch (error) {
    console.error("Erreur générale upload:", error);
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
