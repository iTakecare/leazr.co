
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
 * Télécharge une image à partir d'une URL et la stocke dans un bucket Supabase
 * @param imageUrl L'URL de l'image à télécharger
 * @param bucketName Le nom du bucket où stocker l'image
 * @param folder Dossier optionnel dans le bucket
 * @returns La nouvelle URL de l'image stockée ou null en cas d'erreur
 */
export async function downloadAndStoreImage(imageUrl: string, bucketName: string, folder: string = ''): Promise<string | null> {
  try {
    if (!imageUrl) return null;
    
    // Vérifier que le bucket existe avant tout
    console.log(`Vérification du bucket ${bucketName} avant téléchargement`);
    const bucketExists = await ensureStorageBucket(bucketName);
    
    if (!bucketExists) {
      console.error(`Le bucket ${bucketName} n'existe pas et n'a pas pu être créé`);
      toast.error(`Erreur: Le bucket ${bucketName} n'a pas pu être créé`);
      throw new Error(`Le bucket ${bucketName} n'existe pas et n'a pas pu être créé`);
    }
    
    // Extraire le nom du fichier et l'extension de l'URL
    const urlParts = imageUrl.split('/');
    let fileName = urlParts[urlParts.length - 1];
    
    // Nettoyer le nom de fichier
    fileName = fileName.split('?')[0]; // Supprimer les paramètres de requête
    
    // Extraire l'extension du fichier
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '-');
    
    // Générer un nom unique pour éviter les collisions
    const timestamp = Date.now();
    const uniqueFileName = `${fileNameWithoutExt}-${timestamp}.${fileExt || 'jpg'}`;
    const filePath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;
    
    // Télécharger l'image
    try {
      console.log(`Téléchargement de l'image: ${imageUrl}`);
      
      // Force un timeout pour éviter les requêtes qui ne se terminent jamais
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(imageUrl, { 
        signal: controller.signal,
        headers: {
          'Accept': 'image/*',
          'Cache-Control': 'no-cache' 
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Erreur lors du téléchargement de l'image: ${response.statusText}`);
      }
      
      // Vérifier le type de contenu
      const contentType = response.headers.get('content-type');
      console.log(`Type de contenu de la réponse: ${contentType}`);
      
      // Si le contentType est JSON, c'est probablement une erreur
      if (contentType && contentType.includes('application/json')) {
        const jsonData = await response.json();
        console.error('Réponse JSON reçue au lieu d'une image:', jsonData);
        toast.error("Le serveur a renvoyé du JSON au lieu d'une image");
        return null;
      }
      
      // Récupérer comme blob
      const blob = await response.blob();
      
      // Déterminer le type MIME correct à partir de l'extension
      let mimeType = '';
      switch (fileExt.toLowerCase()) {
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg';
          break;
        case 'png':
          mimeType = 'image/png';
          break;
        case 'gif':
          mimeType = 'image/gif';
          break;
        case 'webp':
          mimeType = 'image/webp';
          break;
        case 'svg':
          mimeType = 'image/svg+xml';
          break;
        default:
          // Si on ne peut pas déterminer le type, utiliser celui du blob
          mimeType = blob.type;
          // Si le blob n'a pas de type ou est application/octet-stream, forcer à JPEG
          if (!mimeType || mimeType === 'application/octet-stream' || mimeType.includes('application/json')) {
            mimeType = 'image/jpeg';
          }
      }
      
      // Créer un nouveau blob avec le type MIME correct
      const arrayBuffer = await blob.arrayBuffer();
      const correctBlob = new Blob([arrayBuffer], { type: mimeType });
      
      console.log(`Upload de l'image vers ${bucketName}/${filePath} avec type ${mimeType}`);
      
      const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(filePath, correctBlob, {
          contentType: mimeType,
          upsert: true
        });
      
      if (error) {
        console.error(`Erreur lors de l'upload: ${error.message}`);
        toast.error(`Erreur lors de l'upload: ${error.message}`);
        return null;
      }
      
      // Obtenir l'URL publique
      const { data: publicUrlData } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      const publicUrl = publicUrlData.publicUrl;
      console.log(`Image téléchargée avec succès: ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      console.error(`Erreur lors du téléchargement et stockage de l'image:`, error);
      toast.error("Erreur lors du téléchargement de l'image");
      return null;
    }
  } catch (error) {
    console.error(`Erreur dans downloadAndStoreImage:`, error);
    toast.error("Erreur lors du téléchargement de l'image");
    return null;
  }
}
