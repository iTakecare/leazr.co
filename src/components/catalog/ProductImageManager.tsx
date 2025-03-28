
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage, listFiles, deleteFile, ensureBucket } from "@/services/fileUploadService";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Check } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const BUCKET_NAME = "catalog";

  useEffect(() => {
    loadImages();
  }, [productId]);

  const loadImages = async () => {
    try {
      setIsLoading(true);
      
      // S'assurer que le bucket existe
      const bucketExists = await ensureBucket(BUCKET_NAME);
      if (!bucketExists) {
        toast.error("Erreur lors de l'accès au stockage");
        setIsLoading(false);
        return;
      }
      
      // Charger les images du produit
      const files = await listFiles(BUCKET_NAME, productId);
      
      const imageFiles = files
        .filter(file => !file.name.startsWith('.'))
        .map(file => {
          const { publicUrl } = supabase.storage.from(BUCKET_NAME).getPublicUrl(`${productId}/${file.name}`).data;
          return {
            name: file.name,
            url: publicUrl,
            isMain: false // Nous définirons l'image principale par la suite
          };
        });
      
      setImages(imageFiles);
      
      if (onChange) {
        onChange(imageFiles);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des images:", error);
      toast.error("Erreur lors du chargement des images");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
          toast.error(`Le fichier ${file.name} n'est pas une image`);
          continue;
        }
        
        const result = await uploadImage(file, BUCKET_NAME, productId);
        
        if (result) {
          toast.success(`Image ${file.name} téléchargée avec succès`);
        }
      }
      
      // Recharger les images après l'upload
      await loadImages();
    } catch (error) {
      console.error("Erreur lors de l'upload des images:", error);
      toast.error("Erreur lors de l'upload des images");
    } finally {
      setIsUploading(false);
      
      // Réinitialiser le champ de fichier
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleDelete = async (imageName: string) => {
    try {
      const filePath = `${productId}/${imageName}`;
      const success = await deleteFile(BUCKET_NAME, filePath);
      
      if (success) {
        toast.success("Image supprimée avec succès");
        await loadImages();
      } else {
        toast.error("Erreur lors de la suppression de l'image");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image:", error);
      toast.error("Erreur lors de la suppression de l'image");
    }
  };

  const handleSetMainImage = (imageUrl: string) => {
    if (onSetMainImage) {
      onSetMainImage(imageUrl);
      toast.success("Image principale définie avec succès");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-8 h-8 animate-spin" />
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
      </div>

      {images.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucune image n'a été téléchargée pour ce produit.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={image.url}
                  alt={`Product ${index + 1}`}
                  className="object-cover w-full h-full"
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
