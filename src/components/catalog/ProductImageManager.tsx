
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Star, StarOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadImage } from "@/utils/imageUtils";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

interface ProductImageManagerProps {
  product: Product;
  onImageUpdate?: (imageUrl: string) => void;
}

const ProductImageManager: React.FC<ProductImageManagerProps> = ({ 
  product, 
  onImageUpdate 
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  console.log("📸 ProductImageManager - Product data:", {
    id: product.id,
    image_url: product.image_url,
    image_urls: product.image_urls,
    imageUrls: product.imageUrls
  });

  // Initialize images from product data
  useEffect(() => {
    const initializeImages = () => {
      let initialImages: string[] = [];
      
      // Priority: image_urls > imageUrls > image_url
      if (product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
        initialImages = product.image_urls;
      } else if (product.imageUrls && Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
        initialImages = product.imageUrls;
      } else if (product.image_url) {
        initialImages = [product.image_url];
      }
      
      console.log("📸 Initializing images:", initialImages);
      setImages(initialImages);
      
      // Set primary image index based on image_url
      if (product.image_url && initialImages.length > 0) {
        const primaryIndex = initialImages.indexOf(product.image_url);
        setPrimaryImageIndex(primaryIndex >= 0 ? primaryIndex : 0);
      }
    };

    initializeImages();
  }, [product]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("📸 Starting image upload:", file.name);
    setIsUploading(true);

    try {
      // Corrected: Use the existing multi-tenant bucket "product-images"
      const imageUrl = await uploadImage(file, "product-images", `product-${product.id}`);
      
      if (imageUrl) {
        console.log("📸 Image uploaded successfully:", imageUrl);
        
        // Add the new image to the array
        const newImages = [...images, imageUrl];
        setImages(newImages);
        
        // Save to database immediately
        await saveImagesToDatabase(newImages, images[primaryImageIndex] || imageUrl);
        
        toast.success("Image ajoutée avec succès");
        
        // Notify parent component
        if (onImageUpdate) {
          onImageUpdate(imageUrl);
        }
      }
    } catch (error) {
      console.error("📸 Error uploading image:", error);
      toast.error("Erreur lors de l'upload de l'image");
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const saveImagesToDatabase = async (imageUrls: string[], primaryImageUrl: string) => {
    try {
      console.log("📸 Saving images to database:", {
        imageUrls,
        primaryImageUrl,
        productId: product.id
      });

      const { error } = await supabase
        .from('products')
        .update({
          image_urls: imageUrls,
          image_url: primaryImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) {
        console.error("📸 Error saving images to database:", error);
        throw error;
      }

      console.log("📸 Images saved successfully to database");
    } catch (error) {
      console.error("📸 Database save error:", error);
      toast.error("Erreur lors de la sauvegarde des images");
      throw error;
    }
  };

  const handleRemoveImage = async (indexToRemove: number) => {
    if (images.length <= 1) {
      toast.error("Vous devez conserver au moins une image");
      return;
    }

    console.log("📸 Removing image at index:", indexToRemove);
    
    const newImages = images.filter((_, index) => index !== indexToRemove);
    setImages(newImages);
    
    // Adjust primary image index if needed
    let newPrimaryIndex = primaryImageIndex;
    if (indexToRemove === primaryImageIndex) {
      newPrimaryIndex = 0; // Set first image as primary
    } else if (indexToRemove < primaryImageIndex) {
      newPrimaryIndex = primaryImageIndex - 1;
    }
    setPrimaryImageIndex(newPrimaryIndex);
    
    // Save to database
    try {
      await saveImagesToDatabase(newImages, newImages[newPrimaryIndex]);
      toast.success("Image supprimée avec succès");
      
      // Notify parent component
      if (onImageUpdate) {
        onImageUpdate(newImages[newPrimaryIndex]);
      }
    } catch (error) {
      console.error("📸 Error removing image:", error);
      // Revert changes on error
      setImages(images);
      setPrimaryImageIndex(primaryImageIndex);
    }
  };

  const handleSetPrimaryImage = async (index: number) => {
    console.log("📸 Setting primary image to index:", index);
    
    setPrimaryImageIndex(index);
    
    // Save to database
    try {
      await saveImagesToDatabase(images, images[index]);
      toast.success("Image principale définie");
      
      // Notify parent component
      if (onImageUpdate) {
        onImageUpdate(images[index]);
      }
    } catch (error) {
      console.error("📸 Error setting primary image:", error);
      // Revert changes on error
      setPrimaryImageIndex(primaryImageIndex);
    }
  };

  if (!product.id) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Vous devez d'abord créer le produit avant de pouvoir gérer ses images.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des images du produit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div>
          <Label htmlFor="image-upload">Ajouter une image</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Upload..." : "Choisir"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Formats acceptés: JPG, PNG, GIF, WebP (max 5MB)
          </p>
        </div>

        {/* Images Grid */}
        {images.length > 0 && (
          <div>
            <Label>Images du produit ({images.length})</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
              {images.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("📸 Image load error:", imageUrl);
                        e.currentTarget.src = "/placeholder-image.jpg";
                      }}
                    />
                  </div>
                  
                  {/* Primary image indicator */}
                  {index === primaryImageIndex && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                      Principal
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      size="sm"
                      variant={index === primaryImageIndex ? "default" : "outline"}
                      onClick={() => handleSetPrimaryImage(index)}
                      className="h-8 w-8 p-0"
                      title={index === primaryImageIndex ? "Image principale" : "Définir comme principale"}
                    >
                      {index === primaryImageIndex ? (
                        <Star className="h-3 w-3 fill-current" />
                      ) : (
                        <StarOff className="h-3 w-3" />
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveImage(index)}
                      className="h-8 w-8 p-0"
                      title="Supprimer l'image"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {images.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucune image pour ce produit</p>
            <p className="text-sm text-gray-400">Ajoutez des images pour améliorer la présentation</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductImageManager;
