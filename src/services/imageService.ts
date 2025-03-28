/**
 * Service pour gérer le téléchargement et la manipulation d'images
 */

export const uploadProductImage = async (file: File, productId: string, isMainImage = false) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Vérifier d'abord si le bucket existe
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Erreur lors de la vérification des buckets:', bucketError);
      throw new Error('Erreur lors de la vérification des buckets');
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === 'product-images');
    
    if (!bucketExists) {
      console.log('Le bucket product-images n\'existe pas, création en cours...');
      const { error: createError } = await supabase.storage.createBucket('product-images', {
        public: true
      });
      
      if (createError) {
        console.error('Erreur lors de la création du bucket:', createError);
        throw new Error('Impossible de créer le bucket pour les images');
      }
      console.log('Bucket product-images créé avec succès');
    }
    
    // Créer la structure de dossier basée sur l'ID du produit
    const productFolder = `${productId}`;
    
    // Get file extension
    const fileExt = file.name.split('.').pop();
    const fileName = `${isMainImage ? 'main' : Date.now().toString()}.${fileExt}`;
    const filePath = `${productFolder}/${fileName}`;
    
    console.log(`Téléchargement de l'image vers: ${filePath} dans le bucket product-images`);
    
    // Vérifier si le fichier existe déjà
    const { data: existingFiles } = await supabase.storage
      .from('product-images')
      .list(productFolder);
    
    // Si c'est l'image principale et qu'elle existe déjà, la supprimer
    if (isMainImage && existingFiles && existingFiles.some(f => f.name.startsWith('main.'))) {
      const mainFile = existingFiles.find(f => f.name.startsWith('main.'));
      if (mainFile) {
        console.log(`Suppression de l'ancienne image principale: ${productFolder}/${mainFile.name}`);
        await supabase.storage
          .from('product-images')
          .remove([`${productFolder}/${mainFile.name}`]);
      }
    }
    
    // Uploader le fichier
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) {
      console.error('Erreur lors du téléchargement de l\'image:', uploadError);
      throw new Error(uploadError.message);
    }
    
    // Get public URL
    const { data: publicURL } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    console.log(`Image téléchargée avec succès: ${publicURL.publicUrl}`);
    
    // Update product with image URL
    if (isMainImage) {
      await supabase.from('products').update({
        image_url: publicURL.publicUrl
      }).eq('id', productId);
      console.log(`Image principale mise à jour pour le produit ${productId}`);
    } else {
      // Get current image_urls array
      const { data: product } = await supabase.from('products')
        .select('image_urls')
        .eq('id', productId)
        .single();
      
      let imageUrls = product?.image_urls || [];
      if (!Array.isArray(imageUrls)) {
        imageUrls = [];
      }
      
      // Add new URL and update
      await supabase.from('products').update({
        image_urls: [...imageUrls, publicURL.publicUrl]
      }).eq('id', productId);
      console.log(`Image secondaire ajoutée pour le produit ${productId}`);
    }
    
    return publicURL.publicUrl;
  } catch (error) {
    console.error('Erreur dans uploadProductImage:', error);
    throw error;
  }
};

export const uploadImage = async (
  file: File | string,
  bucket: string,
  folder: string = '',
  upsert: boolean = true
): Promise<{ url: string }> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Si file est une chaîne, c'est déjà une URL ou un chemin de fichier
    if (typeof file === 'string') {
      if (file.startsWith('http')) {
        return { url: file }; // C'est déjà une URL, on la retourne simplement
      }
      // Sinon, on pourrait implémenter un téléchargement depuis le chemin, mais pas nécessaire pour l'instant
      throw new Error('Le téléchargement depuis un chemin de fichier n\'est pas supporté');
    }
    
    // C'est un objet File, on procède normalement
    // Get file extension
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert: upsert
      });
    
    if (uploadError) {
      console.error('Erreur lors du téléchargement de l\'image:', uploadError);
      throw new Error(uploadError.message);
    }
    
    // Get public URL
    const { data: publicURL } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return { url: publicURL.publicUrl };
  } catch (error) {
    console.error('Erreur dans uploadImage:', error);
    throw error;
  }
};

export const detectFileExtension = (file: File | string): string => {
  if (typeof file === 'string') {
    // Si file est une chaîne (filename)
    const parts = file.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  } else {
    // Si file est un File object
    const parts = file.name.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  }
};

export const detectMimeTypeFromSignature = async (file: File): Promise<string> => {
  // Simple mime type detection based on file extension
  const ext = detectFileExtension(file);
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  
  return mimeTypes[ext] || file.type || 'application/octet-stream';
};
