
import { getSupabaseClient } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

/**
 * Service de gestion des fichiers avec Supabase Storage uniquement
 * Sans fallback en mode local
 */

// Variable pour suivre l'état de connexion à Supabase Storage
let storageConnectionStatus: 'connected' | 'disconnected' | 'checking' = 'checking';
let bucketStatusCache: Record<string, boolean> = {};
let lastConnectionCheck: number = 0;
const CONNECTION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Vérifie la connexion à Supabase Storage
 */
export const checkStorageConnection = async (): Promise<boolean> => {
  try {
    console.log("Vérification de la connexion à Supabase Storage...");
    
    // Limite la fréquence des vérifications
    const now = Date.now();
    if (storageConnectionStatus === 'connected' && (now - lastConnectionCheck) < CONNECTION_CHECK_INTERVAL) {
      return true;
    }
    
    const supabase = getSupabaseClient();
    
    // Essayer d'obtenir la liste des buckets
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error("Erreur lors de la vérification des buckets:", error);
        storageConnectionStatus = 'disconnected';
        return false;
      }
      
      console.log("Connexion à Supabase Storage établie avec succès. Buckets:", data);
      storageConnectionStatus = 'connected';
      lastConnectionCheck = now;
      
      // Mettre à jour le cache de statut des buckets
      if (Array.isArray(data)) {
        data.forEach(bucket => {
          bucketStatusCache[bucket.name] = true;
        });
      }
      
      return true;
    } catch (listError) {
      console.error("Erreur lors de la vérification des buckets:", listError);
      storageConnectionStatus = 'disconnected';
      return false;
    }
  } catch (error) {
    console.error("Exception lors de la vérification de la connexion à Supabase Storage:", error);
    storageConnectionStatus = 'disconnected';
    return false;
  }
};

/**
 * Force la mise à jour du statut de connexion
 */
export const resetStorageConnection = async (): Promise<boolean> => {
  // Réinitialiser le statut
  storageConnectionStatus = 'checking';
  bucketStatusCache = {};
  
  // Revérifier la connexion
  return await checkStorageConnection();
};

/**
 * Vérifie si un bucket existe et le crée si nécessaire 
 */
export const ensureBucket = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Vérification du bucket: ${bucketName}`);
    
    // Vérifier dans le cache d'abord
    if (bucketStatusCache[bucketName] === true) {
      console.log(`Le bucket ${bucketName} existe (info en cache)`);
      return true;
    }
    
    // Vérifier d'abord si la connexion à Supabase Storage est établie
    const isConnected = await checkStorageConnection();
    if (!isConnected) {
      console.warn("Connexion à Supabase Storage non disponible, opération impossible");
      throw new Error(`Connexion à Supabase Storage non disponible. Le bucket ${bucketName} ne peut pas être vérifié.`);
    }
    
    // Utiliser le client standard pour vérifier les buckets
    const supabase = getSupabaseClient();
    
    // Vérification directe dans la liste des buckets
    const { data: bucketsList, error: listError } = await supabase.storage.listBuckets();
    
    if (!listError && Array.isArray(bucketsList)) {
      console.log("Liste des buckets récupérée:", bucketsList.map(b => b.name));
      const bucketExists = bucketsList.some(b => b.name === bucketName);
      
      if (bucketExists) {
        console.log(`Bucket ${bucketName} trouvé dans la liste des buckets`);
        bucketStatusCache[bucketName] = true;
        return true;
      }
    }
    
    // Stratégie 2: Essayer de lister les fichiers dans le bucket
    try {
      const { data: testListFiles, error: testListError } = await supabase.storage.from(bucketName).list();
      
      if (!testListError) {
        console.log(`Bucket ${bucketName} vérifié avec succès via list()`);
        bucketStatusCache[bucketName] = true;
        return true;
      }
    } catch (e) {
      console.warn(`Erreur lors du test du bucket via list():`, e);
    }
    
    // Stratégie 3: Tenter de créer le bucket
    try {
      console.log(`Tentative de création du bucket ${bucketName}...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });
      
      if (createError) {
        // Si l'erreur indique que le bucket existe déjà, c'est un succès
        if (createError.message && (
            createError.message.includes("already exists") || 
            createError.message.includes("existe déjà")
          )) {
          console.log(`Le bucket ${bucketName} existe déjà, confirmation par erreur de création`);
          bucketStatusCache[bucketName] = true;
          return true;
        }
        
        console.error(`Erreur lors de la création du bucket:`, createError);
        throw new Error(`Le bucket ${bucketName} n'existe pas et ne peut pas être créé: ${createError.message}`);
      }
      
      console.log(`Bucket ${bucketName} créé avec succès`);
      bucketStatusCache[bucketName] = true;
      return true;
    } catch (createErr) {
      console.error("Exception lors de la création du bucket:", createErr);
      
      // Dernière vérification
      try {
        const { data: finalCheck } = await supabase.storage.from(bucketName).list();
        if (finalCheck !== null) {
          console.log(`Confirmation finale: le bucket ${bucketName} existe`);
          bucketStatusCache[bucketName] = true;
          return true;
        }
      } catch (finalErr) {
        console.error("Échec de la vérification finale:", finalErr);
      }
      
      throw createErr;
    }
  } catch (error) {
    console.error("Exception lors de la vérification/création du bucket:", error);
    
    if (error instanceof Error) {
      throw new Error(`Erreur avec le bucket ${bucketName}: ${error.message}`);
    } else {
      throw new Error(`Erreur inconnue avec le bucket ${bucketName}`);
    }
  }
};

