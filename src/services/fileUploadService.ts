
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * S'assure qu'un bucket existe dans Supabase Storage
 */
export const ensureBucket = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Vérification de l'existence du bucket: ${bucketName}`);
    
    // Vérifier si le bucket existe en listant les buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Erreur lors de la liste des buckets: ${listError.message}`);
      return false;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.id === bucketName);
    
    if (bucketExists) {
      console.log(`Le bucket ${bucketName} existe déjà`);
      return true;
    }
    
    console.log(`Le bucket ${bucketName} n'existe pas mais devrait être disponible`);
    return true; // On continue car les buckets sont créés via migration
  } catch (error) {
    console.error(`Erreur lors de la vérification du bucket ${bucketName}:`, error);
    return true; // On continue quand même
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
      console.warn("Le bucket pourrait ne pas exister, tentative d'upload quand même");
    }
    
    // Validation des types de fichiers
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const isValidType = allowedTypes.includes(file.type) || 
                       ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'].includes(fileExtension || '');
    
    if (!isValidType) {
      console.error("Type de fichier non autorisé:", file.type, fileExtension);
      toast.error("Type de fichier non autorisé. Utilisez JPG, PNG, GIF, WEBP, SVG ou PDF.");
      return null;
    }
    
    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '-');
    const extension = fileExtension || 'bin';
    const uniqueFileName = `${fileNameWithoutExt}-${timestamp}-${randomString}.${extension}`;
    
    // Construire le chemin complet
    const filePath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;
    
    console.log(`Upload vers ${bucketName}/${filePath}`);
    
    // Upload vers Supabase
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: file.type || `image/${extension}`,
        upsert: true
      });
    
    if (error) {
      console.error("Erreur lors de l'upload:", error);
      toast.error(`Erreur lors de l'upload: ${error.message}`);
      return null;
    }
    
    // Obtenir l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    if (!publicUrlData?.publicUrl) {
      console.error("Impossible d'obtenir l'URL publique");
      toast.error("Impossible d'obtenir l'URL publique du fichier");
      return null;
    }
    
    console.log(`Fichier uploadé avec succès: ${publicUrlData.publicUrl}`);
    toast.success("Fichier uploadé avec succès");
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Erreur générale dans uploadImage:", error);
    toast.error("Erreur lors de l'upload du fichier");
    return null;
  }
};

// Function to get a cache-busted URL for images
export function getCacheBustedUrl(url: string | null | undefined): string {
  if (!url) return "/placeholder.svg";
  
  try {
    // Vérifier si l'URL est un object JSON (cas d'erreur connu)
    if (url.startsWith('{') || url.startsWith('[')) {
      console.error("Invalid image URL (JSON detected):", url);
      return "/placeholder.svg";
    }
    
    // Nettoyer l'URL en supprimant les paramètres existants
    const urlParts = url.split('?');
    const baseUrl = urlParts[0];
    
    // Si l'URL semble être un lien relatif ou incomplet, essayer de le corriger
    let fixedUrl = baseUrl;
    if (baseUrl.startsWith('//')) {
      fixedUrl = 'https:' + baseUrl;
    } else if (!baseUrl.startsWith('http') && !baseUrl.startsWith('/')) {
      fixedUrl = '/' + baseUrl;
    }
    
    // Ajouter un timestamp comme paramètre de cache-busting
    return `${fixedUrl}?t=${Date.now()}`;
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL avec cache-busting:", error);
    return url || "/placeholder.svg";
  }
}
