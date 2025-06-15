
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Service d'upload de fichiers complètement isolé pour éviter les problèmes de permissions
 */
export const cleanFileUpload = async (
  file: File,
  bucketName: string = "site-settings",
  folder: string = "logos"
): Promise<string | null> => {
  try {
    console.log(`=== CLEAN FILE UPLOAD ===`);
    console.log(`Fichier:`, {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validation basique
    if (!file || file.size === 0) {
      console.error("Fichier invalide");
      toast.error("Fichier invalide");
      return null;
    }

    // Types autorisés
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      console.error(`Type non autorisé: ${file.type}`);
      toast.error("Type de fichier non supporté");
      return null;
    }

    // Taille maximum (5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error(`Fichier trop volumineux: ${file.size} bytes`);
      toast.error("Fichier trop volumineux (max 5MB)");
      return null;
    }

    // Créer un nom unique
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `logo-${timestamp}-${randomId}.${extension}`;
    const filePath = `${folder}/${fileName}`;

    console.log(`Upload vers: ${bucketName}/${filePath}`);

    // Upload direct sans vérification d'authentification
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error("Erreur upload:", error);
      toast.error(`Erreur: ${error.message}`);
      return null;
    }

    console.log("Upload réussi:", data);

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log("URL publique générée:", urlData.publicUrl);
    toast.success("Logo uploadé avec succès");
    
    return urlData.publicUrl;

  } catch (error) {
    console.error("Erreur générale:", error);
    toast.error("Erreur lors de l'upload");
    return null;
  }
};
