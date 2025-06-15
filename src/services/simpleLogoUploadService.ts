
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Service d'upload ultra-simple pour les logos - pas de vérification d'auth
 */
export const simpleLogoUpload = async (file: File): Promise<string | null> => {
  try {
    console.log("=== SIMPLE LOGO UPLOAD ===", {
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
    const filePath = `logos/${fileName}`;

    console.log(`Upload vers: site-settings/${filePath}`);

    // Upload direct vers le bucket site-settings avec des politiques publiques
    const { data, error } = await supabase.storage
      .from('site-settings')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error("Erreur upload storage:", error);
      
      // Si le bucket n'existe pas, essayer de le créer
      if (error.message.includes('Bucket not found')) {
        console.log("Tentative de création du bucket...");
        
        // Essayer l'upload vers un bucket alternatif ou créer le bucket
        const { data: buckets } = await supabase.storage.listBuckets();
        console.log("Buckets disponibles:", buckets);
        
        toast.error("Le stockage n'est pas configuré. Contactez l'administrateur.");
        return null;
      }
      
      toast.error(`Erreur d'upload: ${error.message}`);
      return null;
    }

    console.log("Upload réussi:", data);

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from('site-settings')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log("URL publique générée:", publicUrl);
    
    return publicUrl;

  } catch (error) {
    console.error("Erreur générale upload:", error);
    toast.error("Erreur lors de l'upload");
    return null;
  }
};
