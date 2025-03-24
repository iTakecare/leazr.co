
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Eye, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { uploadFile, ensureBucket, listFiles, deleteFile } from "@/services/fileStorage";

interface TemplateImage {
  id: string;
  name: string;
  url: string;
  page: number;
}

interface PDFTemplateImageUploaderProps {
  templateImages?: TemplateImage[];
  onChange: (images: TemplateImage[]) => void;
  selectedPage?: number;
  onPageSelect?: (pageIndex: number) => void;
}

const BUCKET_NAME = "pdf-templates";

const PDFTemplateImageUploader = ({ 
  templateImages = [], 
  onChange, 
  selectedPage = 0, 
  onPageSelect 
}: PDFTemplateImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [localImages, setLocalImages] = useState<TemplateImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  
  console.log("PDFTemplateImageUploader rendu avec templateImages:", templateImages);
  
  // Initialisation
  useEffect(() => {
    const initialize = async () => {
      console.log("Initialisation des images avec templateImages:", templateImages);
      setIsLoadingImages(true);
      
      try {
        // Vérifier si templateImages est disponible
        if (templateImages && Array.isArray(templateImages) && templateImages.length > 0) {
          console.log("Utilisation des templateImages fournis:", templateImages);
          
          // S'assurer que toutes les images ont un numéro de page défini
          const imagesWithPageNumbers = templateImages.map((img, idx) => ({
            ...img,
            page: img.page !== undefined ? img.page : idx
          }));
          
          console.log("Images avec numéros de page:", imagesWithPageNumbers);
          setLocalImages(imagesWithPageNumbers);
          
          // Si des numéros de page ont été ajoutés/corrigés, notifier le parent
          if (JSON.stringify(imagesWithPageNumbers) !== JSON.stringify(templateImages)) {
            onChange(imagesWithPageNumbers);
          }
        } else {
          // Si aucun templateImages n'est fourni, essayer de lister toutes les images dans le bucket
          console.log("Aucun templateImages fourni, listing depuis le stockage");
          
          // S'assurer que le bucket existe
          const bucketReady = await ensureBucket(BUCKET_NAME);
          
          if (!bucketReady) {
            console.error("Impossible de préparer le bucket pdf-templates");
            toast.error("Erreur lors de la préparation du stockage");
            setLocalImages([]);
            return;
          }
          
          // Lister les fichiers
          const storageFiles = await listFiles(BUCKET_NAME);
          
          if (storageFiles && storageFiles.length > 0) {
            console.log("Fichiers trouvés dans le stockage:", storageFiles);
            
            // Filtrer les fichiers qui ne sont pas des images
            const imageFiles = storageFiles.filter(file => 
              !file.name.startsWith('.') && 
              (file.metadata?.mimetype?.startsWith('image/') || 
               file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
            );
            
            // URL de base pour les fichiers
            const baseUrl = `https://cifbetjefyfocafanlhv.supabase.co/storage/v1/object/public/${BUCKET_NAME}/`;
            
            // Mapper les fichiers à notre format
            const mappedImages = imageFiles.map((file, index) => ({
              id: file.name,
              name: file.name,
              url: baseUrl + file.name,
              page: index
            }));
            
            console.log("Images mappées depuis le stockage:", mappedImages);
            setLocalImages(mappedImages);
            onChange(mappedImages);
          } else {
            console.log("Aucun fichier trouvé dans le stockage");
            setLocalImages([]);
          }
        }
      } catch (err) {
        console.error("Exception lors de l'initialisation des images:", err);
        toast.error("Une erreur est survenue lors de l'initialisation des images");
        setLocalImages([]);
      } finally {
        setIsLoadingImages(false);
      }
    };
    
    initialize();
  }, []);
  
  // Gérer l'upload de fichier
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Vérifier le type de fichier (images seulement)
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    
    try {
      setIsUploading(true);
      
      console.log("Début de l'upload pour:", file.name);
      
      // Générer un nom unique pour le fichier
      const uniqueId = uuidv4();
      const fileName = `${uniqueId}-${file.name}`;
      
      // Uploader le fichier
      const fileUrl = await uploadFile(BUCKET_NAME, file, fileName);
      
      if (fileUrl) {
        // Créer une nouvelle entrée d'image
        const newImage: TemplateImage = {
          id: fileName,
          name: file.name,
          url: fileUrl,
          page: localImages.length
        };
        
        const newImages = [...localImages, newImage];
        console.log("Nouveau tableau d'images après upload:", newImages);
        
        setLocalImages(newImages);
        onChange(newImages);
        
        // S'il s'agit de la première image, la sélectionner automatiquement
        if (newImages.length === 1 && onPageSelect) {
          onPageSelect(0);
        }
        
        toast.success("Image uploadée avec succès");
      } else {
        toast.error("Échec de l'upload de l'image");
      }
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      toast.error("Une erreur est survenue lors de l'upload");
    } finally {
      setIsUploading(false);
    }
  };
  
  // Supprimer une image
  const handleDeleteImage = async (imageId: string) => {
    try {
      console.log("Suppression de l'image:", imageId);
      
      const deleted = await deleteFile(BUCKET_NAME, imageId);
      
      if (!deleted) {
        toast.error("Échec de la suppression de l'image");
        return;
      }
      
      // Mettre à jour la liste d'images
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
      console.error("Erreur lors de la suppression:", error);
      toast.error("Une erreur est survenue lors de la suppression");
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
  
  // Gérer l'erreur de chargement d'image
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, imageUrl: string) => {
    console.error("Échec de chargement de l'image:", imageUrl);
    e.currentTarget.src = "/placeholder.svg"; // Image de secours
    
    // Essayer de recharger l'image avec un paramètre de contournement de cache
    setTimeout(() => {
      if (e.currentTarget.src === "/placeholder.svg") {
        const timestamp = new Date().getTime();
        e.currentTarget.src = `${imageUrl}?t=${timestamp}`;
        console.log("Tentative de rechargement avec contournement de cache:", `${imageUrl}?t=${timestamp}`);
      }
    }, 2000);
  };

  // Ajouter un timestamp pour forcer le rechargement des images
  const timestampedImages = localImages.map(img => ({
    ...img,
    displayUrl: `${img.url}?t=${new Date().getTime()}`
  }));
  
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
          Formats acceptés: PNG, JPG, WEBP. L'ordre des pages correspond à l'ordre dans lequel elles apparaîtront dans le document.
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
            {timestampedImages.map((image, index) => (
              <Card 
                key={`${image.id}-${index}`} 
                className={`overflow-hidden ${selectedPage === index ? 'ring-2 ring-primary' : ''}`}
                onClick={() => selectPage(index)}
              >
                <div className="relative bg-gray-100 h-40 flex items-center justify-center">
                  <img 
                    src={image.displayUrl} 
                    alt={`Template page ${index + 1}`}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => handleImageError(e, image.url)}
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
                          handleDeleteImage(image.id);
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

export default PDFTemplateImageUploader;