/**
 * Liste les fichiers dans un bucket
 */
export const listFiles = async (bucketName: string, path: string = ''): Promise<any[] | null> => {
  try {
    console.log(`Listage des fichiers dans ${bucketName}/${path}`);
    
    // Vérifier la connexion au stockage
    const isConnected = await checkStorageConnection();
    if (!isConnected) {
      console.warn("Stockage Supabase non disponible, impossible de lister les fichiers");
      toast.error("Stockage Supabase non disponible. Veuillez vérifier votre connexion.");
      return null;
    }
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path);
    
    if (error) {
      console.error("Erreur lors du listage des fichiers:", error);
      toast.error("Erreur lors du listage des fichiers.");
      return null;
    }
    
    return data || [];
  } catch (error) {
    console.error("Exception lors du listage des fichiers:", error);
    toast.error("Erreur lors du listage des fichiers.");
    return null;
  }
};

/**
 * Supprime un fichier dans un bucket
 */
export const deleteFile = async (bucketName: string, filePath: string): Promise<boolean> => {
  try {
    console.log(`Suppression du fichier ${bucketName}/${filePath}`);
    
    // Vérifier la connexion au stockage
    const isConnected = await checkStorageConnection();
    if (!isConnected) {
      console.warn("Stockage Supabase non disponible, impossible de supprimer le fichier");
      toast.error("Stockage Supabase non disponible. Veuillez vérifier votre connexion.");
      return false;
    }
    
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      console.error("Erreur lors de la suppression du fichier:", error);
      toast.error("Erreur lors de la suppression du fichier.");
      return false;
    }
    
    console.log(`Fichier ${filePath} supprimé avec succès`);
    return true;
  } catch (error) {
    console.error("Exception lors de la suppression du fichier:", error);
    toast.error("Erreur lors de la suppression du fichier.");
    return false;
  }
};

/**
 * Télécharge un fichier dans un bucket spécifié avec plusieurs tentatives et gestion d'erreurs améliorée
 * @param bucketName Nom du bucket
 * @param file Fichier à télécharger
 * @param customPath Chemin personnalisé (optionnel)
 * @returns URL du fichier téléchargé ou null si erreur
 */
