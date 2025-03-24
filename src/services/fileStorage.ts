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

/**
 * Vérifie la connexion à Supabase Storage
 */
export const checkStorageConnection = async (): Promise<boolean> => {
  try {
    console.log("Vérification de la connexion à Supabase Storage...");
    
    // Si déjà vérifié et connecté, retourner directement
    if (storageConnectionStatus === 'connected') {
      return true;
    }
    
    // Si déjà vérifié et déconnecté, retourner directement
    if (storageConnectionStatus === 'disconnected') {
      return false;
    }
    
    const supabase = getSupabaseClient();
    
    // Essayer d'obtenir la liste des buckets
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error("Erreur lors de la vérification des buckets:", error);
        storageConnectionStatus = 'disconnected';
        toast.error("Erreur de connexion au stockage Supabase. Veuillez réessayer.");
        return false;
      }
      
      console.log("Connexion à Supabase Storage établie avec succès. Buckets:", data);
      storageConnectionStatus = 'connected';
      
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
      toast.error("Erreur de connexion au stockage Supabase. Veuillez réessayer.");
      return false;
    }
  } catch (error) {
    console.error("Exception lors de la vérification de la connexion à Supabase Storage:", error);
    storageConnectionStatus = 'disconnected';
    toast.error("Erreur de connexion au stockage Supabase. Veuillez réessayer.");
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
    
    // Stratégie 1: Vérification directe dans la liste des buckets
    const { data: bucketsList, error: listError } = await supabase.storage.listBuckets();
    
    if (!listError && Array.isArray(bucketsList)) {
      console.log("Liste des buckets récupérée:", bucketsList.map(b => b.name));
      const bucketExists = bucketsList.some(b => b.name === bucketName || b.id === bucketName);
      
      if (bucketExists) {
        console.log(`Bucket ${bucketName} trouvé dans la liste des buckets`);
        bucketStatusCache[bucketName] = true;
        return true;
      }
    } else {
      console.warn("Erreur ou pas de liste de buckets:", listError);
    }
    
    // Stratégie 2: Essayer de lister les fichiers dans le bucket
    try {
      const { data: testListFiles, error: testListError } = await supabase.storage.from(bucketName).list();
      
      if (!testListError) {
        console.log(`Bucket ${bucketName} vérifié avec succès via list()`);
        bucketStatusCache[bucketName] = true;
        return true;
      } else {
        // L'erreur peut être due à une absence du bucket ou à un problème d'autorisation
        console.log(`Erreur lors du test du bucket via list():`, testListError);
        
        if (testListError.message && testListError.message.includes("does not exist")) {
          console.log(`Le bucket ${bucketName} n'existe pas, création nécessaire`);
        } else {
          console.log(`Erreur d'accès au bucket ${bucketName}, peut-être un problème d'autorisation`);
        }
      }
    } catch (e) {
      console.warn(`Erreur lors du test du bucket via list():`, e);
    }
    
    // Stratégie 3: Tenter de créer le bucket (peut échouer s'il existe déjà)
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
      
      // Dernière vérification pour les cas où la création échoue mais le bucket existe
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
 * Télécharge un fichier dans un bucket spécifié
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
    // Vérifier la connexion au stockage
    const isConnected = await checkStorageConnection();
    if (!isConnected) {
      console.warn("Stockage Supabase non disponible, upload impossible");
      toast.error("Stockage Supabase non disponible. Veuillez vérifier votre connexion.");
      return null;
    }
    
    // S'assurer que le bucket existe
    const bucketExists = await ensureBucket(bucketName);
    if (!bucketExists) {
      console.error(`Le bucket ${bucketName} n'existe pas ou n'est pas accessible`);
      toast.error(`Le bucket ${bucketName} n'existe pas dans Supabase Storage.`);
      return null;
    }
    
    // Générer un nom de fichier unique
    const uniqueId = uuidv4();
    const filePath = customPath || `${uniqueId}-${file.name}`;
    
    const supabase = getSupabaseClient();
    
    // Détecter le type MIME
    const contentType = file.type || 'application/octet-stream';
    console.log(`Upload du fichier ${filePath} avec type: ${contentType}`);
    
    // Uploader le fichier
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType,
        upsert: true
      });
    
    if (error) {
      console.error("Erreur lors de l'upload:", error);
      toast.error(`Erreur lors de l'upload: ${error.message}`);
      return null;
    }
    
    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    console.log("Fichier uploadé avec succès:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Exception lors de l'upload:", error);
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
