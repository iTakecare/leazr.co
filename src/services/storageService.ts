
import { supabase, STORAGE_URL, SUPABASE_KEY } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * S'assure qu'un bucket de stockage existe et est configuré correctement
 * @param bucketName Le nom du bucket à vérifier/créer
 * @returns Promise<boolean> Vrai si le bucket existe ou a été créé avec succès
 */
export async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    console.log(`Vérification/création du bucket de stockage: ${bucketName}`);
    
    // 1. Vérifier si le bucket existe déjà
    try {
      const { data: existingBuckets, error: bucketError } = await supabase
        .storage
        .listBuckets();
      
      if (bucketError) {
        console.error(`Erreur lors de la vérification des buckets:`, bucketError);
        // Ne pas afficher de toast ici, continuer avec les autres méthodes
      } else {
        const bucketExists = existingBuckets?.some(bucket => bucket.name === bucketName);
        
        if (bucketExists) {
          console.log(`Le bucket ${bucketName} existe déjà`);
          return true;
        }
      }
    } catch (e) {
      console.warn(`Exception lors de la vérification des buckets: ${e}`);
      // Continuer avec les autres méthodes
    }
    
    // 2. Essayer via l'edge function create-storage-bucket
    try {
      console.log(`Tentative de création via l'edge function create-storage-bucket`);
      const { data, error } = await supabase.functions.invoke('create-storage-bucket', {
        body: { bucket_name: bucketName }
      });
      
      if (error) {
        console.error(`Erreur lors de l'appel à la fonction create-storage-bucket:`, error);
      } else if (data?.success) {
        console.log(`Bucket ${bucketName} créé avec succès via edge function`);
        return true;
      } else if (data?.message?.includes('already exists')) {
        console.log(`Le bucket ${bucketName} existe déjà (signalé par edge function)`);
        return true;
      }
    } catch (functionError) {
      console.warn(`Exception lors de l'appel à l'edge function: ${functionError}`);
    }
    
    // 3. Dernière tentative: création directe via l'API Supabase
    try {
      console.log(`Tentative de création directe du bucket ${bucketName}`);
      
      const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800 // 50MB
      });
      
      if (createError) {
        if (createError.message && createError.message.includes('already exists')) {
          console.log(`Le bucket ${bucketName} existe déjà (détecté via erreur de création)`);
          return true;
        }
        
        console.error(`Échec de la création directe du bucket ${bucketName}: ${createError.message}`);
        return false;
      }
      
      console.log(`Bucket ${bucketName} créé avec succès via API directe`);
      
      // Create public access policies
      try {
        await supabase.rpc('create_storage_policy', {
          bucket_name: bucketName,
          policy_name: `${bucketName}_public_select`,
          definition: 'TRUE',
          policy_type: 'SELECT'
        });
        
        await supabase.rpc('create_storage_policy', {
          bucket_name: bucketName,
          policy_name: `${bucketName}_public_insert`,
          definition: 'TRUE',
          policy_type: 'INSERT'
        });
        
        await supabase.rpc('create_storage_policy', {
          bucket_name: bucketName,
          policy_name: `${bucketName}_public_update`,
          definition: 'TRUE',
          policy_type: 'UPDATE'
        });
        
        await supabase.rpc('create_storage_policy', {
          bucket_name: bucketName,
          policy_name: `${bucketName}_public_delete`,
          definition: 'TRUE',
          policy_type: 'DELETE'
        });
        
        console.log(`Created public access policies for bucket ${bucketName}`);
      } catch (policyError) {
        console.error("Failed to create policies (continuing anyway):", policyError);
      }
      
      return true;
    } catch (error) {
      console.error(`Exception lors de la création directe du bucket ${bucketName}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`Erreur générale dans ensureStorageBucket pour ${bucketName}:`, error);
    return false;
  }
}

/**
 * Méthode simplifiée pour télécharger et stocker une image
 * @param imageUrl URL de l'image à télécharger
 * @param bucketName Nom du bucket Supabase
 * @param folder Dossier optionnel dans le bucket
 * @returns URL de l'image stockée ou null en cas d'erreur
 */
export async function downloadAndStoreImage(imageUrl: string, bucketName: string, folder: string = ''): Promise<string | null> {
  try {
    if (!imageUrl) return null;
    console.log(`Téléchargement d'image depuis: ${imageUrl}`);
    
    // Vérifier que le bucket existe
    const bucketExists = await ensureStorageBucket(bucketName);
    if (!bucketExists) {
      console.error(`Le bucket ${bucketName} n'existe pas et n'a pas pu être créé`);
      toast.error(`Erreur: Le bucket ${bucketName} n'a pas pu être créé`);
      return null;
    }
    
    // Extraire le nom du fichier et l'extension de l'URL
    const urlParts = imageUrl.split('/');
    let fileName = urlParts[urlParts.length - 1];
    fileName = fileName.split('?')[0]; // Supprimer les paramètres de requête
    
    // Générer un nom unique pour éviter les collisions
    const timestamp = Date.now();
    const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '-');
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueFileName = `${fileNameWithoutExt}-${timestamp}.${fileExt}`;
    const filePath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;
    
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
      console.log(`Upload vers ${bucketName}/${filePath}`);
      const { data, error } = await supabase.storage
        .from(bucketName)
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
        .from(bucketName)
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
    console.error(`Erreur générale dans downloadAndStoreImage:`, error);
    toast.error("Erreur lors du traitement de l'image");
    return null;
  }
}

/**
 * Détecte le type MIME à partir de l'extension de fichier
 */
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
    default:
      return 'image/jpeg';  // Fallback
  }
}
