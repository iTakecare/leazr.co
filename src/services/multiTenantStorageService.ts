import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserCompanyId } from "./multiTenantService";

/**
 * Service de stockage multi-tenant
 * Organise tous les fichiers par entreprise dans des dossiers séparés
 */

export type StorageType = 
  | 'avatars'
  | 'product-images' 
  | 'company-assets'
  | 'pdf-templates'
  | 'leaser-logos'
  | 'blog-images'
  | 'site-settings';

/**
 * Génère le chemin de stockage multi-tenant
 * Format: bucket-name/company-{companyId}/file-path
 */
export async function getMultiTenantPath(
  storageType: StorageType,
  fileName: string,
  companyId?: string
): Promise<string> {
  const finalCompanyId = companyId || await getCurrentUserCompanyId();
  return `company-${finalCompanyId}/${fileName}`;
}

/**
 * Upload un fichier dans l'architecture multi-tenant
 */
export async function uploadFileMultiTenant(
  file: File,
  storageType: StorageType,
  fileName?: string,
  companyId?: string
): Promise<string | null> {
  try {
    const finalCompanyId = companyId || await getCurrentUserCompanyId();
    
    // Générer un nom de fichier unique si non fourni
    const finalFileName = fileName || generateUniqueFileName(file);
    const filePath = await getMultiTenantPath(storageType, finalFileName, finalCompanyId);
    
    console.log(`Upload multi-tenant vers ${storageType}/${filePath}`);
    
    // S'assurer que le bucket existe
    const bucketExists = await ensureStorageBucket(storageType);
    if (!bucketExists) {
      console.error(`Le bucket ${storageType} n'existe pas et n'a pas pu être créé`);
      toast.error(`Erreur: Le bucket ${storageType} n'a pas pu être créé`);
      return null;
    }
    
    // Upload le fichier
    const { data, error } = await supabase.storage
      .from(storageType)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      });
    
    if (error) {
      console.error(`Erreur lors de l'upload: ${error.message}`);
      toast.error("Erreur lors de l'upload du fichier");
      return null;
    }
    
    // Obtenir l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from(storageType)
      .getPublicUrl(filePath);
    
    console.log(`Fichier uploadé avec succès: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`Erreur générale dans uploadFileMultiTenant:`, error);
    toast.error("Erreur lors du traitement du fichier");
    return null;
  }
}

/**
 * Télécharge et stocke une image externe dans l'architecture multi-tenant
 */
export async function downloadAndStoreImageMultiTenant(
  imageUrl: string,
  storageType: StorageType,
  companyId?: string
): Promise<string | null> {
  try {
    if (!imageUrl) return null;
    console.log(`Téléchargement d'image depuis: ${imageUrl}`);
    
    const finalCompanyId = companyId || await getCurrentUserCompanyId();
    
    // Extraire le nom du fichier et l'extension de l'URL
    const urlParts = imageUrl.split('/');
    let fileName = urlParts[urlParts.length - 1];
    fileName = fileName.split('?')[0]; // Supprimer les paramètres de requête
    
    // Générer un nom unique pour éviter les collisions
    const timestamp = Date.now();
    const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '-');
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueFileName = `${fileNameWithoutExt}-${timestamp}.${fileExt}`;
    
    const filePath = await getMultiTenantPath(storageType, uniqueFileName, finalCompanyId);
    
    // S'assurer que le bucket existe
    const bucketExists = await ensureStorageBucket(storageType);
    if (!bucketExists) {
      console.error(`Le bucket ${storageType} n'existe pas et n'a pas pu être créé`);
      toast.error(`Erreur: Le bucket ${storageType} n'a pas pu être créé`);
      return null;
    }
    
    // Télécharger l'image avec timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(imageUrl, { 
        signal: controller.signal,
        headers: { 'Accept': 'image/*' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Erreur lors du téléchargement: ${response.status} ${response.statusText}`);
      }
      
      // Vérifier le type de contenu
      const contentType = response.headers.get('content-type');
      console.log(`Type de contenu: ${contentType}`);
      
      if (contentType && contentType.includes('application/json')) {
        console.error('Réponse JSON reçue au lieu d\'une image');
        toast.error("Le serveur a renvoyé du JSON au lieu d'une image");
        return null;
      }
      
      // Obtenir le blob et forcer le type MIME correct
      const arrayBuffer = await response.arrayBuffer();
      let mimeType = contentType || `image/${fileExt}`;
      
      // S'assurer que le type MIME est correct
      if (!mimeType.startsWith('image/')) {
        mimeType = detectMimeType(fileExt);
      }
      
      console.log(`Utilisation du type MIME: ${mimeType}`);
      const blob = new Blob([arrayBuffer], { type: mimeType });
      
      // Upload vers Supabase
      console.log(`Upload vers ${storageType}/${filePath}`);
      const { data, error } = await supabase.storage
        .from(storageType)
        .upload(filePath, blob, {
          contentType: mimeType,
          upsert: true
        });
      
      if (error) {
        console.error(`Erreur lors de l'upload: ${error.message}`);
        toast.error("Erreur lors de l'upload de l'image");
        return null;
      }
      
      // Obtenir l'URL publique
      const { data: publicUrlData } = supabase.storage
        .from(storageType)
        .getPublicUrl(filePath);
      
      console.log(`Image téléchargée avec succès: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error(`Erreur lors du téléchargement: ${fetchError}`);
      toast.error("Erreur lors du téléchargement de l'image");
      return null;
    }
  } catch (error) {
    console.error(`Erreur générale dans downloadAndStoreImageMultiTenant:`, error);
    toast.error("Erreur lors du traitement de l'image");
    return null;
  }
}

/**
 * Liste les fichiers d'une entreprise dans un bucket donné
 */
export async function listCompanyFiles(
  storageType: StorageType,
  companyId?: string
): Promise<{ name: string; url: string }[]> {
  try {
    const finalCompanyId = companyId || await getCurrentUserCompanyId();
    const prefix = `company-${finalCompanyId}/`;
    
    const { data, error } = await supabase.storage
      .from(storageType)
      .list(prefix);
    
    if (error) {
      console.error(`Erreur lors de la liste des fichiers:`, error);
      return [];
    }
    
    return (data || []).map(file => ({
      name: file.name,
      url: supabase.storage.from(storageType).getPublicUrl(`${prefix}${file.name}`).data.publicUrl
    }));
  } catch (error) {
    console.error(`Erreur générale dans listCompanyFiles:`, error);
    return [];
  }
}

/**
 * Supprime un fichier dans l'architecture multi-tenant
 */
export async function deleteFileMultiTenant(
  storageType: StorageType,
  fileName: string,
  companyId?: string
): Promise<boolean> {
  try {
    const finalCompanyId = companyId || await getCurrentUserCompanyId();
    const filePath = await getMultiTenantPath(storageType, fileName, finalCompanyId);
    
    const { error } = await supabase.storage
      .from(storageType)
      .remove([filePath]);
    
    if (error) {
      console.error(`Erreur lors de la suppression: ${error.message}`);
      toast.error("Erreur lors de la suppression du fichier");
      return false;
    }
    
    console.log(`Fichier supprimé avec succès: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Erreur générale dans deleteFileMultiTenant:`, error);
    toast.error("Erreur lors de la suppression du fichier");
    return false;
  }
}

/**
 * Fonctions utilitaires
 */

function generateUniqueFileName(file: File): string {
  const timestamp = Date.now();
  const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '-');
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  return `${fileNameWithoutExt}-${timestamp}.${fileExt}`;
}

function detectMimeType(extension: string): string {
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
    case 'bmp':
      return 'image/bmp';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

/**
 * S'assure qu'un bucket de stockage existe
 * Fonction simplifiée réutilisant la logique existante
 */
async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    // Vérifier si le bucket existe déjà
    const { data: existingBuckets, error: bucketError } = await supabase
      .storage
      .listBuckets();
    
    if (!bucketError) {
      const bucketExists = existingBuckets?.some(bucket => bucket.name === bucketName);
      if (bucketExists) {
        return true;
      }
    }
    
    // Créer le bucket s'il n'existe pas
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 52428800 // 50MB
    });
    
    if (createError && !createError.message?.includes('already exists')) {
      console.error(`Échec de la création du bucket ${bucketName}: ${createError.message}`);
      return false;
    }
    
    console.log(`Bucket ${bucketName} créé avec succès ou existe déjà`);
    return true;
  } catch (error) {
    console.error(`Erreur générale dans ensureStorageBucket pour ${bucketName}:`, error);
    return false;
  }
}

/**
 * Migration helper: déplace les fichiers existants vers la nouvelle structure multi-tenant
 */
export async function migrateExistingFilesToMultiTenant(
  storageType: StorageType,
  companyId: string
): Promise<void> {
  try {
    console.log(`Migration des fichiers existants vers la structure multi-tenant pour ${storageType}`);
    
    // Lister tous les fichiers à la racine du bucket
    const { data: files, error } = await supabase.storage
      .from(storageType)
      .list('', { limit: 1000 });
    
    if (error) {
      console.error(`Erreur lors de la liste des fichiers pour migration:`, error);
      return;
    }
    
    const rootFiles = files?.filter(file => !file.name.startsWith('company-')) || [];
    
    console.log(`Trouvé ${rootFiles.length} fichiers à migrer`);
    
    for (const file of rootFiles) {
      try {
        // Télécharger le fichier existant
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(storageType)
          .download(file.name);
        
        if (downloadError) {
          console.error(`Erreur lors du téléchargement de ${file.name}:`, downloadError);
          continue;
        }
        
        // Upload vers le nouveau chemin multi-tenant
        const newPath = `company-${companyId}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from(storageType)
          .upload(newPath, fileData, {
            contentType: file.metadata?.mimetype || 'application/octet-stream',
            upsert: true
          });
        
        if (uploadError) {
          console.error(`Erreur lors de l'upload de ${file.name} vers ${newPath}:`, uploadError);
          continue;
        }
        
        // Supprimer l'ancien fichier
        const { error: deleteError } = await supabase.storage
          .from(storageType)
          .remove([file.name]);
        
        if (deleteError) {
          console.error(`Erreur lors de la suppression de ${file.name}:`, deleteError);
        } else {
          console.log(`Fichier migré avec succès: ${file.name} -> ${newPath}`);
        }
      } catch (fileError) {
        console.error(`Erreur lors de la migration du fichier ${file.name}:`, fileError);
      }
    }
    
    console.log(`Migration terminée pour ${storageType}`);
  } catch (error) {
    console.error(`Erreur générale lors de la migration:`, error);
  }
}