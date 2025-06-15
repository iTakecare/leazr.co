
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Check, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadFileMultiTenant } from "@/services/multiTenantStorageService";
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
  
  useEffect(() => {
    if (loadingRef.current || !companyId) return;
    
    const loadImages = async () => {
      loadingRef.current = true;
      setIsLoadingImages(true);
      setErrorMessage(null);
      
      try {
        console.log(`Loading images for product ${productId} from company-${companyId} folder`);
        
        // Chercher dans le dossier de l'entreprise
        const companyFolder = `company-${companyId}`;
        const { data: files, error } = await supabase.storage
          .from("product-images")
          .list(companyFolder, {
            sortBy: { column: 'name', order: 'asc' }
          });
        
        if (error) {
          if (error.message.includes('does not exist') || error.message.includes('not found')) {
            console.log(`No company folder found for ${companyFolder}, this is normal for new products`);
            setImages([]);
            
            if (onChange) {
              onChange([]);
            }
          } else {
            console.error(`Error loading images: ${error.message}`);
            setErrorMessage(`Erreur lors du chargement des images: ${error.message}`);
          }
          
          setIsLoadingImages(false);
          loadingRef.current = false;
          return;
        }
        
        if (!files || files.length === 0) {
          console.log(`No images found for company ${companyId}`);
          setImages([]);
          setIsLoadingImages(false);
          loadingRef.current = false;
          
          if (onChange) {
            onChange([]);
          }
          
          return;
        }
        
        // Filtrer les fichiers du produit spécifique
        const productFiles = files.filter(file => 
          !file.name.startsWith('.') && 
          file.name !== '.emptyFolderPlaceholder' &&
          file.name.includes(productId)
        );
        
        const imageFiles = productFiles
          .map(file => {
            try {
              const filePath = `${companyFolder}/${file.name}`;
              const { data } = supabase.storage
                .from("product-images")
                .getPublicUrl(filePath);
              
              if (!data || !data.publicUrl) {
                console.error(`Failed to get public URL for ${filePath}`);
                return null;
              }
              
              const timestamp = Date.now();
              const isMain = currentMainImage && data.publicUrl === currentMainImage;
              
              return {
                name: file.name,
                url: `${data.publicUrl}?t=${timestamp}&rc=${retryCount}`,
                originalUrl: data.publicUrl,
                isMain: isMain
              };
            } catch (e) {
              console.error(`Error generating URL for ${file.name}:`, e);
              return null;
            }
          })
          .filter(Boolean);
        
        console.log(`Loaded ${imageFiles.length} images for product ${productId}`);
        console.log("Images mises à jour:", imageFiles);
        setImages(imageFiles);
        
        if (onChange) {
          onChange(imageFiles);
        }
      } catch (error) {
        console.error("Error loading images:", error);
        setErrorMessage(`Erreur lors du chargement des images: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        setImages([]);
      } finally {
        setIsLoadingImages(false);
        loadingRef.current = false;
      }
    };
    
    loadImages();
    
    return () => {
      loadingRef.current = false;
    };
  }, [productId, onChange, retryCount, currentMainImage, companyId]);
  
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
        
        if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          toast.error(`Le fichier ${file.name} n'est pas une image valide`);
          continue;
        }
        
        // Créer un nom de fichier unique avec l'ID du produit
        const timestamp = Date.now();
        const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `product-${productId}-${timestamp}-${i}.${extension}`;
        
        const imageUrl = await uploadFileMultiTenant(
          file,
          "product-images",
          fileName,
          companyId
        );
        
        if (imageUrl) {
          uploadedCount++;
        }
      }
      
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} image(s) téléchargée(s) avec succès`);
        setRetryCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error uploading images:", error);
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
      const filePath = `company-${companyId}/${imageName}`;
      console.log(`Deleting file ${filePath} from bucket product-images`);
      
      const { error } = await supabase.storage
        .from("product-images")
        .remove([filePath]);
      
      if (error) {
        console.error('Error deleting file:', error);
        toast.error(`Erreur lors de la suppression: ${error.message}`);
        return;
      }
      
      toast.success("Image supprimée avec succès");
      setRetryCount(prev => prev + 1);
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Erreur lors de la suppression de l'image");
    }
  };
  
  const handleSetMainImage = (imageInfo: any) => {
    const originalUrl = imageInfo.originalUrl || imageInfo.url;
    if (onSetMainImage) {
      try {
        onSetMainImage(originalUrl);
        // We don't show success toast here because it will be shown by the parent component
        // after the operation is actually complete
      } catch (error) {
        console.error("Error setting main image:", error);
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
            <Card key={`${image.name}-${index}`} className={`overflow-hidden ${image.isMain ? 'border-primary' : ''}`}>
              <div className="relative aspect-square">
                <div className="w-full h-full flex items-center justify-center bg-gray-50 p-2">
                  <img
                    src={getUniqueImageUrl(image.url, index)}
                    alt={`Produit ${index + 1}`}
                    className="object-contain max-h-full max-w-full"
                    loading="lazy"
                    onError={(e) => {
                      console.error(`Failed to load image: ${image.url}`);
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
