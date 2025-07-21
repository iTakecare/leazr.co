
import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Upload, 
  X, 
  Star, 
  StarOff, 
  Loader2, 
  RotateCcw,
  AlertCircle 
} from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/utils/imageUtils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct } from "@/services/catalogService";
import { Product } from "@/types/catalog";

interface ProductImage {
  id: string;
  url: string;
  isMain: boolean;
  file?: File;
  isUploading?: boolean;
  uploadError?: string;
}

interface ProductImageManagerProps {
  product?: Product;
  onImageUpdate?: (imageUrl: string) => void;
}

const ProductImageManager: React.FC<ProductImageManagerProps> = ({ 
  product, 
  onImageUpdate 
}) => {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  // Initialize images from product
  useEffect(() => {
    if (product?.image_url) {
      setImages([{
        id: 'main',
        url: product.image_url,
        isMain: true
      }]);
    } else {
      setImages([]);
    }
  }, [product?.image_url]);

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (product?.id) {
        queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      }
      toast.success("Image principale mise à jour");
    },
    onError: (error) => {
      console.error("Error updating product image:", error);
      toast.error("Erreur lors de la mise à jour de l'image");
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log("📸 ProductImageManager - Files dropped:", acceptedFiles.length);

    if (!product?.id) {
      toast.error("Impossible d'uploader - ID produit manquant");
      return;
    }

    setIsUploading(true);

    const newImages: ProductImage[] = acceptedFiles.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      isMain: images.length === 0 && index === 0, // First image is main if no existing images
      file,
      isUploading: true
    }));

    setImages(prev => [...prev, ...newImages]);

    // Upload each file
    for (const imageData of newImages) {
      if (!imageData.file) continue;

      try {
        console.log(`📸 Uploading image: ${imageData.file.name}`);
        
        const uploadedUrl = await uploadImage(
          imageData.file,
          "product-images",
          `products/${product.id}/`
        );

        if (uploadedUrl) {
          console.log(`✅ Image uploaded successfully: ${uploadedUrl}`);
          
          setImages(prev => prev.map(img => 
            img.id === imageData.id 
              ? { ...img, url: uploadedUrl, isUploading: false, file: undefined }
              : img
          ));

          // If this is the main image, update the product
          if (imageData.isMain) {
            updateProductMutation.mutate({
              id: product.id,
              data: { image_url: uploadedUrl }
            });
            onImageUpdate?.(uploadedUrl);
          }

          toast.success(`Image ${imageData.file.name} uploadée avec succès`);
        } else {
          throw new Error("URL d'upload vide");
        }
      } catch (error) {
        console.error(`❌ Error uploading image ${imageData.file?.name}:`, error);
        
        setImages(prev => prev.map(img => 
          img.id === imageData.id 
            ? { ...img, isUploading: false, uploadError: "Erreur d'upload" }
            : img
        ));

        toast.error(`Erreur lors de l'upload de ${imageData.file?.name}`);
      }
    }

    setIsUploading(false);
  }, [product?.id, images.length, updateProductMutation, onImageUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.svg']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: true
  });

  const setAsMainImage = (imageId: string) => {
    if (!product?.id) return;

    const image = images.find(img => img.id === imageId);
    if (!image || image.isUploading) return;

    // Update local state
    setImages(prev => prev.map(img => ({
      ...img,
      isMain: img.id === imageId
    })));

    // Update product in database
    updateProductMutation.mutate({
      id: product.id,
      data: { image_url: image.url }
    });

    onImageUpdate?.(image.url);
  };

  const removeImage = (imageId: string) => {
    setImages(prev => {
      const filteredImages = prev.filter(img => img.id !== imageId);
      
      // If we removed the main image and there are other images, make the first one main
      if (prev.find(img => img.id === imageId)?.isMain && filteredImages.length > 0) {
        filteredImages[0].isMain = true;
        
        if (product?.id) {
          updateProductMutation.mutate({
            id: product.id,
            data: { image_url: filteredImages[0].url }
          });
          onImageUpdate?.(filteredImages[0].url);
        }
      }
      
      return filteredImages;
    });
  };

  const retryUpload = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image?.file || !product?.id) return;

    setImages(prev => prev.map(img => 
      img.id === imageId 
        ? { ...img, isUploading: true, uploadError: undefined }
        : img
    ));

    try {
      const uploadedUrl = await uploadImage(
        image.file,
        "product-images",
        `products/${product.id}/`
      );

      if (uploadedUrl) {
        setImages(prev => prev.map(img => 
          img.id === imageId 
            ? { ...img, url: uploadedUrl, isUploading: false, file: undefined }
            : img
        ));

        if (image.isMain) {
          updateProductMutation.mutate({
            id: product.id,
            data: { image_url: uploadedUrl }
          });
          onImageUpdate?.(uploadedUrl);
        }

        toast.success("Image uploadée avec succès");
      }
    } catch (error) {
      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { ...img, isUploading: false, uploadError: "Erreur d'upload" }
          : img
      ));
      toast.error("Erreur lors de l'upload");
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Images */}
      {images.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Images du produit</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="relative group">
                <CardContent className="p-2">
                  <div className="relative aspect-square">
                    <img
                      src={image.url}
                      alt="Product"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    
                    {/* Loading overlay */}
                    {image.isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      </div>
                    )}

                    {/* Error overlay */}
                    {image.uploadError && (
                      <div className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center rounded-lg text-white text-sm">
                        <AlertCircle className="h-6 w-6 mb-1" />
                        <span>{image.uploadError}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 text-xs"
                          onClick={() => retryUpload(image.id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Réessayer
                        </Button>
                      </div>
                    )}

                    {/* Actions overlay */}
                    {!image.isUploading && !image.uploadError && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-lg">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                          <Button
                            size="sm"
                            variant={image.isMain ? "default" : "outline"}
                            className="h-8 w-8 p-0"
                            onClick={() => setAsMainImage(image.id)}
                            title={image.isMain ? "Image principale" : "Définir comme image principale"}
                          >
                            {image.isMain ? (
                              <Star className="h-4 w-4 fill-current" />
                            ) : (
                              <StarOff className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0"
                            onClick={() => removeImage(image.id)}
                            title="Supprimer l'image"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Main image badge */}
                    {image.isMain && !image.isUploading && (
                      <div className="absolute bottom-2 left-2">
                        <div className="bg-primary text-primary-foreground px-2 py-1 text-xs rounded-md flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Principale
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {isDragActive ? "Déposez vos images ici" : "Ajouter des images"}
        </h3>
        <p className="text-muted-foreground mb-4">
          Glissez-déposez vos images ici ou cliquez pour parcourir.
        </p>
        <p className="text-sm text-muted-foreground">
          Formats acceptés: JPG, PNG, WebP, SVG (max 5MB par image)
        </p>
      </div>

      {/* Loading state */}
      {isUploading && (
        <div className="text-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Upload en cours...</p>
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>💡 Conseil :</strong> La première image uploadée devient automatiquement 
          l'image principale. Vous pouvez changer l'image principale en cliquant sur l'étoile.
        </p>
      </div>
    </div>
  );
};

export default ProductImageManager;
