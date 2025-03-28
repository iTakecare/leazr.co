
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Eye, Plus, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { checkBucketExists, ensureFolderExists } from "@/utils/storage";
import { uploadProductImage } from "@/services/imageService";
import { ensureStorageBucket } from "@/services/storageService";

interface ProductImage {
  id: string;
  name: string;
  url: string;
  isMain?: boolean;
}

interface ProductImageManagerProps {
  productId: string;
  initialImages?: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  onSetMainImage?: (imageUrl: string) => void;
}

const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  productId,
  initialImages = [],
  onChange,
  onSetMainImage
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBucketCreated, setIsBucketCreated] = useState(false);
  
  // Bucket name constant - using 'catalog' which should already exist
  const BUCKET_NAME = 'catalog';

  // First, ensure the bucket exists
  useEffect(() => {
    const createBucketIfNeeded = async () => {
      try {
        // Try to create/ensure the bucket exists
        const bucketCreated = await ensureStorageBucket(BUCKET_NAME);
        console.log(`Bucket ${BUCKET_NAME} creation result:`, bucketCreated);
        setIsBucketCreated(bucketCreated);
        
        if (!bucketCreated) {
          console.error(`Failed to create or ensure bucket: ${BUCKET_NAME}`);
          setLoadError(`Impossible de créer le bucket de stockage ${BUCKET_NAME}`);
        }
      } catch (error) {
        console.error("Error ensuring storage bucket:", error);
        setLoadError(`Erreur lors de la création du bucket: ${BUCKET_NAME}`);
      }
    };
    
    createBucketIfNeeded();
  }, []);

  // Initialize images
  useEffect(() => {
    if (!productId) return;
    
    const loadImages = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        // Check if initial images were provided
        if (initialImages && initialImages.length > 0) {
          console.log("Using provided images:", initialImages);
          setImages(initialImages);
          onChange(initialImages);
          setIsLoading(false);
          return;
        }
        
        // Check if bucket exists
        const bucketExists = await checkBucketExists(BUCKET_NAME);
        if (!bucketExists) {
          console.error(`Bucket ${BUCKET_NAME} does not exist`);
          
          // Try to create the bucket
          const bucketCreated = await ensureStorageBucket(BUCKET_NAME);
          if (!bucketCreated) {
            setLoadError(`Le bucket ${BUCKET_NAME} n'existe pas et n'a pas pu être créé`);
            setIsLoading(false);
            return;
          }
        }
        
        // Try to load images from storage first
        const folderPath = `products/${productId}`;
        
        // Ensure folder exists
        await ensureFolderExists(BUCKET_NAME, folderPath);
        
        // List files in the folder
        const { data: files, error: listError } = await supabase.storage
          .from(BUCKET_NAME)
          .list(folderPath);
        
        if (listError) {
          console.error("Error listing files:", listError);
          
          // If we can't list files, try to get image URLs from the product
          await loadImagesFromProduct();
          return;
        }
        
        if (!files || files.length === 0) {
          console.log("No files found in storage, trying product data");
          await loadImagesFromProduct();
          return;
        }
        
        // Process files from storage
        const imageFiles = files.filter(file => 
          !file.name.endsWith('/') && 
          file.name !== '.placeholder' &&
          file.name !== '.emptyFolderPlaceholder'
        );
        
        if (imageFiles.length === 0) {
          console.log("No valid image files found in storage, trying product data");
          await loadImagesFromProduct();
          return;
        }
        
        const storageImages: ProductImage[] = [];
        
        for (const file of imageFiles) {
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(`${folderPath}/${file.name}`);
          
          const isMain = file.name.startsWith('main') || file.name.toLowerCase().includes('main');
          
          storageImages.push({
            id: file.id || uuidv4(),
            name: file.name,
            url: urlData.publicUrl,
            isMain: isMain
          });
        }
        
        // Sort images to ensure main image is first
        storageImages.sort((a, b) => {
          if (a.isMain && !b.isMain) return -1;
          if (!a.isMain && b.isMain) return 1;
          return 0;
        });
        
        if (storageImages.length > 0) {
          console.log("Loaded images from storage:", storageImages);
          setImages(storageImages);
          onChange(storageImages);
          setIsLoading(false);
          return;
        }
        
        // If no images from storage, try product data
        await loadImagesFromProduct();
      } catch (error) {
        console.error("Error in loadImages:", error);
        setLoadError("Une erreur est survenue lors du chargement des images");
        setIsLoading(false);
      }
    };
    
    const loadImagesFromProduct = async () => {
      try {
        // Try to load images from the product
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('image_url, image_urls')
          .eq('id', productId)
          .single();
        
        if (productError) {
          console.error("Error fetching product:", productError);
          setLoadError("Impossible de charger les données du produit");
          setIsLoading(false);
          return;
        }
        
        // Prepare the list of images
        const productImages: ProductImage[] = [];
        
        // Add main image if exists
        if (product.image_url) {
          productImages.push({
            id: 'main',
            name: 'Image principale',
            url: product.image_url,
            isMain: true
          });
        }
        
        // Add additional images if exist
        if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
          product.image_urls.forEach((url: string, index: number) => {
            if (!url) return;
            
            productImages.push({
              id: `additional-${index}`,
              name: `Image ${index + 1}`,
              url: url
            });
          });
        }
        
        console.log("Loaded product images:", productImages);
        setImages(productImages);
        onChange(productImages);
      } catch (err) {
        console.error("Error loading product images:", err);
        setLoadError("Erreur lors du chargement des images du produit");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadImages();
  }, [productId, initialImages, onChange]);

  // Handle file change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !productId) return;
    
    setIsUploading(true);
    
    try {
      // First make sure the bucket exists
      if (!isBucketCreated) {
        const bucketCreated = await ensureStorageBucket(BUCKET_NAME);
        if (!bucketCreated) {
          toast.error(`Le bucket ${BUCKET_NAME} n'existe pas et n'a pas pu être créé`);
          setIsUploading(false);
          return;
        }
        setIsBucketCreated(true);
      }
      
      const newImages: ProductImage[] = [];
      const imageFiles = Array.from(files).slice(0, 5 - images.length);
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        
        if (!file.type.startsWith('image/')) {
          toast.error(`Le fichier ${file.name} n'est pas une image`);
          continue;
        }
        
        // Upload the image file
        const imageUrl = await uploadProductImage(file, productId, images.length === 0);
        
        if (imageUrl) {
          const newImage: ProductImage = {
            id: uuidv4(),
            name: file.name,
            url: imageUrl,
            isMain: images.length === 0
          };
          
          newImages.push(newImage);
          console.log(`Image uploaded: ${file.name} -> ${imageUrl}`);
        } else {
          toast.error(`Erreur lors de l'upload de ${file.name}`);
        }
      }
      
      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onChange(updatedImages);
        toast.success(`${newImages.length} image(s) uploadée(s) avec succès`);
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Une erreur est survenue lors de l'upload des images");
    } finally {
      setIsUploading(false);
      // Reset the input to allow selecting the same file again
      const input = document.getElementById("image-upload") as HTMLInputElement;
      if (input) input.value = "";
    }
  };

  // Set an image as main
  const handleSetMainImage = (image: ProductImage) => {
    if (!onSetMainImage) return;
    
    try {
      onSetMainImage(image.url);
      
      // Update local state
      setImages(images.map(img => ({
        ...img,
        isMain: img.id === image.id
      })));
      
      toast.success("Image principale définie avec succès");
    } catch (error) {
      console.error("Error setting main image:", error);
      toast.error("Erreur lors de la définition de l'image principale");
    }
  };

  // Preview an image
  const previewImage = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };

  // Add a timestamp to avoid caching issues
  const getTimestampedUrl = (url: string) => {
    if (!url || url === '/placeholder.svg') return url;
    
    try {
      const timestamp = new Date().getTime();
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}t=${timestamp}`;
    } catch (e) {
      return url;
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-md p-4">
        <Label htmlFor="image-upload" className="text-sm font-medium">Ajouter des images</Label>
        <div className="flex gap-2 mt-2">
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading || !isBucketCreated}
            multiple
            className="flex-1"
          />
          <Button disabled={isUploading || !isBucketCreated} className="min-w-20 relative">
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Upload...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                <span>Upload</span>
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Formats acceptés: PNG, JPG, WEBP. Maximum 5 images par produit.
        </p>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Images du produit ({images.length})</h3>
        
        {isLoading ? (
          <div className="text-center p-8 border border-dashed rounded-md">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Chargement des images...
            </p>
          </div>
        ) : loadError ? (
          <div className="text-center p-8 border border-dashed rounded-md">
            <div className="text-red-500 mb-2">
              <span className="font-medium">Erreur de chargement:</span> {loadError}
            </div>
            <p className="text-sm text-muted-foreground">
              Vous pouvez quand même ajouter de nouvelles images.
            </p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-md">
            <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Aucune image n'a encore été uploadée. Utilisez le formulaire ci-dessus pour ajouter des images.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              <Card 
                key={image.id} 
                className={`overflow-hidden ${image.isMain ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="relative bg-gray-100 h-40 flex items-center justify-center">
                  <img 
                    src={getTimestampedUrl(image.url)} 
                    alt={image.name}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      console.error("Error loading image:", image.url);
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                  {image.isMain && (
                    <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded text-xs">
                      Principale
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="truncate text-sm">{image.name}</div>
                    <div className="flex gap-1">
                      {onSetMainImage && !image.isMain && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSetMainImage(image)}
                          className="text-xs"
                        >
                          Définir comme principale
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={() => previewImage(image.url)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {images.length < 5 && (
              <div 
                className="border border-dashed rounded-md flex items-center justify-center cursor-pointer bg-muted/50 h-40" 
                onClick={() => document.getElementById("image-upload")?.click()}
              >
                <div className="text-center space-y-1">
                  <Plus className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Ajouter une image</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImageManager;
