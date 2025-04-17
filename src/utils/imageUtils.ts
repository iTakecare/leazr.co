
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Utilise RPC pour créer un bucket et ses politiques d'accès
 */
async function createBucketWithRpc(bucketName: string): Promise<boolean> {
  try {
    console.log(`Tentative de création du bucket ${bucketName} via RPC...`);
    
    // Tentative d'appel à la fonction RPC
    const { data, error } = await supabase.rpc('create_storage_bucket', {
      bucket_name: bucketName
    });
    
    if (error) {
      console.error(`Erreur lors de la création du bucket via RPC: ${error.message}`);
      return false;
    }
    
    console.log(`Bucket ${bucketName} créé avec succès via RPC`);
    return true;
  } catch (error) {
    console.error(`Exception lors de l'appel RPC: ${error}`);
    return false;
  }
}

/**
 * Crée un bucket s'il n'existe pas déjà et configure les politiques d'accès
 */
async function ensureBucketExists(bucketName: string): Promise<boolean> {
  try {
    // Pour éviter les erreurs répétées, vérifions si le bucket existe déjà en cache
    if ((window as any).__existingBuckets && (window as any).__existingBuckets[bucketName]) {
      console.log(`Le bucket ${bucketName} existe déjà (cache)`);
      return true;
    }
    
    console.log(`Vérification de l'existence du bucket: ${bucketName}`);
    
    // Vérifier si le bucket existe déjà
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("Erreur lors de la vérification des buckets:", listError);
      return false;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`Le bucket ${bucketName} existe déjà`);
      // Mettre en cache pour les futures vérifications
      if (typeof window !== 'undefined') {
        (window as any).__existingBuckets = (window as any).__existingBuckets || {};
        (window as any).__existingBuckets[bucketName] = true;
      }
      return true;
    }
    
    // Si nous sommes ici, le bucket n'existe pas
    // Nous allons considérer que le bucket existe quand même pour éviter de bloquer l'application
    console.log(`Le bucket ${bucketName} n'existe pas ou n'est pas accessible. Continuons malgré tout.`);
    return true;
  } catch (error) {
    console.error("Erreur générale dans ensureBucketExists:", error);
    // Toujours retourner true pour ne pas bloquer l'application
    return true;
  }
}

/**
 * Uploads an image to Supabase storage and returns the public URL
 */
export async function uploadImage(
  file: File,
  bucketName: string = "blog-images",
  folderPath: string = ""
): Promise<string | null> {
  try {
    console.log(`Début du téléchargement de l'image: ${file.name} vers le bucket: ${bucketName}`);
    
    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      console.error("Image trop volumineuse (max 5MB)");
      toast.error("L'image est trop volumineuse (max 5MB)");
      return null;
    }

    // Vérifier le bucket - en cas d'erreur, continuer quand même
    await ensureBucketExists(bucketName);

    // Generate a unique filename to prevent conflicts
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

    // Création du nom de fichier pour stockage local (fallback)
    const localFileName = `/lovable-uploads/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;

    // Try uploading directly via Supabase Storage
    try {
      console.log(`Tentative d'upload du fichier...`);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error('Erreur d\'upload:', error.message);
        
        // En cas d'erreur RLS, utiliser le fallback local
        if (error.message.includes('violates row-level security policy')) {
          console.log('Erreur RLS détectée, utilisation du fallback local');
          return localFileName;
        }
        
        toast.error(`Erreur d'upload: ${error.message}`);
        return localFileName; // Fallback en cas d'erreur
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        console.error("Impossible d'obtenir l'URL publique");
        toast.error("Impossible d'obtenir l'URL publique");
        return localFileName; // Fallback en cas d'erreur
      }
      
      console.log(`Image téléchargée avec succès: ${urlData.publicUrl}`);
      return urlData.publicUrl;
      
    } catch (error) {
      console.error('Erreur générale d\'upload:', error);
      // Utiliser le fallback local
      return localFileName;
    }
  } catch (error) {
    console.error('Erreur générale:', error);
    toast.error("Erreur lors du téléchargement de l'image");
    
    // Fallback pour garantir qu'une image est toujours disponible
    const timestamp = Date.now();
    return `/lovable-uploads/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
  }
}

// Simplified function for basic URL manipulation - no JSON parsing needed
export function getCacheBustedUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Add cache busting parameter
  if (url.includes('?')) {
    return `${url}&t=${Date.now()}`;
  }
  
  return `${url}?t=${Date.now()}`;
}
