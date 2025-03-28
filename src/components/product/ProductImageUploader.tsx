
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Eye, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

interface ProductImage {
  id: string;
  name: string;
  url: string;
  isMain?: boolean;
}

interface ProductImageUploaderProps {
  productId: string;
  initialImages?: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  onSetMainImage?: (imageUrl: string) => void;
}

const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  productId,
  initialImages = [],
  onChange,
  onSetMainImage
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const BUCKET_NAME = 'product-images';

  // Initialisation des images
  useEffect(() => {
    const loadImages = async () => {
      setIsLoading(true);
      
      try {
        // Vérifier si des images initiales ont été fournies
        if (initialImages && initialImages.length > 0) {
          console.log("Utilisation des images fournies:", initialImages);
          setImages(initialImages);
        } else if (productId) {
          // Sinon, charger les images depuis le stockage
          await ensureBucketExists();
          await loadProductImages();
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation des images:", error);
        toast.error("Impossible de charger les images du produit");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadImages();
  }, [productId, initialImages]);

  // S'assurer que le bucket existe
  const ensureBucketExists = async () => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      
      if (!buckets?.some(bucket => bucket.name === BUCKET_NAME)) {
        console.log(`Création du bucket ${BUCKET_NAME}`);
        const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: true
        });
        
        if (error) {
          console.error("Erreur lors de la création du bucket:", error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error("Erreur lors de la vérification du bucket:", error);
      return false;
    }
  };

  // Charger les images du produit
  const loadProductImages = async () => {
    if (!productId) return;
    
    try {
      const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(productId);
      
      if (error) {
        console.error("Erreur lors du chargement des images:", error);
        return;
      }
      
      if (!files || files.length === 0) {
        console.log("Aucune image trouvée pour ce produit");
        return;
      }
      
      const imageFiles = files.filter(file => 
        !file.name.endsWith('/') && 
        file.name !== '.emptyFolderPlaceholder'
      );
      
      const loadedImages = imageFiles.map(file => {
        const { data } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(`${productId}/${file.name}`);
        
        return {
          id: file.name,
          name: file.name.split('-').pop() || file.name,
          url: data.publicUrl
        };
      });
      
      console.log("Images chargées:", loadedImages);
      setImages(loadedImages);
      onChange(loadedImages);
    } catch (error) {
      console.error("Erreur lors du chargement des images:", error);
    }
  };

  // Gérer le changement de fichier
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !productId) return;
    
    try {
      setIsUploading(true);
      
      // Vérifier que le bucket existe
      const bucketReady = await ensureBucketExists();
      if (!bucketReady) {
        toast.error("Impossible de préparer le stockage pour les images");
        return;
      }
      
      const newImages: ProductImage[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Vérifier que c'est bien une image
        if (!file.type.startsWith('image/')) {
          toast.error(`Le fichier ${file.name} n'est pas une image`);
          continue;
        }
        
        const fileId = uuidv4();
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${fileId}.${fileExt}`;
        const filePath = `${productId}/${fileName}`;
        
        // Déterminer le type MIME correct
        let contentType = file.type;
        if (fileExt === 'webp') contentType = 'image/webp';
        
        console.log(`Upload de ${fileName} (${contentType})`);
        
        // Créer un blob avec le type MIME explicite
        const blob = new Blob([await file.arrayBuffer()], { type: contentType });
        
        // Uploader le fichier
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, blob, {
            contentType,
            upsert: true
          });
        
        if (uploadError) {
          console.error(`Erreur lors de l'upload de ${fileName}:`, uploadError);
          toast.error(`Erreur lors de l'upload de ${file.name}`);
          continue;
        }
        
        // Récupérer l'URL publique
        const { data } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);
        
        const imageUrl = data.publicUrl;
        
        newImages.push({
          id: fileName,
          name: file.name,
          url: imageUrl
        });
        
        console.log(`Image ${fileName} uploadée avec succès:`, imageUrl);
      }
      
      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onChange(updatedImages);
        toast.success(`${newImages.length} image(s) uploadée(s) avec succès`);
      }
    } catch (error) {
      console.error("Erreur lors de l'upload des images:", error);
      toast.error("Une erreur est survenue lors de l'upload des images");
    } finally {
      setIsUploading(false);
    }
  };

  // Supprimer une image
  const handleDeleteImage = async (imageId: string) => {
    if (!productId) return;
    
    try {
      setIsUploading(true);
      
      const filePath = `${productId}/${imageId}`;
      
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);
      
      if (error) {
        console.error("Erreur lors de la suppression de l'image:", error);
        toast.error("Impossible de supprimer l'image");
        return;
      }
      
      const updatedImages = images.filter(img => img.id !== imageId);
      setImages(updatedImages);
      onChange(updatedImages);
      
      toast.success("Image supprimée avec succès");
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image:", error);
      toast.error("Une erreur est survenue lors de la suppression de l'image");
    } finally {
      setIsUploading(false);
    }
  };

  // Définir une image comme principale
  const handleSetMainImage = (imageUrl: string) => {
    if (onSetMainImage) {
      onSetMainImage(imageUrl);
      
      // Mettre à jour l'état local
      const updatedImages = images.map(img => ({
        ...img,
        isMain: img.url === imageUrl
      }));
      
      setImages(updatedImages);
      toast.success("Image principale définie avec succès");
    }
  };

  // Prévisualiser une image
  const previewImage = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };

  // Ajouter un timestamp pour éviter les problèmes de cache
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
            disabled={isUploading}
            multiple
            className="flex-1"
          />
          <Button disabled={isUploading} className="min-w-20">
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
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
        ) : images.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-md">
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
                      console.error("Erreur de chargement d'image:", image.url);
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
                          onClick={() => handleSetMainImage(image.url)}
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" 
                        onClick={() => handleDeleteImage(image.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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

export default ProductImageUploader;