export const uploadFile = async (
  bucketName: string,
  file: File,
  customPath?: string
): Promise<string | null> => {
  try {
    console.log(`Upload du fichier dans ${bucketName}/${customPath || 'auto-generated-path'}`);
    
    // Vérifier la connexion au stockage
    const isConnected = await checkStorageConnection();
    if (!isConnected) {
      console.warn("Stockage Supabase non disponible, upload impossible");
      toast.error("Stockage Supabase non disponible. Utilisation du mode local.");
      return null;
    }
    
    // S'assurer que le bucket existe
    let bucketExists = false;
    try {
      bucketExists = await ensureBucket(bucketName);
    } catch (bucketError) {
      console.error(`Impossible de vérifier/créer le bucket ${bucketName}:`, bucketError);
      toast.error(`Problème avec le bucket ${bucketName}. Utilisation du mode local.`);
      return null;
    }
    
    // Générer un nom de fichier unique
    const uniqueId = customPath || `${uuidv4()}-${file.name}`;
    const filePath = uniqueId;
    
    const supabase = getSupabaseClient();
    
    // Déterminer le type MIME
    let contentType = file.type || 'application/octet-stream';
    console.log(`Upload du fichier ${filePath} avec type: ${contentType}`);
    
    // Première tentative: upload standard
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          contentType,
          upsert: true
        });
      
      if (!error && data) {
        // Récupérer l'URL publique
        const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
        console.log("Fichier uploadé avec succès:", urlData.publicUrl);
        return urlData.publicUrl;
      }
      
      if (error) {
        console.error("Erreur lors de l'upload:", error);
        
        // Si l'erreur est liée à un problème de type MIME, essayer avec un type générique
        if (error.message && (error.message.includes("content type") || error.message.includes("type de contenu"))) {
          console.log("Tentative avec un type de contenu générique...");
          
          const { data: retryData, error: retryError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file, {
              contentType: 'image/jpeg', // Type générique pour les images
              upsert: true
            });
            
          if (!retryError && retryData) {
            const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(retryData.path);
            console.log("Fichier uploadé avec succès après correction du type:", urlData.publicUrl);
            return urlData.publicUrl;
          }
          
          console.error("Échec de la seconde tentative:", retryError);
        }
      }
    } catch (uploadError) {
      console.error("Exception lors de l'upload standard:", uploadError);
    }
    
    // Deuxième tentative: upload avec ArrayBuffer + Blob
    try {
      console.log("Tentative avec ArrayBuffer + Blob...");
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: contentType });
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, blob, {
          contentType,
          upsert: true
        });
        
      if (!error && data) {
        const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
        console.log("Fichier uploadé avec succès via Blob:", urlData.publicUrl);
        return urlData.publicUrl;
      }
      
      console.error("Échec de l'upload avec Blob:", error);
    } catch (blobError) {
      console.error("Exception lors de l'upload avec Blob:", blobError);
    }
    
    // Troisième tentative avec Fetch et FormData
    try {
      console.log("Tentative avec Fetch et FormData...");
      
      // Obtenir l'URL signée pour l'upload
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucketName)
        .createSignedUploadUrl(filePath);
        
      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("Erreur lors de la création de l'URL signée:", signedUrlError);
        throw new Error("Impossible d'obtenir une URL signée pour l'upload");
      }
      
      // Créer un FormData et y ajouter le fichier
      const formData = new FormData();
      formData.append('file', file);
      
      // Uploader via fetch
      const response = await fetch(signedUrlData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file, // Utiliser directement le fichier comme body
      });
      
      if (!response.ok) {
        throw new Error(`Échec de l'upload via fetch: ${response.statusText}`);
      }
      
      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(signedUrlData.path);
        
      console.log("Fichier uploadé avec succès via fetch:", urlData.publicUrl);
      return urlData.publicUrl;
    } catch (fetchError) {
      console.error("Exception lors de l'upload via fetch:", fetchError);
    }
    
    // Toutes les tentatives ont échoué, revenir au mode local
    console.log("Toutes les tentatives d'upload ont échoué, passage en mode local");
    return null;
  } catch (error) {
    console.error("Exception globale lors de l'upload:", error);
    toast.error(`Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return null;
  }
};

// Exporter les fonctions principales
export default {
  checkStorageConnection,
  resetStorageConnection,
  ensureBucket,
  uploadFile,
  listFiles,
  deleteFile
};
