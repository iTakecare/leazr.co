import React from 'react';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Eye, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { ensureBucket } from "@/services/fileUploadService";
import { uploadImage } from "@/services/fileUploadService";

interface TemplateImage {
  id: string;
  name: string;
  url: string;
  page: number;
}

interface PDFModelUploaderProps {
  templateImages?: TemplateImage[];
  onChange: (images: TemplateImage[]) => void;
  selectedPage?: number;
  onPageSelect?: (pageIndex: number) => void;
}

const PDFModelUploader = ({ 
  templateImages = [], 
  onChange, 
  selectedPage = 0, 
  onPageSelect 
}: PDFModelUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [localImages, setLocalImages] = useState<TemplateImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const BUCKET_NAME = 'pdf-templates';
  
  useEffect(() => {
    const initImages = async () => {
      console.log("Initialisation des images du modèle PDF");
      setIsLoadingImages(true);
      
      try {
        await ensureBucket(BUCKET_NAME);
        
        if (templateImages && Array.isArray(templateImages) && templateImages.length > 0) {
          console.log("Utilisation des images fournies:", templateImages);
          
          const filteredImages = templateImages.filter(img => 
            !img.name.startsWith('.') && img.url
          );
          
          const imagesWithPageNumbers = filteredImages.map((img, idx) => ({
            ...img,
            page: img.page !== undefined ? img.page : idx
          }));
          
          setLocalImages(imagesWithPageNumbers);
          
          if (JSON.stringify(imagesWithPageNumbers) !== JSON.stringify(templateImages)) {
            onChange(imagesWithPageNumbers);
          }
        } else {
          setLocalImages([]);
        }
      } catch (err) {
        console.error("Erreur lors de l'initialisation des images:", err);
        toast.error("Erreur lors de l'initialisation des images");
        setLocalImages([]);
      } finally {
        setIsLoadingImages(false);
      }
    };
    
    initImages();
  }, [templateImages, onChange]);
  
  const handleUploadImage = async (file: File) => {
    if (!file) return null;
    
    try {
      setIsUploading(true);
      
      console.log("Début du processus d'upload pour:", file.name);
      
      if (!file.type.startsWith('image/')) {
        toast.error("Veuillez sélectionner une image (PNG, JPG, WEBP)");
        return null;
      }
      
      const id = uuidv4();
      
      try {
        const result = await uploadImage(file, 'pdf-templates', 'templates');
        console.log("Image uploadée avec succès:", result);
        
        if (result && result.url) {
          return {
            id,
            name: file.name,
            url: result.url,
            page: localImages.length
          };
        }
      } catch (uploadError) {
        console.error("Erreur lors de l'upload de l'image:", uploadError);
        toast.error("Erreur lors de l'upload de l'image");
        return null;
      }
      
      return null;
    } catch (error) {
      console.error("Exception non gérée lors de l'upload:", error);
      toast.error(`Erreur lors de l'upload du fichier`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  const deleteImage = async (imageId: string) => {
    try {
      console.log("Suppression de l'image:", imageId);
      
      const updatedImages = localImages.filter(img => img.id !== imageId);
      
      updatedImages.forEach((img, idx) => {
        img.page = idx;
      });
      
      setLocalImages(updatedImages);
      onChange(updatedImages);
      
      if (selectedPage >= updatedImages.length && onPageSelect) {
        onPageSelect(Math.max(0, updatedImages.length - 1));
      }
      
      toast.success("Image supprimée avec succès");
    } catch (error) {
      console.error("Exception lors de la suppression:", error);
      toast.error(`Erreur lors de la suppression de l'image`);
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const uploadedImage = await handleUploadImage(file);
    if (uploadedImage) {
      const newImages = [...localImages, uploadedImage];
      setLocalImages(newImages);
      onChange(newImages);
      
      if (newImages.length === 1 && onPageSelect) {
        onPageSelect(0);
      }
      
      toast.success("Image uploadée avec succès");
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    
    const newImages = [...localImages];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    setLocalImages(newImages);
    onChange(newImages);
    
    if (onPageSelect && (selectedPage === index || selectedPage === index - 1)) {
      onPageSelect(selectedPage === index ? index - 1 : index);
    }
  };
  
  const moveDown = (index: number) => {
    if (index === localImages.length - 1) return;
    
    const newImages = [...localImages];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    setLocalImages(newImages);
    onChange(newImages);
    
    if (onPageSelect && (selectedPage === index || selectedPage === index + 1)) {
      onPageSelect(selectedPage === index ? index + 1 : index);
    }
  };
  
  const previewImage = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };
  
  const selectPage = (index: number) => {
    if (onPageSelect) {
      onPageSelect(index);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-md p-4">
        <Label htmlFor="template-upload" className="text-sm font-medium">Ajouter un modèle de page</Label>
        <div className="flex gap-2 mt-2">
          <Input
            id="template-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
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
          Formats acceptés: PNG, JPG, WEBP. L'ordre des pages correspond à l'ordre dans lequel elles apparaîtront dans le document final.
        </p>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Pages du modèle ({localImages.length})</h3>
        
        {isLoadingImages ? (
          <div className="text-center p-8 border border-dashed rounded-md">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Chargement des pages du modèle...
            </p>
          </div>
        ) : localImages.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-md">
            <p className="text-sm text-muted-foreground">
              Aucune page n'a encore été uploadée. Utilisez le formulaire ci-dessus pour ajouter des pages à votre modèle.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {localImages.map((image, index) => (
              <Card 
                key={`${image.id}-${index}`} 
                className={`overflow-hidden ${selectedPage === index ? 'ring-2 ring-primary' : ''}`}
                onClick={() => selectPage(index)}
              >
                <div className="relative bg-gray-100 h-40 flex items-center justify-center">
                  <img 
                    src={image.url} 
                    alt={`Template page ${index + 1}`}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      console.error("Échec de chargement de l'image");
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    Page {index + 1}
                  </div>
                  {selectedPage === index && (
                    <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded text-xs">
                      Sélectionnée
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="truncate text-sm">{image.name || `Page ${index + 1}`}</div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={(e) => {
                          e.stopPropagation();
                          moveUp(index);
                        }}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={(e) => {
                          e.stopPropagation();
                          moveDown(index);
                        }}
                        disabled={index === localImages.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={(e) => {
                          e.stopPropagation();
                          previewImage(image.url);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteImage(image.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFModelUploader;
