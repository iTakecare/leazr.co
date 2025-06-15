
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Check, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadFileMultiTenant, listCompanyFiles, deleteFileMultiTenant } from "@/services/multiTenantStorageService";
import { useMultiTenant } from "@/hooks/useMultiTenant";

interface ProductImageManagerProps {
  productId: string;
  onChange?: (images: any[]) => void;
  onSetMainImage?: (imageUrl: string) => void;
  currentMainImage?: string;
}

const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  productId,
  onChange,
  onSetMainImage,
  currentMainImage
}) => {
  const [images, setImages] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const loadingRef = useRef(false);
  const { companyId, loading: multiTenantLoading } = useMultiTenant();
  
  const getUniqueImageUrl = (url: string, index: number): string => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}&rc=${retryCount}&idx=${index}`;
  };
  
  const loadImages = useCallback(async () => {
    if (loadingRef.current || !companyId) return;
    
    loadingRef.current = true;
    setIsLoadingImages(true);
    setErrorMessage(null);
    
    try {
      console.log(`Chargement des images pour le produit ${productId} de l'entreprise ${companyId}`);
      
      // Utiliser le service multi-tenant pour lister les fichiers
      const files = await listCompanyFiles("product-images", companyId);
      
      // Filtrer les fichiers du produit spécifique
      const productFiles = files.filter(file => 
        file.name.includes(productId) && 
        (file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i))
      );
      
      const imageFiles = productFiles.map((file, index) => {
        const isMain = currentMainImage && file.url === currentMainImage;
        return {
          name: file.name,
          url: getUniqueImageUrl(file.url, index),
          originalUrl: file.url,
          isMain: isMain
        };
      });
      
      console.log(`Chargé ${imageFiles.length} images pour le produit ${productId}`);
      setImages(imageFiles);
      
      if (onChange) {
        onChange(imageFiles);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des images:", error);
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      setErrorMessage(`Erreur lors du chargement des images: ${errorMsg}`);
      setImages([]);
    } finally {
      setIsLoadingImages(false);
      loadingRef.current = false;
    }
  }, [productId, onChange, retryCount, currentMainImage, companyId]);
  
  useEffect(() => {
    if (!multiTenantLoading && companyId) {
      loadImages();
    }
  }, [loadImages, multiTenantLoading, companyId]);
  
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    toast.info("Rafraîchissement des images...");
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !companyId) return;
    
    setIsUploading(true);
    let uploadedCount = 0;
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validation plus stricte des fichiers images
        const isValidImage = file.type.startsWith('image/') || 
                           file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
        
        if (!isValidImage) {
          toast.error(`Le fichier ${file.name} n'est pas une image valide`);
          continue;
        }
        
        // Vérifier la taille du fichier (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`Le fichier ${file.name} est trop volumineux (max 50MB)`);
          continue;
        }
        
        // Créer un nom de fichier unique avec l'ID du produit
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `product-${productId}-${timestamp}-${i}-${randomSuffix}.${extension}`;
        
        console.log(`Upload du fichier: ${fileName}`);
        
        const imageUrl = await uploadFileMultiTenant(
          file,
          "product-images",
          fileName,
          companyId
        );
        
        if (imageUrl) {
          uploadedCount++;
          console.log(`Fichier uploadé avec succès: ${imageUrl}`);
        }
      }
      
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} image(s) téléchargée(s) avec succès`);
        // Recharger les images après l'upload
        await loadImages();
      }
    } catch (error) {
      console.error("Erreur lors de l'upload des images:", error);
      toast.error("Erreur lors de l'upload des images");
    } finally {
      setIsUploading(false);
      
      if (e.target) {
        e.target.value = '';
      }
    }
  };
  
  const handleDelete = async (imageName: string) => {
    if (!companyId) return;
    
    try {
      console.log(`Suppression de l'image: ${imageName}`);
      
      const success = await deleteFileMultiTenant("product-images", imageName, companyId);
      
      if (success) {
        // Recharger les images après la suppression
        await loadImages();
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image:", error);
      toast.error("Erreur lors de la suppression de l'image");
    }
  };
  
  const handleSetMainImage = (imageInfo: any) => {
    const originalUrl = imageInfo.originalUrl || imageInfo.url;
    if (onSetMainImage) {
      try {
        onSetMainImage(originalUrl);
        console.log(`Image principale définie: ${originalUrl}`);
      } catch (error) {
        console.error("Erreur lors de la définition de l'image principale:", error);
        toast.error("Erreur lors de la définition de l'image principale");
      }
    }
  };
  
  if (multiTenantLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Chargement des informations multi-tenant...</span>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-red-500 h-5 w-5" />
          <p className="text-red-700">Impossible de déterminer l'entreprise. Multi-tenant requis.</p>
        </div>
      </div>
    );
  }
  
  if (errorMessage) {
    return (
      <div className="p-6 border border-red-300 bg-red-50 rounded-md">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="text-red-500 h-5 w-5" />
          <h3 className="font-medium">Erreur d'accès au stockage</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {errorMessage}
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
            onClick={() => {
              const url = `https://supabase.com/dashboard/project/cifbetjefyfocafanlhv/storage/buckets`;
              window.open(url, '_blank');
            }}
          >
            Vérifier les buckets de stockage
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
      <div className="text-xs text-muted-foreground mb-2">
        Entreprise: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{companyId}</span>
      </div>
      
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
          disabled={isUploading || !companyId}
        />
        {isUploading && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Upload en cours...</span>
          </div>
        )}
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
          <p className="text-sm text-muted-foreground mt-2">
            Utilisez le bouton "Télécharger des images" ci-dessus pour ajouter des images.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card key={`${image.name}-${index}`} className={`overflow-hidden ${image.isMain ? 'border-primary' : ''}`}>
              <div className="relative aspect-square">
                <div className="w-full h-full flex items-center justify-center bg-gray-50 p-2">
                  <img
                    src={getUniqueImageUrl(image.url, index)}
                    alt={`Produit ${index + 1}`}
                    className="object-contain max-h-full max-w-full"
                    loading="lazy"
                    onError={(e) => {
                      console.error(`Erreur de chargement de l'image: ${image.url}`);
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                  {image.isMain && (
                    <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                      Image principale
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 transition-opacity">
                  <div className="flex space-x-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleSetMainImage(image)}
                      title="Définir comme image principale"
                      disabled={image.isMain}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDelete(image.name)}
                      title="Supprimer l'image"
                    >
                      <Trash2 className="h-4 w-4" />
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
