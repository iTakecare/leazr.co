
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PDFTemplate } from "./PDFTemplateManager";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Eye, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import PDFFieldsEditor from "./PDFFieldsEditor";

interface PDFTemplateWithFieldsProps {
  template: PDFTemplate;
  onSave: (template: PDFTemplate) => void;
}

// Interface pour les images du template
interface TemplateImage {
  id: string;
  name: string;
  data: string; // Données base64
  page: number;
}

// Interface pour les champs du PDF
interface PDFField {
  id: string;
  label: string;
  type: string;
  category: string;
  isVisible: boolean;
  value: string;
  position: { x: number; y: number };
  page: number;
  style?: {
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    textDecoration: string;
  };
}

const PDFTemplateWithFields = ({ template, onSave }: PDFTemplateWithFieldsProps) => {
  const [selectedPage, setSelectedPage] = useState(0);
  const [localTemplate, setLocalTemplate] = useState<PDFTemplate | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Effet pour initialiser le state local avec les données du template
  useEffect(() => {
    // Assurez-vous que template.fields et template.templateImages sont toujours des tableaux
    const sanitizedTemplate = {
      ...template,
      fields: Array.isArray(template.fields) ? template.fields : [],
      templateImages: Array.isArray(template.templateImages) ? template.templateImages : []
    };
    
    console.log("Template reçu (sanitized):", sanitizedTemplate);
    console.log("Images du template:", sanitizedTemplate.templateImages);
    console.log("Champs du template:", sanitizedTemplate.fields);
    
    setLocalTemplate(sanitizedTemplate);
  }, [template]);
  
  // Si le template n'est pas encore chargé, afficher un indicateur de chargement
  if (!localTemplate) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement du modèle...</span>
      </div>
    );
  }
  
  // Convertir les images du template en format local si nécessaire
  const convertTemplateimagesToLocalFormat = (images: any[]): TemplateImage[] => {
    if (!images || !Array.isArray(images)) {
      console.log("Aucune image trouvée ou format invalide");
      return [];
    }
    
    console.log("Conversion des images:", images);
    
    return images.map((img, idx) => {
      // Si l'image est déjà au bon format, la retourner telle quelle
      if (img.data) return img;
      
      // Sinon, créer une nouvelle structure avec l'URL comme données (temporaire)
      return {
        id: img.id || `image-${idx}`,
        name: img.name || `Page ${idx + 1}`,
        data: img.url || img.data || '',
        page: img.page !== undefined ? img.page : idx
      };
    });
  };
  
  // Obtenir les images au format local
  const getLocalImages = (): TemplateImage[] => {
    if (!localTemplate.templateImages || !Array.isArray(localTemplate.templateImages)) {
      console.log("Aucune image dans le template ou format invalide");
      return [];
    }
    
    const images = convertTemplateimagesToLocalFormat(localTemplate.templateImages);
    console.log("Images locales obtenues:", images.length);
    return images;
  };
  
  // Gestionnaire pour les images
  const handleImagesChange = (images: TemplateImage[]) => {
    console.log("Images mises à jour:", images);
    
    const updatedTemplate = {
      ...localTemplate,
      templateImages: images
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
  };
  
  // Gestionnaire pour les champs
  const handleFieldsChange = (fields: PDFField[]) => {
    console.log("Champs mis à jour:", fields);
    
    const updatedTemplate = {
      ...localTemplate,
      fields: fields
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
  };
  
  // Fonction pour supprimer un champ
  const handleDeleteField = (fieldId: string) => {
    const updatedFields = (localTemplate.fields || []).filter(field => field.id !== fieldId);
    
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
    toast.success("Champ supprimé avec succès");
  };
  
  // Fonction pour ajouter un champ
  const handleAddField = (field: PDFField) => {
    const newField = {
      ...field,
      id: uuidv4()
    };
    
    const updatedFields = [...(localTemplate.fields || []), newField];
    
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
    toast.success("Champ ajouté avec succès");
  };
  
  // Fonction pour dupliquer un champ sur une autre page
  const handleDuplicateField = (fieldId: string, targetPage: number) => {
    const fieldToDuplicate = (localTemplate.fields || []).find(field => field.id === fieldId);
    
    if (fieldToDuplicate) {
      const duplicatedField = {
        ...fieldToDuplicate,
        id: `${fieldId}_page${targetPage}`,
        page: targetPage
      };
      
      const updatedFields = [...(localTemplate.fields || []), duplicatedField];
      
      const updatedTemplate = {
        ...localTemplate,
        fields: updatedFields
      };
      
      setLocalTemplate(updatedTemplate);
      onSave(updatedTemplate);
      toast.success(`Champ dupliqué sur la page ${targetPage + 1}`);
    }
  };
  
  // Fonction pour retirer un champ d'une page
  const handleRemoveFieldFromPage = (fieldId: string, page: number) => {
    const updatedFields = (localTemplate.fields || []).filter(field => 
      !(field.id === fieldId && field.page === page)
    );
    
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
    toast.success(`Champ retiré de la page ${page + 1}`);
  };
  
  // Fonction pour convertir un fichier en base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  
  // Gestion de l'upload de fichier
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
      
      // Convertir l'image en base64
      const base64Data = await convertFileToBase64(file);
      
      // Créer une nouvelle entrée d'image
      const newImage: TemplateImage = {
        id: uuidv4(),
        name: file.name,
        data: base64Data,
        page: getLocalImages().length
      };
      
      // Ajouter la nouvelle image
      const updatedImages = [...getLocalImages(), newImage];
      handleImagesChange(updatedImages);
      toast.success("Image ajoutée avec succès");
      
      // S'il s'agit de la première image, la sélectionner automatiquement
      if (updatedImages.length === 1) {
        setSelectedPage(0);
      }
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      toast.error("Une erreur est survenue lors de l'ajout de l'image");
    } finally {
      setIsUploading(false);
    }
  };
  
  // Supprimer une image
  const handleDeleteImage = (imageId: string) => {
    const updatedImages = getLocalImages().filter(img => img.id !== imageId);
    
    // Réindexer les numéros de page
    updatedImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    handleImagesChange(updatedImages);
    
    // Si la page actuellement sélectionnée n'existe plus, sélectionner la dernière page disponible
    if (selectedPage >= updatedImages.length) {
      setSelectedPage(Math.max(0, updatedImages.length - 1));
    }
    
    toast.success("Image supprimée avec succès");
  };
  
  // Déplacer une image vers le haut
  const moveImageUp = (index: number) => {
    if (index === 0) return;
    
    const newImages = [...getLocalImages()];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    
    // Mettre à jour les numéros de page
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    handleImagesChange(newImages);
    
    // Mettre à jour l'index de page sélectionné si c'était l'une des pages déplacées
    if (selectedPage === index || selectedPage === index - 1) {
      setSelectedPage(selectedPage === index ? index - 1 : index);
    }
  };
  
  // Déplacer une image vers le bas
  const moveImageDown = (index: number) => {
    const images = getLocalImages();
    if (index === images.length - 1) return;
    
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    
    // Mettre à jour les numéros de page
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    handleImagesChange(newImages);
    
    // Mettre à jour l'index de page sélectionné si c'était l'une des pages déplacées
    if (selectedPage === index || selectedPage === index + 1) {
      setSelectedPage(selectedPage === index ? index + 1 : index);
    }
  };
  
  // Prévisualiser une image
  const previewImage = (imageData: string) => {
    window.open(imageData, '_blank');
  };
  
  // Gestionnaire de changement de page
  const handlePageChange = (newPage: number) => {
    setSelectedPage(newPage);
  };
  
  // Rendu du composant d'upload et de gestion des images
  const renderImageUploader = () => {
    const images = getLocalImages();
    console.log("Nombre d'images à afficher:", images.length);
    
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
          <h3 className="text-sm font-medium">Pages du modèle ({images.length})</h3>
          
          {images.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-md">
              <p className="text-sm text-muted-foreground">
                Aucune page n'a encore été ajoutée. Utilisez le formulaire ci-dessus pour ajouter des pages à votre modèle.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {images.map((image, index) => (
                <Card 
                  key={`${image.id}-${index}`} 
                  className={`overflow-hidden ${selectedPage === index ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedPage(index)}
                >
                  <div className="relative bg-gray-100 h-40 flex items-center justify-center">
                    <img 
                      src={image.data} 
                      alt={`Template page ${index + 1}`}
                      className="max-h-full max-w-full object-contain"
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
                            moveImageUp(index);
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
                            moveImageDown(index);
                          }}
                          disabled={index === images.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={(e) => {
                            e.stopPropagation();
                            previewImage(image.data);
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
  
  // Rendu du composant d'édition des champs
  const renderFieldsEditor = () => {
    const fields = Array.isArray(localTemplate.fields) ? localTemplate.fields : [];
    const images = getLocalImages();
    
    console.log("Nombre de champs à éditer:", fields.length);
    console.log("Nombre d'images pour le positionnement:", images.length);
    
    return (
      <PDFFieldsEditor 
        fields={fields}
        onChange={handleFieldsChange}
        activePage={selectedPage}
        onPageChange={handlePageChange}
        template={localTemplate}
        onDeleteField={handleDeleteField}
        onAddField={handleAddField}
        onDuplicateField={handleDuplicateField}
        onRemoveFieldFromPage={handleRemoveFieldFromPage}
      />
    );
  };
  
  return (
    <Tabs defaultValue="images" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="images">Pages du modèle</TabsTrigger>
        <TabsTrigger value="fields">Champs du document</TabsTrigger>
      </TabsList>
      
      <TabsContent value="images" className="mt-6">
        {renderImageUploader()}
      </TabsContent>
      
      <TabsContent value="fields" className="mt-6">
        {renderFieldsEditor()}
      </TabsContent>
    </Tabs>
  );
};

export default PDFTemplateWithFields;
