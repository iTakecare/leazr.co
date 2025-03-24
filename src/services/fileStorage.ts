
import { getSupabaseClient, getAdminSupabaseClient, STORAGE_URL, SUPABASE_KEY } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

/**
 * Service amélioré de gestion des fichiers avec Supabase Storage
 */

// Variable pour suivre l'état de connexion à Supabase Storage
let storageConnectionStatus: 'connected' | 'disconnected' | 'checking' = 'checking';

/**
 * Vérifie la connexion à Supabase Storage
 */
export const checkStorageConnection = async (): Promise<boolean> => {
  if (storageConnectionStatus === 'checking') {
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
      storageConnectionStatus = 'connected';
      return true;
    } catch (error) {
      console.error("Exception lors de la vérification de la connexion à Supabase Storage:", error);
      storageConnectionStatus = 'disconnected';
      return false;
    }
  }
  
  // Retourner l'état de connexion actuel
  return storageConnectionStatus === 'connected';
};

/**
 * Vérifie si un bucket existe et le crée si nécessaire avec les bonnes permissions
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
    
    const supabase = getSupabaseClient();
    
    // Vérifier si le bucket existe
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error("Erreur lors de la vérification des buckets:", bucketError);
      return false;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} non trouvé, tentative de création...`);
      
      // Première tentative avec le client standard
      try {
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true
        });
        
        if (createError) {
          console.warn(`Erreur lors de la création du bucket ${bucketName} avec le client standard:`, createError);
          
          // Si la première tentative échoue, essayer avec le client administrateur
          console.log("Tentative avec le client administrateur...");
          const adminClient = getAdminSupabaseClient();
          const { error: adminCreateError } = await adminClient.storage.createBucket(bucketName, {
            public: true
          });
          
          if (adminCreateError) {
            console.warn(`Erreur lors de la création du bucket ${bucketName} avec le client administrateur:`, adminCreateError);
            
            // Si le client administrateur échoue également, essayer avec l'API REST
            return await createBucketWithDirectAPI(bucketName);
          }
        }
        
        console.log(`Bucket ${bucketName} créé avec succès`);
        return true;
      } catch (createError) {
        console.error("Exception lors de la création du bucket:", createError);
        return false;
      }
    }
    
    console.log(`Bucket ${bucketName} existe déjà`);
    return true;
  } catch (error) {
    console.error("Exception lors de la vérification/création du bucket:", error);
    toast.error(`Problème avec le stockage: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return false;
  }
};

// Fonction pour créer un bucket en utilisant l'API REST directement
const createBucketWithDirectAPI = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Tentative de création du bucket ${bucketName} via l'API REST directe...`);
    
    // Appel direct à l'API Supabase Storage
    const response = await fetch(`${STORAGE_URL}/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: bucketName,
        name: bucketName,
        public: true
      })
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      // Si l'erreur contient "already exists", considérer comme un succès
      if (responseData.message && responseData.message.includes("already exists")) {
        console.log(`Le bucket ${bucketName} existe déjà (via API REST)`);
        return true;
      }
      
      console.error(`Erreur de l'API REST lors de la création du bucket ${bucketName}:`, responseData);
      return false;
    }
    
    console.log(`Bucket ${bucketName} créé avec succès via l'API REST directe`);
    
    // Tentative de création des politiques (peut échouer si elles existent déjà, mais ce n'est pas grave)
    try {
      await createBucketPoliciesWithDirectAPI(bucketName);
    } catch (e) {
      console.warn(`Erreur lors de la création des politiques pour ${bucketName}, mais le bucket est bien créé:`, e);
    }
    
    return true;
  } catch (error) {
    console.error(`Exception lors de la création du bucket ${bucketName} via l'API REST:`, error);
    return false;
  }
};

// Création de politiques avec l'API REST directe
const createBucketPoliciesWithDirectAPI = async (bucketName: string): Promise<void> => {
  try {
    // Définir les politiques à créer
    const policies = [
      { name: `${bucketName}_read_policy`, operation: 'SELECT' },
      { name: `${bucketName}_write_policy`, operation: 'INSERT' },
      { name: `${bucketName}_update_policy`, operation: 'UPDATE' },
      { name: `${bucketName}_delete_policy`, operation: 'DELETE' }
    ];
    
    for (const policy of policies) {
      try {
        const response = await fetch(`${STORAGE_URL}/policies`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: policy.name,
            bucket_id: bucketName,
            definition: { role: 'authenticated', operations: [policy.operation] },
            allow: true
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          // Ignorer les erreurs du type "already exists"
          if (data.message && data.message.includes("already exists")) {
            console.log(`Politique ${policy.name} existe déjà`);
            continue;
          }
          
          console.warn(`Erreur lors de la création de la politique ${policy.name} via l'API REST:`, data);
        } else {
          console.log(`Politique ${policy.name} créée avec succès via l'API REST`);
        }
      } catch (policyError) {
        console.warn(`Exception lors de la création de la politique ${policy.name}:`, policyError);
        // Continuer avec les autres politiques même si une échoue
      }
    }
  } catch (error) {
    console.error("Exception lors de la création des politiques via l'API REST:", error);
  }
};

/**
 * Télécharge un fichier dans un bucket spécifié
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
      console.error(`Le bucket ${bucketName} n'a pas pu être créé/vérifié`);
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
    return urlData.publicUrl;
  } catch (error) {
    console.error("Exception lors de l'upload:", error);
    toast.error(`Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return null;
  }
};

/**
 * Liste les fichiers dans un bucket
 */
export const listFiles = async (bucketName: string, path: string = ''): Promise<any[]> => {
  try {
    // S'assurer que le bucket existe
    await ensureBucket(bucketName);
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path);
    
    if (error) {
      console.error("Erreur lors du listage des fichiers:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Exception lors du listage des fichiers:", error);
    return [];
  }
};

/**
 * Supprime un fichier d'un bucket
 */
export const deleteFile = async (bucketName: string, filePath: string): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      console.error("Erreur lors de la suppression:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Exception lors de la suppression:", error);
    return false;
  }
};

/**
 * Télécharge une image depuis une URL et l'enregistre dans un bucket
 */
export const downloadAndSaveImage = async (
  imageUrl: string,
  bucketName: string,
  customPath?: string
): Promise<string | null> => {
  try {
    console.log(`Téléchargement de l'image depuis ${imageUrl}`);
    
    // Télécharger l'image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`Erreur lors du téléchargement: ${response.status}`);
      return null;
    }
    
    // Récupérer le type MIME et le blob
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const blob = await response.blob();
    
    // Créer un fichier à partir du blob
    const filename = imageUrl.split('/').pop() || 'image.jpg';
    const file = new File([blob], filename, { type: contentType });
    
    // Uploader le fichier
    return await uploadFile(bucketName, file, customPath);
  } catch (error) {
    console.error("Exception lors du téléchargement et de l'enregistrement:", error);
    return null;
  }
};

export default {
  ensureBucket,
  uploadFile,
  listFiles,
  deleteFile,
  downloadAndSaveImage,
  checkStorageConnection
};
