
import { toast } from "sonner";
import { uploadImage as uploadImageToStorage } from "@/services/fileUploadService";

/**
 * Wrapper for uploading images that provides toast notifications
 */
export const uploadImage = async (
  file: File,
  bucketName: string = "blog-images",
  folderPath: string = ""
): Promise<string | null> => {
  try {
    toast.loading('Téléchargement de l\'image...');
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Seules les images sont acceptées');
      return null;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image est trop volumineuse (max 5MB)');
      return null;
    }
    
    // Upload image using the file upload service
    const imageUrl = await uploadImageToStorage(file, bucketName, folderPath);
    
    if (imageUrl) {
      toast.dismiss();
      toast.success('Image téléchargée avec succès');
      return imageUrl;
    } else {
      toast.error('Échec du téléchargement de l\'image');
      return null;
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    toast.dismiss();
    toast.error('Erreur lors du téléchargement de l\'image');
    return null;
  }
};
