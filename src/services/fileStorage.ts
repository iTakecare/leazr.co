
import { getSupabaseClient } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

/**
 * Service amélioré de gestion des fichiers avec Supabase Storage
 */

// Variable pour suivre l'état de connexion à Supabase Storage
let storageConnectionStatus: 'connected' | 'disconnected' | 'checking' = 'checking';

/**
 * Vérifie la connexion à Supabase Storage
 * Cette fonction est simplifiée pour éviter les erreurs de permission
 */
export const checkStorageConnection = async (): Promise<boolean> => {
  try {
    console.log("Vérification de la connexion à Supabase Storage...");
    const supabase = getSupabaseClient();
    
    // Essayer de lister les buckets pour vérifier la connexion
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Erreur de connexion à Supabase Storage:", error);
      storageConnectionStatus = 'disconnected';
      return false;
    }
    
    console.log("Connexion à Supabase Storage établie avec succès. Buckets:", data);
    
    // Si pdf-templates n'existe pas dans la liste des buckets, on est en mode local
    const hasPdfTemplatesBucket = data.some(bucket => bucket.name === 'pdf-templates');
    if (!hasPdfTemplatesBucket) {
      console.log("Le bucket pdf-templates n'existe pas");
      storageConnectionStatus = 'disconnected';
      return false;
    }
    
    storageConnectionStatus = 'connected';
    return true;
  } catch (error) {
    console.error("Exception lors de la vérification de la connexion à Supabase Storage:", error);
    storageConnectionStatus = 'disconnected';
    return false;
  }
};

/**
 * Vérifie si un bucket existe - cette fonction n'essaie plus de créer des buckets
 * car cela nécessite des permissions que l'utilisateur pourrait ne pas avoir
 */
export const ensureBucket = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Vérification du bucket: ${bucketName}`);
    
    // Vérifier d'abord si la connexion à Supabase Storage est établie
    const isConnected = await checkStorageConnection();
    if (!isConnected) {
      console.warn("Connexion à Supabase Storage non disponible, opération impossible");
      return false;
    }
    
    // Utiliser le client standard pour vérifier les buckets
    const supabase = getSupabaseClient();
    
    // Vérifier si le bucket existe
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error("Erreur lors de la vérification des buckets:", bucketError);
      return false;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} non trouvé`);
      return false;
    }
    
    console.log(`Bucket ${bucketName} existe`);
    return true;
  } catch (error) {
    console.error("Exception lors de la vérification du bucket:", error);
    return false;
  }
};

/**
 * Liste les fichiers dans un bucket
 * @param bucketName Nom du bucket
 * @param path Chemin optionnel dans le bucket
 * @returns Liste des fichiers ou null en cas d'erreur
 */
export const listFiles = async (bucketName: string, path: string = ''): Promise<any[] | null> => {
  try {
    console.log(`Listage des fichiers dans ${bucketName}/${path}`);
    
    // Vérifier la connexion au stockage
    const isConnected = await checkStorageConnection();
    if (!isConnected) {
      console.warn("Stockage Supabase non disponible, impossible de lister les fichiers");
      return null;
    }
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path);
    
    if (error) {
      console.error("Erreur lors du listage des fichiers:", error);
      return null;
    }
    
    return data || [];
  } catch (error) {
    console.error("Exception lors du listage des fichiers:", error);
    return null;
  }
};

/**
 * Supprime un fichier dans un bucket
 * @param bucketName Nom du bucket
 * @param filePath Chemin du fichier à supprimer
 * @returns true si la suppression a réussi, false sinon
 */
export const deleteFile = async (bucketName: string, filePath: string): Promise<boolean> => {
  try {
    console.log(`Suppression du fichier ${bucketName}/${filePath}`);
    
    // Vérifier la connexion au stockage
    const isConnected = await checkStorageConnection();
    if (!isConnected) {
      console.warn("Stockage Supabase non disponible, impossible de supprimer le fichier");
      return false;
    }
    
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      console.error("Erreur lors de la suppression du fichier:", error);
      return false;
    }
    
    console.log(`Fichier ${filePath} supprimé avec succès`);
    return true;
  } catch (error) {
    console.error("Exception lors de la suppression du fichier:", error);
    return false;
  }
};

/**
 * Télécharge un fichier dans un bucket spécifié
 * Cette fonction vérifie d'abord si le bucket existe avant de tenter l'upload
 */
export const uploadFile = async (
  bucketName: string,
  file: File,
  customPath?: string
): Promise<string | null> => {
  try {
    // S'assurer que le bucket existe
    const bucketExists = await ensureBucket(bucketName);
    if (!bucketExists) {
      console.error(`Le bucket ${bucketName} n'existe pas ou n'est pas accessible`);
      toast.warning("Stockage en ligne non disponible, l'image sera sauvegardée localement uniquement");
      
      // Retourner un data URL pour le mode local
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
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
      
      // Fallback en mode local
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
    
    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Exception lors de l'upload:", error);
    toast.error(`Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    
    // Fallback en mode local
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
};

// Exporter les fonctions principales
export default {
  checkStorageConnection,
  ensureBucket,
  uploadFile,
  listFiles,
  deleteFile
};
