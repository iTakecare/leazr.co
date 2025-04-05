import { v4 as uuidv4 } from 'uuid';
import { supabase, getAdminSupabaseClient } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Vérifie si un bucket existe et le crée s'il n'existe pas
 */
export const ensureBucketExists = async (bucketName: string): Promise<boolean> => {
  try {
    // Vérifier si le bucket existe
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('Erreur lors de la vérification des buckets:', error);
      return false;
    }

    // Si le bucket existe, retourner true
    if (buckets.some(bucket => bucket.name === bucketName)) {
      return true;
    }

    // Si le bucket n'existe pas, essayer de le créer avec la fonction Edge
    try {
      const response = await fetch('/api/create-storage-bucket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bucketName }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(`Bucket ${bucketName} créé avec succès via Edge Function`);
          return true;
        }
      }
      
      console.error(`Échec de la création du bucket ${bucketName} via Edge Function`);
    } catch (edgeFnError) {
      console.error(`Erreur lors de l'appel Edge Function:`, edgeFnError);
    }

    // Essayer la fonction RPC
    try {
      const { data, error } = await supabase.rpc('create_storage_bucket', { bucket_name: bucketName });
      if (!error) {
        console.log(`Bucket ${bucketName} créé via RPC`);
        return true;
      }
    } catch (rpcError) {
      console.error(`Erreur RPC:`, rpcError);
    }

    // Essayer de créer le bucket directement (fallback)
    try {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });

      if (createError) {
        if (createError.message.includes('already exists')) {
          return true;
        }
        console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
        return false;
      }

      return true;
    } catch (createError) {
      console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
      return false;
    }
  } catch (error) {
    console.error(`Erreur lors de la vérification/création du bucket ${bucketName}:`, error);
    return false;
  }
};

/**
 * Détecte le type MIME à partir de l'extension du fichier
 */
export const detectMimeTypeFromExtension = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
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
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
};

/**
 * Ajoute un paramètre de cache-busting à une URL d'image
 */
export const getCacheBustedUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Vérifier si l'URL est un objet JSON (cas d'erreur)
  if (typeof url === 'string' && (url.startsWith('{') || url.startsWith('['))) {
    console.error("URL invalide (JSON détecté):", url);
    return '';
  }
  
  // Ajouter le paramètre cache-busting
  const timestamp = Date.now();
  
  // Ne pas ajouter de cache-busting aux URLs data:
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Si l'URL contient déjà des paramètres, ajouter le cache-busting
  if (url.includes('?')) {
    return `${url}&t=${timestamp}`;
  }
  
  return `${url}?t=${timestamp}`;
};

/**
 * Upload un fichier dans Supabase Storage avec une méthode hybride (fetch API + fallback SDK)
 */
export const uploadFileDirectly = async (
  file: File,
  bucketName: string,
  folderPath: string = ''
): Promise<{ url: string, fileName: string } | null> => {
  try {
    // Valider la taille du fichier (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 5MB)");
      return null;
    }
    
    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const uniqueFileName = `${timestamp}-${fileName}`;
    const fullPath = folderPath ? `${folderPath}/${uniqueFileName}` : uniqueFileName;
    
    // Déterminer le type de contenu en fonction de l'extension du fichier
    const contentType = file.type || detectMimeTypeFromExtension(file.name);
    
    console.log(`Uploading file ${uniqueFileName} with content type ${contentType}`);
    
    // Méthode 1: Utiliser fetch directement 
    try {
      const formData = new FormData();
      const blob = new Blob([await file.arrayBuffer()], { type: contentType });
      formData.append('file', blob, uniqueFileName);
      
      const url = `${supabase.supabaseUrl}/storage/v1/object/${bucketName}/${fullPath}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'x-upsert': 'true'
        },
        body: formData
      });
      
      if (!response.ok) {
        console.log("Fetch upload failed, trying SDK fallback method");
        throw new Error("Fetch upload failed");
      }
    } catch (fetchError) {
      console.log("Falling back to Supabase SDK", fetchError);
      
      // Méthode 2: Utiliser l'API Supabase comme fallback
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fullPath, file, {
          contentType,
          upsert: true,
          cacheControl: "3600"
        });
      
      if (error) {
        console.error("Upload error via SDK:", error);
        throw error;
      }
    }
    
    // Récupérer l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fullPath);
    
    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error("Impossible d'obtenir l'URL publique");
    }
    
    console.log("File uploaded successfully:", publicUrlData.publicUrl);
    return { url: publicUrlData.publicUrl, fileName: uniqueFileName };
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
};
