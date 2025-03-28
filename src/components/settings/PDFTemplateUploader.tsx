
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Eye, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { uploadImage } from "@/services/imageService";

interface TemplateImage {
  id: string;
  name: string;
  url: string;
  page: number;
}

interface PDFTemplateUploaderProps {
  templateImages?: TemplateImage[];
  onChange: (images: TemplateImage[]) => void;
  selectedPage?: number;
  onPageSelect?: (pageIndex: number) => void;
}

const PDFTemplateUploader = ({ 
  templateImages = [], 
  onChange, 
  selectedPage = 0, 
  onPageSelect 
}: PDFTemplateUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [localImages, setLocalImages] = useState<TemplateImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  
  console.log("PDFTemplateUploader rendu avec templateImages:", templateImages);
  
  // Au montage, vérifier si templateImages est disponible
  useEffect(() => {
    const loadImages = async () => {
      console.log("Initialisation des images avec templateImages:", templateImages);
      setIsLoadingImages(true);
      
      try {
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
          const supabase = getSupabaseClient();
          
          // Vérifier si le bucket existe
          const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
          
          if (bucketError) {
            console.error("Erreur lors de la récupération des buckets:", bucketError);
            toast.error("Erreur lors de la récupération des buckets");
            setLocalImages([]);
            return;
          }
          
          // Trouver ou créer le bucket pdf-templates
          let pdfBucketExists = buckets?.some(bucket => bucket.name === 'pdf-templates');
          
          if (!pdfBucketExists) {
            console.log("Bucket pdf-templates non trouvé, création...");
            const { error: createError } = await supabase.storage.createBucket('pdf-templates', {
              public: true
            });
            
            if (createError) {
              console.error("Erreur lors de la création du bucket:", createError);
              toast.error("Erreur lors de la création du stockage");
              setLocalImages([]);
              return;
            }
            
            console.log("Bucket pdf-templates créé avec succès");
          }
          
          const { data: storageFiles, error } = await supabase.storage
            .from('pdf-templates')
            .list();
            
          if (error) {
            console.error("Erreur lors de la récupération des fichiers:", error);
            toast.error("Erreur lors de la récupération des fichiers");
            setLocalImages([]);
          } else if (storageFiles && storageFiles.length > 0) {
            console.log("Fichiers trouvés dans le stockage:", storageFiles);
            
            // Filtrer les fichiers qui ne sont pas des images (comme .emptyFolderPlaceholder)
            const imageFiles = storageFiles.filter(file => 
              !file.name.startsWith('.') && 
              (file.metadata?.mimetype?.startsWith('image/') || 
               file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
            );
            
            // Mapper les fichiers de stockage à notre format attendu
            const mappedImages = imageFiles.map((file, index) => {
              const imageUrl = supabase.storage
                .from('pdf-templates')
                .getPublicUrl(file.name).data.publicUrl;
                
              return {
                id: file.name,
                name: file.name,
                url: imageUrl,
                page: index
              };
            });
            
            console.log("Images mappées depuis le stockage:", mappedImages);
            setLocalImages(mappedImages);
            onChange(mappedImages); // Mettre à jour le composant parent avec les images trouvées
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
    
    loadImages();
  }, []);
  
  // Upload d'une image en utilisant le service
  const handleImageUpload = async (file: File) => {
    if (!file) return null;
    
    try {
      setIsUploading(true);
      
      console.log("Début du processus d'upload pour:", file.name);
      
      // Utiliser la fonction uploadImage qui gère correctement le type MIME
      const uniqueId = uuidv4();
      const result = await uploadImage(file, 'pdf-templates', '');
      
      if (result && result.url) {
        console.log("Upload réussi, URL de l'image:", result.url);
        return {
          id: result.path.split('/').pop() || uniqueId,
          name: file.name,
          url: result.url,
          page: localImages.length
        };
      } else {
        throw new Error("L'URL du fichier n'a pas été générée correctement");
      }
    } catch (error) {
      console.error("Exception non gérée lors de l'upload:", error);
      toast.error(`Erreur lors de l'upload du fichier: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  // Supprimer une image
  const deleteImage = async (imageId: string) => {
    try {
      console.log("Tentative de suppression du fichier:", imageId);
      
      const supabase = getSupabaseClient();
      
      // Supprimer le fichier du stockage
      const { error } = await supabase.storage
        .from('pdf-templates')
        .remove([imageId]);
        
      if (error) {
        console.error("Erreur détaillée lors de la suppression:", error);
        toast.error(`Erreur lors de la suppression du fichier: ${error.message}`);
        return;
      }
      
      console.log("Fichier supprimé avec succès");
      
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
      console.error("Exception non gérée lors de la suppression:", error);
      toast.error(`Erreur lors de la suppression du fichier: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Gérer l'upload de fichier
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Vérifier le type de fichier (images seulement)
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    
    console.log("Début du processus d'upload pour:", file.name);
    
    const uploadedImage = await handleImageUpload(file);
    if (uploadedImage) {
      const newImages = [...localImages, uploadedImage];
      console.log("Nouveau tableau d'images après upload:", newImages);
      setLocalImages(newImages);
      onChange(newImages); // Notifier le composant parent immédiatement
      
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
    onChange(newImages); // Notifier le composant parent immédiatement
    
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
    onChange(newImages); // Notifier le composant parent immédiatement
    
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
        console.log("Tentative de rechargement de l'image avec contournement de cache:", `${imageUrl}?t=${timestamp}`);
      }
    }, 2000);
  };

  // Forcer le rendu des images en ajoutant un timestamp aux URLs
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

export default PDFTemplateUploader;
