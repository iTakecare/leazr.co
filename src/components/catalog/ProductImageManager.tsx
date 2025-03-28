
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage, listFiles, deleteFile } from "@/services/fileUploadService";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Check, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStorageBucket } from "@/services/storageService";
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
  const [bucketError, setBucketError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const bucketInitializedRef = useRef(false);

  // Fonction pour initialiser le bucket une seule fois
  const initializeBucket = useCallback(async () => {
    if (bucketInitializedRef.current) return true;
    
    try {
      console.log("Initializing bucket: product-images");
      const success = await ensureStorageBucket("product-images");
      
      if (success) {
        console.log("Bucket initialized successfully");
        bucketInitializedRef.current = true;
        setBucketError(null);
        return true;
      } else {
        console.error("Failed to initialize bucket");
        setBucketError("Impossible d'accéder au stockage d'images. Veuillez réessayer.");
        return false;
      }
    } catch (error) {
      console.error("Error initializing bucket:", error);
      setBucketError("Erreur lors de l'initialisation du stockage d'images");
      return false;
    }
  }, []);

  const loadImages = useCallback(async () => {
    // Prévenir les appels en boucle
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    try {
      setIsLoadingImages(true);
      console.log(`Attempting to load images for product ${productId} from bucket product-images`);
      
      // Vérifier que le bucket existe
      const bucketReady = await initializeBucket();
      if (!bucketReady) {
        setIsLoadingImages(false);
        loadingRef.current = false;
        return;
      }
      
      // Vérifier si le dossier du produit existe
      const { data: files, error } = await supabase.storage
        .from("product-images")
        .list(productId, {
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (error) {
        console.log(`Error or no folder found for product ${productId}: ${error.message}`);
        
        // Si le dossier n'existe pas, c'est normal pour un nouveau produit
        if (error.message.includes("not found")) {
          console.log(`No folder found for product ${productId}, this is normal for new products`);
          setImages([]);
        } else {
          setBucketError(`Erreur lors du chargement des images: ${error.message}`);
        }
        
        setIsLoadingImages(false);
        loadingRef.current = false;
        return;
      }
      
      if (!files || files.length === 0) {
        console.log(`No images found for product ${productId}`);
        setImages([]);
        setIsLoadingImages(false);
        loadingRef.current = false;
        
        if (onChange) {
          onChange([]);
        }
        
        return;
      }
      
      // Filtrer pour ne garder que les vrais fichiers
      const imageFiles = files
        .filter(file => 
          !file.name.startsWith('.') && 
          file.name !== '.emptyFolderPlaceholder'
        )
        .map(file => {
          const timestamp = Date.now(); // Ajouter un timestamp pour éviter le cache
          const { publicUrl } = supabase.storage
            .from("product-images")
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
      setBucketError("Erreur lors du chargement des images");
      setImages([]);
    } finally {
      setIsLoadingImages(false);
      loadingRef.current = false;
    }
  }, [productId, onChange, initializeBucket]);

  // Effet pour charger les images au montage ou quand l'ID du produit change
  useEffect(() => {
    // Reset l'état lors du changement de produit
    setImages([]);
    setBucketError(null);
    bucketInitializedRef.current = false;
    
    // Initialiser le bucket puis charger les images
    const initialize = async () => {
      await initializeBucket();
      await loadImages();
    };
    
    initialize();
    
    // Nettoyage lors du démontage
    return () => {
      loadingRef.current = false;
      bucketInitializedRef.current = false;
    };
  }, [productId, initializeBucket, loadImages, retryCount]);

  // Mécanisme de réessai
  const handleRetry = async () => {
    setBucketError(null);
    bucketInitializedRef.current = false;
    setRetryCount(prev => prev + 1);
    toast.info("Tentative de rechargement des images...");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    let uploadedCount = 0;
    
    try {
      // S'assurer que le bucket existe
      const bucketReady = await initializeBucket();
      if (!bucketReady) {
        toast.error("Impossible d'accéder au stockage d'images");
        setIsUploading(false);
        return;
      }
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
          toast.error(`Le fichier ${file.name} n'est pas une image`);
          continue;
        }
        
        console.log(`Uploading image ${file.name} to product-images/${productId}`);
        const result = await uploadImage(file, "product-images", productId);
        
        if (result) {
          uploadedCount++;
        }
      }
      
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} image(s) téléchargée(s) avec succès`);
        await loadImages();
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Erreur lors du téléchargement des images");
    } finally {
      setIsUploading(false);
      
      // Réinitialiser le champ de saisie
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleDelete = async (imageName: string) => {
    try {
      const filePath = `${productId}/${imageName}`;
      console.log(`Deleting file ${filePath} from bucket product-images`);
      
      // S'assurer que le bucket existe
      const bucketReady = await initializeBucket();
      if (!bucketReady) {
        toast.error("Impossible d'accéder au stockage d'images");
        return;
      }
      
      const success = await deleteFile("product-images", filePath);
      
      if (success) {
        toast.success("Image supprimée avec succès");
        await loadImages();
      } else {
        toast.error("Erreur lors de la suppression de l'image");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Erreur lors de la suppression de l'image");
    }
  };

  const handleSetMainImage = (imageUrl: string) => {
    if (onSetMainImage) {
      onSetMainImage(imageUrl);
      toast.success("Image principale définie avec succès");
    }
  };

  if (bucketError) {
    return (
      <div className="p-6 border border-red-300 bg-red-50 rounded-md">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="text-red-500 h-5 w-5" />
          <h3 className="font-medium">Erreur d'accès au stockage</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {bucketError}
        </p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={initializeBucket}
          >
            Créer l'espace de stockage
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingImages && images.length === 0) {
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
            <span>Télécharger des images</span>
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
        {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
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
          Actualiser
        </Button>
      </div>

      {isLoadingImages && images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card key={`${image.name}-${index}-loading`} className="overflow-hidden relative">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      ) : images.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucune image n'a été téléchargée pour ce produit.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card key={`${image.name}-${index}`} className="overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={`${image.url}&r=${retryCount}`}
                  alt={`Produit ${index + 1}`}
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
                      title="Définir comme image principale"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDelete(image.name)}
                      title="Supprimer l'image"
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
