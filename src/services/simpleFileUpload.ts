
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Service d'upload simplifié utilisant FormData
 */
export const simpleFileUpload = async (
  file: File,
  bucketName: string = "site-settings",
  folder: string = "logos"
): Promise<string | null> => {
  try {
    console.log(`=== SIMPLE FILE UPLOAD ===`);
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

    // Créer FormData
    const formData = new FormData();
    formData.append('file', file, fileName);

    console.log(`FormData créé avec le fichier`);

    // Upload avec FormData via l'API REST de Supabase
    const uploadUrl = `https://cifbetjefyfocafanlhv.supabase.co/storage/v1/object/${bucketName}/${filePath}`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NzgzODIsImV4cCI6MjA1NzQ1NDM4Mn0.B1-2XP0VVByxEq43KzoGml8W6z_XVtsh542BuiDm3Cw`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erreur HTTP ${response.status}:`, errorText);
      toast.error(`Erreur upload: ${response.status}`);
      return null;
    }

    console.log("Upload réussi via FormData");

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

/**
 * Méthode alternative avec Blob
 */
export const blobFileUpload = async (
  file: File,
  bucketName: string = "site-settings",
  folder: string = "logos"
): Promise<string | null> => {
  try {
    console.log(`=== BLOB FILE UPLOAD ===`);
    
    // Créer un Blob à partir du fichier
    const blob = new Blob([file], { type: file.type });
    
    // Créer un nom unique
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `logo-${timestamp}-${randomId}.${extension}`;
    const filePath = `${folder}/${fileName}`;

    console.log(`Upload blob vers: ${bucketName}/${filePath}`);

    // Upload du blob
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error("Erreur upload blob:", error);
      toast.error(`Erreur: ${error.message}`);
      return null;
    }

    console.log("Upload blob réussi:", data);

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    toast.success("Logo uploadé via Blob");
    return urlData.publicUrl;

  } catch (error) {
    console.error("Erreur blob upload:", error);
    toast.error("Erreur lors de l'upload Blob");
    return null;
  }
};
