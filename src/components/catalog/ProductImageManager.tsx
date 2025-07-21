import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductImageManagerProps {
  productId: string;
  initialImages?: string[];
  mainImageUrl?: string;
  onImageUpdate: (mainImageUrl: string, allImageUrls: string[]) => void;
}

interface UploadingImage {
  file: File;
  preview: string;
  progress: number;
  error?: string;
}

const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  productId,
  initialImages = [],
  mainImageUrl,
  onImageUpdate
}) => {
  const [images, setImages] = useState<string[]>(initialImages);
  const [mainImage, setMainImage] = useState<string>(mainImageUrl || initialImages[0] || '');
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);

  const uploadToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const updateProductImages = async (newImages: string[], newMainImage: string) => {
    const { error } = await supabase
      .from('products')
      .update({
        image_url: newMainImage,
        image_urls: newImages
      })
      .eq('id', productId);

    if (error) throw error;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploadingImages: UploadingImage[] = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0
    }));

    setUploadingImages(prev => [...prev, ...newUploadingImages]);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      try {
        // Update progress
        setUploadingImages(prev => 
          prev.map(img => 
            img.file === file ? { ...img, progress: 50 } : img
          )
        );

        const url = await uploadToSupabase(file);
        
        // Update progress to complete
        setUploadingImages(prev => 
          prev.map(img => 
            img.file === file ? { ...img, progress: 100 } : img
          )
        );

        // Add to images list
        const newImages = [...images, url];
        const newMainImage = mainImage || url; // Set as main if no main image exists
        
        setImages(newImages);
        
        if (!mainImage) {
          setMainImage(newMainImage);
        }

        // Update database
        await updateProductImages(newImages, newMainImage);
        
        // Notify parent component
        onImageUpdate(newMainImage, newImages);

        // Remove from uploading list
        setUploadingImages(prev => prev.filter(img => img.file !== file));
        
        toast.success(`Image ${file.name} uploadée avec succès`);
      } catch (error) {
        console.error('Error uploading image:', error);
        setUploadingImages(prev => 
          prev.map(img => 
            img.file === file 
              ? { ...img, error: 'Erreur lors de l\'upload', progress: 0 } 
              : img
          )
        );
        toast.error(`Erreur lors de l'upload de ${file.name}`);
      }
    }
  }, [images, mainImage, productId, onImageUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: true
  });

  const handleSetMainImage = async (imageUrl: string) => {
    try {
      setMainImage(imageUrl);
      await updateProductImages(images, imageUrl);
      onImageUpdate(imageUrl, images);
      toast.success('Image principale mise à jour');
    } catch (error) {
      console.error('Error setting main image:', error);
      toast.error('Erreur lors de la mise à jour de l\'image principale');
    }
  };

  const handleDeleteImage = async (imageToDelete: string) => {
    try {
      const newImages = images.filter(img => img !== imageToDelete);
      let newMainImage = mainImage;
      
      // If we're deleting the main image, set a new main image
      if (imageToDelete === mainImage) {
        newMainImage = newImages[0] || '';
        setMainImage(newMainImage);
      }
      
      setImages(newImages);
      await updateProductImages(newImages, newMainImage);
      onImageUpdate(newMainImage, newImages);
      
      toast.success('Image supprimée avec succès');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const retryUpload = (uploadingImage: UploadingImage) => {
    setUploadingImages(prev => 
      prev.map(img => 
        img === uploadingImage 
          ? { ...img, error: undefined, progress: 0 }
          : img
      )
    );
    onDrop([uploadingImage.file]);
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card className="p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-primary hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            {isDragActive ? 'Déposez les images ici' : 'Glissez-déposez vos images ici'}
          </p>
          <p className="text-sm text-gray-500">
            ou cliquez pour sélectionner plusieurs fichiers (JPEG, PNG, WebP)
          </p>
        </div>
      </Card>

      {/* Uploading Images */}
      {uploadingImages.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Images en cours d'upload</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadingImages.map((uploadingImage, index) => (
              <Card key={index} className="p-2">
                <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-2">
                  <img
                    src={uploadingImage.preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {uploadingImage.progress > 0 && uploadingImage.progress < 100 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-sm font-medium">
                        {uploadingImage.progress}%
                      </div>
                    </div>
                  )}
                </div>
                {uploadingImage.error && (
                  <div className="space-y-2">
                    <p className="text-xs text-red-600">{uploadingImage.error}</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => retryUpload(uploadingImage)}
                      className="w-full"
                    >
                      Réessayer
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Existing Images */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Images du produit ({images.length})</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Star className="h-4 w-4" />
              Image principale
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((imageUrl, index) => (
              <Card key={index} className="p-2 relative group">
                <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-2">
                  <img
                    src={imageUrl}
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Main image indicator */}
                  {imageUrl === mainImage && (
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Principale
                    </Badge>
                  )}
                  
                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {imageUrl !== mainImage && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSetMainImage(imageUrl)}
                        className="text-xs"
                      >
                        <StarOff className="h-3 w-3 mr-1" />
                        Principale
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteImage(imageUrl)}
                      className="text-xs"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  Image {index + 1}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && uploadingImages.length === 0 && (
        <div className="text-center py-8">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Aucune image ajoutée pour ce produit</p>
        </div>
      )}
    </div>
  );
};

export default ProductImageManager;
