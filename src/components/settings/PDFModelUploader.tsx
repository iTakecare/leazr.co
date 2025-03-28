
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Eye, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { ensureStorageBucket } from "@/services/storageService";
import { uploadImage } from "@/services/imageService";

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
  
  // Au montage, initialiser les images
  useEffect(() => {
    const initImages = async () => {
      console.log("Initialisation des images du modèle PDF");
      setIsLoadingImages(true);
      
      try {
        // S'assurer que le bucket de stockage existe
        await ensureStorageBucket(BUCKET_NAME);
        
        if (templateImages && Array.isArray(templateImages) && templateImages.length > 0) {
          console.log("Utilisation des images fournies:", templateImages);
          
          // Filtrer les images qui ne sont pas des placeholders
          const filteredImages = templateImages.filter(img => 
            !img.name.startsWith('.') && img.url
          );
          
          // S'assurer que toutes les images ont un numéro de page défini
          const imagesWithPageNumbers = filteredImages.map((img, idx) => ({
            ...img,
            page: img.page !== undefined ? img.page : idx
          }));
          
          setLocalImages(imagesWithPageNumbers);
          
          // Si des numéros de page ont été ajoutés/corrigés, notifier le parent
          if (JSON.stringify(imagesWithPageNumbers) !== JSON.stringify(templateImages)) {
            onChange(imagesWithPageNumbers);
          }
        } else {
          // Initialiser avec un tableau vide
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
  
  // Fonction pour uploader une image
  const handleUploadImage = async (file: File) => {
    if (!file) return null;
    
    try {
      setIsUploading(true);
      
      console.log("Début du processus d'upload pour:", file.name);
      
      // Vérifier le format
      if (!file.type.startsWith('image/')) {
        toast.error("Veuillez sélectionner une image (PNG, JPG, WEBP)");
        return null;
      }
      
      // Créer un ID unique pour l'image
      const id = uuidv4();
      
      // Utiliser le service d'upload pour stocker l'image dans Supabase Storage
      try {
        const result = await uploadImage(file, BUCKET_NAME, 'templates');
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
      
      // Fallback: utiliser FileReader pour l'affichage local si l'upload a échoué
      return new Promise<TemplateImage | null>((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          if (e.target?.result) {
            const imgUrl = e.target.result.toString();
            resolve({
              id,
              name: file.name,
              url: imgUrl,
              page: localImages.length
            });
          } else {
            resolve(null);
          }
        };
        
        reader.onerror = () => {
          console.error("Erreur lors de la lecture du fichier");
          toast.error("Erreur lors de la lecture du fichier");
          resolve(null);
        };
        
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error("Exception non gérée lors de l'upload:", error);
      toast.error(`Erreur lors de l'upload du fichier`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  // Supprimer une image
  const deleteImage = async (imageId: string) => {
    try {
      console.log("Suppression de l'image:", imageId);
      
      // Supprimer du tableau local
      const updatedImages = localImages.filter(img => img.id !== imageId);
      
      // Réindexer les numéros de page
      updatedImages.forEach((img, idx) => {
        img.page = idx;
      });
      
      setLocalImages(updatedImages);
      onChange(updatedImages);
      
      // Si la page actuellement sélectionnée n'existe plus, sélectionner la dernière page disponible
      if (selectedPage >= updatedImages.length && onPageSelect) {
        onPageSelect(Math.max(0, updatedImages.length - 1));
      }
      
      toast.success("Image supprimée avec succès");
    } catch (error) {
      console.error("Exception lors de la suppression:", error);
      toast.error(`Erreur lors de la suppression de l'image`);
    }
  };
  
  // Gérer l'upload de fichier
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const uploadedImage = await handleUploadImage(file);
    if (uploadedImage) {
      const newImages = [...localImages, uploadedImage];
      setLocalImages(newImages);
      onChange(newImages);
      
      // S'il s'agit de la première image, la sélectionner automatiquement
      if (newImages.length === 1 && onPageSelect) {
        onPageSelect(0);
      }
      
      toast.success("Image uploadée avec succès");
    }
  };

  // Déplacer une image vers le haut
  const moveUp = (index: number) => {
    if (index === 0) return;
    
    const newImages = [...localImages];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    
    // Mettre à jour les numéros de page
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    setLocalImages(newImages);
    onChange(newImages);
    
    // Mettre à jour l'index de page sélectionné si c'était l'une des pages déplacées
    if (onPageSelect && (selectedPage === index || selectedPage === index - 1)) {
      onPageSelect(selectedPage === index ? index - 1 : index);
    }
  };
  
  // Déplacer une image vers le bas
  const moveDown = (index: number) => {
    if (index === localImages.length - 1) return;
    
    const newImages = [...localImages];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    
    // Mettre à jour les numéros de page
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    setLocalImages(newImages);
    onChange(newImages);
    
    // Mettre à jour l'index de page sélectionné si c'était l'une des pages déplacées
    if (onPageSelect && (selectedPage === index || selectedPage === index + 1)) {
      onPageSelect(selectedPage === index ? index + 1 : index);
    }
  };
  
  // Prévisualiser une image
  const previewImage = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };
  
  // Sélectionner une page pour l'édition
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
