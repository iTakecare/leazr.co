
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
 * Vérifie et crée un bucket de stockage si nécessaire
 */
async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    console.log(`Vérification du bucket: ${bucketName}`);
    
    // Vérifier si le bucket existe déjà
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Erreur lors de la liste des buckets: ${listError.message}`);
      return false;
    }
    
    const bucketExists = existingBuckets?.some(bucket => bucket.id === bucketName);
    
    if (bucketExists) {
      console.log(`Bucket ${bucketName} existe déjà`);
      return true;
    }
    
    console.log(`Le bucket ${bucketName} n'existe pas mais devrait être créé automatiquement`);
    return true; // On retourne true car les buckets ont été créés via la migration
  } catch (error) {
    console.error(`Erreur générale lors de la vérification du bucket ${bucketName}:`, error);
    return true; // On continue quand même
  }
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
    console.log(`Début upload multi-tenant vers ${storageType}`);
    
    const finalCompanyId = companyId || await getCurrentUserCompanyId();
    console.log(`Entreprise cible: ${finalCompanyId}`);
    
    // Générer un nom de fichier unique si non fourni
    const finalFileName = fileName || generateUniqueFileName(file);
    const filePath = await getMultiTenantPath(storageType, finalFileName, finalCompanyId);
    
    console.log(`Chemin de fichier: ${filePath}`);
    
    // S'assurer que le bucket existe
    const bucketExists = await ensureStorageBucket(storageType);
    if (!bucketExists) {
      console.warn(`Le bucket ${storageType} pourrait ne pas exister, tentative d'upload quand même`);
    }
    
    // Upload le fichier directement
    const { data, error } = await supabase.storage
      .from(storageType)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      });
    
    if (error) {
      console.error(`Erreur lors de l'upload: ${error.message}`);
      toast.error(`Erreur lors de l'upload: ${error.message}`);
      return null;
    }
    
    // Obtenir l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from(storageType)
      .getPublicUrl(filePath);
    
    if (!publicUrlData?.publicUrl) {
      console.error("Impossible d'obtenir l'URL publique du fichier");
      toast.error("Impossible d'obtenir l'URL publique du fichier");
      return null;
    }
    
    console.log(`Fichier uploadé avec succès: ${publicUrlData.publicUrl}`);
    toast.success("Fichier uploadé avec succès");
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`Erreur générale dans uploadFileMultiTenant:`, error);
    toast.error("Erreur lors du traitement du fichier");
    return null;
  }
}

/**
 * Liste les fichiers d'une entreprise dans un bucket donné
 */
export async function listCompanyFiles(
  storageType: StorageType,
  companyId?: string,
  path?: string
): Promise<{ name: string; url: string; fullPath: string }[]> {
  try {
    const finalCompanyId = companyId || await getCurrentUserCompanyId();
    const prefix = path ? `company-${finalCompanyId}/${path}` : `company-${finalCompanyId}`;
    
    console.log(`Liste des fichiers dans ${storageType}/${prefix}`);
    
    const { data, error } = await supabase.storage
      .from(storageType)
      .list(prefix, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      console.error(`Erreur lors de la liste des fichiers:`, error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log(`Aucun fichier trouvé dans ${prefix}`);
      return [];
    }
    
    return data
      .filter(file => !file.name.startsWith('.') && file.name !== '.emptyFolderPlaceholder')
      .map(file => {
        const fullPath = `${prefix}/${file.name}`;
        return {
          name: file.name,
          fullPath: fullPath,
          url: supabase.storage.from(storageType).getPublicUrl(fullPath).data.publicUrl
        };
      });
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
    
    console.log(`Suppression du fichier: ${filePath}`);
    
    const { error } = await supabase.storage
      .from(storageType)
      .remove([filePath]);
    
    if (error) {
      console.error(`Erreur lors de la suppression: ${error.message}`);
      toast.error(`Erreur lors de la suppression: ${error.message}`);
      return false;
    }
    
    console.log(`Fichier supprimé avec succès: ${filePath}`);
    toast.success("Fichier supprimé avec succès");
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
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '-');
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  return `${fileNameWithoutExt}-${timestamp}-${randomSuffix}.${fileExt}`;
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
