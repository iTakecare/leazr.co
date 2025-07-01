
import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PDFTemplate } from "@/types/pdfTemplate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Eye, ArrowUp, ArrowDown, Loader2, Plus } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("images");
  const [localTemplate, setLocalTemplate] = useState<PDFTemplate>({
    ...template,
    templateImages: Array.isArray(template.templateImages) ? template.templateImages : [],
    fields: Array.isArray(template.fields) ? template.fields : []
  });
  const [isUploading, setIsUploading] = useState(false);
  
  // Debug lors du premier rendu
  useEffect(() => {
    console.log("PDFTemplateWithFields - Premier rendu");
    console.log("Template reçu:", template);
    console.log("Template.templateImages:", template.templateImages);
    console.log("Template.fields:", template.fields);
    
    // Vérifier et initialiser les tableaux si nécessaire
    const images = Array.isArray(template.templateImages) ? template.templateImages : [];
    const fields = Array.isArray(template.fields) ? template.fields : [];
    
    console.log("Images après vérification:", images.length);
    console.log("Champs après vérification:", fields.length);
    
    // Mettre à jour le template local avec des tableaux garantis
    setLocalTemplate({
      ...template,
      templateImages: images,
      fields: fields
    });
  }, []);
  
  // Mettre à jour le template local lorsque le template parent change
  useEffect(() => {
    console.log("Template parent mis à jour:", template);
    console.log("Template.templateImages:", template.templateImages);
    console.log("Template.fields:", template.fields);
    
    // Vérifier et initialiser les tableaux si nécessaire
    const images = Array.isArray(template.templateImages) ? template.templateImages : [];
    const fields = Array.isArray(template.fields) ? template.fields : [];
    
    console.log("Images après vérification:", images.length);
    console.log("Champs après vérification:", fields.length);
    
    // Mettre à jour le template local avec des tableaux garantis
    setLocalTemplate({
      ...template,
      templateImages: images,
      fields: fields
    });
  }, [template]);
  
  // Vérifier que les tableaux du template local sont toujours des tableaux
  const safeTemplate = {
    ...localTemplate,
    templateImages: Array.isArray(localTemplate.templateImages) ? localTemplate.templateImages : [],
    fields: Array.isArray(localTemplate.fields) ? localTemplate.fields : []
  };
  
  // Gestionnaire d'images
  const handleImagesChange = useCallback((images: TemplateImage[]) => {
    console.log("Images mises à jour:", images);
    console.log("Nombre d'images:", images.length);
    
    const updatedTemplate = {
      ...localTemplate,
      templateImages: images
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
  }, [localTemplate, onSave]);
  
  // Gestionnaire de champs
  const handleFieldsChange = useCallback((fields: PDFField[]) => {
    console.log("Champs mis à jour:", fields);
    console.log("Nombre de champs:", fields.length);
    
    const updatedTemplate = {
      ...localTemplate,
      fields: fields
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
  }, [localTemplate, onSave]);
  
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
      
      // Récupérer les images existantes de façon sûre
      const existingImages = Array.isArray(localTemplate.templateImages) 
        ? localTemplate.templateImages 
        : [];
      
      // Créer une nouvelle entrée d'image
      const newImage: TemplateImage = {
        id: uuidv4(),
        name: file.name,
        data: base64Data,
        page: existingImages.length
      };
      
      // Ajouter la nouvelle image
      const updatedImages = [...existingImages, newImage];
      
      const updatedTemplate = {
        ...localTemplate,
        templateImages: updatedImages
      };
      
      console.log("Mise à jour du template avec la nouvelle image");
      console.log("Nombre d'images avant:", existingImages.length);
      console.log("Nombre d'images après:", updatedImages.length);
      
      setLocalTemplate(updatedTemplate);
      onSave(updatedTemplate);
      
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
      
      // Réinitialiser l'input file
      if (e.target) {
        e.target.value = "";
      }
    }
  };
  
  // Supprimer une image
  const handleDeleteImage = (imageId: string) => {
    // Récupérer les images existantes de façon sûre
    const existingImages = Array.isArray(localTemplate.templateImages) 
      ? localTemplate.templateImages 
      : [];
    
    const updatedImages = existingImages.filter(img => img.id !== imageId);
    
    // Réindexer les numéros de page
    updatedImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    const updatedTemplate = {
      ...localTemplate,
      templateImages: updatedImages
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
    
    // Si la page actuellement sélectionnée n'existe plus, sélectionner la dernière page disponible
    if (selectedPage >= updatedImages.length) {
      setSelectedPage(Math.max(0, updatedImages.length - 1));
    }
    
    toast.success("Image supprimée avec succès");
  };
  
  // Déplacer une image vers le haut
  const moveImageUp = (index: number) => {
    if (index === 0) return;
    
    // Récupérer les images existantes de façon sûre
    const existingImages = Array.isArray(localTemplate.templateImages) 
      ? localTemplate.templateImages 
      : [];
    
    const newImages = [...existingImages];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    
    // Mettre à jour les numéros de page
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    const updatedTemplate = {
      ...localTemplate,
      templateImages: newImages
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
    
    // Mettre à jour l'index de page sélectionné si c'était l'une des pages déplacées
    if (selectedPage === index || selectedPage === index - 1) {
      setSelectedPage(selectedPage === index ? index - 1 : index);
    }
  };
  
  // Déplacer une image vers le bas
  const moveImageDown = (index: number) => {
    // Récupérer les images existantes de façon sûre
    const existingImages = Array.isArray(localTemplate.templateImages) 
      ? localTemplate.templateImages 
      : [];
    
    if (index === existingImages.length - 1) return;
    
    const newImages = [...existingImages];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    
    // Mettre à jour les numéros de page
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    const updatedTemplate = {
      ...localTemplate,
      templateImages: newImages
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
    
    // Mettre à jour l'index de page sélectionné si c'était l'une des pages déplacées
    if (selectedPage === index || selectedPage === index + 1) {
      setSelectedPage(selectedPage === index ? index + 1 : index);
    }
  };
  
  // Prévisualiser une image
  const previewImage = (imageData: string) => {
    window.open(imageData, '_blank');
  };
  
  // Gestion des champs spécifiques
  
  // Ajouter un champ
  const handleAddField = (field: PDFField) => {
    // Récupérer les champs existants de façon sûre
    const existingFields = Array.isArray(localTemplate.fields) 
      ? localTemplate.fields 
      : [];
    
    const newField = {
      ...field,
      id: uuidv4()
    };
    
    const updatedFields = [...existingFields, newField];
    
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
    toast.success("Champ ajouté avec succès");
  };
  
  // Supprimer un champ
  const handleDeleteField = (fieldId: string) => {
    // Récupérer les champs existants de façon sûre
    const existingFields = Array.isArray(localTemplate.fields) 
      ? localTemplate.fields 
      : [];
    
    const updatedFields = existingFields.filter(field => field.id !== fieldId);
    
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
    toast.success("Champ supprimé avec succès");
  };
  
  // Dupliquer un champ sur une autre page
  const handleDuplicateField = (fieldId: string, targetPage: number) => {
    // Récupérer les champs existants de façon sûre
    const existingFields = Array.isArray(localTemplate.fields) 
      ? localTemplate.fields 
      : [];
    
    const fieldToDuplicate = existingFields.find(field => field.id === fieldId);
    
    if (fieldToDuplicate) {
      const duplicatedField = {
        ...fieldToDuplicate,
        id: uuidv4(),
        page: targetPage
      };
      
      const updatedFields = [...existingFields, duplicatedField];
      
      const updatedTemplate = {
        ...localTemplate,
        fields: updatedFields
      };
      
      setLocalTemplate(updatedTemplate);
      onSave(updatedTemplate);
      toast.success(`Champ dupliqué sur la page ${targetPage + 1}`);
    }
  };
  
  // Retirer un champ d'une page
  const handleRemoveFieldFromPage = (fieldId: string, page: number) => {
    // Récupérer les champs existants de façon sûre
    const existingFields = Array.isArray(localTemplate.fields) 
      ? localTemplate.fields 
      : [];
    
    const updatedFields = existingFields.filter(field => 
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
  
  // Ajout d'un champ simple pour débogage
  const addDebugField = () => {
    // Récupérer les champs existants de façon sûre
    const existingFields = Array.isArray(localTemplate.fields) 
      ? localTemplate.fields 
      : [];
    
    const newField = {
      id: uuidv4(),
      label: "Champ de test",
      type: "text",
      category: "client",
      isVisible: true,
      value: "Valeur de test",
      position: { x: 50, y: 50 },
      page: selectedPage
    };
    
    const updatedFields = [...existingFields, newField];
    
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
    toast.success("Champ de test ajouté avec succès");
  };
  
  // Rendu du composant d'upload et de gestion des images
  const renderImageUploader = () => {
    // Récupérer les images existantes de façon sûre
    const existingImages = Array.isArray(localTemplate.templateImages) 
      ? localTemplate.templateImages 
      : [];
    
    console.log("renderImageUploader - Nombre d'images:", existingImages.length);
    
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
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Pages du modèle ({existingImages.length})</h3>
            <Button variant="outline" size="sm" onClick={() => console.log("Images du template:", existingImages)}>
              Debug Images
            </Button>
          </div>
          
          {existingImages.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-md">
              <p className="text-sm text-muted-foreground">
                Aucune page n'a encore été ajoutée. Utilisez le formulaire ci-dessus pour ajouter des pages à votre modèle.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {existingImages.map((image, index) => (
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
                          disabled={index === existingImages.length - 1}
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
    // Récupérer les champs existants de façon sûre
    const existingFields = Array.isArray(localTemplate.fields) 
      ? localTemplate.fields 
      : [];
    
    // Récupérer les images existantes de façon sûre
    const existingImages = Array.isArray(localTemplate.templateImages) 
      ? localTemplate.templateImages 
      : [];
    
    console.log("renderFieldsEditor - Nombre de champs:", existingFields.length);
    console.log("renderFieldsEditor - Nombre d'images:", existingImages.length);
    
    // Si nous n'avons pas d'images, afficher un message
    if (existingImages.length === 0) {
      return (
        <div className="text-center p-8 border border-dashed rounded-md">
          <p className="text-sm text-muted-foreground">
            Veuillez d'abord ajouter au moins une page de modèle dans l'onglet "Pages du modèle" avant de pouvoir ajouter des champs.
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Champs du document ({existingFields.length})</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addDebugField}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un champ test
            </Button>
            <Button variant="outline" size="sm" onClick={() => console.log("Champs:", existingFields)}>
              Debug Champs
            </Button>
          </div>
        </div>
        
        <PDFFieldsEditor 
          fields={existingFields}
          onChange={handleFieldsChange}
          activePage={selectedPage}
          onPageChange={setSelectedPage}
          template={safeTemplate}
          onDeleteField={handleDeleteField}
          onAddField={handleAddField}
          onDuplicateField={handleDuplicateField}
          onRemoveFieldFromPage={handleRemoveFieldFromPage}
        />
      </div>
    );
  };
  
  // Log avant le rendu final
  console.log("Rendu final PDFTemplateWithFields", {
    templateImagesCount: safeTemplate.templateImages.length,
    fieldsCount: safeTemplate.fields.length,
    selectedPage,
    activeTab
  });
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
