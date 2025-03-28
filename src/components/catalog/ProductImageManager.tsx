
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage, listFiles, deleteFile } from "@/services/fileUploadService";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Check, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useExistingStorageBucket } from "@/hooks/useExistingStorageBucket";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductImageManagerProps {
  productId: string;
  onChange?: (images: any[]) => void;
  onSetMainImage?: (imageUrl: string) => void;
}

const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  productId,
  onChange,
  onSetMainImage
}) => {
  const [images, setImages] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const BUCKET_NAME = "product-images";

  const loadImages = useCallback(async () => {
    if (isLoadingImages) return;
    
    try {
      setIsLoadingImages(true);
      console.log(`Attempting to load images for product ${productId} from bucket ${BUCKET_NAME}`);
      
      // Check if product folder exists
      const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(productId, {
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (error) {
        console.error(`Error listing files in ${BUCKET_NAME}/${productId}:`, error);
        setImages([]);
        setIsLoadingImages(false);
        return;
      }
      
      if (!files || files.length === 0) {
        console.log(`No images found for product ${productId}`);
        setImages([]);
        setIsLoadingImages(false);
        return;
      }
      
      const imageFiles = files
        .filter(file => 
          !file.name.startsWith('.') && 
          file.name !== '.emptyFolderPlaceholder'
        )
        .map(file => {
          const timestamp = Date.now(); // Add timestamp to bust cache
          const { publicUrl } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(`${productId}/${file.name}`).data;
          
          return {
            name: file.name,
            url: `${publicUrl}?t=${timestamp}`,
            isMain: false
          };
        });
      
      console.log(`Loaded ${imageFiles.length} images for product ${productId}`);
      setImages(imageFiles);
      
      if (onChange) {
        onChange(imageFiles);
      }
    } catch (error) {
      console.error("Error loading images:", error);
      toast.error("Error loading images");
      setImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  }, [productId, onChange, isLoadingImages]);

  // Use the hook to check the existing bucket
  const { error, isLoading } = useExistingStorageBucket(BUCKET_NAME, loadImages);

  // Retry mechanism
  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    try {
      await loadImages();
      toast.success("Images reloaded successfully");
    } catch (err) {
      toast.error("Failed to reload images");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    let uploadedCount = 0;
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
          toast.error(`File ${file.name} is not an image`);
          continue;
        }
        
        console.log(`Uploading image ${file.name} to ${BUCKET_NAME}/${productId}`);
        const result = await uploadImage(file, BUCKET_NAME, productId);
        
        if (result) {
          uploadedCount++;
        }
      }
      
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} image(s) uploaded successfully`);
        await loadImages();
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Error uploading images");
    } finally {
      setIsUploading(false);
      
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleDelete = async (imageName: string) => {
    try {
      const filePath = `${productId}/${imageName}`;
      console.log(`Deleting file ${filePath} from bucket ${BUCKET_NAME}`);
      
      const success = await deleteFile(BUCKET_NAME, filePath);
      
      if (success) {
        toast.success("Image deleted successfully");
        await loadImages();
      } else {
        toast.error("Error deleting image");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Error deleting image");
    }
  };

  const handleSetMainImage = (imageUrl: string) => {
    if (onSetMainImage) {
      onSetMainImage(imageUrl);
      toast.success("Main image set successfully");
    }
  };

  if (error) {
    return (
      <div className="p-6 border border-red-300 bg-red-50 rounded-md">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="text-red-500 h-5 w-5" />
          <h3 className="font-medium">Storage access error</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {error}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRetry}
          className="mt-2"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-10">
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label htmlFor="image-upload" className="cursor-pointer">
          <div className="flex items-center gap-2 px-4 py-2 border rounded bg-background hover:bg-accent">
            <Upload className="w-4 h-4" />
            <span>Upload images</span>
          </div>
        </Label>
        <Input
          id="image-upload"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRetry}
          disabled={isUploading || isLoadingImages}
        >
          {isLoadingImages ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {isLoadingImages ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No images have been uploaded for this product.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card key={`${image.name}-${index}`} className="overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={image.url}
                  alt={`Product ${index + 1}`}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    console.error(`Failed to load image: ${image.url}`);
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 transition-opacity">
                  <div className="flex space-x-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleSetMainImage(image.url)}
                      title="Set as main image"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDelete(image.name)}
                      title="Delete image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageManager;
