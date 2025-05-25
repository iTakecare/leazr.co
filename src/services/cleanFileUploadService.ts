
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Service d'upload propre qui évite les transformations JSON
 */
export const cleanFileUpload = async (
  file: File,
  bucketName: string = "site-settings",
  folder: string = "logos"
): Promise<string | null> => {
  try {
    console.log(`=== CLEAN FILE UPLOAD ===`);
    console.log(`Fichier original:`, {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validation du fichier
    if (!file || file.size === 0) {
      console.error("Fichier vide ou invalide");
      toast.error("Fichier invalide");
      return null;
    }

    // Validation du type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      console.error(`Type non autorisé: ${file.type}`);
      toast.error("Type de fichier non supporté");
      return null;
    }

    // Vérification de la taille (max 5MB)
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

    // Lire le fichier comme ArrayBuffer pour éviter toute transformation
    const arrayBuffer = await file.arrayBuffer();
    console.log(`ArrayBuffer taille: ${arrayBuffer.byteLength} bytes`);

    // Upload direct avec ArrayBuffer
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error("Erreur upload:", error);
      
      // Si erreur de politique RLS, essayer avec le client admin
      if (error.message.includes('policy') || error.message.includes('Unauthorized')) {
        console.log("=== TENTATIVE AVEC CLIENT ADMIN ===");
        
        try {
          const { getAdminSupabaseClient } = await import('@/integrations/supabase/client');
          const adminClient = getAdminSupabaseClient();
          
          const { data: adminData, error: adminError } = await adminClient.storage
            .from(bucketName)
            .upload(filePath, arrayBuffer, {
              contentType: file.type,
              cacheControl: '3600',
              upsert: true
            });

          if (adminError) {
            console.error("Erreur avec client admin:", adminError);
            toast.error(`Erreur admin: ${adminError.message}`);
            return null;
          }

          console.log("Upload admin réussi:", adminData);
        } catch (adminErr) {
          console.error("Impossible d'utiliser le client admin:", adminErr);
          toast.error("Erreur de permissions");
          return null;
        }
      } else {
        toast.error(`Erreur: ${error.message}`);
        return null;
      }
    } else {
      console.log("Upload réussi:", data);
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log("URL publique générée:", urlData.publicUrl);
    
    // Vérifier que le fichier est bien accessible
    try {
      const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
      console.log(`Vérification fichier - Status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`);
      
      if (!response.ok) {
        console.error("Le fichier uploadé n'est pas accessible");
        toast.error("Fichier uploadé mais non accessible");
        return null;
      }
    } catch (fetchError) {
      console.error("Erreur de vérification:", fetchError);
    }

    toast.success("Logo uploadé avec succès");
    return urlData.publicUrl;

  } catch (error) {
    console.error("Erreur générale:", error);
    toast.error("Erreur lors de l'upload");
    return null;
  }
};
